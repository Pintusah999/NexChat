import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendSignal } from '../store/socketManager';
import { getMediaStream, stopMediaStream } from '../utils/mediaStream';
import {
    addIceCandidate,
    addMediaTracks,
    createAnswer,
    createOffer,
    createPeerConnection,
    setRemoteDescription,
} from '../utils/webrtc';

function CallView() {
  const {
    selectedPeer,
    localStream,
    audioEnabled,
    videoEnabled,
    incomingCall,
    setLocalStream,
    toggleAudio,
    toggleVideo,
    setCurrentView,
    addRemoteStream,
    clearIncomingCall,
  } = useChatStore();

  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Initialize local stream and peer connection
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let peerConnection: RTCPeerConnection | null = null;

    const initializeCall = async () => {
      try {
        const mediaType = videoEnabled ? 'both' : 'audio';
        const stream = await getMediaStream(mediaType);
        activeStream = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        peerConnection = createPeerConnection();
        peerConnectionRef.current = peerConnection;
        addMediaTracks(peerConnection, stream);

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          addRemoteStream(selectedPeer || '', event.streams[0]);
        };

        // Handle local ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal(selectedPeer || '', {
              type: 'ice-candidate',
              candidate: event.candidate,
            });
          }
        };

        if (incomingCall) {
          // We are the receiver: accept the offer and send an answer
          await setRemoteDescription(peerConnection, incomingCall.offer);
          const answer = await createAnswer(peerConnection);
          sendSignal(selectedPeer || '', answer);
          clearIncomingCall();
        } else {
          // We are the caller: create and send an offer
          const offer = await createOffer(peerConnection);
          sendSignal(selectedPeer || '', { ...offer, isVideo: videoEnabled });
        }
      } catch (error) {
        console.error('Failed to initialize call:', error);
        alert('Unable to access microphone/camera');
        setCurrentView('chat');
      }
    };

    initializeCall();

    return () => {
      if (activeStream) {
        stopMediaStream(activeStream);
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, []);

  // Handle incoming RTC signals (Answer, ICE candidates)
  useEffect(() => {
    const handleRtcSignal = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { signal } = customEvent.detail;
      const pc = peerConnectionRef.current;
      
      if (!pc) return;

      if (signal.type === 'answer') {
        await setRemoteDescription(pc, signal);
      } else if (signal.type === 'ice-candidate') {
        await addIceCandidate(pc, signal.candidate);
      }
    };

    window.addEventListener('rtc-signal', handleRtcSignal);
    return () => window.removeEventListener('rtc-signal', handleRtcSignal);
  }, []);

  // Call duration timer
  useEffect(() => {
    if (!isCallActive) return;

    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (localStream) {
      stopMediaStream(localStream);
    }
    setCurrentView('chat');
  };

  const toggleLocalAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      toggleAudio();
    }
  };

  const toggleLocalVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      toggleVideo();
    }
  };

  return (
    <div className="flex h-screen bg-primary items-center justify-center">
      <motion.div
        className="w-full h-full flex flex-col items-center justify-center relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Remote Video */}
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Local Video (Picture in Picture) */}
        {videoEnabled && (
          <motion.div
            className="absolute bottom-8 right-8 w-48 h-36 rounded-lg overflow-hidden shadow-2xl border-4 border-accent"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
          </motion.div>
        )}

        {/* Call Info Overlay */}
        <motion.div
          className="absolute top-8 left-1/2 transform -translate-x-1/2 glass-effect px-6 py-4 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <p className="text-sm text-slate-300">Call in progress</p>
          <p className="text-2xl font-bold text-accent mt-1">
            {formatDuration(callDuration)}
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.button
            onClick={toggleLocalAudio}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
              audioEnabled
                ? 'bg-slate-700 hover:bg-slate-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {audioEnabled ? '🎙️' : '🔇'}
          </motion.button>

          <motion.button
            onClick={toggleLocalVideo}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
              videoEnabled
                ? 'bg-slate-700 hover:bg-slate-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {videoEnabled ? '📹' : '📷'}
          </motion.button>

          <motion.button
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-red-600 hover:bg-red-700"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            📞
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default CallView;
