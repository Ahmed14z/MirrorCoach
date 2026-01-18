// types/index.ts

// Message types from/to server
export type MessageType =
  | 'video_frame'
  | 'audio_chunk'
  | 'text_input'
  | 'session_control';

export type ServerMessageType =
  | 'text_response'
  | 'audio_response'
  | 'session_state'
  | 'error'
  | 'annotation';

export interface ClientMessage {
  type: MessageType;
  timestamp: number;
  data?: string;
  mimeType?: string;
  content?: string;
}

export interface VideoFrameMessage extends ClientMessage {
  type: 'video_frame';
  data: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
}

export interface AudioChunkMessage extends ClientMessage {
  type: 'audio_chunk';
  data: string;
  mimeType: 'audio/pcm;rate=16000';
  durationMs: number;
}

export interface ServerMessage {
  type: ServerMessageType;
  timestamp?: number;
}

export interface TextResponse extends ServerMessage {
  type: 'text_response';
  content: string;
  category?: 'tip' | 'correction' | 'praise' | 'question';
}

export interface AudioResponse extends ServerMessage {
  type: 'audio_response';
  data: string;
  mimeType: string;
  durationMs?: number;
}

export interface SessionState extends ServerMessage {
  type: 'session_state';
  state: 'connected' | 'listening' | 'processing' | 'speaking' | 'error' | 'interrupted';
  message?: string;
}

export interface ErrorResponse extends ServerMessage {
  type: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

// Annotation overlay types
export interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'text' | 'highlight';
  position: { x: number; y: number };
  endPosition?: { x: number; y: number };
  message?: string;
  color: string;
  size?: number;
}

// Skill types
export type SkillType = 'guitar' | 'yoga' | 'fitness' | 'cooking' | 'pushups' | 'screen_assistant';

export interface Skill {
  id: SkillType;
  name: string;
  emoji: string;
  description: string;
  color: string;
  gradient: string;
}

// Session state
export interface CoachingSessionState {
  isConnected: boolean;
  isActive: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  skill: SkillType | null;
  messages: TextResponse[];
  currentTip: string | null;
  sessionDuration: number;
}

// Hook return types
export interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (message: ClientMessage) => void;
  lastMessage: ServerMessage | null;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  hasPermission: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
}

export interface UseAudioCaptureReturn {
  isRecording: boolean;
  hasPermission: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

// Screen share types
export type ScreenShareState = 'inactive' | 'pending' | 'active' | 'error';

export interface ScreenAnnotation extends Annotation {
  expiresAt?: number;
  animationState?: 'entering' | 'visible' | 'exiting';
  target?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  style?: {
    color?: string;
    size?: 'small' | 'medium' | 'large';
    animation?: 'pulse' | 'bounce' | 'static' | 'fade';
  };
  label?: string;
  duration?: number;
}

export interface AnnotationResponse extends ServerMessage {
  type: 'annotation';
  annotations: ScreenAnnotation[];
  clearPrevious?: boolean;
}

export interface UseScreenShareReturn {
  screenRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isSharing: boolean;
  shareState: ScreenShareState;
  error: string | null;
  startShare: () => Promise<void>;
  stopShare: () => void;
  captureFrame: () => string | null;
}

