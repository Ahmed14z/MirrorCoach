// app/coach/[skill]/page.tsx
'use client';

import { useState, useCallback, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { motion } from 'framer-motion';
import {
  MicOff,
  VideoOff,
  MonitorOff,
  ArrowLeft,
  Lightbulb,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';

import { VideoFeed } from '@/components/video/VideoFeed';
import { VideoOverlay } from '@/components/video/VideoOverlay';
import { ScreenShareFeed } from '@/components/screen/ScreenShareFeed';
import { AnnotationCanvas } from '@/components/screen/AnnotationCanvas';
import { ControlBar } from '@/components/coaching/ControlBar';
import { ConnectionStatus } from '@/components/shared/ConnectionStatus';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCamera } from '@/hooks/useCamera';
import { useScreenShare } from '@/hooks/useScreenShare';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useAudioPlayback } from '@/hooks/useAudioPlayback';
import type { ServerMessage, TextResponse, AudioResponse, SessionState, ErrorResponse, SkillType, ScreenAnnotation, AnnotationResponse } from '@/types';
import { sanitizeResponse, isValidCoachingFeedback } from '@/lib/responseSanitizer';
import { AUDIO_CONFIG } from '@/lib/constants';

const SKILL_NAMES: Record<SkillType, string> = {
  guitar: 'Guitar',
  yoga: 'Yoga',
  fitness: 'Fitness',
  cooking: 'Cooking',
  pushups: 'Push-ups',
  screen_assistant: 'Screen Assistant',
};

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface PageParams {
  skill: string;
}

const getCategoryConfig = (category: string) => {
  switch (category) {
    case 'praise':
      return {
        Icon: BadgeCheck,
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        textColor: 'text-emerald-300',
        iconColor: 'text-emerald-400',
      };
    case 'correction':
      return {
        Icon: AlertTriangle,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        textColor: 'text-amber-300',
        iconColor: 'text-amber-400',
      };
    default:
      return {
        Icon: Lightbulb,
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
        textColor: 'text-violet-300',
        iconColor: 'text-violet-400',
      };
  }
};

export default function CoachingPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const skill = resolvedParams.skill as SkillType;
  const skillName = SKILL_NAMES[skill] || 'Skill';
  const isScreenMode = skill === 'screen_assistant';

  // Container ref for annotation positioning
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState<TextResponse[]>([]);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [tipCategory, setTipCategory] = useState<'tip' | 'correction' | 'praise' | 'question'>('tip');
  const [annotations, setAnnotations] = useState<ScreenAnnotation[]>([]);

  // Media controls
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  // Camera hooks (for non-screen mode)
  const { videoRef, canvasRef, isActive: isCameraActive, startCamera, stopCamera } = useCamera();

  // Screen share hooks (for screen mode)
  const {
    screenRef,
    canvasRef: screenCanvasRef,
    isSharing,
    startShare,
    stopShare,
  } = useScreenShare();

  const { queueAudio, stopAudio } = useAudioPlayback();

  // Handle incoming messages
  const handleMessage = useCallback((message: ServerMessage) => {
    if (message.type === 'text_response') {
      const textMsg = message as TextResponse;
      const rawContent = textMsg.content;
      console.log(`[Coach] Received text response: ${rawContent.substring(0, 50)}...`);

      // Frontend sanitization - last line of defense against prompt leakage
      const sanitizedContent = sanitizeResponse(rawContent);

      if (!sanitizedContent) {
        console.warn('[Coach] Message filtered by frontend sanitizer:', rawContent.substring(0, 100));
        return;
      }

      if (!isValidCoachingFeedback(sanitizedContent)) {
        console.warn('[Coach] Message failed coaching feedback validation:', sanitizedContent.substring(0, 100));
        return;
      }

      // Create sanitized message
      const sanitizedMsg: TextResponse = {
        ...textMsg,
        content: sanitizedContent,
      };

      setCurrentTip(sanitizedContent);
      setTipCategory(textMsg.category || 'tip');
      setMessages((prev) => [...prev.slice(-9), sanitizedMsg]);

      // Auto-clear tip after 5 seconds
      setTimeout(() => setCurrentTip(null), 5000);
    }

    if (message.type === 'audio_response') {
      const audioMsg = message as AudioResponse;
      console.log(`[Coach] Received audio response: ${audioMsg.data.length} chars`);
      queueAudio(audioMsg.data);
    }

    if (message.type === 'session_state') {
      const stateMsg = message as unknown as SessionState;
      if (stateMsg.state === 'connected') {
        toast.success('Coach connected. Start practicing.');
      }
    }

    if (message.type === 'error') {
      const errorMsg = message as unknown as ErrorResponse;
      toast.error(errorMsg.message || 'An error occurred');
    }

    // Handle annotations (screen_assistant only)
    if (message.type === 'annotation') {
      const annotationMsg = message as AnnotationResponse;
      const now = Date.now();
      const annotationsWithExpiry = annotationMsg.annotations.map((ann) => ({
        ...ann,
        id: ann.id || `ann_${now}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: ann.expiresAt || now + (ann.duration || 5) * 1000,
      }));

      if (annotationMsg.clearPrevious) {
        setAnnotations(annotationsWithExpiry);
      } else {
        setAnnotations((prev) => [...prev, ...annotationsWithExpiry]);
      }
    }
  }, [queueAudio]);

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    send,
  } = useWebSocket({
    url: `${WS_BASE_URL}/ws/coaching/${skill}`,
    onMessage: handleMessage,
    onConnect: () => {
      toast.success('Connected to AI Coach');
    },
    onDisconnect: () => {
      if (isSessionActive) {
        toast.info('Session ended');
        setIsSessionActive(false);
      }
    },
    onError: () => {
      toast.error('Connection error. Please try again.');
    },
  });

  // Audio capture with callback - simple audio-only, video handled separately at 1 FPS
  const audioChunkCountRef = useRef(0);
  const handleAudioChunk = useCallback(
    (chunk: string, isSpeaking: boolean) => {
      audioChunkCountRef.current++;
      if (isSessionActive && isMicEnabled) {
        if (audioChunkCountRef.current % 50 === 1) {
          console.log(`[Coach] Sending audio chunk #${audioChunkCountRef.current} to WebSocket, speaking: ${isSpeaking}`);
        }

        // Send audio chunk only - video frames sent separately at 1 FPS
        // Gemini Live API processes video at 1 FPS internally regardless of input rate
        send({
          type: 'audio_chunk',
          data: chunk,
          mimeType: `audio/pcm;rate=${AUDIO_CONFIG.sampleRate}`,
          timestamp: Date.now() / 1000,
        });
      } else if (audioChunkCountRef.current % 50 === 1) {
        console.log(`[Coach] Audio chunk #${audioChunkCountRef.current} skipped: session=${isSessionActive}, mic=${isMicEnabled}`);
      }
    },
    [isSessionActive, isMicEnabled, send]
  );

  const { startRecording, stopRecording } = useAudioCapture({
    onAudioChunk: handleAudioChunk,
  });

  // Video frame callback
  const handleVideoFrame = useCallback(
    (frameData: string) => {
      if (isSessionActive && isCameraEnabled) {
        send({
          type: 'video_frame',
          data: frameData,
          mimeType: 'image/jpeg',
          timestamp: Date.now(),
        });
      }
    },
    [isSessionActive, isCameraEnabled, send]
  );

  // Start session
  const handleStartSession = async () => {
    try {
      if (isScreenMode) {
        // Screen share mode
        await startShare();
      } else {
        // Camera mode
        await startCamera();
      }
      // Connect to WebSocket and wait a moment for connection
      connect();
      // Small delay to ensure WebSocket connects before we start sending data
      await new Promise(resolve => setTimeout(resolve, 500));
      // Now start audio capture (will use latest callback via ref)
      await startRecording();
      setIsSessionActive(true);
      console.log(`[Coach] Session started in ${isScreenMode ? 'screen' : 'camera'} mode`);
    } catch (err) {
      const errorMsg = isScreenMode
        ? 'Failed to start session. Check screen share/mic permissions.'
        : 'Failed to start session. Check camera/mic permissions.';
      toast.error(errorMsg);
    }
  };

  // End session
  const handleEndSession = () => {
    disconnect();
    if (isScreenMode) {
      stopShare();
    } else {
      stopCamera();
    }
    stopRecording();
    stopAudio();
    setIsSessionActive(false);
    setCurrentTip(null);
    setAnnotations([]);
  };

  // Toggle controls
  const handleToggleMic = () => setIsMicEnabled((prev) => !prev);
  const handleToggleCamera = () => setIsCameraEnabled((prev) => !prev);

  // Handle annotation expiry
  const handleAnnotationExpired = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Track container dimensions for annotation positioning
  useEffect(() => {
    if (!isScreenMode) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isScreenMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (isScreenMode) {
        stopShare();
      } else {
        stopCamera();
      }
      stopRecording();
    };
  }, [disconnect, stopCamera, stopShare, stopRecording, isScreenMode]);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Subtle gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(24, 24, 27, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      />

      <div className="relative container mx-auto px-6 py-5 max-w-7xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="group p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                {skillName} Coaching
              </h1>
              <p className="text-zinc-500 text-sm mt-0.5">
                {isSessionActive ? 'Session in progress' : 'Ready to begin'}
              </p>
            </div>
          </div>

          <ConnectionStatus isConnected={isConnected} />
        </motion.header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Video Feed Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-9 relative"
          >
            {/* Glass border container */}
            <div
              ref={containerRef}
              className="relative aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-white/[0.08] shadow-2xl shadow-black/40"
            >
              {/* Inner glow effect */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.05] pointer-events-none z-10" />

              {isScreenMode ? (
                <>
                  <ScreenShareFeed
                    screenRef={screenRef}
                    canvasRef={screenCanvasRef}
                    isActive={isSessionActive && isSharing}
                    onFrame={handleVideoFrame}
                    className="w-full h-full"
                    frameRate={1}  // Background only - synced frames sent with audio
                  />
                  {isSessionActive && annotations.length > 0 && (
                    <AnnotationCanvas
                      annotations={annotations}
                      containerWidth={containerDimensions.width}
                      containerHeight={containerDimensions.height}
                      onAnnotationExpired={handleAnnotationExpired}
                    />
                  )}
                </>
              ) : (
                <VideoFeed
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  isActive={isSessionActive && isCameraEnabled}
                  onFrame={handleVideoFrame}
                  className="w-full h-full object-cover"
                />
              )}

              <VideoOverlay
                currentTip={currentTip}
                isActive={isSessionActive}
                category={tipCategory}
              />

              {/* Live indicator */}
              {isSessionActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-sm border border-white/10"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Live</span>
                </motion.div>
              )}

              {/* Muted indicators - professional with icons */}
              {isSessionActive && (!isMicEnabled || (!isCameraEnabled && !isScreenMode)) && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {!isMicEnabled && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/20"
                    >
                      <MicOff className="w-3.5 h-3.5 text-red-400" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-red-400">Muted</span>
                    </motion.div>
                  )}
                  {!isCameraEnabled && !isScreenMode && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/20"
                    >
                      <VideoOff className="w-3.5 h-3.5 text-red-400" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-red-400">Hidden</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Feedback Panel */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="h-full rounded-2xl bg-zinc-900/50 backdrop-blur-xl border border-white/[0.08] shadow-xl shadow-black/20 overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  Session Feedback
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real-time coaching insights
                </p>
              </div>

              {/* Feedback list */}
              <div className="p-4 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-zinc-600" strokeWidth={1.5} />
                    </div>
                    <p className="text-zinc-500 text-sm">
                      Start a session to receive feedback
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const config = getCategoryConfig(msg.category || 'tip');
                    const { Icon } = config;
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-3.5 rounded-xl border ${config.bgColor} ${config.borderColor}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-6 h-6 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 ${config.iconColor}`}>
                            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </div>
                          <p className={`text-sm leading-relaxed ${config.textColor}`}>
                            {msg.content}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Control Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <ControlBar
            isSessionActive={isSessionActive}
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            isConnecting={isConnecting}
            onStartSession={handleStartSession}
            onEndSession={handleEndSession}
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            showCameraToggle={!isScreenMode}
          />
        </div>
      </div>
    </div>
  );
}
