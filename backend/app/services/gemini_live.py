"""Gemini Live API session management using google-genai SDK."""

import asyncio
import base64
import logging
from typing import AsyncIterator, Optional, Callable, Any

from google import genai
from google.genai import types

from app.config import get_settings
from app.services.response_sanitizer import sanitize_response

logger = logging.getLogger(__name__)


class GeminiSessionError(Exception):
    """Custom exception for Gemini session errors."""

    def __init__(self, message: str, code: str = "GEMINI_ERROR", details: Optional[dict] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class GeminiLiveSession:
    """
    Manages a live streaming session with Gemini's multimodal API.

    Uses the google-genai SDK for WebSocket-based real-time communication
    with video and audio streaming capabilities.
    """

    def __init__(
        self,
        system_instruction: str,
        on_text: Optional[Callable[[str], Any]] = None,
        on_audio: Optional[Callable[[bytes], Any]] = None,
        on_error: Optional[Callable[[Exception], Any]] = None,
    ):
        """
        Initialize the Gemini Live session.

        Args:
            system_instruction: The system prompt for the AI coach
            on_text: Callback for text responses
            on_audio: Callback for audio responses
            on_error: Callback for errors
        """
        self.settings = get_settings()
        self.system_instruction = system_instruction
        self.on_text = on_text
        self.on_audio = on_audio
        self.on_error = on_error

        self._client: Optional[genai.Client] = None
        self._session: Optional[Any] = None
        self._session_context: Optional[Any] = None  # Store the context manager
        self._is_connected: bool = False
        self._receive_task: Optional[asyncio.Task] = None

        # Latest-frame-only strategy for video (reduces latency by dropping old frames)
        self._latest_video_frame: Optional[bytes] = None
        self._latest_video_mime: str = "image/jpeg"
        self._video_send_task: Optional[asyncio.Task] = None
        self._video_send_lock = asyncio.Lock()  # Only for task management

        # Text still uses a lock for ordered delivery
        self._text_lock = asyncio.Lock()

    @property
    def is_connected(self) -> bool:
        """Check if session is connected."""
        return self._is_connected and self._session is not None

    async def connect(self) -> None:
        """
        Establish connection to Gemini Live API.

        Raises:
            GeminiSessionError: If connection fails
        """
        if self._is_connected:
            logger.warning("Session already connected")
            return

        try:
            # Initialize the client with API key and v1alpha API version
            # v1alpha is required for proactive audio and other preview features
            self._client = genai.Client(
                api_key=self.settings.gemini_api_key,
                http_options=types.HttpOptions(api_version='v1alpha')
            )

            # Configure the live session
            # Model-specific config:
            # - gemini-2.0-flash-exp: TEXT only (no audio output)
            # - gemini-2.5-flash-native-audio: AUDIO output supported
            config = {
                "response_modalities": ["AUDIO"],
                "speech_config": {
                    "voice_config": {
                        "prebuilt_voice_config": {
                            "voice_name": self.settings.gemini_voice
                        }
                    }
                },
                "system_instruction": self.system_instruction,
            }

            # PROACTIVE AUDIO: Allow AI to decide when to respond
            # This enables the coach to proactively provide feedback based on visual observations
            # without waiting for user speech - perfect for hands-on activities
            if self.settings.enable_proactive_audio:
                config["proactivity"] = {
                    "proactive_audio": True
                }

            # SMART VAD CONFIGURATION for hands-on activities
            # Users doing guitar, painting, design can't do manual turn control
            # VAD stays automatic but configured to be less trigger-happy
            config["realtime_input_config"] = {
                # Smart VAD settings - tolerates background noise from activities
                "automatic_activity_detection": {
                    "disabled": False,  # Keep VAD enabled (automatic)
                    # LOW sensitivity = less trigger-happy, good for background noise
                    "start_of_speech_sensitivity": types.StartSensitivity.START_SENSITIVITY_LOW,
                    "end_of_speech_sensitivity": types.EndSensitivity.END_SENSITIVITY_LOW,
                    "silence_duration_ms": self.settings.vad_silence_duration_ms,
                    "prefix_padding_ms": self.settings.vad_prefix_padding_ms,
                }
            }

            # MEMORY: Enable context window compression for longer sessions
            # This allows video+audio sessions to exceed 2 minutes
            # Older context is compressed/pruned when token limit is reached
            if self.settings.enable_context_compression:
                config["context_window_compression"] = {
                    "sliding_window": {},
                    "trigger_tokens": self.settings.context_compression_trigger_tokens
                }

            # Connect using the async context manager approach
            # Note: Live API expects model name without "models/" prefix
            self._session_context = self._client.aio.live.connect(
                model=self.settings.gemini_model,
                config=config,
            )
            self._session = await self._session_context.__aenter__()

            self._is_connected = True
            logger.info(f"Connected to Gemini Live API with model {self.settings.gemini_model}")

            # Start the receive loop
            self._receive_task = asyncio.create_task(self._receive_loop())

            # Trigger the AI to greet and start the coaching session
            await asyncio.sleep(0.3)
            await self._send_initial_greeting()

        except Exception as e:
            logger.error(f"Failed to connect to Gemini: {e}")
            self._is_connected = False
            raise GeminiSessionError(
                message=f"Failed to connect to Gemini Live API: {str(e)}",
                code="CONNECTION_FAILED",
                details={"original_error": str(e)},
            )

    async def _send_initial_greeting(self) -> None:
        """Send an initial message to trigger the AI coach to greet and start observing."""
        if not self._session:
            return

        try:
            # Send a brief trigger to get the AI to introduce itself and start coaching
            await self._session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[types.Part(text="Hi! I'm ready to start practicing. Please greet me and watch my form.")]
                ),
                turn_complete=True
            )
            logger.info("Sent initial greeting trigger to AI coach")
        except Exception as e:
            logger.error(f"Failed to send initial greeting: {e}")

    async def _receive_loop(self) -> None:
        """Background task to receive and process responses from Gemini."""
        if not self._session:
            return

        try:
            while self._is_connected:
                try:
                    async for response in self._session.receive():
                        await self._handle_response(response)
                except asyncio.CancelledError:
                    logger.info("Receive loop cancelled")
                    break
                except Exception as e:
                    if self._is_connected:
                        logger.error(f"Error in receive loop: {e}")
                        if self.on_error:
                            await self._call_handler(self.on_error, e)
                    break
        except Exception as e:
            logger.error(f"Fatal error in receive loop: {e}")
            if self.on_error:
                await self._call_handler(self.on_error, e)

    async def _handle_response(self, response: Any) -> None:
        """
        Handle a response from Gemini.

        Args:
            response: The response object from Gemini
        """
        try:
            # Debug: Log what we received
            logger.debug(f"Received response type: {type(response).__name__}")

            # Handle server content (text and audio)
            if hasattr(response, "server_content") and response.server_content:
                server_content = response.server_content
                logger.debug(f"Got server_content: {type(server_content).__name__}")

                if hasattr(server_content, "model_turn") and server_content.model_turn:
                    model_turn = server_content.model_turn
                    logger.debug(f"Got model_turn with {len(model_turn.parts) if hasattr(model_turn, 'parts') else 0} parts")

                    if hasattr(model_turn, "parts"):
                        for part in model_turn.parts:
                            # Handle text parts
                            if hasattr(part, "text") and part.text:
                                raw_text = part.text
                                logger.info(f"Received raw text from Gemini: {raw_text[:100]}...")

                                # Sanitize response to filter out prompt leakage
                                sanitized_text = sanitize_response(raw_text)

                                if sanitized_text and self.on_text:
                                    logger.info(f"Sending sanitized text: {sanitized_text[:100]}...")
                                    await self._call_handler(self.on_text, sanitized_text)
                                elif not sanitized_text:
                                    logger.warning(f"Text filtered out by sanitizer: {raw_text[:100]}...")

                            # Handle audio parts (inline_data)
                            if hasattr(part, "inline_data") and part.inline_data:
                                inline_data = part.inline_data
                                if hasattr(inline_data, "data") and inline_data.data:
                                    audio_bytes = inline_data.data
                                    if isinstance(audio_bytes, str):
                                        audio_bytes = base64.b64decode(audio_bytes)
                                    logger.info(f"Received audio from Gemini: {len(audio_bytes)} bytes")
                                    if self.on_audio:
                                        await self._call_handler(self.on_audio, audio_bytes)
                else:
                    # Check for turn_complete or interrupted signals
                    if hasattr(server_content, "turn_complete") and server_content.turn_complete:
                        logger.debug("Turn complete signal received")
                    if hasattr(server_content, "interrupted") and server_content.interrupted:
                        logger.debug("Interrupted signal received")
            else:
                # Log other response types for debugging
                attrs = [a for a in dir(response) if not a.startswith('_')]
                logger.debug(f"Response attributes: {attrs[:10]}")

            # Handle tool calls if any (for future extension)
            if hasattr(response, "tool_call") and response.tool_call:
                logger.debug(f"Received tool call: {response.tool_call}")

        except Exception as e:
            logger.error(f"Error handling response: {e}")
            if self.on_error:
                await self._call_handler(self.on_error, e)

    async def _call_handler(self, handler: Callable, *args: Any) -> None:
        """
        Safely call a handler, handling both sync and async functions.

        Args:
            handler: The handler function to call
            *args: Arguments to pass to the handler
        """
        try:
            result = handler(*args)
            if asyncio.iscoroutine(result):
                await result
        except Exception as e:
            logger.error(f"Error in handler: {e}")

    async def send_video_frame(self, frame_data: str, mime_type: str = "image/jpeg") -> None:
        """
        Send a video frame to Gemini - only sends latest frame.

        Uses a "latest frame only" strategy where new frames replace old ones,
        reducing latency by dropping queued frames.

        Args:
            frame_data: Base64 encoded image data
            mime_type: MIME type of the image (default: image/jpeg)

        Raises:
            GeminiSessionError: If not connected or send fails
        """
        if not self.is_connected:
            raise GeminiSessionError(
                message="Not connected to Gemini",
                code="NOT_CONNECTED",
            )

        try:
            # Decode and store as latest frame (replaces any pending frame)
            video_bytes = base64.b64decode(frame_data)
            self._latest_video_frame = video_bytes
            self._latest_video_mime = mime_type

            # Start sender task if not running
            async with self._video_send_lock:
                if self._video_send_task is None or self._video_send_task.done():
                    self._video_send_task = asyncio.create_task(self._send_latest_video())

        except Exception as e:
            logger.error(f"Failed to queue video frame: {e}")
            raise GeminiSessionError(
                message=f"Failed to send video frame: {str(e)}",
                code="SEND_FAILED",
                details={"type": "video"},
            )

    async def _send_latest_video(self) -> None:
        """Background task to send the latest video frame."""
        while self._latest_video_frame is not None and self.is_connected:
            # Grab the latest frame
            frame = self._latest_video_frame
            mime = self._latest_video_mime
            self._latest_video_frame = None  # Clear it

            if frame:
                try:
                    await self._session.send_realtime_input(
                        video=types.Blob(data=frame, mime_type=mime)
                    )
                    logger.debug("Sent latest video frame")
                except Exception as e:
                    logger.error(f"Error sending video frame: {e}")

            # Minimal delay for yielding - no rate limiting needed at 1 FPS
            await asyncio.sleep(0.01)

    async def send_audio_chunk(
        self,
        audio_data: str,
        sample_rate: int = 16000,
        mime_type: str = "audio/pcm",
    ) -> None:
        """
        Send an audio chunk to Gemini - audio gets priority, sends immediately.

        Audio is sent without locks for lowest latency since it's the
        highest priority stream for real-time coaching.

        Args:
            audio_data: Base64 encoded PCM16 audio data
            sample_rate: Audio sample rate in Hz (default: 16000)
            mime_type: MIME type of the audio (default: audio/pcm)

        Raises:
            GeminiSessionError: If not connected or send fails
        """
        if not self.is_connected:
            raise GeminiSessionError(
                message="Not connected to Gemini",
                code="NOT_CONNECTED",
            )

        try:
            # Decode base64 to raw bytes
            audio_bytes = base64.b64decode(audio_data)
            # Include sample rate in mime type
            full_mime_type = f"{mime_type};rate={sample_rate}"

            # Send immediately - audio is priority (no locks)
            await self._session.send_realtime_input(
                audio=types.Blob(data=audio_bytes, mime_type=full_mime_type)
            )
            logger.debug("Sent audio chunk")

        except Exception as e:
            logger.error(f"Failed to send audio chunk: {e}")
            raise GeminiSessionError(
                message=f"Failed to send audio chunk: {str(e)}",
                code="SEND_FAILED",
                details={"type": "audio"},
            )

    async def send_text(self, text: str) -> None:
        """
        Send a text message to Gemini.

        Args:
            text: The text message to send

        Raises:
            GeminiSessionError: If not connected or send fails
        """
        if not self.is_connected:
            raise GeminiSessionError(
                message="Not connected to Gemini",
                code="NOT_CONNECTED",
            )

        try:
            async with self._text_lock:
                # Use send_client_content for text messages
                await self._session.send_client_content(
                    turns=types.Content(
                        role="user",
                        parts=[types.Part(text=text)]
                    ),
                    turn_complete=True
                )
                logger.debug(f"Sent text: {text[:50]}...")

        except Exception as e:
            logger.error(f"Failed to send text: {e}")
            raise GeminiSessionError(
                message=f"Failed to send text: {str(e)}",
                code="SEND_FAILED",
                details={"type": "text"},
            )

    async def send_proactive_check(self) -> None:
        """
        Send a proactive check to trigger AI observation and feedback.

        This sends a short trigger message that prompts the AI to observe
        the current video feed and provide coaching feedback if needed.
        The AI should stay quiet if everything looks good.
        """
        if not self.is_connected:
            return

        try:
            await self._session.send_client_content(
                turns=types.Content(
                    role="user",
                    parts=[types.Part(text="[observe]")]
                ),
                turn_complete=True
            )
            logger.debug("Sent proactive check")
        except Exception as e:
            logger.error(f"Failed to send proactive check: {e}")

    async def receive_responses(self) -> AsyncIterator[dict]:
        """
        Async iterator to receive responses.

        Note: This is an alternative to using callbacks.
        If callbacks are set, they will be called automatically.

        Yields:
            Dict with 'type' and 'data' keys
        """
        if not self._session:
            return

        try:
            async for response in self._session.receive():
                # Process and yield responses
                if hasattr(response, "server_content") and response.server_content:
                    server_content = response.server_content

                    if hasattr(server_content, "model_turn") and server_content.model_turn:
                        model_turn = server_content.model_turn

                        if hasattr(model_turn, "parts"):
                            for part in model_turn.parts:
                                if hasattr(part, "text") and part.text:
                                    yield {"type": "text", "data": part.text}

                                if hasattr(part, "inline_data") and part.inline_data:
                                    audio_data = part.inline_data.data
                                    if isinstance(audio_data, str):
                                        audio_data = base64.b64decode(audio_data)
                                    yield {"type": "audio", "data": audio_data}

        except asyncio.CancelledError:
            logger.info("Response iteration cancelled")
        except Exception as e:
            logger.error(f"Error receiving responses: {e}")
            yield {"type": "error", "data": str(e)}

    async def close(self) -> None:
        """Close the Gemini session and clean up resources."""
        logger.info("Closing Gemini session")

        self._is_connected = False

        # Cancel receive task
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        # Cancel video send task
        if self._video_send_task and not self._video_send_task.done():
            self._video_send_task.cancel()
            try:
                await self._video_send_task
            except asyncio.CancelledError:
                pass

        # Close the session using the context manager
        if self._session_context:
            try:
                await self._session_context.__aexit__(None, None, None)
            except Exception as e:
                logger.error(f"Error closing session: {e}")
            finally:
                self._session = None
                self._session_context = None

        self._client = None
        logger.info("Gemini session closed")

    async def __aenter__(self) -> "GeminiLiveSession":
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        await self.close()
