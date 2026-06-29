import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { applySecurityMiddleware, corsOptions, handleErrors } from './security.js';
import authRoutes from './auth.js';
import taskRoutes from './routes.js';

const PORT = Number(process.env.API_PORT) || 14365;
const app = express();

applySecurityMiddleware(app);
app.use(cors(corsOptions()));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'softius-tasks-api' });
});

app.use(authRoutes);
app.use(taskRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.use(handleErrors);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер on!`);
});
