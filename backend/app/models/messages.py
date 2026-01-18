from enum import Enum
from typing import Optional, Literal, Union
from pydantic import BaseModel, Field


class MessageType(str, Enum):
    """Types of messages that can be sent/received."""

    # Client -> Server
    VIDEO_FRAME = "video_frame"
    AUDIO_CHUNK = "audio_chunk"
    TEXT = "text"
    START_SESSION = "start_session"
    END_SESSION = "end_session"

    # Server -> Client
    TEXT_RESPONSE = "text_response"
    AUDIO_RESPONSE = "audio_response"
    ERROR = "error"
    SESSION_STATUS = "session_status"
    COACHING_FEEDBACK = "coaching_feedback"
    ANNOTATION = "annotation"


class BaseMessage(BaseModel):
    """Base message model."""

    type: MessageType


# Client -> Server Messages


class VideoFrameMessage(BaseMessage):
    """Video frame from client webcam."""

    type: Literal[MessageType.VIDEO_FRAME] = MessageType.VIDEO_FRAME
    data: str = Field(..., description="Base64 encoded JPEG image")
    timestamp: float = Field(..., description="Client timestamp in seconds")
    width: Optional[int] = Field(None, description="Frame width in pixels")
    height: Optional[int] = Field(None, description="Frame height in pixels")


class AudioChunkMessage(BaseMessage):
    """Audio chunk from client microphone."""

    type: Literal[MessageType.AUDIO_CHUNK] = MessageType.AUDIO_CHUNK
    data: str = Field(..., description="Base64 encoded PCM16 audio")
    sample_rate: int = Field(16000, description="Audio sample rate in Hz")
    timestamp: float = Field(..., description="Client timestamp in seconds")


class TextMessage(BaseMessage):
    """Text message from client."""

    type: Literal[MessageType.TEXT] = MessageType.TEXT
    content: str = Field(..., description="Text content")


class StartSessionMessage(BaseMessage):
    """Start a new coaching session."""

    type: Literal[MessageType.START_SESSION] = MessageType.START_SESSION
    skill: str = Field(..., description="Skill to practice (e.g., 'sales_pitch')")
    session_id: Optional[str] = Field(None, description="Optional session ID for resumption")


class EndSessionMessage(BaseMessage):
    """End the current coaching session."""

    type: Literal[MessageType.END_SESSION] = MessageType.END_SESSION
    reason: Optional[str] = Field(None, description="Reason for ending session")


# Server -> Client Messages


class TextResponse(BaseMessage):
    """Text response from the AI coach."""

    type: Literal[MessageType.TEXT_RESPONSE] = MessageType.TEXT_RESPONSE
    content: str = Field(..., description="Text content from AI")
    is_partial: bool = Field(False, description="Whether this is a partial/streaming response")


class AudioResponse(BaseMessage):
    """Audio response from the AI coach."""

    type: Literal[MessageType.AUDIO_RESPONSE] = MessageType.AUDIO_RESPONSE
    data: str = Field(..., description="Base64 encoded audio data")
    sample_rate: int = Field(24000, description="Audio sample rate in Hz")
    format: str = Field("pcm16", description="Audio format")


class ErrorResponse(BaseMessage):
    """Error response."""

    type: Literal[MessageType.ERROR] = MessageType.ERROR
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")


class SessionStatusResponse(BaseMessage):
    """Session status update."""

    type: Literal[MessageType.SESSION_STATUS] = MessageType.SESSION_STATUS
    status: Literal["connecting", "connected", "active", "paused", "ended", "error"]
    session_id: Optional[str] = Field(None, description="Session identifier")
    skill: Optional[str] = Field(None, description="Current skill being practiced")
    duration: Optional[float] = Field(None, description="Session duration in seconds")
    message: Optional[str] = Field(None, description="Status message")


class CoachingFeedback(BaseMessage):
    """Real-time coaching feedback."""

    type: Literal[MessageType.COACHING_FEEDBACK] = MessageType.COACHING_FEEDBACK
    category: str = Field(..., description="Feedback category (posture, eye_contact, etc.)")
    score: Optional[float] = Field(None, ge=0, le=100, description="Score out of 100")
    feedback: str = Field(..., description="Feedback text")
    suggestion: Optional[str] = Field(None, description="Improvement suggestion")


class AnnotationResponse(BaseMessage):
    """Visual annotation overlay for screen assistant."""

    type: Literal[MessageType.ANNOTATION] = MessageType.ANNOTATION
    annotations: list = Field(default_factory=list, description="List of annotation objects")
    clear_previous: bool = Field(True, description="Whether to clear previous annotations")


# Union type for all incoming messages
IncomingMessage = Union[
    VideoFrameMessage,
    AudioChunkMessage,
    TextMessage,
    StartSessionMessage,
    EndSessionMessage,
]

# Union type for all outgoing messages
OutgoingMessage = Union[
    TextResponse,
    AudioResponse,
    ErrorResponse,
    SessionStatusResponse,
    CoachingFeedback,
    AnnotationResponse,
]
