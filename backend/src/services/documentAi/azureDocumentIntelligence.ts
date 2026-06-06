import { v4 as uuidv4 } from 'uuid';
import { DocumentAiProvider, DocumentLayout } from './types';
import { Page, Region, RegionType, FractionBox, TableStructure } from '../../types/study';

const API_VERSION = '2024-11-30';
const MODEL = 'prebuilt-layout';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

interface DiPolygonRegion {
  pageNumber: number;
  polygon?: number[];
}
interface DiPage {
  pageNumber: number;
  width?: number;
  height?: number;
}

function bboxFromPolygon(polygon: number[], pageW: number, pageH: number): FractionBox {
  const xs = polygon.filter((_, i) => i % 2 === 0);
  const ys = polygon.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  return {
    x: clamp(minX / pageW),
    y: clamp(minY / pageH),
    width: clamp((maxX - minX) / pageW),
    height: clamp((maxY - minY) / pageH),
  };
}

function regionFromBounding(
  br: DiPolygonRegion | undefined,
  pages: Map<number, DiPage>,
  type: RegionType,
  content: string,
  tableStructure?: TableStructure
): Region | null {
  if (!br || !br.polygon) return null;
  const page = pages.get(br.pageNumber);
  if (!page || !page.width || !page.height) return null;
  return {
    id: uuidv4(),
    pageIndex: br.pageNumber - 1,
    type,
    bbox: bboxFromPolygon(br.polygon, page.width, page.height),
    content,
    ...(tableStructure ? { tableStructure } : {}),
  };
}

export class AzureDocumentIntelligence implements DocumentAiProvider {
  readonly name = 'azure-document-intelligence';

  async analyzeLayout(pdf: Buffer): Promise<DocumentLayout> {
    const endpoint = process.env.AZURE_DOC_INTEL_ENDPOINT;
    const key = process.env.AZURE_DOC_INTEL_KEY;
    if (!endpoint || !key) {
      throw new Error('Azure Document Intelligence not configured (AZURE_DOC_INTEL_ENDPOINT / AZURE_DOC_INTEL_KEY)');
    }
    const base = endpoint.replace(/\/$/, '');

    // 1) Submit the PDF bytes for layout analysis
    const submit = await fetch(
      `${base}/documentintelligence/documentModels/${MODEL}:analyze?api-version=${API_VERSION}`,
      {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/pdf' },
        body: pdf,
      }
    );
    if (submit.status !== 202) {
      throw new Error(`Document Intelligence submit failed: ${submit.status} ${await submit.text()}`);
    }
    const operationLocation = submit.headers.get('operation-location');
    if (!operationLocation) throw new Error('Document Intelligence: missing operation-location');

    // 2) Poll until the operation succeeds
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let result: any = null;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const poll = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': key } });
      const body = (await poll.json()) as any;
      if (body.status === 'succeeded') {
        result = body.analyzeResult;
        break;
      }
      if (body.status === 'failed') {
        throw new Error(`Document Intelligence analysis failed: ${JSON.stringify(body.error)}`);
      }
    }
    if (!result) throw new Error('Document Intelligence: analysis timed out');

    return this.normalize(result);
  }

  private normalize(result: any): DocumentLayout {
    const diPages: DiPage[] = result.pages || [];
    const pageMap = new Map<number, DiPage>(diPages.map((p) => [p.pageNumber, p]));

    const pages: Page[] = diPages.map((p) => ({
      index: p.pageNumber - 1,
      widthPx: p.width || 0,
      heightPx: p.height || 0,
    }));

    const regions: Region[] = [];

    // Paragraphs -> heading or text. Skip page furniture (headers/footers/numbers).
    for (const para of result.paragraphs || []) {
      const role: string | undefined = para.role;
      if (role === 'pageHeader' || role === 'pageFooter' || role === 'pageNumber') continue;
      const type: RegionType = role === 'title' || role === 'sectionHeading' ? 'heading' : 'text';
      const r = regionFromBounding(para.boundingRegions?.[0], pageMap, type, para.content || '');
      if (r) regions.push(r);
    }

    // Tables -> table region (with structure) plus an optional caption region.
    for (const table of result.tables || []) {
      const cells = (table.cells || []).map((c: any) => ({
        rowIndex: c.rowIndex,
        columnIndex: c.columnIndex,
        rowSpan: c.rowSpan,
        columnSpan: c.columnSpan,
        content: c.content || '',
      }));
      const structure: TableStructure = {
        rowCount: table.rowCount || 0,
        columnCount: table.columnCount || 0,
        cells,
      };
      const content = cells.map((c: { content: string }) => c.content).filter(Boolean).join(' | ');
      const r = regionFromBounding(table.boundingRegions?.[0], pageMap, 'table', content, structure);
      if (r) regions.push(r);
      if (table.caption?.boundingRegions?.[0]) {
        const cap = regionFromBounding(table.caption.boundingRegions[0], pageMap, 'caption', table.caption.content || '');
        if (cap) regions.push(cap);
      }
    }

    // Figures -> figure region plus an optional caption region.
    for (const figure of result.figures || []) {
      const r = regionFromBounding(figure.boundingRegions?.[0], pageMap, 'figure', figure.caption?.content || '');
      if (r) regions.push(r);
      if (figure.caption?.boundingRegions?.[0]) {
        const cap = regionFromBounding(figure.caption.boundingRegions[0], pageMap, 'caption', figure.caption.content || '');
        if (cap) regions.push(cap);
      }
    }

    return { pages, regions, raw: result };
  }
}
