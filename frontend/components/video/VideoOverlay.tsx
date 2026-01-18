// components/video/VideoOverlay.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Lightbulb,
  AlertTriangle,
  BadgeCheck,
  HelpCircle,
} from 'lucide-react';

interface VideoOverlayProps {
  currentTip: string | null;
  isActive: boolean;
  category?: 'tip' | 'correction' | 'praise' | 'question';
  className?: string;
}

const categoryConfig = {
  tip: {
    Icon: Lightbulb,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-400/20',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    accentColor: 'bg-blue-400',
    label: 'Tip',
  },
  correction: {
    Icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-400/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    accentColor: 'bg-amber-400',
    label: 'Adjustment',
  },
  praise: {
    Icon: BadgeCheck,
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-400/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    accentColor: 'bg-emerald-400',
    label: 'Excellent',
  },
  question: {
    Icon: HelpCircle,
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-400/20',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    accentColor: 'bg-violet-400',
    label: 'Question',
  },
};

export function VideoOverlay({
  currentTip,
  isActive,
  category = 'tip',
  className,
}: VideoOverlayProps) {
  const config = categoryConfig[category];
  const { Icon } = config;

  return (
    <AnimatePresence mode="wait">
      {isActive && currentTip && (
        <motion.div
          key={currentTip}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className={cn('absolute bottom-6 left-6 right-6 max-w-2xl mx-auto', className)}
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-xl',
              'bg-zinc-900/80 backdrop-blur-xl',
              'border shadow-2xl shadow-black/20',
              config.borderColor
            )}
          >
            {/* Top accent line */}
            <div className={cn('absolute top-0 left-0 right-0 h-0.5', config.accentColor)} />

            <div className="p-4">
              <div className="flex items-start gap-3.5">
                {/* Icon container */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    config.iconBg
                  )}
                >
                  <Icon className={cn('w-5 h-5', config.iconColor)} strokeWidth={1.5} />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  {/* Category label */}
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 }}
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider mb-1 block',
                      config.iconColor
                    )}
                  >
                    {config.label}
                  </motion.span>

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-white/90 text-sm font-medium leading-relaxed"
                  >
                    {currentTip}
                  </motion.p>
                </div>
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="relative h-0.5 bg-white/5">
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 5, ease: 'linear' }}
                className={cn('absolute inset-0 origin-left', config.accentColor, 'opacity-60')}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
