<div align="center">

# MirrorCoach AI

### Real-Time AI Coaching Platform with Multimodal Feedback

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Gemini](https://img.shields.io/badge/Gemini_Live_API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)

<p align="center">
  <strong>Get real-time AI coaching for Guitar, Yoga, Fitness, Cooking, Push-ups, and Screen Navigation</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#available-skills">Skills</a> •
  <a href="#api-reference">API</a>
</p>

---

</div>

## Overview

MirrorCoach AI is a real-time coaching platform that provides personalized, multimodal feedback through video and audio streaming. Powered by Google's Gemini Live API, it offers instant coaching from "Coach Alex" - your AI coach who can see what you're doing and provide voice guidance in real-time.

<div align="center">

```
┌─────────────────┐      WebSocket       ┌──────────────────┐      Streaming      ┌─────────────────┐
│                 │  ◄───────────────►   │                  │  ◄───────────────►  │                 │
│   Next.js SPA   │   Video + Audio      │  FastAPI Server  │   Multimodal AI     │  Gemini Live    │
│                 │                      │                  │                     │                 │
└─────────────────┘                      └──────────────────┘                     └─────────────────┘
        │                                         │
        ▼                                         ▼
   Camera/Mic/Screen                    Response Sanitization
   Real-time Display                    Annotation Parsing
   Audio Playback                       Session Management
```

</div>

## Features

- **Real-Time Video Analysis** - Stream video at 10 FPS with intelligent JPEG compression
- **Bidirectional Audio** - Capture voice input and receive AI voice responses
- **6 Coaching Skills** - Guitar, Yoga, Fitness, Cooking, Push-ups, Screen Assistant
- **Visual Annotations** - Screen sharing mode with interactive visual guides
- **Natural Conversations** - Talk to Coach Alex naturally while practicing
- **Categorized Feedback** - Tips, Corrections, Praise, and Questions with color coding
- **Proactive Coaching** - AI observes and provides feedback without prompting
- **Dark Mode UI** - Beautiful glassmorphism interface

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) package manager
- Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/Ahmed14z/MirrorCoach.git
cd MirrorCoach

# Install all dependencies
uv run poe install-all
```

### Configuration

```bash
# Copy the environment template
cp backend/.env.example backend/.env

# Edit and add your Gemini API key
# Open backend/.env and set:
# GEMINI_API_KEY=your_api_key_here
```

### Running the Application

```bash
# Run both frontend and backend together
uv run poe both
```

This starts:
- **Backend** at `http://localhost:8000`
- **Frontend** at `http://localhost:3000`

Open your browser to `http://localhost:3000` and start coaching!

### Alternative: Run Services Separately

```bash
# Terminal 1 - Backend
uv run poe server

# Terminal 2 - Frontend
uv run poe client
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `uv run poe both` | Run frontend and backend together |
| `uv run poe server` | Run backend only |
| `uv run poe client` | Run frontend only |
| `uv run poe install-all` | Install all dependencies |
| `uv run poe install-client` | Install frontend dependencies only |

## Available Skills

<table>
<tr>
<td align="center" width="33%">

### 🎸 Guitar
Chord positions, finger placement, strumming technique, wrist tension

</td>
<td align="center" width="33%">

### 🧘 Yoga
Body alignment, breathing, posture corrections, balance guidance

</td>
<td align="center" width="33%">

### 💪 Fitness
Exercise form, range of motion, posture, rep counting

</td>
</tr>
<tr>
<td align="center" width="33%">

### 🍳 Cooking
Knife technique, pan management, safety tips, timing guidance

</td>
<td align="center" width="33%">

### 🏋️ Push-ups
Body alignment, elbow angle, core engagement, proper depth

</td>
<td align="center" width="33%">

### 🖥️ Screen Assistant
Navigation guidance, visual annotations, workflow tips, UI help

</td>
</tr>
</table>

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion |
| **Backend** | FastAPI, Python 3.11+, Uvicorn, Pydantic |
| **AI** | Google Gemini Live API (gemini-2.0-flash-exp) |
| **Communication** | WebSocket for real-time streaming |
| **Audio** | Web Audio API (16kHz capture, 24kHz playback) |

### Data Flow

```
Video Pipeline:
Camera/Screen → Canvas → JPEG (640x480) → Base64 → WebSocket → Gemini

Audio Pipeline (Input):
Microphone → Float32 → PCM16 (16kHz) → Base64 → WebSocket → Gemini

Audio Pipeline (Output):
Gemini → Base64 PCM16 (24kHz) → Web Audio API → Speakers
```

### Project Structure

```
mirrorcoach/
├── frontend/                    # Next.js frontend
│   ├── app/                     # App Router pages
│   ├── components/              # React components
│   ├── hooks/                   # Custom hooks (WebSocket, Camera, Audio)
│   ├── lib/                     # Utilities
│   └── types/                   # TypeScript definitions
│
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration
│   │   ├── models/              # Pydantic models
│   │   ├── routers/             # API & WebSocket routes
│   │   ├── services/            # Business logic (Gemini, Sanitizer)
│   │   └── prompts/             # AI coaching prompts
│   └── .env.example             # Environment template
│
├── pyproject.toml               # Python dependencies & poe tasks
└── README.md                    # This file
```

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API information |
| GET | `/health` | Health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/ws/skills` | List available skills |

### WebSocket Endpoint

```
WS /ws/coaching/{skill}?language=en
```

**Path Parameters:**
- `skill`: `guitar`, `yoga`, `fitness`, `cooking`, `pushups`, `screen_assistant`

**Query Parameters:**
- `language`: Response language (default: `en`)

### Message Types

<details>
<summary><strong>Client → Server</strong></summary>

```json
// Video Frame
{
  "type": "video_frame",
  "data": "base64_jpeg",
  "timestamp": 1234567890,
  "width": 640,
  "height": 480
}

// Audio Chunk
{
  "type": "audio_chunk",
  "data": "base64_pcm16",
  "sample_rate": 16000
}

// Text Message
{
  "type": "text",
  "content": "Your message"
}

// Session Control
{
  "type": "start_session" | "end_session",
  "skill": "guitar"
}
```

</details>

<details>
<summary><strong>Server → Client</strong></summary>

```json
// Text Response
{
  "type": "text_response",
  "content": "Coaching feedback",
  "category": "tip" | "correction" | "praise" | "question"
}

// Audio Response
{
  "type": "audio_response",
  "data": "base64_pcm16",
  "sample_rate": 24000
}

// Session Status
{
  "type": "session_status",
  "status": "connected" | "active" | "ended",
  "session_id": "uuid"
}

// Annotations (screen_assistant only)
{
  "type": "annotation",
  "annotations": [{
    "type": "arrow" | "circle" | "highlight",
    "target": {"x": 50, "y": 50},
    "color": "#ff0000"
  }]
}
```

</details>

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | *required* | Google Gemini API key |
| `GEMINI_MODEL` | `gemini-2.0-flash-exp` | Gemini model to use |
| `GEMINI_VOICE` | `Kore` | Voice for audio output |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |
| `MAX_SESSION_DURATION` | `900` | Max session (15 min) |
| `VIDEO_FPS` | `10` | Video frame rate |
| `AUDIO_CHUNK_MS` | `100` | Audio chunk size |

### Frontend Environment

```bash
# frontend/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Design Decisions

- **Stateless Backend** - No database; sessions exist in-memory only
- **Real-time Only** - No video storage; frames discarded after processing
- **Response Sanitization** - Filters prompt leakage and meta-commentary
- **Gap-free Audio** - Uses Web Audio API scheduling for seamless playback
- **Auto-reconnection** - 3 retry attempts with 2-second intervals
- **15-minute Sessions** - Automatic timeout for resource management

## Browser Requirements

- Chrome, Firefox, Edge, or Safari (latest versions)
- Camera and microphone permissions
- WebSocket support
- Web Audio API support

## License

MIT

---

<div align="center">
<p>Built with Gemini Live API</p>
</div>
