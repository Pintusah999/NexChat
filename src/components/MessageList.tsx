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
              className={`max-w-xs px-4 py-2 rounded-lg ${
                isOwn
                  ? 'bg-accent text-white rounded-br-none'
                  : 'bg-slate-700 text-slate-100 rounded-bl-none'
              }`}
            >
              <p className="text-sm break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-400'}`}>
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
