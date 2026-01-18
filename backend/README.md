# MirrorCoach Backend

FastAPI backend for real-time AI coaching with Gemini Live API integration.

## Tech Stack

- **FastAPI 0.115+** - ASGI web framework
- **Uvicorn** - ASGI server
- **Python 3.11+** - Runtime
- **Pydantic 2** - Data validation
- **google-genai** - Gemini Live API SDK
- **websockets** - WebSocket support

## Quick Start

```bash
# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start server
uv run uvicorn app.main:app --reload
```

Server runs at [http://localhost:8000](http://localhost:8000)

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.0-flash-exp` | Gemini model |
| `GEMINI_VOICE` | No | `Kore` | Voice preset |
| `HOST` | No | `0.0.0.0` | Server host |
| `PORT` | No | `8000` | Server port |
| `DEBUG` | No | `false` | Debug mode |
| `MAX_SESSION_DURATION` | No | `900` | Session timeout (sec) |
| `VIDEO_FPS` | No | `10` | Video frame rate |
| `AUDIO_CHUNK_MS` | No | `100` | Audio chunk size |
| `ALLOWED_ORIGINS_STR` | No | `localhost:3000` | CORS origins |

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # Configuration
│   ├── models/
│   │   └── messages.py         # Pydantic models
│   ├── routers/
│   │   ├── health.py           # Health endpoints
│   │   └── coaching.py         # WebSocket handler
│   ├── services/
│   │   ├── gemini_live.py      # Gemini integration
│   │   ├── response_sanitizer.py
│   │   └── annotation_parser.py
│   └── prompts/
│       └── base.py             # Coaching prompts
├── .env.example                # Environment template
└── .env                        # Your configuration
```

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/live` | Liveness probe |
| GET | `/health/config` | Configuration |
| GET | `/ws/skills` | Available skills |

### WebSocket Endpoint

```
WS /ws/coaching/{skill}?language=en
```

**Skills**: `guitar`, `yoga`, `fitness`, `cooking`, `pushups`, `screen_assistant`

### Message Protocol

**Client → Server:**

```json
{"type": "start_session", "skill": "guitar"}
{"type": "video_frame", "data": "base64", "width": 640, "height": 480}
{"type": "audio_chunk", "data": "base64", "sample_rate": 16000}
{"type": "text", "content": "message"}
{"type": "end_session"}
```

**Server → Client:**

```json
{"type": "session_status", "status": "connected", "session_id": "uuid"}
{"type": "text_response", "content": "feedback", "category": "tip"}
{"type": "audio_response", "data": "base64", "sample_rate": 24000}
{"type": "annotation", "annotations": [...]}
{"type": "error", "code": "ERROR_CODE", "message": "..."}
```

## Core Services

### GeminiLiveSession
Manages real-time streaming to Gemini API with video/audio/text support.

### CoachingSessionHandler
Handles WebSocket sessions, message routing, and session lifecycle.

### ResponseSanitizer
Filters AI responses to remove prompt leakage and meta-commentary.

### AnnotationParser
Extracts visual annotations from responses for screen assistant mode.

## Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
