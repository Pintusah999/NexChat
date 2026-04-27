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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [activeMood, setActiveMood] = useState('romantic');
  const [activeTab, setActiveTab] = useState<'playing' | 'search' | 'discover'>('playing');
  const playerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-switch to playing tab when a song starts
  useEffect(() => {
    if (musicState.currentTrack) {
      setActiveTab('playing');
    }
  }, [musicState.currentTrack?.id]);

  const fetchRecommendations = async (mood: string, seed?: string) => {
    setIsLoadingRecs(true);
    try {
      const params = new URLSearchParams({ mood });
      if (seed) params.append('seed', seed);
      const response = await fetch(`/api/recommendations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Recommendations error:', error);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Fetch recommendations on mount and when mood changes
  useEffect(() => {
    fetchRecommendations(activeMood);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMood]);

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
        // Fetch updated recommendations based on played track
        if (musicState.currentTrack?.name) {
          fetchRecommendations(activeMood, musicState.currentTrack.name);
        }
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (
      searchQuery.includes('youtube.com') ||
      searchQuery.includes('youtu.be')
    ) {
      // It's a direct URL
      const track: Track = {
        id: uuidv4(),
        name: `YouTube - ${new Date().toLocaleTimeString()}`,
        url: searchQuery,
        duration: 0,
        uploadedBy: myNickname,
        uploadedAt: Date.now(),
      };

      addTrackToPlaylist(track);
      setSearchQuery('');
      setSearchResults([]);

      connectedPeers.forEach((peer) => {
        sendSignal(peer.key, { type: 'music-upload', track });
      });
      return;
    }

    // It's a search
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search YouTube. Please try again.');
    } finally {
      setIsSearching(false);
    }
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
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex bg-white/60 backdrop-blur-md border-b border-pink-100 p-1.5 m-3 rounded-2xl shadow-sm z-20">
        {[
          { id: 'playing', label: 'Now Playing', icon: '🎵' },
          { id: 'search', label: 'Search', icon: '🔍' },
          { id: 'discover', label: 'Discover', icon: '💕' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl transition-all font-bold text-xs ${
              activeTab === tab.id
                ? 'bg-white shadow-md text-accent scale-105'
                : 'text-slate-500 hover:bg-rose-50/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Hidden ReactPlayer - Global */}
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

      <div className="flex-1 overflow-hidden relative">
        {/* Now Playing Tab */}
        {activeTab === 'playing' && (
          <div className="h-full flex flex-col overflow-y-auto">
            {musicState.currentTrack ? (
              <motion.div
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {/* Album Art Placeholder */}
                <motion.div
                  className="w-40 h-40 bg-gradient-to-br from-accent to-accent-light rounded-3xl shadow-[0_15px_40px_rgba(255,77,109,0.3)] mb-8 flex items-center justify-center"
                  animate={{
                    rotate: musicState.isPlaying ? 360 : 0,
                  }}
                  transition={{
                    rotate: { duration: 10, repeat: Infinity, ease: "linear" }
                  }}
                >
                  <span className="text-6xl drop-shadow-lg">
                    {musicState.currentTrack.url.includes('youtube') ? '🎬' : '🎶'}
                  </span>
                </motion.div>

                {/* Track Info */}
                <h2 className="text-xl font-bold text-slate-800 mb-1 px-4 truncate max-w-full">
                  {musicState.currentTrack.name}
                </h2>
                <p className="text-slate-500 text-sm mb-6 font-medium">
                  Added by {musicState.currentTrack.uploadedBy}
                </p>

                {/* Progress Bar */}
                <div className="w-full max-w-md mb-6 px-4">
                  <input
                    type="range"
                    min="0"
                    max={musicState.currentTrack.duration || 0}
                    value={musicState.currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                    style={{
                      background: `linear-gradient(to right, #ff4d6d 0%, #ff4d6d ${
                        ((musicState.currentTime / (musicState.currentTrack.duration || 1)) * 100)
                      }%, #fce7f3 ${
                        ((musicState.currentTime / (musicState.currentTrack.duration || 1)) * 100)
                      }%, #fce7f3 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-slate-500 font-bold mt-2">
                    <span>{formatTime(musicState.currentTime)}</span>
                    <span>{formatTime(musicState.currentTrack.duration)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-8">
                  <motion.button
                    onClick={togglePlayPause}
                    className="w-16 h-16 rounded-full bg-accent hover:bg-accent-light text-white flex items-center justify-center text-3xl shadow-glow"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {musicState.isPlaying ? '⏸' : '▶'}
                  </motion.button>

                  <div className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-2xl border border-pink-100">
                    <span className="text-sm">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={musicState.volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1.5 accent-accent cursor-pointer"
                    />
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-10 text-center opacity-80">
                <motion.div 
                  className="text-7xl mb-6"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  🎧
                </motion.div>
                <h3 className="text-lg font-bold text-slate-700">Silence is boring...</h3>
                <p className="text-sm text-slate-500 mt-2 font-medium">
                  Let's find the perfect song for your mood!
                </p>
                <motion.button
                  onClick={() => setActiveTab('discover')}
                  className="mt-8 btn-primary px-8"
                  whileHover={{ scale: 1.05 }}
                >
                  Explore Discover 💕
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="h-full flex flex-col p-4">
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search songs on YouTube..."
                className="input-field py-2 text-sm"
              />
              <motion.button
                onClick={handleSearch}
                className="btn-primary p-2 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
              >
                🔍
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <motion.div 
                    className="text-4xl text-accent"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    ⌛
                  </motion.div>
                  <p className="text-sm font-bold text-slate-500">Searching YouTube...</p>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((v, idx) => (
                  <motion.div
                    key={idx}
                    onClick={() => {
                      const track: Track = {
                        id: uuidv4(),
                        name: v.title,
                        url: v.url,
                        duration: v.duration,
                        uploadedBy: myNickname,
                        uploadedAt: Date.now(),
                      };
                      addTrackToPlaylist(track);
                      playTrack(track);
                      connectedPeers.forEach((peer) => {
                        sendSignal(peer.key, { type: 'music-upload', track });
                      });
                    }}
                    className="flex gap-3 p-2 bg-white/60 hover:bg-rose-50 rounded-2xl cursor-pointer border border-pink-50 hover:border-pink-200 transition-all group"
                  >
                    <div className="relative flex-shrink-0">
                      <img src={v.thumbnail} className="w-16 h-16 object-cover rounded-xl shadow-sm" alt="" />
                      <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition-all">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-sm font-bold truncate text-slate-800">{v.title}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">{v.author}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-slate-400 p-10 flex flex-col items-center gap-4">
                  <span className="text-5xl">🔭</span>
                  <p className="text-sm font-medium">Search for your favorite songs!</p>
                </div>
              )}
            </div>
            
            {/* Direct Upload Option */}
            <div className="mt-4 pt-4 border-t border-pink-100 flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors border border-slate-200"
              >
                📁 Upload Local File
              </button>
            </div>
          </div>
        )}

        {/* Discover Tab (Recommendations) */}
        {activeTab === 'discover' && (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="p-4 bg-white/40 backdrop-blur-sm border-b border-pink-100 shadow-sm z-10">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <span>💕</span> Curated for Couples
                </p>
                <motion.button
                  onClick={() => fetchRecommendations(activeMood)}
                  className="text-[10px] font-black uppercase tracking-tighter text-accent px-2 py-1 bg-rose-100/50 rounded-lg hover:bg-rose-200 transition-colors"
                  whileTap={{ scale: 0.9 }}
                >
                  Refresh ↻
                </motion.button>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['romantic', 'bollywood', 'english', 'chill'].map((mood) => (
                  <motion.button
                    key={mood}
                    onClick={() => setActiveMood(mood)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black whitespace-nowrap transition-all shadow-sm ${
                      activeMood === mood 
                        ? 'bg-accent text-white scale-105 shadow-glow' 
                        : 'bg-white text-slate-500 hover:bg-rose-50 border border-pink-50'
                    }`}
                  >
                    {mood === 'romantic' ? '💖 Romantic' : mood === 'bollywood' ? '🎬 Bollywood' : mood === 'english' ? '🎸 English' : '✨ Chill'}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {isLoadingRecs ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 text-accent">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-5xl"
                  >
                    ❤️
                  </motion.div>
                  <p className="text-xs font-bold uppercase tracking-widest">Finding Love Songs...</p>
                </div>
              ) : (
                recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    onClick={() => {
                      const track: Track = {
                        id: uuidv4(),
                        name: rec.title,
                        url: rec.url,
                        duration: rec.duration,
                        uploadedBy: myNickname,
                        uploadedAt: Date.now(),
                      };
                      addTrackToPlaylist(track);
                      playTrack(track);
                      connectedPeers.forEach((peer) => {
                        sendSignal(peer.key, { type: 'music-upload', track });
                      });
                    }}
                    className="flex gap-3 items-center p-3 bg-white/80 hover:bg-rose-50 rounded-2xl cursor-pointer shadow-sm border border-pink-50 hover:border-pink-200 transition-all group"
                  >
                    <img src={rec.thumbnail} className="w-12 h-12 object-cover rounded-xl shadow-inner" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate text-slate-800">{rec.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">{rec.author}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="font-bold">+</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Playlist Section - Global */}
      {musicState.playlist.length > 0 && (
        <motion.div
          className="border-t border-pink-100 max-h-48 overflow-hidden flex flex-col bg-white/80 backdrop-blur-md"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
        >
          <div className="p-3 text-[10px] font-black text-slate-400 border-b border-pink-50 flex justify-between items-center tracking-[0.2em] uppercase">
            <span>Our Playlist ({musicState.playlist.length})</span>
            <span className="text-accent animate-pulse">● Live</span>
          </div>
          <div className="overflow-y-auto divide-y divide-pink-50 max-h-40 no-scrollbar">
            {musicState.playlist.map((track) => (
              <motion.div
                key={track.id}
                className={`p-3 text-sm cursor-pointer transition-all ${
                  musicState.currentTrack?.id === track.id
                    ? 'bg-rose-50 text-accent font-bold border-l-4 border-accent'
                    : 'hover:bg-rose-50/50 text-slate-600'
                }`}
                onClick={() => playTrack(track)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <span className="text-lg">
                      {track.url.includes('youtube') ? '🎬' : '🎵'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold leading-tight">{track.name}</p>
                      <p className="text-[10px] opacity-60">{formatTime(track.duration)} • {track.uploadedBy}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTrackFromPlaylist(track.id);
                    }}
                    className="ml-2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-rose-100 text-slate-300 hover:text-accent transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}

export default MusicPlayer;
