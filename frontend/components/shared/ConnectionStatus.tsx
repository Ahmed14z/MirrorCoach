// components/shared/ConnectionStatus.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionStatus({ isConnected, className }: ConnectionStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded-full',
        'bg-white/5 backdrop-blur-sm border border-white/10',
        className
      )}
    >
      <motion.div
        initial={false}
        animate={{
          scale: isConnected ? [1, 1.2, 1] : 1,
          opacity: isConnected ? 1 : 0.5,
        }}
        transition={{
          scale: {
            repeat: isConnected ? Infinity : 0,
            duration: 2,
            ease: 'easeInOut',
          },
        }}
        className="relative"
      >
        {/* Outer glow ring for connected state */}
        {isConnected && (
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-400/40"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeOut',
            }}
          />
        )}
        <div
          className={cn(
            'w-2 h-2 rounded-full relative z-10',
            isConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
              : 'bg-zinc-500'
          )}
        />
      </motion.div>
      <span
        className={cn(
          'text-xs font-medium tracking-wide uppercase',
          isConnected ? 'text-emerald-400/90' : 'text-zinc-500'
        )}
      >
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  );
}
