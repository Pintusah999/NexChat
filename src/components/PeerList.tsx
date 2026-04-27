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
      <div className="p-4 text-center text-slate-500 text-sm">
        <p>No peers connected</p>
        <p className="text-xs mt-2">Share your key to invite others</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700">
      {peerArray.map((peer) => (
        <motion.button
          key={peer.key}
          onClick={() => onSelectPeer(peer.key)}
          className={`w-full p-3 text-left transition-colors ${
            selectedPeer === peer.key
              ? 'bg-accent/20 border-l-2 border-accent'
              : 'hover:bg-slate-800'
          }`}
          whileHover={{ x: 4 }}
          whileTap={{ x: 2 }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{peer.nickname}</p>
              <p className="text-xs text-slate-500 truncate">{peer.key}</p>
              <div className="flex gap-1 mt-1">
                {peer.hasAudio && <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">🎙️</span>}
                {peer.hasVideo && <span className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">📹</span>}
              </div>
            </div>
            <div className="ml-2">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  peer.status === 'connected'
                    ? 'bg-green-500'
                    : peer.status === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

export default PeerList;
