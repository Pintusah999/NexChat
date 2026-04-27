import { motion } from 'framer-motion';
import { Message } from '../store/chatStore';
import { formatTime } from '../utils/helpers';

interface MessageListProps {
  messages: Message[];
  myKey: string;
}

function MessageList({ messages, myKey }: MessageListProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {messages.map((msg) => {
        const isOwn = msg.fromKey === myKey;
        return (
          <motion.div
            key={msg.id}
            variants={itemVariants}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2.5 rounded-2xl shadow-sm ${
                isOwn
                  ? 'bg-gradient-to-r from-accent to-accent-light text-white rounded-br-sm'
                  : 'bg-rose-50 text-slate-800 rounded-bl-sm border border-pink-100'
              }`}
            >
              <p className="text-sm font-medium break-words leading-relaxed">{msg.content}</p>
              <p className={`text-xs mt-1 ${isOwn ? 'text-white/90' : 'text-slate-500'}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export default MessageList;
