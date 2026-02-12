import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './modules/users/user.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import { requestLogger } from './middleware/logger.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
