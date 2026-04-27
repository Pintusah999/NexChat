import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';

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
  const clientPath = path.join(__dirname, '../client');
  app.use(express.static(clientPath));
} else {
  // Local dev static path (relative to server/index.ts)
  const clientPath = path.join(__dirname, '../dist/client');
  app.use(express.static(clientPath));
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

/**
 * API endpoint to search YouTube videos
 */
app.get('/api/search', (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  ytSearch(query)
    .then((results) => {
      const videos = results.videos.slice(0, 10).map((v) => ({
        title: v.title,
        url: v.url,
        duration: v.seconds,
        thumbnail: v.thumbnail,
        author: v.author.name,
      }));
      res.json(videos);
    })
    .catch((error) => {
      console.error('[Search] YouTube search error:', error);
      res.status(500).json({ error: 'Failed to search YouTube' });
    });
});

/**
 * Curated romantic playlists by mood
 */
const CURATED_SONGS: Record<string, Array<{title: string; url: string; duration: number; thumbnail: string; author: string}>> = {
  romantic: [
    { title: 'Perfect - Ed Sheeran', url: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g', duration: 263, thumbnail: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg', author: 'Ed Sheeran' },
    { title: 'All of Me - John Legend', url: 'https://www.youtube.com/watch?v=450p7goxZqg', duration: 269, thumbnail: 'https://i.ytimg.com/vi/450p7goxZqg/hqdefault.jpg', author: 'John Legend' },
    { title: 'Thinking Out Loud - Ed Sheeran', url: 'https://www.youtube.com/watch?v=lp-EO5I60KA', duration: 281, thumbnail: 'https://i.ytimg.com/vi/lp-EO5I60KA/hqdefault.jpg', author: 'Ed Sheeran' },
    { title: 'A Thousand Years - Christina Perri', url: 'https://www.youtube.com/watch?v=rtOvBOTyX00', duration: 285, thumbnail: 'https://i.ytimg.com/vi/rtOvBOTyX00/hqdefault.jpg', author: 'Christina Perri' },
    { title: 'Can\'t Help Falling In Love - Elvis Presley', url: 'https://www.youtube.com/watch?v=vGJTaP6anOU', duration: 182, thumbnail: 'https://i.ytimg.com/vi/vGJTaP6anOU/hqdefault.jpg', author: 'Elvis Presley' },
    { title: 'My Heart Will Go On - Celine Dion', url: 'https://www.youtube.com/watch?v=WNIPqafd4As', duration: 279, thumbnail: 'https://i.ytimg.com/vi/WNIPqafd4As/hqdefault.jpg', author: 'Celine Dion' },
    { title: 'Latch - Sam Smith', url: 'https://www.youtube.com/watch?v=qf3IT5mNIqA', duration: 203, thumbnail: 'https://i.ytimg.com/vi/qf3IT5mNIqA/hqdefault.jpg', author: 'Sam Smith' },
    { title: 'Make You Feel My Love - Adele', url: 'https://www.youtube.com/watch?v=0put0_a--Ng', duration: 214, thumbnail: 'https://i.ytimg.com/vi/0put0_a--Ng/hqdefault.jpg', author: 'Adele' },
  ],
  bollywood: [
    { title: 'Tujhe Dekha To - DDLJ', url: 'https://www.youtube.com/watch?v=_lzLaC4l1aw', duration: 320, thumbnail: 'https://i.ytimg.com/vi/_lzLaC4l1aw/hqdefault.jpg', author: 'Kumar Sanu' },
    { title: 'Pehla Nasha - Jo Jeeta Wohi Sikandar', url: 'https://www.youtube.com/watch?v=k0AUQ0HQCTs', duration: 348, thumbnail: 'https://i.ytimg.com/vi/k0AUQ0HQCTs/hqdefault.jpg', author: 'Udit Narayan' },
    { title: 'Raabta - Agent Sai Srinivasa', url: 'https://www.youtube.com/watch?v=a-yx-ux7VHo', duration: 263, thumbnail: 'https://i.ytimg.com/vi/a-yx-ux7VHo/hqdefault.jpg', author: 'Arijit Singh' },
    { title: 'Tum Hi Ho - Aashiqui 2', url: 'https://www.youtube.com/watch?v=Umqb9KENgmk', duration: 268, thumbnail: 'https://i.ytimg.com/vi/Umqb9KENgmk/hqdefault.jpg', author: 'Arijit Singh' },
    { title: 'Kal Ho Naa Ho - Kal Ho Naa Ho', url: 'https://www.youtube.com/watch?v=3n1hFQSBZ7I', duration: 312, thumbnail: 'https://i.ytimg.com/vi/3n1hFQSBZ7I/hqdefault.jpg', author: 'Sonu Nigam' },
    { title: 'Gerua - Dilwale', url: 'https://www.youtube.com/watch?v=AEIVhBS6baE', duration: 291, thumbnail: 'https://i.ytimg.com/vi/AEIVhBS6baE/hqdefault.jpg', author: 'Arijit Singh' },
    { title: 'Channa Mereya - Ae Dil Hai Mushkil', url: 'https://www.youtube.com/watch?v=zahrUGJQQF4', duration: 294, thumbnail: 'https://i.ytimg.com/vi/zahrUGJQQF4/hqdefault.jpg', author: 'Arijit Singh' },
    { title: 'Tera Ban Jaunga - Kabir Singh', url: 'https://www.youtube.com/watch?v=LFBT8OJyNfY', duration: 262, thumbnail: 'https://i.ytimg.com/vi/LFBT8OJyNfY/hqdefault.jpg', author: 'Akhil Sachdeva' },
  ],
  english: [
    { title: 'Shape of You - Ed Sheeran', url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8', duration: 234, thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', author: 'Ed Sheeran' },
    { title: 'Lover - Taylor Swift', url: 'https://www.youtube.com/watch?v=is7vn5URVcc', duration: 221, thumbnail: 'https://i.ytimg.com/vi/is7vn5URVcc/hqdefault.jpg', author: 'Taylor Swift' },
    { title: 'Stay With Me - Sam Smith', url: 'https://www.youtube.com/watch?v=pB-5XG-DbAA', duration: 172, thumbnail: 'https://i.ytimg.com/vi/pB-5XG-DbAA/hqdefault.jpg', author: 'Sam Smith' },
    { title: 'Say You Won\'t Let Go - James Arthur', url: 'https://www.youtube.com/watch?v=0yW7w8F2TVA', duration: 211, thumbnail: 'https://i.ytimg.com/vi/0yW7w8F2TVA/hqdefault.jpg', author: 'James Arthur' },
    { title: 'Marry You - Bruno Mars', url: 'https://www.youtube.com/watch?v=dElRVQFqj-k', duration: 230, thumbnail: 'https://i.ytimg.com/vi/dElRVQFqj-k/hqdefault.jpg', author: 'Bruno Mars' },
    { title: 'Love Story - Taylor Swift', url: 'https://www.youtube.com/watch?v=8xg3vE8Ie_E', duration: 235, thumbnail: 'https://i.ytimg.com/vi/8xg3vE8Ie_E/hqdefault.jpg', author: 'Taylor Swift' },
    { title: 'Speechless - Dan + Shay', url: 'https://www.youtube.com/watch?v=gF00bFCACxU', duration: 204, thumbnail: 'https://i.ytimg.com/vi/gF00bFCACxU/hqdefault.jpg', author: 'Dan + Shay' },
    { title: 'Better Together - Jack Johnson', url: 'https://www.youtube.com/watch?v=u57d4_b_YgI', duration: 207, thumbnail: 'https://i.ytimg.com/vi/u57d4_b_YgI/hqdefault.jpg', author: 'Jack Johnson' },
  ],
  chill: [
    { title: 'Die With A Smile - Lady Gaga & Bruno Mars', url: 'https://www.youtube.com/watch?v=kPa7bsKwL-c', duration: 251, thumbnail: 'https://i.ytimg.com/vi/kPa7bsKwL-c/hqdefault.jpg', author: 'Lady Gaga & Bruno Mars' },
    { title: 'Golden Hour - JVKE', url: 'https://www.youtube.com/watch?v=PEM0kvsOhmg', duration: 210, thumbnail: 'https://i.ytimg.com/vi/PEM0kvsOhmg/hqdefault.jpg', author: 'JVKE' },
    { title: 'From The Start - Laufey', url: 'https://www.youtube.com/watch?v=wNXnjDFNkeE', duration: 183, thumbnail: 'https://i.ytimg.com/vi/wNXnjDFNkeE/hqdefault.jpg', author: 'Laufey' },
    { title: 'Enchanted - Taylor Swift', url: 'https://www.youtube.com/watch?v=4yKO4Ei1RtA', duration: 352, thumbnail: 'https://i.ytimg.com/vi/4yKO4Ei1RtA/hqdefault.jpg', author: 'Taylor Swift' },
    { title: 'Budapest - George Ezra', url: 'https://www.youtube.com/watch?v=VHrLPs3_1Fs', duration: 198, thumbnail: 'https://i.ytimg.com/vi/VHrLPs3_1Fs/hqdefault.jpg', author: 'George Ezra' },
    { title: 'Wildest Dreams - Taylor Swift', url: 'https://www.youtube.com/watch?v=IdneKLhsWOQ', duration: 220, thumbnail: 'https://i.ytimg.com/vi/IdneKLhsWOQ/hqdefault.jpg', author: 'Taylor Swift' },
    { title: 'Bloom - The Paper Kites', url: 'https://www.youtube.com/watch?v=jcuTHoNQaAc', duration: 218, thumbnail: 'https://i.ytimg.com/vi/jcuTHoNQaAc/hqdefault.jpg', author: 'The Paper Kites' },
    { title: 'Oceans - Hillsong United', url: 'https://www.youtube.com/watch?v=dy9nwe9bAPo', duration: 528, thumbnail: 'https://i.ytimg.com/vi/dy9nwe9bAPo/hqdefault.jpg', author: 'Hillsong United' },
  ],
};

/**
 * API endpoint to get romantic song recommendations
 */
app.get('/api/recommendations', (_req, res) => {
  const mood = (_req.query.mood as string) || 'romantic';

  // Return curated songs, shuffled for variety
  const curated = CURATED_SONGS[mood] || CURATED_SONGS['romantic'];
  const shuffled = [...curated].sort(() => Math.random() - 0.5);

  res.json(shuffled);
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// Serve index.html for SPA routing
app.get('*', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../client/index.html'));
  } else {
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
