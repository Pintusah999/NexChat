import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { v4 as uuidv4 } from 'uuid';
import { Track, useChatStore } from '../store/chatStore';
import { sendSignal } from '../store/socketManager';

function MusicPlayer() {
  const {
    myNickname,
    connectedPeers,
    musicState,
    setMusicState,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  } = useChatStore();

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const playerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync playback state
  useEffect(() => {
    if (playerRef.current && musicState.currentTrack) {
      if (musicState.isPlaying) {
        playerRef.current.seekTo(musicState.currentTime, 'seconds');
      }
    }
  }, [musicState.currentTime, musicState.isPlaying, musicState.currentTrack]);

  // Broadcast time updates to peers
  const handleProgress = (state: any) => {
    setMusicState({ currentTime: state.playedSeconds });

    // Periodically broadcast to peers (every 5 seconds to reduce network traffic)
    if (Math.floor(state.playedSeconds) % 5 === 0) {
      connectedPeers.forEach((peer) => {
        sendSignal(peer.key, {
          type: 'music-sync',
          trackId: musicState.currentTrack?.id,
          currentTime: state.playedSeconds,
          isPlaying: musicState.isPlaying,
        });
      });
    }
  };

  const handleDuration = (duration: number) => {
    if (musicState.currentTrack) {
      const updatedTrack = { ...musicState.currentTrack, duration };
      setMusicState({ currentTrack: updatedTrack });
    }
  };

  const handleEnded = () => {
    // Play next track if available
    if (musicState.currentTrack) {
      const currentIndex = musicState.playlist.findIndex(
        (t) => t.id === musicState.currentTrack?.id
      );
      if (currentIndex !== -1 && currentIndex < musicState.playlist.length - 1) {
        const nextTrack = musicState.playlist[currentIndex + 1];
        playTrack(nextTrack);
      } else {
        setMusicState({ isPlaying: false });
      }
    }
  };

  const handleYoutubeUrlAdd = () => {
    if (!youtubeUrl.trim()) return;

    // Validate YouTube URL
    if (
      !youtubeUrl.includes('youtube.com') &&
      !youtubeUrl.includes('youtu.be')
    ) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const track: Track = {
      id: uuidv4(),
      name: `YouTube - ${new Date().toLocaleTimeString()}`,
      url: youtubeUrl,
      duration: 0, // Will be set when video loads
      uploadedBy: myNickname,
      uploadedAt: Date.now(),
    };

    addTrackToPlaylist(track);
    setYoutubeUrl('');
    setShowYoutubeInput(false);

    // Broadcast to peers
    connectedPeers.forEach((peer) => {
      sendSignal(peer.key, {
        type: 'music-upload',
        track,
      });
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('audio/')) {
        alert('Please select audio files only');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const audioUrl = reader.result as string;
        const track: Track = {
          id: uuidv4(),
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: audioUrl,
          duration: 0,
          uploadedBy: myNickname,
          uploadedAt: Date.now(),
        };

        addTrackToPlaylist(track);

        // Broadcast to peers
        connectedPeers.forEach((peer) => {
          sendSignal(peer.key, {
            type: 'music-upload',
            track,
          });
        });
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const playTrack = (track: Track) => {
    setMusicState({ currentTrack: track, isPlaying: true, currentTime: 0 });

    // Broadcast to peers
    connectedPeers.forEach((peer) => {
      sendSignal(peer.key, {
        type: 'music-play',
        trackId: track.id,
        timestamp: Date.now(),
      });
    });
  };

  const togglePlayPause = () => {
    if (!musicState.currentTrack) return;

    const newIsPlaying = !musicState.isPlaying;
    setMusicState({ isPlaying: newIsPlaying });

    // Broadcast to peers
    connectedPeers.forEach((peer) => {
      sendSignal(peer.key, {
        type: newIsPlaying ? 'music-play' : 'music-pause',
        trackId: musicState.currentTrack?.id,
        currentTime: musicState.currentTime,
      });
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setMusicState({ currentTime: time });

    if (playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    }

    // Broadcast seek to peers
    connectedPeers.forEach((peer) => {
      sendSignal(peer.key, {
        type: 'music-seek',
        trackId: musicState.currentTrack?.id,
        currentTime: time,
      });
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    setMusicState({ volume });
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Hidden Player */}
      {musicState.currentTrack && (
        <ReactPlayer
          ref={playerRef}
          url={musicState.currentTrack.url}
          playing={musicState.isPlaying}
          volume={musicState.volume}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          width="0"
          height="0"
          config={{
            youtube: {
              playerVars: {
                showinfo: 1,
                controls: 0,
                modestbranding: 1,
                autoplay: musicState.isPlaying ? 1 : 0,
              },
            },
          }}
        />
      )}

      {/* Current Track Display */}
      {musicState.currentTrack ? (
        <motion.div
          className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Album Art Placeholder */}
          <motion.div
            className="w-40 h-40 bg-gradient-to-br from-accent to-accent-light rounded-lg shadow-2xl mb-8 flex items-center justify-center"
            animate={{
              rotate: musicState.isPlaying ? 360 : 0,
              transition: {
                duration: musicState.isPlaying ? 3 : 0,
                repeat: musicState.isPlaying ? Infinity : 0,
              },
            }}
          >
            <span className="text-6xl">
              {musicState.currentTrack.url.includes('youtube') ? '▶️' : '🎵'}
            </span>
          </motion.div>

          {/* Track Info */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {musicState.currentTrack.name}
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            By {musicState.currentTrack.uploadedBy}
          </p>

          {/* Progress Bar */}
          <div className="w-full max-w-md mb-4">
            <input
              type="range"
              min="0"
              max={musicState.currentTrack.duration || 0}
              value={musicState.currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                  ((musicState.currentTime / (musicState.currentTrack.duration || 1)) * 100)
                }%, #1E293B ${
                  ((musicState.currentTime / (musicState.currentTrack.duration || 1)) * 100)
                }%, #1E293B 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{formatTime(musicState.currentTime)}</span>
              <span>{formatTime(musicState.currentTrack.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-accent hover:bg-accent-light text-white flex items-center justify-center text-3xl"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {musicState.isPlaying ? '⏸️' : '▶️'}
            </motion.button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <span className="text-xl">🔊</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={musicState.volume}
                onChange={handleVolumeChange}
                className="w-24 h-2 bg-slate-700 rounded-lg"
              />
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-4">🎶</div>
          <p className="text-slate-400">No track playing</p>
          <p className="text-slate-500 text-sm mt-2">
            Upload music or paste a YouTube link
          </p>
        </div>
      )}

      {/* Upload Section */}
      <motion.div
        className="p-4 border-t border-slate-700 space-y-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* YouTube Input */}
        {showYoutubeInput && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleYoutubeUrlAdd();
              }}
              placeholder="Paste YouTube URL..."
              className="input-field text-sm w-full"
            />
            <div className="flex gap-2">
              <motion.button
                onClick={handleYoutubeUrlAdd}
                className="btn-primary flex-1 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Add Song
              </motion.button>
              <motion.button
                onClick={() => setShowYoutubeInput(false)}
                className="btn-secondary flex-1 text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <motion.button
            onClick={() => setShowYoutubeInput(!showYoutubeInput)}
            className="btn-primary text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            🎬 YouTube
          </motion.button>
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary text-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            📁 Upload Song
          </motion.button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </motion.div>

      {/* Playlist Section */}
      {musicState.playlist.length > 0 && (
        <motion.div
          className="border-t border-slate-700 max-h-40 overflow-y-auto"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
        >
          <div className="p-3 text-xs font-semibold text-slate-400 sticky top-0 bg-primary">
            PLAYLIST ({musicState.playlist.length})
          </div>
          <div className="divide-y divide-slate-700">
            {musicState.playlist.map((track) => (
              <motion.div
                key={track.id}
                className={`p-2 text-sm cursor-pointer transition-colors ${
                  musicState.currentTrack?.id === track.id
                    ? 'bg-accent/20 text-accent'
                    : 'hover:bg-slate-800 text-slate-300'
                }`}
                onClick={() => playTrack(track)}
                whileHover={{ x: 4 }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium flex items-center gap-1">
                      <span>
                        {track.url.includes('youtube') ? '🎬' : '🎵'}
                      </span>
                      {track.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatTime(track.duration)}
                    </p>
                  </div>
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrackFromPlaylist(track.id);
                    }}
                    className="ml-2 text-slate-500 hover:text-red-400"
                    whileHover={{ scale: 1.2 }}
                  >
                    ✕
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default MusicPlayer;
