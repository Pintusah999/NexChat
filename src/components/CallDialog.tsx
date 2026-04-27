import { motion } from 'framer-motion';
import { useState } from 'react';
import { useChatStore } from '../store/chatStore';

function CallDialog() {
  const { selectedPeer, connectedPeers, setShowCallDialog, setCurrentView } = useChatStore();
  const [callType, setCallType] = useState<'voice' | 'video'>('video');

  const peerName = connectedPeers.get(selectedPeer || '')?.nickname || 'Unknown';

  const handleInitiateCall = (_type: 'voice' | 'video') => {
    // Store call type in a more accessible way if needed
    setShowCallDialog(false);
    setCurrentView('call');
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="card p-8 max-w-sm w-full mx-4"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
      >
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Call Your Partner</h2>
        <p className="text-slate-500 mb-6 font-medium">
          Connect with <span className="font-semibold text-accent">{peerName}</span> 💕
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <motion.button
            onClick={() => {
              setCallType('voice');
              handleInitiateCall('voice');
            }}
            className={`p-4 rounded-2xl border-2 transition-all ${
              callType === 'voice'
                ? 'border-accent bg-accent/10 shadow-soft'
                : 'border-pink-100 hover:border-pink-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-2xl mb-1">🎙️</div>
            <p className={`text-sm font-bold ${callType === 'voice' ? 'text-accent' : 'text-slate-500'}`}>Voice</p>
          </motion.button>

          <motion.button
            onClick={() => {
              setCallType('video');
              handleInitiateCall('video');
            }}
            className={`p-4 rounded-2xl border-2 transition-all ${
              callType === 'video'
                ? 'border-accent bg-accent/10 shadow-soft'
                : 'border-pink-100 hover:border-pink-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="text-2xl mb-1">📹</div>
            <p className={`text-sm font-bold ${callType === 'video' ? 'text-accent' : 'text-slate-500'}`}>Video</p>
          </motion.button>
        </div>

        <div className="flex gap-3">
          <motion.button
            onClick={() => setShowCallDialog(false)}
            className="btn-secondary flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={() => handleInitiateCall(callType)}
            className="btn-primary flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Call
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default CallDialog;
