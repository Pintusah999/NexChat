import { io, Socket } from 'socket.io-client';
import { useChatStore } from './chatStore';

let socket: Socket | null = null;

/**
 * Initialize Socket.IO connection to signaling server
 */
export function initializeSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = (import.meta.env.VITE_BACKEND_URL as string) || 
    ((import.meta.env.PROD as boolean)
    ? window.location.origin
    : 'http://localhost:3000');

  socket = io(socketUrl, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  setupSocketListeners();
  return socket;
}

/**
 * Setup socket event listeners
 */
function setupSocketListeners() {
  if (!socket) return;

  socket.on('connect', () => {
    console.log('Connected to signaling server');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from signaling server');
  });

  socket.on('peer-joined', (data: { key: string; nickname: string }) => {
    const store = useChatStore.getState();
    store.addPeer({
      key: data.key,
      nickname: data.nickname,
      status: 'connecting',
      lastSeen: Date.now(),
      hasAudio: false,
      hasVideo: false,
    });
  });

  socket.on('peer-left', (data: { key: string }) => {
    const store = useChatStore.getState();
    store.removePeer(data.key);
    store.removeRemoteStream(data.key);
  });

  socket.on('signal', (data: any) => {
    // Handle WebRTC signaling
    window.dispatchEvent(
      new CustomEvent('rtc-signal', { detail: data })
    );
  });

  socket.on('message', (data: any) => {
    const store = useChatStore.getState();
    store.addMessage({
      id: data.id,
      from: data.from,
      fromKey: data.fromKey,
      to: data.to,
      content: data.content,
      timestamp: data.timestamp,
      type: 'text',
    });
  });
}

/**
 * Join a chat room with a key
 */
export function joinRoom(key: string, nickname: string): void {
  if (!socket) {
    initializeSocket();
  }
  socket?.emit('join', { key, nickname });
}

/**
 * Leave the chat room
 */
export function leaveRoom(): void {
  socket?.emit('leave');
}

/**
 * Send a text message
 */
export function sendMessage(to: string, content: string): void {
  socket?.emit('message', { to, content });
}

/**
 * Send WebRTC signal
 */
export function sendSignal(to: string, signal: any): void {
  socket?.emit('signal', { to, signal });
}

/**
 * Get socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
