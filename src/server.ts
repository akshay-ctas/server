import 'dotenv/config';

import type { Request, Response, NextFunction } from 'express';
import app from './app.js';
import logger from './config/logger.js';
import { connectDB } from './config/database.js';

const PORT = Number(process.env.PORT || 3000);

connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors: string[] = [];

  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'VALIDATION_ERROR') {
      return res.status(status).json(parsed);
    }
  } catch {}

  res.status(status).json({ message, errors });
});
