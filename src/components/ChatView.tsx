import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useChatStore } from '../store/chatStore';
import { disconnectSocket, leaveRoom, sendMessage } from '../store/socketManager';
import CallDialog from './CallDialog';
import MessageList from './MessageList';
import MusicPlayer from './MusicPlayer';
import PeerList from './PeerList';

function ChatView() {
  const {
    myKey,
    myNickname,
    connectedPeers,
    messages,
    selectedPeer,
    showCallDialog,
    setSelectedPeer,
    setShowCallDialog,
    addMessage,
    setCurrentView,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<typeof messages>([]);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  // Filter messages for selected peer
  useEffect(() => {
    if (selectedPeer) {
      const peerMessages = messages.filter(
        (msg) =>
          (msg.fromKey === selectedPeer && msg.to === myKey) ||
          (msg.fromKey === myKey && msg.to === selectedPeer)
      );
      setFilteredMessages(peerMessages);
    } else {
      setFilteredMessages(messages);
    }

    // Scroll to bottom
    setTimeout(() => {
      messageListRef.current?.scrollTo(0, messageListRef.current.scrollHeight);
    }, 0);
  }, [messages, selectedPeer, myKey]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    if (!selectedPeer) {
      alert('Please select a peer to message');
      return;
    }

    const message = {
      id: uuidv4(),
      from: myNickname,
      fromKey: myKey,
      to: selectedPeer,
      content: messageInput,
      timestamp: Date.now(),
      type: 'text' as const,
    };

    addMessage(message);
    sendMessage(selectedPeer, messageInput);
    setMessageInput('');
  };

  const handleLogout = () => {
    if (confirm('Exit NexChat?')) {
      leaveRoom();
      disconnectSocket();
      setCurrentView('key-entry');
    }
  };

  const handleInitiateCall = () => {
    if (!selectedPeer) {
      alert('Please select a peer to call');
      return;
    }
    setShowCallDialog(true);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-primary">
      {/* Sidebar */}
      <motion.div
        className="w-full md:w-80 border-b md:border-b-0 md:border-r border-pink-100 bg-rose-50/50 backdrop-blur-sm flex flex-col z-30"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-pink-100 space-y-2">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Your Connection Key</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono bg-pink-100 px-3 py-1.5 rounded-lg flex-1 text-accent font-semibold border border-pink-200">
                {myKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(myKey)}
                className="p-2 hover:bg-pink-100 rounded-lg transition-colors text-slate-500"
                title="Copy key"
              >
                📋
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-700 font-bold mt-2">Welcome, {myNickname} 💕</p>
        </div>

        {/* Peers List */}
        <div className="flex-1 overflow-y-auto">
          <PeerList
            peers={connectedPeers}
            selectedPeer={selectedPeer}
            onSelectPeer={setSelectedPeer}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-pink-100 space-y-2">
          <motion.button
            onClick={() => setShowMusicPlayer(!showMusicPlayer)}
            className={`w-full text-sm transition-all ${
              showMusicPlayer ? 'btn-primary' : 'btn-secondary'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Play Music 🎵
          </motion.button>
          <motion.button
            onClick={handleInitiateCall}
            className="btn-primary w-full text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📞 Start Call
          </motion.button>
          <motion.button
            onClick={handleLogout}
            className="btn-secondary w-full text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Leave Space 🚪
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {selectedPeer ? (
          <>
            {/* Chat Header */}
            <motion.div
              className="p-4 border-b border-pink-100 bg-white/60 backdrop-blur-md flex justify-between items-center shadow-sm z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {connectedPeers.get(selectedPeer)?.nickname || 'Unknown'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">{selectedPeer}</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleInitiateCall}
                  className="p-2 hover:bg-pink-100 rounded-xl transition-colors"
                  whileHover={{ scale: 1.1 }}
                  title="Voice call"
                >
                  🎙️
                </motion.button>
                <motion.button
                  onClick={handleInitiateCall}
                  className="p-2 hover:bg-pink-100 rounded-xl transition-colors"
                  whileHover={{ scale: 1.1 }}
                  title="Video call"
                >
                  📹
                </motion.button>
              </div>
            </motion.div>

            {/* Messages */}
            <div
              ref={messageListRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              <MessageList messages={filteredMessages} myKey={myKey} />
            </div>

            {/* Message Input */}
            <motion.div
              className="p-4 border-t border-pink-100 bg-white/60 backdrop-blur-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                />
                <motion.button
                  onClick={handleSendMessage}
                  className="btn-primary px-6"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send
                </motion.button>
              </div>
            </motion.div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 bg-rose-50/30">
            <motion.div
              className="text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-2xl font-bold text-slate-700">Ready to connect 💕</p>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Select your partner from the sidebar to start chatting
              </p>
            </motion.div>
          </div>
        )}

        {/* Floating Music Player */}
        {showMusicPlayer && (
          <motion.div
            className="fixed md:absolute top-4 bottom-4 md:bottom-auto right-4 left-4 md:left-auto md:w-[400px] md:h-[650px] md:max-h-[calc(100vh-2rem)] bg-white/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(255,77,109,0.3)] border border-white flex flex-col z-[70] overflow-hidden"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header for Floating UI */}
            <div className="p-4 bg-gradient-to-r from-accent to-accent-light flex justify-between items-center text-white shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎵</span>
                <span className="font-bold tracking-tight">Our Playlist</span>
              </div>
              <button
                onClick={() => setShowMusicPlayer(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MusicPlayer />
            </div>
          </motion.div>
        )}
      </div>

      {/* Right Side Action Bar (Floating Buttons) */}
      <motion.div
        className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 flex-col gap-3 z-[60]"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <motion.button
          onClick={() => setShowMusicPlayer(!showMusicPlayer)}
          className={`w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center text-xl transition-all ${
            showMusicPlayer ? 'bg-accent text-white' : 'bg-white text-accent border border-pink-100'
          }`}
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          title="Music Player"
        >
          🎵
        </motion.button>
        <motion.button
          onClick={handleInitiateCall}
          className="w-12 h-12 bg-white text-accent border border-pink-100 rounded-2xl shadow-lg flex items-center justify-center text-xl"
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          title="Start Call"
        >
          📞
        </motion.button>
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-white text-slate-500 border border-slate-100 rounded-2xl shadow-lg flex items-center justify-center text-xl"
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          title="Scroll to Top"
        >
          🔝
        </motion.button>
      </motion.div>

      {/* Call Dialog */}
      {showCallDialog && <CallDialog />}
    </div>
  );
}

export default ChatView;
