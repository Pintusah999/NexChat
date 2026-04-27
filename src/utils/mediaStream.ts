/**
 * MediaStream utilities for WebRTC audio/video
 */

export type MediaStreamType = 'audio' | 'video' | 'both' | 'screen';

export interface MediaStreamConfig {
  audio?: boolean | MediaStreamAudioConstraints;
  video?: boolean | MediaStreamVideoConstraints;
}

interface MediaStreamAudioConstraints {
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

interface MediaStreamVideoConstraints {
  width?: number | { min: number; max: number };
  height?: number | { min: number; max: number };
  frameRate?: number | { min: number; max: number };
}

/**
 * Get media stream for audio and/or video
 */
export async function getMediaStream(type: MediaStreamType = 'audio'): Promise<MediaStream> {
  const constraints: MediaStreamConfig = {};

  if (type === 'audio' || type === 'both') {
    constraints.audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  if (type === 'video' || type === 'both') {
    constraints.video = {
      width: { min: 320, max: 1280 } as any,
      height: { min: 240, max: 720 } as any,
      frameRate: { max: 60 } as any,
    };
  }

  return navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Get screen capture stream
 */
export async function getScreenStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: 'always',
    } as any,
    audio: false,
  });
}

/**
 * Stop all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Get available audio/video devices
 */
export async function getMediaDevices(): Promise<{
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
}> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    audioDevices: devices.filter((d) => d.kind === 'audioinput'),
    videoDevices: devices.filter((d) => d.kind === 'videoinput'),
  };
}
