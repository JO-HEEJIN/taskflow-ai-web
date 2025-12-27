import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

class BlobService {
  private containerClient: ContainerClient;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'task-images';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  /**
   * Upload an image to Azure Blob Storage
   * @param buffer - Image buffer
   * @param mimeType - MIME type (e.g., 'image/png', 'image/jpeg')
   * @param userId - User ID for organizing images
   * @returns Public URL of the uploaded image
   */
  async uploadImage(buffer: Buffer, mimeType: string, userId: string): Promise<string> {
    const extension = this.getExtensionFromMimeType(mimeType);
    const blobName = `${userId}/${uuidv4()}${extension}`;

    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: mimeType,
      },
    });

    // Return the public URL
    return blockBlobClient.url;
  }

  /**
   * Delete an image from Azure Blob Storage
   * @param blobName - Name of the blob (relative path)
   */
  async deleteImage(blobName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeMap: { [key: string]: string } = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
    };

    return mimeMap[mimeType] || '.jpg';
  }
}

export const blobService = new BlobService();
