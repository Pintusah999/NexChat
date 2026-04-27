import { create } from 'zustand';
import { generateNexChatKey, isValidNexChatKey } from '../utils/helpers';

export interface Message {
  id: string;
  from: string;
  fromKey: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'media';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface Peer {
  key: string;
  nickname: string;
  status: 'connecting' | 'connected' | 'disconnected';
  lastSeen: number;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface Track {
  id: string;
  name: string;
  url: string;
  duration: number;
  uploadedBy: string;
  uploadedAt: number;
}

export interface MusicState {
  currentTrack: Track | null;
  playlist: Track[];
  isPlaying: boolean;
  currentTime: number;
  volume: number;
}

interface ChatStore {
  // Local user
  myKey: string;
  myNickname: string;
  connectedPeers: Map<string, Peer>;
  messages: Message[];
  
  // UI state
  currentView: 'key-entry' | 'chat' | 'call' | 'media-watch';
  selectedPeer: string | null;
  showSettings: boolean;
  showCallDialog: boolean;
  
  // Media state
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  
  // Music state
  musicState: MusicState;
  
  // Actions
  initializeUser: () => void;
  setMyKey: (key: string) => void;
  setMyNickname: (nickname: string) => void;
  addPeer: (peer: Peer) => void;
  removePeer: (key: string) => void;
  updatePeerStatus: (key: string, status: Peer['status']) => void;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  setCurrentView: (view: ChatStore['currentView']) => void;
  setSelectedPeer: (key: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowCallDialog: (show: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (key: string, stream: MediaStream) => void;
  removeRemoteStream: (key: string) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setMusicState: (state: Partial<MusicState>) => void;
  addTrackToPlaylist: (track: Track) => void;
  removeTrackFromPlaylist: (trackId: string) => void;
  clearPlaylist: () => void;
  reset: () => void;
}

const initialState = {
  myKey: '',
  myNickname: 'Anonymous',
  connectedPeers: new Map<string, Peer>(),
  messages: [] as Message[],
  currentView: 'key-entry' as const,
  selectedPeer: null,
  showSettings: false,
  showCallDialog: false,
  localStream: null,
  remoteStreams: new Map<string, MediaStream>(),
  audioEnabled: false,
  videoEnabled: false,
  screenSharing: false,
  musicState: {
    currentTrack: null,
    playlist: [],
    isPlaying: false,
    currentTime: 0,
    volume: 1,
  },
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  initializeUser: () => {
    set((state) => {
      if (state.myKey === '') {
        return {
          myKey: generateNexChatKey(),
          currentView: 'key-entry' as const,
        };
      }
      return {};
    });
  },

  setMyKey: (key: string) => {
    if (isValidNexChatKey(key)) {
      set({ myKey: key });
    }
  },

  setMyNickname: (nickname: string) => {
    set({ myNickname: nickname.trim() || 'Anonymous' });
  },

  addPeer: (peer: Peer) => {
    set((state) => {
      const newPeers = new Map(state.connectedPeers);
      newPeers.set(peer.key, peer);
      return { connectedPeers: newPeers };
    });
  },

  removePeer: (key: string) => {
    set((state) => {
      const newPeers = new Map(state.connectedPeers);
      newPeers.delete(key);
      return { connectedPeers: newPeers };
    });
  },

  updatePeerStatus: (key: string, status: Peer['status']) => {
    set((state) => {
      const newPeers = new Map(state.connectedPeers);
      const peer = newPeers.get(key);
      if (peer) {
        newPeers.set(key, { ...peer, status, lastSeen: Date.now() });
      }
      return { connectedPeers: newPeers };
    });
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setCurrentView: (view: ChatStore['currentView']) => {
    set({ currentView: view });
  },

  setSelectedPeer: (key: string | null) => {
    set({ selectedPeer: key });
  },

  setShowSettings: (show: boolean) => {
    set({ showSettings: show });
  },

  setShowCallDialog: (show: boolean) => {
    set({ showCallDialog: show });
  },

  setLocalStream: (stream: MediaStream | null) => {
    set({ localStream: stream });
  },

  addRemoteStream: (key: string, stream: MediaStream) => {
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.set(key, stream);
      return { remoteStreams: newStreams };
    });
  },

  removeRemoteStream: (key: string) => {
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      newStreams.delete(key);
      return { remoteStreams: newStreams };
    });
  },

  toggleAudio: () => {
    set((state) => ({ audioEnabled: !state.audioEnabled }));
  },

  toggleVideo: () => {
    set((state) => ({ videoEnabled: !state.videoEnabled }));
  },

  toggleScreenShare: () => {
    set((state) => ({ screenSharing: !state.screenSharing }));
  },

  setMusicState: (state: Partial<MusicState>) => {
    set((current) => ({
      musicState: { ...current.musicState, ...state },
    }));
  },

  addTrackToPlaylist: (track: Track) => {
    set((state) => ({
      musicState: {
        ...state.musicState,
        playlist: [...state.musicState.playlist, track],
      },
    }));
  },

  removeTrackFromPlaylist: (trackId: string) => {
    set((state) => ({
      musicState: {
        ...state.musicState,
        playlist: state.musicState.playlist.filter((t) => t.id !== trackId),
      },
    }));
  },

  clearPlaylist: () => {
    set((state) => ({
      musicState: {
        ...state.musicState,
        playlist: [],
        currentTrack: null,
        isPlaying: false,
      },
    }));
  },

  reset: () => {
    set(initialState);
  },
}));
