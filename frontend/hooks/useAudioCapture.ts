// hooks/useAudioCapture.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseAudioCaptureReturn } from '@/types';

// Voice activity detection threshold (RMS amplitude)
const VAD_THRESHOLD = 0.01;

interface UseAudioCaptureOptions {
  sampleRate?: number;
  onAudioChunk?: (chunk: string, isSpeaking: boolean) => void;
  chunkIntervalMs?: number;
}

export function useAudioCapture({
  sampleRate = 16000,
  onAudioChunk,
}: UseAudioCaptureOptions = {}): UseAudioCaptureReturn {
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  // Use ref to avoid stale closure issues with the callback
  const onAudioChunkRef = useRef(onAudioChunk);

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep ref updated with latest callback
  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: sampleRate },
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Create audio context with target sample rate
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create script processor for raw audio access
      // Buffer size: 1024 samples = ~64ms at 16kHz (reduced latency)
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      let audioChunkCount = 0;
      processor.onaudioprocess = (event) => {
        // Use ref to get latest callback (avoids stale closure)
        const callback = onAudioChunkRef.current;
        if (!callback) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate RMS (Root Mean Square) for voice activity detection
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const isSpeaking = rms > VAD_THRESHOLD;

        // Convert Float32Array to Int16Array (PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and convert to 16-bit range
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        // Convert to base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        audioChunkCount++;
        if (audioChunkCount % 50 === 1) {
          console.log(`[Audio] Captured chunk #${audioChunkCount}, size: ${base64Audio.length}, speaking: ${isSpeaking}, rms: ${rms.toFixed(4)}`);
        }
        callback(base64Audio, isSpeaking);
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Microphone access failed';
      setError(errorMessage);
      console.error('Audio capture error:', err);

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      }
    }
  }, [sampleRate, onAudioChunk]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    hasPermission,
    error,
    startRecording,
    stopRecording,
  };
}
