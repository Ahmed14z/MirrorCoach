from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # API Keys
    gemini_api_key: str = ""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # Gemini
    gemini_model: str = "gemini-2.0-flash-exp"
    gemini_voice: str = "Kore"

    # Session
    max_session_duration: int = 900  # 15 minutes in seconds
    video_fps: int = 10
    audio_chunk_ms: int = 100

    # Memory settings - context window compression for longer sessions
    enable_context_compression: bool = True
    context_compression_trigger_tokens: int = 25000

    # VAD settings for hands-on activities (guitar, painting, etc.)
    vad_start_sensitivity: str = "START_SENSITIVITY_LOW"
    vad_end_sensitivity: str = "END_SENSITIVITY_LOW"
    vad_silence_duration_ms: int = 500  # Longer silence tolerance for natural pauses
    vad_prefix_padding_ms: int = 100

    # Proactive coaching - allows AI to decide when to respond
    enable_proactive_audio: bool = True
    proactive_check_interval_sec: int = 4

    # CORS - stored as string, parsed to list via property
    allowed_origins_str: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def allowed_origins(self) -> list[str]:
        """Parse comma-separated origins string into a list."""
        return [origin.strip() for origin in self.allowed_origins_str.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
