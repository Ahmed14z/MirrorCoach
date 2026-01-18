"""WebSocket coaching endpoint with real-time video/audio streaming."""

import asyncio
import base64
import json
import logging
import time
import uuid
from typing import Optional, Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError

from app.config import get_settings
from app.models.messages import (
    MessageType,
    VideoFrameMessage,
    AudioChunkMessage,
    TextMessage,
    StartSessionMessage,
    EndSessionMessage,
    TextResponse,
    AudioResponse,
    ErrorResponse,
    SessionStatusResponse,
    AnnotationResponse,
)
from app.services.gemini_live import GeminiLiveSession, GeminiSessionError
from app.services.annotation_parser import parse_annotations
from app.prompts import get_skill_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["Coaching"])


class CoachingSessionHandler:
    """
    Handles a single coaching WebSocket session.

    Manages the lifecycle of a coaching session including:
    - WebSocket connection management
    - Gemini Live API integration
    - Message routing between client and AI
    - Session state tracking
    - Proactive coaching loop for continuous observation
    """

    def __init__(self, websocket: WebSocket):
        """
        Initialize the coaching session handler.

        Args:
            websocket: The WebSocket connection from the client
        """
        self.websocket = websocket
        self.settings = get_settings()
        self.session_id: Optional[str] = None
        self.skill: Optional[str] = None
        self.gemini_session: Optional[GeminiLiveSession] = None
        self.start_time: Optional[float] = None
        self.is_active: bool = False
        self._send_lock = asyncio.Lock()
        self._message_queue: asyncio.Queue[Dict[str, Any]] = asyncio.Queue()
        self._processing_task: Optional[asyncio.Task] = None
        self._proactive_task: Optional[asyncio.Task] = None

    async def send_message(self, message: Dict[str, Any]) -> None:
        """
        Send a message to the WebSocket client.

        Args:
            message: The message dictionary to send
        """
        async with self._send_lock:
            try:
                await self.websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")

    async def send_error(self, code: str, message: str, details: Optional[dict] = None) -> None:
        """
        Send an error message to the client.

        Args:
            code: Error code
            message: Human-readable error message
            details: Optional additional details
        """
        error = ErrorResponse(code=code, message=message, details=details)
        await self.send_message(error.model_dump())

    async def send_status(
        self,
        status: str,
        message: Optional[str] = None,
    ) -> None:
        """
        Send a status update to the client.

        Args:
            status: Current session status
            message: Optional status message
        """
        duration = None
        if self.start_time:
            duration = time.time() - self.start_time

        status_msg = SessionStatusResponse(
            status=status,  # type: ignore
            session_id=self.session_id,
            skill=self.skill,
            duration=duration,
            message=message,
        )
        await self.send_message(status_msg.model_dump())

    async def _on_gemini_text(self, text: str) -> None:
        """
        Handle text response from Gemini.

        For screen_assistant skill, parses annotation markup and sends
        separate annotation messages to the client.

        Args:
            text: The text content from Gemini
        """
        # Check if this is a screen assistant session that might have annotations
        if self.skill == "screen_assistant":
            clean_text, annotations = parse_annotations(text)

            # Send annotations if any were found
            if annotations:
                annotation_response = AnnotationResponse(
                    annotations=annotations,
                    clear_previous=True,
                )
                await self.send_message(annotation_response.model_dump())

            # Send cleaned text (without annotation markup) if non-empty
            if clean_text:
                response = TextResponse(content=clean_text, is_partial=False)
                await self.send_message(response.model_dump())
        else:
            # Non-screen-assistant skills: send text as-is
            response = TextResponse(content=text, is_partial=False)
            await self.send_message(response.model_dump())

    async def _on_gemini_audio(self, audio_data: bytes) -> None:
        """
        Handle audio response from Gemini.

        Args:
            audio_data: Raw audio bytes from Gemini
        """
        # Encode audio as base64 for WebSocket transmission
        audio_b64 = base64.b64encode(audio_data).decode("utf-8")
        response = AudioResponse(data=audio_b64, sample_rate=24000, format="pcm16")
        await self.send_message(response.model_dump())

    async def _on_gemini_error(self, error: Exception) -> None:
        """
        Handle error from Gemini.

        Args:
            error: The exception that occurred
        """
        logger.error(f"Gemini error: {error}")
        await self.send_error(
            code="GEMINI_ERROR",
            message=str(error),
        )

    async def _proactive_coaching_loop(self) -> None:
        """
        Background task to periodically trigger AI observation.

        Sends proactive check messages every 4 seconds to prompt the AI
        to observe the video feed and provide coaching feedback.
        The AI should stay quiet if everything looks good.
        """
        # Initial delay - let session warm up and allow initial greeting
        await asyncio.sleep(5)

        while self.is_active and self.gemini_session:
            try:
                await self.gemini_session.send_proactive_check()
            except Exception as e:
                logger.error(f"Proactive check failed: {e}")

            # Wait 4 seconds between checks
            await asyncio.sleep(4)

    async def start_session(self, skill: str, session_id: Optional[str] = None) -> None:
        """
        Start a new coaching session with Gemini.

        Args:
            skill: The skill to practice
            session_id: Optional session ID for resumption
        """
        if self.is_active:
            await self.send_error(
                code="SESSION_ACTIVE",
                message="A session is already active. End it first.",
            )
            return

        self.session_id = session_id or str(uuid.uuid4())
        self.skill = skill
        self.start_time = time.time()

        await self.send_status("connecting", "Connecting to AI coach...")

        try:
            # Get the skill-specific prompt
            system_prompt = get_skill_prompt(skill)

            # Create and connect the Gemini session
            self.gemini_session = GeminiLiveSession(
                system_instruction=system_prompt,
                on_text=self._on_gemini_text,
                on_audio=self._on_gemini_audio,
                on_error=self._on_gemini_error,
            )

            await self.gemini_session.connect()
            self.is_active = True

            # Start the proactive coaching loop for continuous observation
            self._proactive_task = asyncio.create_task(self._proactive_coaching_loop())

            await self.send_status("connected", f"Connected! Ready to practice {skill.replace('_', ' ')}.")
            logger.info(f"Session {self.session_id} started for skill: {skill}")

        except GeminiSessionError as e:
            await self.send_error(code=e.code, message=e.message, details=e.details)
            self.is_active = False
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            await self.send_error(
                code="SESSION_START_FAILED",
                message=f"Failed to start session: {str(e)}",
            )
            self.is_active = False

    async def end_session(self, reason: Optional[str] = None) -> None:
        """
        End the current coaching session.

        Args:
            reason: Optional reason for ending
        """
        if not self.is_active:
            await self.send_status("ended", "No active session")
            return

        self.is_active = False

        # Cancel the proactive coaching loop
        if self._proactive_task and not self._proactive_task.done():
            self._proactive_task.cancel()
            try:
                await self._proactive_task
            except asyncio.CancelledError:
                pass
            self._proactive_task = None

        # Close Gemini session
        if self.gemini_session:
            await self.gemini_session.close()
            self.gemini_session = None

        duration = time.time() - self.start_time if self.start_time else 0
        logger.info(f"Session {self.session_id} ended. Duration: {duration:.1f}s. Reason: {reason}")

        await self.send_status("ended", reason or "Session ended")

    async def handle_video_frame(self, message: VideoFrameMessage) -> None:
        """
        Handle incoming video frame from client.

        Args:
            message: The video frame message
        """
        if not self.is_active or not self.gemini_session:
            return

        try:
            await self.gemini_session.send_video_frame(message.data)
        except GeminiSessionError as e:
            await self.send_error(code=e.code, message=e.message)
        except Exception as e:
            logger.error(f"Error sending video frame: {e}")

    async def handle_audio_chunk(self, message: AudioChunkMessage) -> None:
        """
        Handle incoming audio chunk from client.

        Args:
            message: The audio chunk message
        """
        if not self.is_active or not self.gemini_session:
            logger.debug("Audio chunk received but session not active")
            return

        try:
            logger.debug(f"Forwarding audio chunk to Gemini: {len(message.data)} chars, rate={message.sample_rate}")
            await self.gemini_session.send_audio_chunk(
                audio_data=message.data,
                sample_rate=message.sample_rate,
            )
        except GeminiSessionError as e:
            await self.send_error(code=e.code, message=e.message)
        except Exception as e:
            logger.error(f"Error sending audio chunk: {e}")

    async def handle_text(self, message: TextMessage) -> None:
        """
        Handle incoming text message from client.

        Args:
            message: The text message
        """
        if not self.is_active or not self.gemini_session:
            await self.send_error(
                code="NO_ACTIVE_SESSION",
                message="No active session. Start a session first.",
            )
            return

        try:
            await self.gemini_session.send_text(message.content)
        except GeminiSessionError as e:
            await self.send_error(code=e.code, message=e.message)
        except Exception as e:
            logger.error(f"Error sending text: {e}")

    async def process_message(self, data: Dict[str, Any]) -> None:
        """
        Process an incoming WebSocket message with priority handling.

        Priority order (highest to lowest):
        1. AUDIO_CHUNK - highest priority, process immediately
        2. Session control (START_SESSION, END_SESSION)
        3. TEXT
        4. VIDEO_FRAME - lowest priority (can be dropped)

        Args:
            data: The parsed JSON message data
        """
        try:
            message_type = data.get("type")
            # Log non-video messages (video frames are too frequent)
            if message_type != "video_frame":
                logger.debug(f"Received message type: {message_type}")

            # PRIORITY 1: Audio - process immediately (highest priority)
            if message_type == MessageType.AUDIO_CHUNK:
                msg = AudioChunkMessage(**data)
                await self.handle_audio_chunk(msg)
                return

            # PRIORITY 2: Session control
            if message_type == MessageType.START_SESSION:
                msg = StartSessionMessage(**data)
                await self.start_session(msg.skill, msg.session_id)
                return

            if message_type == MessageType.END_SESSION:
                msg = EndSessionMessage(**data)
                await self.end_session(msg.reason)
                return

            # PRIORITY 3: Text
            if message_type == MessageType.TEXT:
                msg = TextMessage(**data)
                await self.handle_text(msg)
                return

            # PRIORITY 4: Video - lowest priority (can be dropped)
            if message_type == MessageType.VIDEO_FRAME:
                msg = VideoFrameMessage(**data)
                await self.handle_video_frame(msg)
                return

            # Unknown message type
            logger.warning(f"Unknown message type: {message_type}")
            await self.send_error(
                code="UNKNOWN_MESSAGE_TYPE",
                message=f"Unknown message type: {message_type}",
            )

        except ValidationError as e:
            await self.send_error(
                code="VALIDATION_ERROR",
                message="Invalid message format",
                details={"errors": e.errors()},
            )
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await self.send_error(
                code="PROCESSING_ERROR",
                message=f"Error processing message: {str(e)}",
            )

    async def check_session_timeout(self) -> bool:
        """
        Check if the session has exceeded the maximum duration.

        Returns:
            True if session has timed out, False otherwise
        """
        if not self.start_time or not self.is_active:
            return False

        elapsed = time.time() - self.start_time
        if elapsed >= self.settings.max_session_duration:
            await self.end_session("Maximum session duration reached")
            return True

        return False

    async def run(self) -> None:
        """
        Main loop for handling the WebSocket connection.

        Receives messages, processes them, and handles disconnection.
        """
        try:
            await self.websocket.accept()
            logger.info("WebSocket connection accepted")

            await self.send_status(
                "connected",
                "Connected to MirrorCoach. Send a start_session message to begin.",
            )

            # Start timeout checker
            timeout_task = asyncio.create_task(self._timeout_checker())

            try:
                while True:
                    # Receive message
                    try:
                        data = await self.websocket.receive_json()
                        await self.process_message(data)
                    except json.JSONDecodeError:
                        await self.send_error(
                            code="INVALID_JSON",
                            message="Invalid JSON message",
                        )

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session {self.session_id}")
            finally:
                timeout_task.cancel()
                try:
                    await timeout_task
                except asyncio.CancelledError:
                    pass

        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            # Clean up session
            if self.is_active:
                await self.end_session("Connection closed")

    async def _timeout_checker(self) -> None:
        """Background task to check for session timeout."""
        while True:
            await asyncio.sleep(30)  # Check every 30 seconds
            if await self.check_session_timeout():
                break


@router.websocket("/coaching/{skill}")
async def coaching_websocket(websocket: WebSocket, skill: str, language: str = "en") -> None:
    """
    WebSocket endpoint for real-time skill coaching sessions.

    This endpoint auto-starts a session for the specified skill when connected.

    Path Parameters:
        skill: The skill to coach (guitar, yoga, fitness, cooking, pushups)

    Query Parameters:
        language: Language for responses (default: en)

    This endpoint handles:
    - Video frame streaming from client webcam (10 FPS)
    - Audio chunk streaming from client microphone (16kHz PCM)
    - Text messages from client
    - AI coach responses (text and audio)

    Message Protocol:
    - Client sends JSON messages with 'type' field
    - Server responds with JSON messages

    Supported message types (client -> server):
    - video_frame: Send a video frame (base64 JPEG)
    - audio_chunk: Send an audio chunk (base64 PCM)
    - text_input: Send a text message

    Response types (server -> client):
    - session_state: Session state updates
    - text_response: Text from AI coach
    - audio_response: Audio from AI coach
    - error: Error messages
    """
    handler = CoachingSessionHandler(websocket)
    # Auto-start the session with the skill from the URL
    await websocket.accept()
    await handler.start_session(skill)

    # Run the message handling loop (without re-accepting)
    try:
        timeout_task = asyncio.create_task(handler._timeout_checker())
        try:
            while handler.is_active:
                try:
                    data = await websocket.receive_json()
                    await handler.process_message(data)
                except json.JSONDecodeError:
                    await handler.send_error(
                        code="INVALID_JSON",
                        message="Invalid JSON message",
                    )
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for session {handler.session_id}")
        finally:
            timeout_task.cancel()
            try:
                await timeout_task
            except asyncio.CancelledError:
                pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if handler.is_active:
            await handler.end_session("Connection closed")


@router.get("/skills")
async def get_skills() -> Dict[str, Any]:
    """
    Get available coaching skills.

    Returns:
        Dict containing list of available skills with descriptions
    """
    from app.prompts.base import SKILL_CONTEXTS

    skills = []
    for skill_id in SKILL_CONTEXTS.keys():
        # Create a human-readable name
        name = skill_id.replace("_", " ").title()
        skills.append({
            "id": skill_id,
            "name": name,
        })

    return {
        "skills": skills,
        "default": "general",
    }
