// components/coaching/ControlBar.tsx
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Play,
  Square,
  Loader2,
} from 'lucide-react';

interface ControlBarProps {
  isSessionActive: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isConnecting: boolean;
  onStartSession: () => void;
  onEndSession: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  showCameraToggle?: boolean;
  className?: string;
}

export function ControlBar({
  isSessionActive,
  isMicEnabled,
  isCameraEnabled,
  isConnecting,
  onStartSession,
  onEndSession,
  onToggleMic,
  onToggleCamera,
  showCameraToggle = true,
  className,
}: ControlBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex items-center justify-center gap-3 px-4 py-3',
        'bg-zinc-900/70 backdrop-blur-2xl rounded-2xl',
        'border border-white/[0.08] shadow-2xl shadow-black/40',
        'ring-1 ring-inset ring-white/[0.05]',
        className
      )}
    >
      {/* Microphone toggle */}
      <ControlButton
        onClick={onToggleMic}
        disabled={!isSessionActive}
        isActive={isMicEnabled}
        activeIcon={<Mic className="w-5 h-5" strokeWidth={1.5} />}
        inactiveIcon={<MicOff className="w-5 h-5" strokeWidth={1.5} />}
        label={isMicEnabled ? 'Mute' : 'Unmute'}
      />

      {/* Main action button */}
      {!isSessionActive ? (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            size="lg"
            onClick={onStartSession}
            disabled={isConnecting}
            className={cn(
              'relative px-6 h-12 rounded-xl text-sm font-semibold',
              'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500',
              'bg-[length:200%_100%] animate-gradient-x',
              'hover:shadow-lg hover:shadow-purple-500/20',
              'border border-white/10',
              'transition-all duration-300',
              isConnecting && 'opacity-80'
            )}
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                <span>Connecting</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                <span>Start Session</span>
              </span>
            )}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            size="lg"
            onClick={onEndSession}
            className={cn(
              'px-6 h-12 rounded-xl text-sm font-semibold',
              'bg-red-500/10 hover:bg-red-500/20',
              'text-red-400 hover:text-red-300',
              'border border-red-500/20 hover:border-red-500/30',
              'transition-all duration-200'
            )}
          >
            <span className="flex items-center gap-2">
              <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />
              <span>End Session</span>
            </span>
          </Button>
        </motion.div>
      )}

      {/* Camera toggle (hidden for screen share mode) */}
      {showCameraToggle && (
        <ControlButton
          onClick={onToggleCamera}
          disabled={!isSessionActive}
          isActive={isCameraEnabled}
          activeIcon={<Video className="w-5 h-5" strokeWidth={1.5} />}
          inactiveIcon={<VideoOff className="w-5 h-5" strokeWidth={1.5} />}
          label={isCameraEnabled ? 'Hide Camera' : 'Show Camera'}
        />
      )}
    </motion.div>
  );
}

// Reusable control button component
interface ControlButtonProps {
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  label: string;
}

function ControlButton({
  onClick,
  disabled,
  isActive,
  activeIcon,
  inactiveIcon,
  label,
}: ControlButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'group relative w-12 h-12 rounded-xl flex items-center justify-center',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
        disabled && 'opacity-40 cursor-not-allowed',
        !disabled && isActive && [
          'bg-white/[0.08] hover:bg-white/[0.12]',
          'text-white/80 hover:text-white',
          'border border-white/[0.08] hover:border-white/[0.12]',
        ],
        !disabled && !isActive && [
          'bg-red-500/10 hover:bg-red-500/15',
          'text-red-400 hover:text-red-300',
          'border border-red-500/20 hover:border-red-500/25',
        ]
      )}
    >
      {/* Subtle glow effect on hover */}
      {!disabled && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300',
            isActive
              ? 'shadow-[inset_0_0_12px_rgba(255,255,255,0.06)]'
              : 'shadow-[inset_0_0_12px_rgba(239,68,68,0.1)]'
          )}
        />
      )}
      <span className="relative z-10">
        {isActive ? activeIcon : inactiveIcon}
      </span>
    </motion.button>
  );
}
