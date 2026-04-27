import { motion } from 'framer-motion';
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { joinRoom } from '../store/socketManager';
import { generateNexChatKey, isValidNexChatKey } from '../utils/helpers';

function KeyEntry() {
  const { myKey, setMyKey, setMyNickname, setCurrentView } = useChatStore();
  const [inputKey, setInputKey] = useState(myKey);
  const [nickname, setNicknameLocal] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  const handleGenerateNewKey = () => {
    const newKey = generateNexChatKey();
    setInputKey(newKey);
    setMyKey(newKey);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(inputKey);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const handleProceed = () => {
    if (!isValidNexChatKey(inputKey)) {
      alert('Please enter a valid NexChat key (format: NX-XXXX-XXXX)');
      return;
    }
    if (!nickname.trim()) {
      alert('Please enter a nickname');
      return;
    }

    setMyKey(inputKey);
    setMyNickname(nickname);
    joinRoom(inputKey, nickname);
    setCurrentView('chat');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary via-secondary to-primary px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card p-8 space-y-6">
          {/* Logo/Title */}
          <motion.div
            className="text-center"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
              NexChat
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Zero-login peer-to-peer chat</p>
          </motion.div>

          {/* Key Section */}
          <motion.div
            className="space-y-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-medium text-slate-300">Your NexChat Key</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                placeholder="NX-XXXX-XXXX"
                className="input-field flex-1"
                maxLength={14}
              />
            </div>

            <div className="flex gap-2">
              <motion.button
                onClick={handleGenerateNewKey}
                className="btn-secondary flex-1 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                🔄 Generate
              </motion.button>
              <motion.button
                onClick={handleCopyKey}
                className="btn-secondary flex-1 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showCopyFeedback ? '✓ Copied!' : '📋 Copy'}
              </motion.button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Share your key with others to connect. Keep it private!
            </p>
          </motion.div>

          {/* Nickname Section */}
          <motion.div
            className="space-y-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-slate-300">Your Nickname</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNicknameLocal(e.target.value)}
              placeholder="Enter a nickname"
              className="input-field"
              maxLength={20}
            />
          </motion.div>

          {/* Proceed Button */}
          <motion.button
            onClick={handleProceed}
            className="btn-primary w-full text-lg font-medium"
            whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Enter Chat
          </motion.button>

          {/* Info */}
          <motion.div
            className="text-xs text-slate-500 text-center space-y-1 pt-4 border-t border-slate-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p>📱 Works on desktop and mobile</p>
            <p>🔐 All connections are peer-to-peer</p>
            <p>⚡ No sign-up required</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

export default KeyEntry;
