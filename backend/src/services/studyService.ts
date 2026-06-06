import { cosmosService } from './cosmosService';
import { Book, Page, Region } from '../types/study';

// Persistence for the AI Study Layer. Books are partitioned by ownerRef (the
// existing identity value: email or guest id). Pages and Regions are partitioned
// by bookId so all of a book's data lives in one partition.
//
// Process-once: a book is keyed by (ownerRef, sourceHash). If the same PDF is
// uploaded again we return the cached book instead of reprocessing.

interface PageDoc extends Page {
  id: string;
  bookId: string;
}
interface RegionDoc extends Region {
  bookId: string;
}

class StudyService {
  async findCachedBook(ownerRef: string, sourceHash: string): Promise<Book | null> {
    const container = cosmosService.getContainer('studyBooks');
    const { resources } = await container.items
      .query<Book>({
        query: 'SELECT * FROM c WHERE c.ownerRef = @owner AND c.sourceHash = @hash',
        parameters: [
          { name: '@owner', value: ownerRef },
          { name: '@hash', value: sourceHash },
        ],
      })
      .fetchAll();
    return resources[0] || null;
  }

  async saveProcessedBook(book: Book, pages: Page[], regions: Region[]): Promise<void> {
    const booksContainer = cosmosService.getContainer('studyBooks');
    const pagesContainer = cosmosService.getContainer('studyPages');
    const regionsContainer = cosmosService.getContainer('studyRegions');

    await booksContainer.items.upsert(book);

    const pageDocs: PageDoc[] = pages.map((p) => ({ ...p, id: `${book.id}:p${p.index}`, bookId: book.id }));
    await Promise.all(pageDocs.map((d) => pagesContainer.items.upsert(d)));

    const regionDocs: RegionDoc[] = regions.map((r) => ({ ...r, bookId: book.id }));
    await Promise.all(regionDocs.map((d) => regionsContainer.items.upsert(d)));
  }

  async listBooks(ownerRef: string): Promise<Book[]> {
    const container = cosmosService.getContainer('studyBooks');
    const { resources } = await container.items
      .query<Book>({
        query: 'SELECT * FROM c WHERE c.ownerRef = @owner',
        parameters: [{ name: '@owner', value: ownerRef }],
      })
      .fetchAll();
    return resources;
  }

  async getBook(bookId: string, ownerRef: string): Promise<Book | null> {
    const container = cosmosService.getContainer('studyBooks');
    try {
      const { resource } = await container.item(bookId, ownerRef).read<Book>();
      return resource || null;
    } catch {
      return null;
    }
  }

  async getPages(bookId: string): Promise<Page[]> {
    const container = cosmosService.getContainer('studyPages');
    const { resources } = await container.items
      .query<PageDoc>({
        query: 'SELECT * FROM c WHERE c.bookId = @b ORDER BY c.index',
        parameters: [{ name: '@b', value: bookId }],
      })
      .fetchAll();
    return resources;
  }

  async getRegions(bookId: string): Promise<Region[]> {
    const container = cosmosService.getContainer('studyRegions');
    const { resources } = await container.items
      .query<RegionDoc>({
        query: 'SELECT * FROM c WHERE c.bookId = @b',
        parameters: [{ name: '@b', value: bookId }],
      })
      .fetchAll();
    return resources;
  }
}

export const studyService = new StudyService();
