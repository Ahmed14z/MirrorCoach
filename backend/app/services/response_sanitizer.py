"""Response sanitization to filter out prompt leakage and meta-commentary."""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Patterns that indicate leaked internal reasoning/meta-commentary
LEAK_PATTERNS = [
    # Headers/labels that shouldn't be in spoken output
    r"\*\*[A-Z][^*]+\*\*",  # **Greeting**, **Observation**, etc.
    r"^#{1,3}\s+",  # Markdown headers

    # Meta-narration phrases
    r"(?i)^(I'm |I am )?(now |currently )?(observing|analyzing|preparing|ready to|going to|about to)",
    r"(?i)^(I'm |I am )?(now |currently )?(initiating|starting|beginning)",
    r"(?i)as (requested|instructed|directed|per my instructions)",
    r"(?i)my (focus|goal|objective|task|purpose) is",
    r"(?i)I('ll| will) (be |now )?(providing|giving|offering)",
    r"(?i)let me (observe|analyze|assess|evaluate|provide|give)",
    r"(?i)I('m| am) (here to|designed to|programmed to)",
    r"(?i)^(first,? )?I (need|should|must|will) (to )?(observe|analyze|assess)",

    # Internal thinking markers
    r"(?i)\*thinking\*",
    r"(?i)\*internal\*",
    r"(?i)\[thinking\]",
    r"(?i)\[internal\]",
    r"(?i)<thinking>.*?</thinking>",
    r"(?i)<internal>.*?</internal>",

    # Instruction acknowledgment
    r"(?i)following (my |the )?(instructions|guidelines|rules)",
    r"(?i)based on (my |the )?(instructions|guidelines|system prompt)",
    r"(?i)according to (my |the )?(instructions|guidelines)",

    # Session/role narration
    r"(?i)^(I('ve| have) )?(initiated|started|begun) (the |this )?(session|coaching)",
    r"(?i)^(I('m| am) )?(greeting|welcoming) (the |this )?user",
    r"(?i)in my role as",
    r"(?i)as (a |an )?(AI |artificial intelligence )?(coach|assistant)",
]

# Compiled patterns for efficiency
COMPILED_PATTERNS = [re.compile(p, re.MULTILINE) for p in LEAK_PATTERNS]

# Phrases to completely remove (exact matches, case-insensitive)
REMOVE_PHRASES = [
    "as requested",
    "as instructed",
    "as directed",
    "as per my instructions",
    "i'm prepared to",
    "i am prepared to",
    "i'm ready to observe",
    "i am ready to observe",
    "let me provide",
    "i will now",
    "i'm now going to",
    "my focus is on",
    "my goal is to",
]


def sanitize_response(text: str) -> Optional[str]:
    """
    Sanitize AI response to remove prompt leakage and meta-commentary.

    Args:
        text: Raw response text from Gemini

    Returns:
        Sanitized text, or None if the entire response should be filtered
    """
    if not text:
        return None

    original_text = text

    # Check if the response is mostly meta-commentary (should be completely filtered)
    if _is_mostly_meta_commentary(text):
        logger.warning(f"Filtered meta-commentary response: {text[:100]}...")
        return None

    # Remove markdown headers at the start
    text = re.sub(r"^\*\*[^*]+\*\*\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"^#{1,3}\s+[^\n]+\n?", "", text, flags=re.MULTILINE)

    # Remove phrases
    for phrase in REMOVE_PHRASES:
        text = re.sub(re.escape(phrase), "", text, flags=re.IGNORECASE)

    # Apply pattern-based filtering
    for pattern in COMPILED_PATTERNS:
        text = pattern.sub("", text)

    # Clean up artifacts
    text = _clean_artifacts(text)

    # If we removed most of the content, filter the whole response
    if len(text.strip()) < 5:
        logger.warning(f"Response too short after sanitization, filtering: {original_text[:100]}...")
        return None

    if text != original_text:
        logger.info(f"Sanitized response: '{original_text[:50]}...' -> '{text[:50]}...'")

    return text.strip()


def _is_mostly_meta_commentary(text: str) -> bool:
    """
    Check if text is mostly meta-commentary that should be completely filtered.

    Args:
        text: Text to check

    Returns:
        True if the text appears to be internal reasoning/meta-commentary
    """
    text_lower = text.lower()

    # Strong indicators of meta-commentary (if found, likely entire response is leaked thinking)
    strong_indicators = [
        "i've initiated the session",
        "i'm observing the video feed",
        "i'm preparing a",
        "i'm currently observing",
        "currently, i'm observing",
        "i interpreted as meaning",
        "which i interpreted",
        "i notice that",
        "acknowledging session",
        "greeting and observation",
        "observation** i",
        "greeting** i",
        "**acknowledging",
        "**greeting",
        "**observation",
        "**analyzing",
        "**preparing",
        "**initiating",
    ]

    for indicator in strong_indicators:
        if indicator in text_lower:
            return True

    # Check for high density of meta-commentary patterns
    meta_count = 0
    meta_phrases = [
        "i'm ", "i am ", "i will ", "i'll ",
        "observing", "analyzing", "preparing", "ready to",
        "as requested", "as instructed", "my focus",
        "the user", "their form", "their technique"
    ]

    for phrase in meta_phrases:
        meta_count += text_lower.count(phrase)

    # If more than 3 meta-phrases in a short response, it's likely leaked thinking
    word_count = len(text.split())
    if word_count > 0 and meta_count / word_count > 0.15:
        return True

    return False


def _clean_artifacts(text: str) -> str:
    """
    Clean up artifacts left by pattern removal.

    Args:
        text: Text with potential artifacts

    Returns:
        Cleaned text
    """
    # Remove multiple spaces
    text = re.sub(r" +", " ", text)

    # Remove leading/trailing commas and spaces
    text = re.sub(r"^[,.\s]+", "", text)
    text = re.sub(r"[,\s]+$", "", text)

    # Remove orphaned punctuation at start
    text = re.sub(r"^[.!?,;:\s]+", "", text)

    # Fix double punctuation
    text = re.sub(r"([.!?])\1+", r"\1", text)

    # Remove empty lines
    text = re.sub(r"\n\s*\n", "\n", text)

    return text.strip()


def contains_annotations(text: str) -> tuple[str, Optional[str]]:
    """
    Extract annotation JSON from response text (for screen_assistant).

    Args:
        text: Response text potentially containing <ANNOTATIONS> block

    Returns:
        Tuple of (spoken_text, annotation_json or None)
    """
    annotation_pattern = r"<ANNOTATIONS>\s*(\{.*?\})\s*</ANNOTATIONS>"
    match = re.search(annotation_pattern, text, re.DOTALL)

    if match:
        annotation_json = match.group(1)
        spoken_text = re.sub(annotation_pattern, "", text, flags=re.DOTALL).strip()
        return spoken_text, annotation_json

    return text, None
