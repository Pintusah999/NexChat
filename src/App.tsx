import { useEffect } from 'react';
import './App.css';
import CallView from './components/CallView';
import ChatView from './components/ChatView';
import IncomingCallDialog from './components/IncomingCallDialog';
import KeyEntry from './components/KeyEntry';
import { useChatStore } from './store/chatStore';
import { initializeSocket } from './store/socketManager';

function App() {
  const currentView = useChatStore((state) => state.currentView);
  const initializeUser = useChatStore((state) => state.initializeUser);
  const setIncomingCall = useChatStore((state) => state.setIncomingCall);

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

  useEffect(() => {
    const handleRtcSignal = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { from, from_nickname, signal } = customEvent.detail;
      
      // Only handle offers globally. Answers and ICE candidates are handled in CallView.
      if (signal.type === 'offer') {
        setIncomingCall({
          from,
          from_nickname,
          offer: signal,
          isVideo: signal.isVideo || false
        });
      }
    };

    window.addEventListener('rtc-signal', handleRtcSignal);
    return () => window.removeEventListener('rtc-signal', handleRtcSignal);
  }, [setIncomingCall]);

  return (
    <div className="app-container">
      {currentView === 'key-entry' && <KeyEntry />}
      {currentView === 'chat' && <ChatView />}
      {currentView === 'call' && <CallView />}
      <IncomingCallDialog />
    </div>
  );
}

export default App;
