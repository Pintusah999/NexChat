/**
 * WebRTC peer connection utilities
 */

export type RTCSignalType = 'offer' | 'answer' | 'ice-candidate';

export interface RTCSignal {
  type: RTCSignalType;
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

export interface PeerConfig {
  iceServers?: RTCIceServer[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
  },
  {
    urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'],
  },
];

/**
 * Create a new RTCPeerConnection
 */
export function createPeerConnection(config: PeerConfig = {}): RTCPeerConnection {
  const iceServers = config.iceServers || DEFAULT_ICE_SERVERS;
  return new RTCPeerConnection({
    iceServers,
  });
}

/**
 * Create an offer for a peer connection
 */
export async function createOffer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await peerConnection.setLocalDescription(offer);
  return offer;
}

/**
 * Create an answer for a peer connection
 */
export async function createAnswer(peerConnection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const answer = await peerConnection.createAnswer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await peerConnection.setLocalDescription(answer);
  return answer;
}

/**
 * Set remote description
 */
export async function setRemoteDescription(
  peerConnection: RTCPeerConnection,
  description: RTCSessionDescriptionInit
): Promise<void> {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
}

/**
 * Add ICE candidate
 */
export async function addIceCandidate(
  peerConnection: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.warn('Error adding ICE candidate:', error);
  }
}

/**
 * Add media tracks to peer connection
 */
export function addMediaTracks(peerConnection: RTCPeerConnection, stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
}

/**
 * Remove media tracks from peer connection
 */
export function removeMediaTracks(peerConnection: RTCPeerConnection, stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    const sender = peerConnection.getSenders().find((s) => s.track === track);
    if (sender) {
      peerConnection.removeTrack(sender);
    }
  });
}

/**
 * Get connection stats
 */
export async function getConnectionStats(peerConnection: RTCPeerConnection): Promise<RTCStatsReport> {
  return peerConnection.getStats();
}

/**
 * Close a peer connection
 */
export function closePeerConnection(peerConnection: RTCPeerConnection): void {
  peerConnection.close();
}
