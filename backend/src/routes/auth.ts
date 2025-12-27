import { Router, Request, Response } from 'express';
import { cosmosService } from '../services/cosmosService';

const router = Router();

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  provider: string;
  createdAt?: string;
  updatedAt?: string;
}

// Create or update user
router.post('/user', async (req: Request, res: Response) => {
  try {
    const { id, email, name, image, provider } = req.body;

    if (!id || !email) {
      return res.status(400).json({ error: 'Missing required fields: id, email' });
    }

    const usersContainer = cosmosService.getUsersContainer();
    if (!usersContainer) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user already exists
    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: id }],
    };

    const { resources: existingUsers } = await usersContainer.items
      .query(query)
      .fetchAll();

    const now = new Date().toISOString();

    if (existingUsers.length > 0) {
      // Update existing user
      const existingUser = existingUsers[0];
      const updatedUser: User = {
        ...existingUser,
        name,
        image,
        provider,
        updatedAt: now,
      };

      const { resource: updated } = await usersContainer
        .item(id, email)
        .replace(updatedUser);

      return res.json(updated);
    } else {
      // Create new user
      const newUser: User = {
        id,
        email,
        name,
        image,
        provider,
        createdAt: now,
        updatedAt: now,
      };

      const { resource: created } = await usersContainer.items.create(newUser);
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Failed to create/update user' });
  }
});

// Get user by ID
router.get('/user/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const usersContainer = cosmosService.getUsersContainer();
    if (!usersContainer) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const query = {
      query: 'SELECT * FROM c WHERE c.id = @id',
      parameters: [{ name: '@id', value: id }],
    };

    const { resources: users } = await usersContainer.items.query(query).fetchAll();

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
