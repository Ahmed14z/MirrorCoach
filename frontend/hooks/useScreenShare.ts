'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseScreenShareReturn, ScreenShareState } from '@/types';

interface UseScreenShareOptions {
  captureWidth?: number;
  captureHeight?: number;
  quality?: number;
}

export function useScreenShare({
  captureWidth = 640,
  captureHeight = 480,
  quality = 0.7,
}: UseScreenShareOptions = {}): UseScreenShareReturn {
  const screenRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isSharing, setIsSharing] = useState(false);
  const [shareState, setShareState] = useState<ScreenShareState>('inactive');
  const [error, setError] = useState<string | null>(null);

  const startShare = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setError(null);
    setShareState('pending');

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15, max: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.onended = () => {
        stopShare();
      };

      if (screenRef.current) {
        screenRef.current.srcObject = stream;
        await screenRef.current.play();
      }

      setIsSharing(true);
      setShareState('active');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Screen share failed';
      setError(errorMessage);
      setShareState('error');
      console.error('Screen share error:', err);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Screen share permission denied or cancelled.');
        } else if (err.name === 'NotFoundError') {
          setError('No screen available for sharing.');
        } else if (err.name === 'NotSupportedError') {
          setError('Screen sharing is not supported in this browser.');
        }
      }
    }
  }, []);

  const stopShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (screenRef.current) {
      screenRef.current.srcObject = null;
    }

    setIsSharing(false);
    setShareState('inactive');
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!screenRef.current || !canvasRef.current) return null;
    if (!screenRef.current.videoWidth) return null;

    const video = screenRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = captureWidth;
    canvas.height = captureHeight;

    // No mirror transform for screen share (unlike camera selfie)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return dataUrl.split(',')[1];
  }, [captureWidth, captureHeight, quality]);

  useEffect(() => {
    return () => {
      stopShare();
    };
  }, [stopShare]);

  return {
    screenRef,
    canvasRef,
    isSharing,
    shareState,
    error,
    startShare,
    stopShare,
    captureFrame,
  };
}
