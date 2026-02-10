import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import eventsRouter from './routes/events';
import * as storage from './services/storageService';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true, // Allow all origins for ngrok
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware - Allow all CORS for ngrok
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/events', eventsRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-event', (eventId: string) => {
    socket.join(eventId);
    console.log(`Socket ${socket.id} joined event ${eventId}`);
  });

  socket.on('leave-event', (eventId: string) => {
    socket.leave(eventId);
    console.log(`Socket ${socket.id} left event ${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast helper for services to use
export function broadcastEventUpdate(eventId: string, event: any) {
  io.to(eventId).emit('event-updated', event);
}

export function broadcastPlayerJoined(eventId: string, player: any) {
  io.to(eventId).emit('player-joined', player);
}

// Cleanup old events every hour
setInterval(async () => {
  console.log('Running cleanup of old events...');
  await storage.cleanupOldEvents();
}, 60 * 60 * 1000);

// Start server (listen on all network interfaces)
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MTG Sealed Event Server running on port ${PORT}`);
  console.log(`   - API: http://localhost:${PORT}/api`);
  console.log(`   - WebSocket: ws://localhost:${PORT}`);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`   - Frontend (dev): http://localhost:5173`);
  }

  console.log('\nShare with friends:');
  console.log('   1. Find your local IP: ipconfig (Windows) or ifconfig (Mac/Linux)');
  console.log('   2. Share: http://YOUR_IP:5173 (dev) or http://YOUR_IP:3001 (prod)');
});

export { io };
