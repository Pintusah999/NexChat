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
    <div className="flex h-screen bg-primary">
      {/* Sidebar */}
      <motion.div
        className="w-80 border-r border-slate-700 flex flex-col"
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 space-y-2">
          <div>
            <p className="text-xs text-slate-500">Your Key</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm font-mono bg-slate-900 px-2 py-1 rounded flex-1 text-accent">
                {myKey}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(myKey)}
                className="p-2 hover:bg-slate-800 rounded transition-colors"
                title="Copy key"
              >
                📋
              </button>
            </div>
          </div>
          <p className="text-sm text-slate-400">Hello, {myNickname}!</p>
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
        <div className="p-4 border-t border-slate-700 space-y-2">
          <motion.button
            onClick={() => setShowMusicPlayer(!showMusicPlayer)}
            className={`w-full text-sm transition-all ${
              showMusicPlayer ? 'btn-primary' : 'btn-secondary'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎵 Music Player
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
            🚪 Exit
          </motion.button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {showMusicPlayer ? (
          <MusicPlayer />
        ) : selectedPeer ? (
          <>
            {/* Chat Header */}
            <motion.div
              className="p-4 border-b border-slate-700 flex justify-between items-center"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div>
                <h2 className="text-lg font-semibold">
                  {connectedPeers.get(selectedPeer)?.nickname || 'Unknown'}
                </h2>
                <p className="text-xs text-slate-500">{selectedPeer}</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleInitiateCall}
                  className="p-2 hover:bg-slate-800 rounded transition-colors"
                  whileHover={{ scale: 1.1 }}
                  title="Voice call"
                >
                  🎙️
                </motion.button>
                <motion.button
                  onClick={handleInitiateCall}
                  className="p-2 hover:bg-slate-800 rounded transition-colors"
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
              className="p-4 border-t border-slate-700"
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
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <motion.div
              className="text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <p className="text-lg">No peer selected</p>
              <p className="text-sm text-slate-500 mt-2">
                Select a peer from the sidebar to start chatting
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Call Dialog */}
      {showCallDialog && <CallDialog />}
    </div>
  );
}

export default ChatView;
