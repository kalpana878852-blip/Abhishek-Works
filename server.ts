import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import api from './src/server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Mount API routes
app.use(api);

// Serve static frontend in production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AEW ERP Production Server running on port ${PORT}`);
});
