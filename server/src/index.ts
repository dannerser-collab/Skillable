import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../../shared/types.ts';

const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, referee: process.env.GEMINI_API_KEY ? 'gemini' : 'local' });
});

const httpServer = createServer(app);

export const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  { cors: { origin: '*' } },
);

httpServer.listen(PORT, () => {
  console.log(`[skillable] server listo en http://localhost:${PORT}`);
});
