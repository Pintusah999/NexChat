import { motion } from 'framer-motion';
import { Peer } from '../store/chatStore';

interface PeerListProps {
  peers: Map<string, Peer>;
  selectedPeer: string | null;
  onSelectPeer: (key: string) => void;
}

function PeerList({ peers, selectedPeer, onSelectPeer }: PeerListProps) {
  const peerArray = Array.from(peers.values());

  if (peerArray.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm font-medium">
        <p>Waiting for your partner...</p>
        <p className="text-xs mt-2 text-slate-500">Share your connection key to invite them 💕</p>
      </div>
    );
  }

  return (
    <div className="flex md:flex-col gap-2 p-2 md:p-0 md:divide-y md:divide-pink-50">
      {peerArray.map((peer) => (
        <motion.button
          key={peer.key}
          onClick={() => onSelectPeer(peer.key)}
          className={`flex-shrink-0 w-48 md:w-full p-3 text-left transition-all rounded-2xl md:rounded-none md:mb-0 ${
            selectedPeer === peer.key
              ? 'bg-accent/10 md:bg-accent/5 border border-accent/20 md:border-none md:border-l-4 md:border-accent'
              : 'bg-white md:bg-transparent border border-pink-50 md:border-none md:border-l-4 md:border-transparent hover:bg-rose-50/50'
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-bold text-sm shrink-0">
              {peer.nickname[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-bold text-xs md:text-sm truncate">{peer.nickname}</p>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    peer.status === 'connected'
                      ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'
                      : 'bg-yellow-500 animate-pulse'
                  }`}
                />
              </div>
              <p className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate uppercase tracking-widest">{peer.key}</p>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export default PeerList;
