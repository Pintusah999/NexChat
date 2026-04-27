import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';

function IncomingCallDialog() {
  const {
    incomingCall,
    clearIncomingCall,
    setCurrentView,
    setSelectedPeer,
  } = useChatStore();

  if (!incomingCall) return null;

  const handleAccept = () => {
    // Set up state for the incoming call
    useChatStore.setState({
      videoEnabled: incomingCall.isVideo,
      audioEnabled: true,
    });
    setSelectedPeer(incomingCall.from);
    setCurrentView('call');
    // Keep incomingCall state so CallView knows it's a receiver
  };

  const handleDecline = () => {
    clearIncomingCall();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="card p-8 max-w-sm w-full mx-4 text-center"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
      >
        <motion.div 
          className="text-4xl mb-4"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {incomingCall.isVideo ? '📹' : '📞'}
        </motion.div>
        <h2 className="text-2xl font-bold mb-2 text-slate-800">Your Partner is Calling</h2>
        <p className="text-slate-500 mb-8 font-medium">
          Connect with <span className="font-semibold text-accent">{incomingCall.from_nickname}</span>? 💕
        </p>

        <div className="flex gap-4">
          <motion.button
            onClick={handleDecline}
            className="flex-1 py-3 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-medium transition-colors border border-white/10"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Decline
          </motion.button>
          <motion.button
            onClick={handleAccept}
            className="flex-1 py-3 px-4 rounded-xl bg-accent hover:bg-accent-light text-white font-medium transition-colors shadow-glow"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Accept
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default IncomingCallDialog;
