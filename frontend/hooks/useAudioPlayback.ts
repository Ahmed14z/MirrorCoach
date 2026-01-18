// hooks/useAudioPlayback.ts
'use client';

import { useCallback, useRef, useState } from 'react';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playAudio: (base64Audio: string, sampleRate?: number) => Promise<void>;
  stopAudio: () => void;
  queueAudio: (base64Audio: string, sampleRate?: number) => void;
}

/**
 * Seamless audio playback hook using scheduled playback.
 * Uses audioContext.currentTime for precise scheduling to eliminate gaps.
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const gainNodeRef = useRef<GainNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  // Gemini outputs 24kHz PCM16 audio
  const SAMPLE_RATE = 24000;

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
      // Create a gain node for smooth volume control
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  }, []);

  const base64ToAudioBuffer = useCallback(
    async (base64Audio: string, sampleRate: number = SAMPLE_RATE): Promise<AudioBuffer> => {
      const audioContext = getAudioContext();

      // Decode base64 to bytes
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Ensure even byte count for Int16
      const validLength = bytes.length - (bytes.length % 2);
      const int16Array = new Int16Array(bytes.buffer, 0, validLength / 2);

      // Create AudioBuffer
      const audioBuffer = audioContext.createBuffer(1, int16Array.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 to Float32 with proper normalization
      for (let i = 0; i < int16Array.length; i++) {
        const sample = int16Array[i];
        // Proper signed 16-bit to float conversion
        channelData[i] = sample < 0 ? sample / 0x8000 : sample / 0x7fff;
      }

      return audioBuffer;
    },
    [getAudioContext]
  );

  /**
   * Schedule an audio buffer to play seamlessly after the previous one.
   * Uses audioContext.currentTime for precise, gap-free scheduling.
   */
  const scheduleBuffer = useCallback((audioBuffer: AudioBuffer) => {
    const audioContext = getAudioContext();
    const gainNode = gainNodeRef.current;
    if (!gainNode) return;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(gainNode);

    // Track active sources for cleanup
    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      // Check if all sources finished
      if (activeSourcesRef.current.size === 0) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    // Calculate when to start this buffer
    const now = audioContext.currentTime;

    // If we're behind schedule or just starting, start from now with small offset
    if (nextStartTimeRef.current <= now) {
      nextStartTimeRef.current = now + 0.01; // 10ms offset to prevent glitches
    }

    // Schedule the buffer to start at the precise time
    source.start(nextStartTimeRef.current);

    // Update next start time to be exactly when this buffer ends
    nextStartTimeRef.current += audioBuffer.duration;

    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [getAudioContext]);

  const playAudio = useCallback(
    async (base64Audio: string, sampleRate: number = SAMPLE_RATE): Promise<void> => {
      try {
        const audioContext = getAudioContext();

        // Resume audio context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const audioBuffer = await base64ToAudioBuffer(base64Audio, sampleRate);

        // Reset timing for single playback
        nextStartTimeRef.current = 0;
        scheduleBuffer(audioBuffer);
      } catch (err) {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    },
    [base64ToAudioBuffer, getAudioContext, scheduleBuffer]
  );

  const queueAudio = useCallback(
    async (base64Audio: string, sampleRate: number = SAMPLE_RATE) => {
      try {
        const audioContext = getAudioContext();

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const audioBuffer = await base64ToAudioBuffer(base64Audio, sampleRate);
        scheduleBuffer(audioBuffer);
      } catch (err) {
        console.error('Error queuing audio:', err);
      }
    },
    [base64ToAudioBuffer, getAudioContext, scheduleBuffer]
  );

  const stopAudio = useCallback(() => {
    // Stop all active sources
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped
      }
    });
    activeSourcesRef.current.clear();

    // Reset timing
    nextStartTimeRef.current = 0;
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    playAudio,
    stopAudio,
    queueAudio,
  };
}
