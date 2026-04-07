import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Mock Database
const users = [];

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });
  
  const user = { id: uuidv4(), email, name, password };
  users.push(user);
  res.json({ token: `mock-token-${user.id}`, user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: `mock-token-${user.id}`, user: { id: user.id, email: user.email, name: user.name } });
});

app.get('/api/user/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !token.startsWith('mock-token-')) return res.status(401).json({ error: 'Unauthorized' });
  const userId = token.replace('mock-token-', '');
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, name: user.name });
});

// Analyze Route
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    const { location } = req.body;
    const file = req.file;

    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return detailed mockup response
    res.json({
      status: 'Analysis Complete',
      insights: [
        `Detected location context: ${location || 'Unknown'}`,
        `Image processed successfully (${file?.mimetype || 'image/jpeg'})`,
        'Structural integrity appears stable based on visual markers.',
        'Stage estimation: Foundation & framing completed.',
        'Valuation index: 94% alignment with blueprint.'
      ]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});