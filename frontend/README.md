# MirrorCoach Frontend

Next.js 16 frontend for real-time AI coaching with video/audio streaming.

## Tech Stack

- **Next.js 16.1.3** - App Router, Server Components
- **React 19.2.3** - Latest React with hooks
- **TypeScript** - Strict type safety
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Component library
- **Framer Motion** - Animations
- **Web Audio API** - Audio capture/playback

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home (skill selection)
│   └── coach/[skill]/page.tsx  # Coaching session
├── components/
│   ├── coaching/               # Session controls
│   ├── screen/                 # Screen sharing
│   ├── video/                  # Video display
│   ├── shared/                 # Common components
│   └── ui/                     # shadcn/ui components
├── hooks/
│   ├── useWebSocket.ts         # WebSocket connection
│   ├── useCamera.ts            # Camera capture
│   ├── useScreenShare.ts       # Screen sharing
│   ├── useAudioCapture.ts      # Mic input
│   └── useAudioPlayback.ts     # Audio output
├── lib/
│   ├── constants.ts            # App configuration
│   ├── utils.ts                # Utilities
│   └── responseSanitizer.ts    # Response filtering
└── types/
    └── index.ts                # TypeScript types
```

## Key Features

### Real-time Media Streaming

- **Video**: 640x480 JPEG at 10 FPS
- **Audio In**: 16kHz mono PCM16 with noise suppression
- **Audio Out**: 24kHz gap-free playback

### Supported Skills

1. Guitar - Chord and technique coaching
2. Yoga - Posture and alignment
3. Fitness - Exercise form
4. Cooking - Knife skills and safety
5. Push-ups - Form analysis
6. Screen Assistant - Navigation with annotations

### UI/UX

- Dark theme with glassmorphism
- Categorized feedback (Tips, Corrections, Praise)
- Live connection status
- Session controls (mic/camera toggle)

## Browser Support

- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

Requires camera and microphone permissions.
