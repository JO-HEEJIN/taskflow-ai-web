import { Router, Request, Response } from 'express';
import multer from 'multer';
import { blobService } from '../services/blobService';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload image endpoint
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing x-user-id header' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('📤 Uploading image:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      userId,
    });

    const imageUrl = await blobService.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      userId
    );

    console.log('✅ Image uploaded successfully:', imageUrl);

    res.json({ imageUrl });
  } catch (error: any) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

export default router;
