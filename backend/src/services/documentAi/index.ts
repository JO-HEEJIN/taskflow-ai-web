import { DocumentAiProvider } from './types';
import { AzureDocumentIntelligence } from './azureDocumentIntelligence';

// Provider seam. Selected by env so we can swap to Google or a self-hosted
// provider (Surya/PaddleOCR) later without changing callers. Defaults to Azure.
let provider: DocumentAiProvider | null = null;

export function getDocumentAiProvider(): DocumentAiProvider {
  if (provider) return provider;
  const which = (process.env.DOCUMENT_AI_PROVIDER || 'azure').toLowerCase();
  switch (which) {
    case 'azure':
      provider = new AzureDocumentIntelligence();
      break;
    default:
      throw new Error(`Unknown DOCUMENT_AI_PROVIDER: ${which}`);
  }
  return provider;
}

export type { DocumentAiProvider, DocumentLayout } from './types';
