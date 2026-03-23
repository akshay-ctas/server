import 'dotenv/config';
import type { Request, Response, NextFunction } from 'express';
import { app, httpServer } from './app.js';
import logger from './config/logger.js';
import { connectDB } from './config/database.js';

const PORT = Number(process.env.PORT || 5000);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'VALIDATION_ERROR') {
      return res.status(status).json(parsed);
    }
  } catch {}

  res.status(status).json({ message, errors: [] });
});

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});
