'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Monitor } from 'lucide-react';

// Background frame interval: 1 FPS (1000ms) for ambient context only
// Primary frames are now captured synced with audio in page.tsx
const BACKGROUND_FRAME_RATE = 1;

interface ScreenShareFeedProps {
  screenRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onFrame?: (frameData: string) => void;
  className?: string;
  frameRate?: number;  // Now defaults to 1 FPS for background context
}

export function ScreenShareFeed({
  screenRef,
  canvasRef,
  isActive,
  onFrame,
  className,
  frameRate = BACKGROUND_FRAME_RATE,  // Default to 1 FPS for background context
}: ScreenShareFeedProps) {
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive || !onFrame) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      return;
    }

    const captureFrame = () => {
      if (!screenRef.current || !canvasRef.current) return;
      if (!screenRef.current.videoWidth) return;

      const video = screenRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = 640;
      canvas.height = 480;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64Data = dataUrl.split(',')[1];
      onFrame(base64Data);
    };

    const intervalMs = 1000 / frameRate;
    frameIntervalRef.current = setInterval(captureFrame, intervalMs);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, onFrame, screenRef, canvasRef, frameRate]);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden bg-zinc-900', className)}>
      <video
        ref={screenRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain bg-black"
      />

      <canvas ref={canvasRef} className="hidden" />

      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full"
        >
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2.5 h-2.5 bg-white rounded-full"
          />
          <span className="text-white text-sm font-medium">Sharing Screen</span>
        </motion.div>
      )}

      {!isActive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
          <Monitor className="w-16 h-16 mb-4" strokeWidth={1} />
          <p className="text-lg font-medium">Ready to share your screen</p>
          <p className="text-sm mt-1">Click Start Session to begin</p>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}
