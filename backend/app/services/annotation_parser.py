"""Parser for extracting visual annotations from Gemini responses."""

import re
import json
import logging
import uuid
from typing import Optional, List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

# Pattern to match annotation blocks
ANNOTATION_PATTERN = re.compile(
    r'<ANNOTATIONS>\s*(.*?)\s*</ANNOTATIONS>',
    re.DOTALL | re.IGNORECASE
)


def parse_annotations(text: str) -> Tuple[str, Optional[List[Dict[str, Any]]]]:
    """
    Extract annotations from Gemini response text.

    Args:
        text: Raw text from Gemini response

    Returns:
        Tuple of (clean_text, annotations_list or None)
    """
    match = ANNOTATION_PATTERN.search(text)

    if match:
        # Remove annotation block from text
        clean_text = ANNOTATION_PATTERN.sub('', text).strip()
        clean_text = ' '.join(clean_text.split())  # Normalize whitespace

        try:
            json_content = match.group(1).strip()
            data = json.loads(json_content)

            if not isinstance(data, dict):
                logger.warning("Annotation data is not a dict")
                return clean_text, None

            annotations = data.get('annotations', [])
            if not isinstance(annotations, list):
                logger.warning("Annotations field is not a list")
                return clean_text, None

            # Process and validate annotations
            processed_annotations = []
            for ann in annotations:
                processed = process_annotation(ann)
                if processed:
                    processed_annotations.append(processed)

            return clean_text, processed_annotations if processed_annotations else None

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse annotation JSON: {e}")
            return clean_text, None
        except Exception as e:
            logger.warning(f"Error processing annotations: {e}")
            return clean_text, None

    return text.strip(), None


def process_annotation(ann: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process and validate a single annotation.

    Args:
        ann: Raw annotation dict from parsed JSON

    Returns:
        Processed annotation dict or None if invalid
    """
    try:
        ann_type = ann.get('type', '').lower()
        if ann_type not in ('arrow', 'circle', 'highlight', 'text'):
            logger.debug(f"Unknown annotation type: {ann_type}")
            return None

        # Get target position
        target = ann.get('target', {})
        if not target or 'x' not in target or 'y' not in target:
            logger.debug("Annotation missing target position")
            return None

        # Validate and clamp coordinates to 0-100 range
        x = max(0, min(100, float(target.get('x', 50))))
        y = max(0, min(100, float(target.get('y', 50))))

        # Build processed annotation
        processed: Dict[str, Any] = {
            'id': ann.get('id') or f"ann_{uuid.uuid4().hex[:8]}",
            'type': ann_type,
            'position': {'x': x, 'y': y},
        }

        # Add optional target dimensions
        if 'width' in target:
            processed['target'] = {
                'x': x,
                'y': y,
                'width': max(0, min(100, float(target['width']))),
            }
            if 'height' in target:
                processed['target']['height'] = max(0, min(100, float(target['height'])))

        # Add endpoint for arrows
        if ann_type == 'arrow' and 'endpoint' in ann:
            endpoint = ann['endpoint']
            processed['endPosition'] = {
                'x': max(0, min(100, float(endpoint.get('x', x + 10)))),
                'y': max(0, min(100, float(endpoint.get('y', y + 10)))),
            }

        # Add style
        style = ann.get('style', {})
        if style:
            processed['style'] = {
                'color': style.get('color', 'blue'),
                'size': style.get('size', 'medium'),
                'animation': style.get('animation', 'pulse'),
            }
        else:
            processed['style'] = {
                'color': 'blue',
                'size': 'medium',
                'animation': 'pulse',
            }

        # Add color (for compatibility with frontend Annotation type)
        color_map = {
            'blue': '#3b82f6',
            'red': '#ef4444',
            'green': '#22c55e',
            'yellow': '#eab308',
            'orange': '#f97316',
            'white': '#ffffff',
        }
        color_name = processed['style']['color']
        processed['color'] = color_map.get(color_name, color_name)

        # Add label/message
        if 'label' in ann:
            processed['label'] = str(ann['label'])[:100]
            processed['message'] = processed['label']

        # Add duration
        processed['duration'] = float(ann.get('duration', 5))

        # Add size for circles
        if ann_type == 'circle':
            processed['size'] = float(ann.get('radius', 5)) * 10  # Scale for frontend

        return processed

    except (TypeError, ValueError) as e:
        logger.debug(f"Error processing annotation: {e}")
        return None


def create_annotation(
    ann_type: str,
    x: float,
    y: float,
    label: Optional[str] = None,
    color: str = 'blue',
    duration: float = 5.0,
    **kwargs
) -> Dict[str, Any]:
    """
    Helper to create an annotation programmatically.

    Args:
        ann_type: Type of annotation (arrow, circle, highlight, text)
        x: X position (0-100)
        y: Y position (0-100)
        label: Optional text label
        color: Color name or hex
        duration: Display duration in seconds
        **kwargs: Additional type-specific parameters

    Returns:
        Annotation dict ready for sending to client
    """
    color_map = {
        'blue': '#3b82f6',
        'red': '#ef4444',
        'green': '#22c55e',
        'yellow': '#eab308',
        'orange': '#f97316',
        'white': '#ffffff',
    }

    annotation: Dict[str, Any] = {
        'id': f"ann_{uuid.uuid4().hex[:8]}",
        'type': ann_type,
        'position': {'x': x, 'y': y},
        'color': color_map.get(color, color),
        'style': {
            'color': color,
            'size': kwargs.get('size', 'medium'),
            'animation': kwargs.get('animation', 'pulse'),
        },
        'duration': duration,
    }

    if label:
        annotation['label'] = label
        annotation['message'] = label

    if ann_type == 'arrow' and 'end_x' in kwargs and 'end_y' in kwargs:
        annotation['endPosition'] = {
            'x': kwargs['end_x'],
            'y': kwargs['end_y'],
        }

    if ann_type == 'circle' and 'radius' in kwargs:
        annotation['size'] = kwargs['radius'] * 10

    if ann_type == 'highlight':
        annotation['target'] = {
            'x': x,
            'y': y,
            'width': kwargs.get('width', 20),
            'height': kwargs.get('height', 10),
        }

    return annotation
