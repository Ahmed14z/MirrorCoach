# MirrorCoach AI - Complete Project Context

> **Purpose:** This document provides comprehensive context for AI assistants to understand the MirrorCoach codebase. Read this first before making any changes.

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Gemini Live API Integration](#6-gemini-live-api-integration)
7. [Video & Audio Handling](#7-video--audio-handling)
8. [WebSocket Protocol](#8-websocket-protocol)
9. [Key Files Reference](#9-key-files-reference)
10. [Configuration](#10-configuration)
11. [Development Commands](#11-development-commands)

---

## 1. Project Overview

**MirrorCoach AI** is a real-time AI coaching platform that provides multimodal feedback based on video and audio streaming. Users can receive coaching for various skills (guitar, yoga, fitness, cooking, pushups, screen assistance) through a conversational AI coach powered by Google's Gemini Live API.

### Core Features
- Real-time video streaming at 10 FPS
- Bidirectional audio (user microphone + AI speech)
- Multiple coaching skills with skill-specific prompts
- Screen sharing with visual annotations (screen_assistant mode)
- Natural conversational AI coach ("Coach Alex")
- Response sanitization to prevent prompt leakage

### Architecture Pattern
- **Frontend:** Next.js SPA with WebSocket client
- **Backend:** FastAPI WebSocket server (stateless, no database)
- **AI:** Google Gemini Live API for multimodal processing
- **Communication:** JSON over WebSocket (bidirectional streaming)

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.3 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | Strict mode | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| shadcn/ui | Latest | Pre-built components |
| Framer Motion | Latest | Animations |
| Lucide React | Latest | Icons |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.115.0+ | ASGI web framework |
| Uvicorn | 0.30.0+ | ASGI server |
| Python | 3.11+ | Runtime |
| Pydantic | 2.0+ | Data validation |
| google-genai | 1.33.0+ | Gemini Live API SDK |
| websockets | 12.0+ | WebSocket support |

### Infrastructure
- **No Database** - Stateless sessions (in-memory only)
- **No Authentication** - Direct WebSocket access
- **CORS** - Configurable origins

---

## 3. Directory Structure

```
/home/ahmed/dev/mirrorcoach/
├── frontend/                          # Next.js frontend application
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout with metadata
│   │   ├── page.tsx                   # Homepage with skill selection
│   │   └── coach/
│   │       └── [skill]/
│   │           └── page.tsx           # Dynamic coaching session page
│   ├── components/
│   │   ├── coaching/
│   │   │   └── ControlBar.tsx         # Session control buttons
│   │   ├── screen/
│   │   │   ├── ScreenShareFeed.tsx    # Screen share video display
│   │   │   └── AnnotationCanvas.tsx   # Canvas overlay for AI annotations
│   │   ├── shared/
│   │   │   └── ConnectionStatus.tsx   # WebSocket connection indicator
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   └── card.tsx
│   │   └── video/
│   │       ├── VideoFeed.tsx          # Camera video display + frame capture
│   │       └── VideoOverlay.tsx       # Coaching feedback overlay
│   ├── hooks/
│   │   ├── useWebSocket.ts            # WebSocket connection management
│   │   ├── useCamera.ts               # Camera stream capture at 10 FPS
│   │   ├── useScreenShare.ts          # Screen sharing with frame capture
│   │   ├── useAudioCapture.ts         # Microphone audio capture (PCM16)
│   │   └── useAudioPlayback.ts        # Seamless audio playback scheduling
│   ├── lib/
│   │   ├── constants.ts               # Skills config, video/audio settings
│   │   ├── utils.ts                   # Helper functions (cn, formatTime)
│   │   └── responseSanitizer.ts       # Frontend response filtering
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces for all messaging
│   ├── public/                        # Static assets
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   └── package.json
│
├── backend/                           # FastAPI backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app entry point
│   │   ├── config.py                  # Configuration (Pydantic Settings)
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── messages.py            # WebSocket message schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── health.py              # Health check endpoints
│   │   │   └── coaching.py            # WebSocket coaching endpoint
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── gemini_live.py         # Gemini Live API session management
│   │   │   ├── annotation_parser.py   # Visual annotation extraction
│   │   │   └── response_sanitizer.py  # Response filtering
│   │   └── prompts/
│   │       ├── __init__.py
│   │       └── base.py                # Skill-specific coaching prompts
│   ├── .env                           # Environment variables (gitignored)
│   ├── .env.example                   # Environment template
│   └── pyproject.toml                 # Python dependencies
│
└── PROJECT_CONTEXT.md                 # This file
```

---

## 4. Frontend Architecture

### 4.1 Routing (Next.js App Router)

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page with skill selection |
| `/coach/[skill]` | `app/coach/[skill]/page.tsx` | Coaching session for specific skill |

**Available Skills:** `guitar`, `yoga`, `fitness`, `cooking`, `pushups`, `screen_assistant`

### 4.2 Key Components

#### VideoFeed (`components/video/VideoFeed.tsx`)
- Displays camera stream with live indicator
- Captures frames at 10 FPS (100ms interval)
- Renders to canvas at 640x480
- Outputs base64 JPEG at 0.7 quality
- Horizontal mirror for selfie view

#### ScreenShareFeed (`components/screen/ScreenShareFeed.tsx`)
- Displays screen share for screen_assistant skill
- Same frame capture logic (640x480, JPEG)
- No mirror transform

#### AnnotationCanvas (`components/screen/AnnotationCanvas.tsx`)
- Canvas overlay for AI visual annotations
- Supports: arrow, circle, highlight, text
- Animations: pulse, bounce, fade, static
- Auto-expires annotations after 5 seconds

#### VideoOverlay (`components/video/VideoOverlay.tsx`)
- Displays current coaching feedback
- Categories with color coding:
  - Tip (Blue) - Lightbulb icon
  - Correction (Amber) - Alert triangle
  - Praise (Green) - Badge check
  - Question (Violet) - Help circle
- Auto-clears after 5 seconds

#### ControlBar (`components/coaching/ControlBar.tsx`)
- Microphone toggle
- Start/End session button
- Camera toggle (camera mode only)

### 4.3 Custom Hooks

#### useWebSocket (`hooks/useWebSocket.ts`)
```typescript
const { isConnected, send, disconnect } = useWebSocket({
  url: string,
  onMessage: (message: ServerMessage) => void,
  onConnect: () => void,
  onDisconnect: () => void,
  onError: (error: Error) => void,
});
```
- Auto-reconnection (3 attempts, 2s intervals)
- JSON message parsing
- Clean disconnect handling

#### useCamera (`hooks/useCamera.ts`)
```typescript
const { videoRef, canvasRef, startCamera, stopCamera, isActive } = useCamera({
  onFrame: (frameData: string) => void,
});
```
- Requests 1280x720 at 30 FPS
- Captures at 640x480, 10 FPS
- JPEG compression at 0.7 quality

#### useAudioCapture (`hooks/useAudioCapture.ts`)
```typescript
const { startCapture, stopCapture, isCapturing } = useAudioCapture({
  onAudioChunk: (audioData: string) => void,
});
```
- Sample rate: 16000 Hz (mono)
- Encoding: Float32 → Int16 PCM
- Features: Echo cancellation, noise suppression

#### useAudioPlayback (`hooks/useAudioPlayback.ts`)
```typescript
const { queueAudio, stopPlayback } = useAudioPlayback();
```
- Sample rate: 24000 Hz (Gemini output)
- Seamless buffer scheduling
- Gap-free playback using audioContext.currentTime

#### useScreenShare (`hooks/useScreenShare.ts`)
```typescript
const { screenRef, canvasRef, startShare, stopShare, isSharing } = useScreenShare({
  onFrame: (frameData: string) => void,
});
```
- Requests 1920x1080 at 15 FPS
- Captures at 640x480

### 4.4 State Management

**Pattern:** React Hooks (no Redux/Context)

**Main Coaching Page State:**
```typescript
const [isSessionActive, setIsSessionActive] = useState(false);
const [messages, setMessages] = useState<TextResponse[]>([]);
const [currentTip, setCurrentTip] = useState<string | null>(null);
const [tipCategory, setTipCategory] = useState<'tip' | 'correction' | 'praise' | 'question'>('tip');
const [isMicEnabled, setIsMicEnabled] = useState(true);
const [isCameraEnabled, setIsCameraEnabled] = useState(true);
const [annotations, setAnnotations] = useState<ScreenAnnotation[]>([]);
```

### 4.5 Styling

- **Framework:** Tailwind CSS 4
- **Components:** shadcn/ui
- **Theme:** Dark mode (forced via `<html className="dark">`)
- **Custom Utilities** in `globals.css`:
  - `.glass` - Glassmorphism effect
  - `.gradient-primary` - Purple to blue gradient
  - `.gradient-text` - Background clip text gradient
  - `.shadow-glow` - Glow shadow effect

---

## 5. Backend Architecture

### 5.1 Application Structure

**Entry Point:** `backend/app/main.py`

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting MirrorCoach backend...")
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(title="MirrorCoach AI", lifespan=lifespan)
app.include_router(health_router, prefix="/health")
app.include_router(coaching_router, prefix="/ws")
```

### 5.2 API Endpoints

#### REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Root endpoint with service info |
| GET | `/health` | Basic health check |
| GET | `/health/ready` | Readiness probe (checks API key) |
| GET | `/health/live` | Kubernetes liveness probe |
| GET | `/health/config` | Non-sensitive config info |
| GET | `/ws/skills` | Get available coaching skills |

#### WebSocket Endpoints

| Path | Parameters | Purpose |
|------|------------|---------|
| `/ws/coaching/{skill}` | `skill` (path), `language` (query, default: "en") | Real-time coaching session |

### 5.3 Key Services

#### GeminiLiveSession (`services/gemini_live.py`)
- Manages WebSocket connection to Gemini Live API
- Handles real-time audio/video/text streaming
- Callback pattern for text/audio/error handling
- Separate locks for concurrent video/audio/text

```python
class GeminiLiveSession:
    async def connect(self) -> None
    async def send_video_frame(self, frame_data: str, mime_type: str = "image/jpeg") -> None
    async def send_audio_chunk(self, audio_data: str, sample_rate: int = 16000) -> None
    async def send_text(self, text: str) -> None
    async def close(self) -> None
```

#### CoachingSessionHandler (`routers/coaching.py`)
- Manages individual WebSocket client connections
- Routes messages between client and Gemini
- Handles session lifecycle and timeouts (15 min max)

```python
class CoachingSessionHandler:
    async def start_session(self, skill: str) -> None
    async def end_session(self, reason: str = None) -> None
    async def handle_video_frame(self, message: VideoFrameMessage) -> None
    async def handle_audio_chunk(self, message: AudioChunkMessage) -> None
    async def handle_text(self, message: TextMessage) -> None
    async def process_message(self, data: dict) -> None
```

#### ResponseSanitizer (`services/response_sanitizer.py`)
- Filters prompt leakage and meta-commentary
- Removes markdown headers, internal thinking, instruction acknowledgments

#### AnnotationParser (`services/annotation_parser.py`)
- Extracts `<ANNOTATIONS>` blocks from responses
- Validates annotation objects
- Used for screen_assistant skill

### 5.4 Prompt Engineering

**Location:** `backend/app/prompts/base.py`

**4-Tier Structure:**
1. **Tier 1 - Persona:** "You are Coach Alex, a supportive and encouraging coach..."
2. **Tier 2 - Rules:** Greeting behavior, ongoing coaching style, response length (max 2 sentences)
3. **Tier 3 - Capabilities:** What the coach can observe (video, audio)
4. **Tier 4 - Guardrails:** Safety rules, output boundaries

**Skill Contexts:**
| Skill | Focus Areas |
|-------|-------------|
| `guitar` | Finger placement, hand position, strumming, chord clarity |
| `yoga` | Alignment, balance, muscle engagement, breathing |
| `fitness` | Form, range of motion, posture, fatigue |
| `cooking` | Knife technique, pan management, safety |
| `pushups` | Body alignment, elbow angle, core, rep quality |
| `screen_assistant` | Screen navigation, UI guidance, visual annotations |

**Critical Output Constraint:**
```
OUTPUT BOUNDARIES - CRITICAL:
- Your response is spoken aloud to the user
- Output ONLY what you want the user to HEAR
- No headers, labels, or markdown formatting
- No internal notes or thinking
- Just speak naturally as Coach Alex
```

---

## 6. Gemini Live API Integration

### 6.1 Connection Setup

**File:** `backend/app/services/gemini_live.py`

```python
from google import genai
from google.genai import types

async def connect(self) -> None:
    self._client = genai.Client(api_key=self.settings.gemini_api_key)

    config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": self.settings.gemini_voice  # "Kore"
                }
            }
        },
        "system_instruction": self.system_instruction,
    }

    self._session_context = self._client.aio.live.connect(
        model=self.settings.gemini_model,  # "gemini-2.0-flash-exp"
        config=config,
    )
    self._session = await self._session_context.__aenter__()
```

### 6.2 Sending Media

**Video Frame:**
```python
async def send_video_frame(self, frame_data: str, mime_type: str = "image/jpeg") -> None:
    async with self._video_lock:
        video_bytes = base64.b64decode(frame_data)
        await self._session.send_realtime_input(
            media=types.Blob(data=video_bytes, mime_type=mime_type)
        )
```

**Audio Chunk:**
```python
async def send_audio_chunk(self, audio_data: str, sample_rate: int = 16000) -> None:
    async with self._audio_lock:
        audio_bytes = base64.b64decode(audio_data)
        full_mime_type = f"audio/pcm;rate={sample_rate}"
        await self._session.send_realtime_input(
            audio=types.Blob(data=audio_bytes, mime_type=full_mime_type)
        )
```

### 6.3 Receiving Responses

```python
async def _receive_loop(self) -> None:
    async for response in self._session.receive():
        await self._handle_response(response)

async def _handle_response(self, response) -> None:
    if hasattr(response, 'server_content') and response.server_content:
        model_turn = response.server_content.model_turn
        if model_turn and model_turn.parts:
            for part in model_turn.parts:
                # Text response
                if hasattr(part, 'text') and part.text:
                    sanitized = sanitize_response(part.text)
                    if sanitized and self.on_text:
                        await self.on_text(sanitized)

                # Audio response
                if hasattr(part, 'inline_data') and part.inline_data:
                    audio_bytes = part.inline_data.data
                    if self.on_audio:
                        await self.on_audio(audio_bytes)
```

### 6.4 Gemini Models

| Model | Capabilities |
|-------|-------------|
| `gemini-2.0-flash-exp` | Text + vision input, text output |
| `gemini-2.5-flash-native-audio-preview-12-2025` | Text + vision + audio input, audio output |

### 6.5 Error Handling

**Custom Exception:**
```python
class GeminiSessionError(Exception):
    def __init__(self, message: str, code: str = "GEMINI_ERROR", details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
```

**Error Codes:**
- `GEMINI_ERROR` - Generic Gemini error
- `CONNECTION_FAILED` - Failed to establish connection
- `NOT_CONNECTED` - Session not connected
- `SEND_FAILED` - Failed to send message
- `SESSION_ACTIVE` - Session already active
- `VALIDATION_ERROR` - Invalid message format

---

## 7. Video & Audio Handling

### 7.1 Video Pipeline

```
Camera/Screen → MediaStream → Canvas Render → JPEG Compress → Base64 → WebSocket → Backend → Gemini
```

**Specifications:**
| Parameter | Value |
|-----------|-------|
| Capture Resolution | 1280x720 (camera), 1920x1080 (screen) |
| Transmission Resolution | 640x480 |
| Frame Rate | 10 FPS |
| Format | JPEG |
| Quality | 0.7 (70%) |
| Encoding | Base64 |

**Frame Capture Code:**
```typescript
// In VideoFeed.tsx
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;

// Mirror for selfie view
ctx.translate(canvas.width, 0);
ctx.scale(-1, 1);
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

// Compress to JPEG
const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
const base64Data = dataUrl.split(',')[1];
onFrame(base64Data);
```

### 7.2 Audio Pipeline

**Input (User → AI):**
```
Microphone → MediaStream → ScriptProcessor → Float32 → Int16 PCM → Base64 → WebSocket → Backend → Gemini
```

| Parameter | Value |
|-----------|-------|
| Sample Rate | 16000 Hz |
| Channels | Mono |
| Format | PCM16 (Int16) |
| Buffer Size | 2048 samples (~128ms) |
| Features | Echo cancellation, noise suppression, auto gain |

**Output (AI → User):**
```
Gemini → Backend → WebSocket → Base64 PCM16 → AudioBuffer → Web Audio API → Speakers
```

| Parameter | Value |
|-----------|-------|
| Sample Rate | 24000 Hz |
| Format | PCM16 |
| Playback | Scheduled buffer (gap-free) |

### 7.3 No Video Storage

MirrorCoach uses **streaming only** - no video files are stored. All frames are processed in real-time and discarded after transmission to Gemini.

---

## 8. WebSocket Protocol

### 8.1 Connection

**URL:** `ws://backend:8000/ws/coaching/{skill}?language=en`

**Lifecycle:**
1. Client connects to WebSocket
2. Server accepts and auto-starts session
3. Gemini Live API connection established
4. Initial greeting sent to AI
5. Bidirectional streaming begins
6. Session timeout check every 30 seconds
7. Disconnect or timeout → cleanup

### 8.2 Client → Server Messages

```typescript
// Video Frame
{
  type: "video_frame",
  data: string,      // Base64 JPEG
  timestamp: number,
  width?: number,    // 640
  height?: number    // 480
}

// Audio Chunk
{
  type: "audio_chunk",
  data: string,        // Base64 PCM16
  sample_rate: number, // 16000
  timestamp: number
}

// Text Message
{
  type: "text",
  content: string
}

// Start Session
{
  type: "start_session",
  skill: string,
  session_id?: string
}

// End Session
{
  type: "end_session",
  reason?: string
}
```

### 8.3 Server → Client Messages

```typescript
// Text Response
{
  type: "text_response",
  content: string,
  is_partial: boolean,
  category?: "tip" | "correction" | "praise" | "question"
}

// Audio Response
{
  type: "audio_response",
  data: string,      // Base64 PCM16
  sample_rate: number, // 24000
  format: string     // "pcm16"
}

// Session Status
{
  type: "session_status",
  status: "connected" | "disconnected" | "error",
  session_id?: string,
  skill?: string,
  duration?: number,
  message?: string
}

// Error
{
  type: "error",
  code: string,
  message: string,
  details?: object
}

// Annotation (screen_assistant only)
{
  type: "annotation",
  annotations: AnnotationObject[],
  clear_previous: boolean
}
```

### 8.4 Annotation Format

```typescript
interface AnnotationObject {
  type: "arrow" | "circle" | "highlight" | "text";
  target: { x: number; y: number };  // 0-100 normalized
  label?: string;
  radius?: number;      // For circle
  size?: { width: number; height: number };  // For highlight
  color?: string;
  animation?: "pulse" | "bounce" | "fade" | "static";
  duration?: number;    // milliseconds
}
```

---

## 9. Key Files Reference

### Frontend Critical Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/coach/[skill]/page.tsx` | ~350 | Main coaching interface |
| `hooks/useWebSocket.ts` | ~100 | WebSocket management |
| `hooks/useCamera.ts` | ~80 | Camera capture |
| `hooks/useAudioCapture.ts` | ~120 | Microphone capture |
| `hooks/useAudioPlayback.ts` | ~100 | Audio playback |
| `components/video/VideoFeed.tsx` | ~100 | Video display + capture |
| `components/video/VideoOverlay.tsx` | ~80 | Feedback overlay |
| `components/screen/AnnotationCanvas.tsx` | ~200 | Visual annotations |
| `types/index.ts` | ~150 | TypeScript interfaces |
| `lib/responseSanitizer.ts` | ~100 | Frontend filtering |

### Backend Critical Files

| File | Lines | Purpose |
|------|-------|---------|
| `app/main.py` | ~50 | FastAPI app setup |
| `app/config.py` | ~40 | Configuration |
| `app/routers/coaching.py` | ~500 | WebSocket handler |
| `app/services/gemini_live.py` | ~450 | Gemini integration |
| `app/services/response_sanitizer.py` | ~150 | Response filtering |
| `app/services/annotation_parser.py` | ~100 | Annotation extraction |
| `app/models/messages.py` | ~150 | Pydantic models |
| `app/prompts/base.py` | ~200 | AI prompts |

---

## 10. Configuration

### 10.1 Environment Variables

**Required:**
```bash
GEMINI_API_KEY=your_api_key_here
```

**Optional:**
```bash
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false

# Gemini
GEMINI_MODEL=gemini-2.0-flash-exp
GEMINI_VOICE=Kore

# Session
MAX_SESSION_DURATION=900  # 15 minutes
VIDEO_FPS=10
AUDIO_CHUNK_MS=100

# CORS
ALLOWED_ORIGINS_STR=http://localhost:3000,http://127.0.0.1:3000
```

### 10.2 Frontend Environment

```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### 10.3 Configuration Class

**File:** `backend/app/config.py`

```python
class Settings(BaseSettings):
    gemini_api_key: str = ""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    gemini_model: str = "gemini-2.0-flash-exp"
    gemini_voice: str = "Kore"
    max_session_duration: int = 900
    video_fps: int = 10
    audio_chunk_ms: int = 100
    allowed_origins_str: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## 11. Development Commands

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Run development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with poe (if configured)
uv run poe dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

### Full Stack

```bash
# Terminal 1: Backend
cd backend && uv run uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## Appendix: Type Definitions

### Message Types (TypeScript)

```typescript
// Client message types
export type MessageType =
  | 'video_frame'
  | 'audio_chunk'
  | 'text_input'
  | 'start_session'
  | 'end_session';

// Server message types
export type ServerMessageType =
  | 'text_response'
  | 'audio_response'
  | 'session_status'
  | 'error'
  | 'annotation';

// Skill type
export type Skill =
  | 'guitar'
  | 'yoga'
  | 'fitness'
  | 'cooking'
  | 'pushups'
  | 'screen_assistant';

// Feedback category
export type FeedbackCategory =
  | 'tip'
  | 'correction'
  | 'praise'
  | 'question';
```

### Pydantic Models (Python)

```python
class MessageType(str, Enum):
    VIDEO_FRAME = "video_frame"
    AUDIO_CHUNK = "audio_chunk"
    TEXT = "text"
    START_SESSION = "start_session"
    END_SESSION = "end_session"
    TEXT_RESPONSE = "text_response"
    AUDIO_RESPONSE = "audio_response"
    ERROR = "error"
    SESSION_STATUS = "session_status"
    ANNOTATION = "annotation"

class VideoFrameMessage(BaseMessage):
    type: Literal[MessageType.VIDEO_FRAME]
    data: str  # Base64 JPEG
    timestamp: float
    width: Optional[int] = None
    height: Optional[int] = None

class AudioChunkMessage(BaseMessage):
    type: Literal[MessageType.AUDIO_CHUNK]
    data: str  # Base64 PCM16
    sample_rate: int = 16000
    timestamp: float
```

---

## Summary

MirrorCoach is a **real-time multimodal AI coaching platform** that:

1. **Captures** video (10 FPS, 640x480 JPEG) and audio (16kHz PCM16) from the user
2. **Streams** data over WebSocket to a FastAPI backend
3. **Forwards** to Google Gemini Live API for multimodal processing
4. **Returns** text feedback and speech (24kHz) to the user
5. **Displays** coaching tips with categorized overlays
6. **Supports** 6 skills with specialized prompts

**Key Design Decisions:**
- Stateless backend (no database)
- Real-time streaming (no video storage)
- Response sanitization (prevent prompt leakage)
- Separate locks for concurrent media streams
- Scheduled audio playback (gap-free)
- 15-minute session timeout

**When modifying this codebase:**
- Check `types/index.ts` and `models/messages.py` for message contracts
- Update both frontend and backend when changing protocols
- Test with actual Gemini API (no mocks available)
- Consider response sanitization for new AI outputs
- Follow existing patterns for hooks and services
