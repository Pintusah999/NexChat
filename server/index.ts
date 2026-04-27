import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist/client')));
}

// Store active connections
interface UserSession {
  id: string;
  key: string;
  nickname: string;
  socketId: string;
  connectedPeers: Set<string>;
}

const userSessions = new Map<string, UserSession>();
const keyRooms = new Map<string, Set<string>>();

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`[Socket] New connection: ${socket.id}`);

  /**
   * User joins a chat room with their key
   */
  socket.on('join', (data: { key: string; nickname: string }) => {
    const { key, nickname } = data;

    // Validate key format (NX-XXXX-XXXX)
    if (!isValidKey(key)) {
      socket.emit('error', 'Invalid key format');
      return;
    }

    // Create user session
    const userSession: UserSession = {
      id: socket.id,
      key,
      nickname,
      socketId: socket.id,
      connectedPeers: new Set(),
    };

    userSessions.set(socket.id, userSession);

    // Add to room
    socket.join(key);

    // Track room membership
    if (!keyRooms.has(key)) {
      keyRooms.set(key, new Set());
    }
    keyRooms.get(key)!.add(socket.id);

    // Get all other users in the room
    const roomUsers = Array.from(keyRooms.get(key) || [])
      .filter((id) => id !== socket.id)
      .map((id) => {
        const user = userSessions.get(id);
        return user ? { key: user.key, nickname: user.nickname } : null;
      })
      .filter(Boolean);

    // Notify others that a new peer joined
    socket.to(key).emit('peer-joined', {
      key,
      nickname,
      socketId: socket.id,
    });

    // Send all existing peers to the new user
    socket.emit('peers-list', roomUsers);

    console.log(`[Join] User ${nickname} (${key}) joined. Room size: ${keyRooms.get(key)?.size}`);
  });

  /**
   * User leaves the room
   */
  socket.on('leave', () => {
    const user = userSessions.get(socket.id);
    if (!user) return;

    // Remove from room
    const room = keyRooms.get(user.key);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        keyRooms.delete(user.key);
      }
    }

    // Notify others
    socket.to(user.key).emit('peer-left', { key: user.key, socketId: socket.id });

    // Clean up
    userSessions.delete(socket.id);
    socket.leave(user.key);

    console.log(`[Leave] User ${user.nickname} (${user.key}) left`);
  });

  /**
   * Handle text messages
   */
  socket.on('message', (data: { to: string; content: string }) => {
    const sender = userSessions.get(socket.id);
    if (!sender) return;

    const message = {
      id: generateId(),
      from: sender.nickname,
      fromKey: sender.key,
      to: data.to,
      content: data.content,
      timestamp: Date.now(),
    };

    // Find recipient socket
    const recipientSocket = Array.from(userSessions.values()).find(
      (user) => user.key === data.to
    );

    if (recipientSocket) {
      io.to(recipientSocket.socketId).emit('message', message);
    }
  });

  /**
   * Handle WebRTC signaling
   */
  socket.on('signal', (data: { to: string; signal: any }) => {
    const sender = userSessions.get(socket.id);
    if (!sender) return;

    // Find recipient
    const recipientSocket = Array.from(userSessions.values()).find(
      (user) => user.key === data.to
    );

    if (recipientSocket) {
      io.to(recipientSocket.socketId).emit('signal', {
        from: sender.key,
        from_nickname: sender.nickname,
        signal: data.signal,
      });
    }
  });

  /**
   * User disconnects
   */
  socket.on('disconnect', () => {
    const user = userSessions.get(socket.id);
    if (user) {
      const room = keyRooms.get(user.key);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          keyRooms.delete(user.key);
        }
      }

      // Notify others that peer disconnected
      socket.to(user.key).emit('peer-left', { key: user.key, socketId: socket.id });

      userSessions.delete(socket.id);
      console.log(`[Disconnect] User ${user.nickname} (${user.key}) disconnected`);
    }
  });

  /**
   * Handle connection errors
   */
  socket.on('error', (error: any) => {
    console.error(`[Error] Socket ${socket.id}:`, error);
  });
});

/**
 * Validate NexChat key format
 */
function isValidKey(key: string): boolean {
  const pattern = /^NX-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

/**
 * API endpoint to get room stats
 */
app.get('/api/stats', (_req, res) => {
  const stats = {
    totalConnections: io.engine.clientsCount,
    totalRooms: keyRooms.size,
    rooms: Array.from(keyRooms.entries()).map(([key, sockets]) => ({
      key,
      userCount: sockets.size,
    })),
  };
  res.json(stats);
});

// Serve index.html for SPA routing in production
app.get('*', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../dist/client/index.html'));
  }
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 NexChat Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default httpServer;
