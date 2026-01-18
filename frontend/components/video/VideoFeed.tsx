// components/video/VideoFeed.tsx
'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { VIDEO_CONFIG } from '@/lib/constants';

interface VideoFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onFrame?: (frameData: string) => void;
  className?: string;
  showMirror?: boolean;
}

export function VideoFeed({
  videoRef,
  canvasRef,
  isActive,
  onFrame,
  className,
  showMirror = true,
}: VideoFeedProps) {
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simple 1 FPS capture - Gemini Live API processes video at 1 FPS internally
  useEffect(() => {
    if (!isActive || !onFrame) {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
      return;
    }

    const captureFrame = () => {
      if (!videoRef.current || !canvasRef.current) return;
      if (!videoRef.current.videoWidth) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Reduced resolution for bandwidth
      canvas.width = VIDEO_CONFIG.captureWidth;
      canvas.height = VIDEO_CONFIG.captureHeight;

      // Draw (with mirror flip for selfie view)
      if (showMirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Extract frame as base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', VIDEO_CONFIG.quality);
      const base64Data = dataUrl.split(',')[1];

      if (base64Data) {
        onFrame(base64Data);
      }
    };

    // Capture at 1 FPS (1000ms) - matches Gemini Live API internal processing rate
    frameIntervalRef.current = setInterval(captureFrame, VIDEO_CONFIG.frameIntervalMs);

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isActive, onFrame, videoRef, canvasRef, showMirror]);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden bg-black', className)}>
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          'w-full h-full object-cover',
          showMirror && 'transform -scale-x-100'
        )}
      />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live indicator */}
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full"
        >
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2.5 h-2.5 bg-red-500 rounded-full"
          />
          <span className="text-white text-sm font-medium">LIVE</span>
        </motion.div>
      )}

      {/* Gradient overlay at bottom for text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
    </div>
  );
}
