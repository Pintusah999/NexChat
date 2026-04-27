import { useEffect } from 'react';
import './App.css';
import CallView from './components/CallView';
import ChatView from './components/ChatView';
import KeyEntry from './components/KeyEntry';
import { useChatStore } from './store/chatStore';
import { initializeSocket } from './store/socketManager';

function App() {
  const currentView = useChatStore((state) => state.currentView);
  const initializeUser = useChatStore((state) => state.initializeUser);

  useEffect(() => {
    // Initialize user key on app load
    initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    // Connect to signaling server when entering chat view
    if (currentView !== 'key-entry') {
      initializeSocket();
    }
  }, [currentView]);

  return (
    <div className="app-container">
      {currentView === 'key-entry' && <KeyEntry />}
      {currentView === 'chat' && <ChatView />}
      {currentView === 'call' && <CallView />}
    </div>
  );
}

export default App;
