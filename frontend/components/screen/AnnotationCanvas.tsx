'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { ScreenAnnotation } from '@/types';

interface AnnotationCanvasProps {
  annotations: ScreenAnnotation[];
  containerWidth: number;
  containerHeight: number;
  className?: string;
  onAnnotationExpired?: (id: string) => void;
}

const ANNOTATION_COLORS: Record<string, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  white: '#ffffff',
};

const SIZE_MAP: Record<string, number> = {
  small: 2,
  medium: 3,
  large: 5,
};

export function AnnotationCanvas({
  annotations,
  containerWidth,
  containerHeight,
  className,
  onAnnotationExpired,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  const toPixel = useCallback(
    (pos: { x: number; y: number }) => ({
      x: (pos.x / 100) * containerWidth,
      y: (pos.y / 100) * containerHeight,
    }),
    [containerWidth, containerHeight]
  );

  const getColor = (annotation: ScreenAnnotation): string => {
    const colorName = annotation.style?.color || annotation.color || 'blue';
    return ANNOTATION_COLORS[colorName] || colorName;
  };

  const getStrokeWidth = (annotation: ScreenAnnotation): number => {
    const size = annotation.style?.size || 'medium';
    return SIZE_MAP[size] || 3;
  };

  const drawArrow = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: ScreenAnnotation, opacity: number) => {
      const target = annotation.target || annotation.position;
      if (!target) return;

      const end = toPixel({ x: target.x, y: target.y });
      const angle = Math.PI / 4;
      const length = 80;
      const start = {
        x: end.x - length * Math.cos(angle),
        y: end.y - length * Math.sin(angle),
      };

      const color = getColor(annotation);
      const strokeWidth = getStrokeWidth(annotation);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      // Draw arrowhead
      const headLength = 15;
      const arrowAngle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(arrowAngle - Math.PI / 6),
        end.y - headLength * Math.sin(arrowAngle - Math.PI / 6)
      );
      ctx.lineTo(
        end.x - headLength * Math.cos(arrowAngle + Math.PI / 6),
        end.y - headLength * Math.sin(arrowAngle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      // Draw label if exists
      if (annotation.label) {
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(annotation.label, end.x + 10, end.y - 10);
      }

      ctx.restore();
    },
    [toPixel]
  );

  const drawCircle = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: ScreenAnnotation, opacity: number, pulse: number) => {
      const target = annotation.target || annotation.position;
      if (!target) return;

      const center = toPixel({ x: target.x, y: target.y });
      const baseRadius = (annotation.size || 30) * (containerWidth / 100);
      const radius = baseRadius * (1 + pulse * 0.1);

      const color = getColor(annotation);
      const strokeWidth = getStrokeWidth(annotation);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;

      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (annotation.label) {
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(annotation.label, center.x, center.y - radius - 10);
      }

      ctx.restore();
    },
    [toPixel, containerWidth]
  );

  const drawHighlight = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: ScreenAnnotation, opacity: number) => {
      const target = annotation.target || annotation.position;
      if (!target) return;

      const pos = toPixel({ x: target.x, y: target.y });
      const width = ((target.width || 20) / 100) * containerWidth;
      const height = ((target.height || 10) / 100) * containerHeight;

      const color = getColor(annotation);

      ctx.save();
      ctx.globalAlpha = opacity * 0.3;
      ctx.fillStyle = color;
      ctx.fillRect(pos.x - width / 2, pos.y - height / 2, width, height);

      ctx.globalAlpha = opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(pos.x - width / 2, pos.y - height / 2, width, height);

      ctx.restore();
    },
    [toPixel, containerWidth, containerHeight]
  );

  const drawText = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: ScreenAnnotation, opacity: number) => {
      const target = annotation.target || annotation.position;
      if (!target || !annotation.message && !annotation.label) return;

      const pos = toPixel({ x: target.x, y: target.y });
      const text = annotation.message || annotation.label || '';
      const color = getColor(annotation);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = 'bold 16px Inter, sans-serif';

      // Draw background
      const metrics = ctx.measureText(text);
      const padding = 8;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(
        pos.x - padding,
        pos.y - 16 - padding,
        metrics.width + padding * 2,
        24 + padding
      );

      // Draw text
      ctx.fillStyle = color;
      ctx.fillText(text, pos.x, pos.y);

      ctx.restore();
    },
    [toPixel]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const now = Date.now();
    const pulse = Math.sin(pulsePhase) * 0.5 + 0.5;

    for (const annotation of annotations) {
      // Check expiration
      if (annotation.expiresAt && annotation.expiresAt <= now) {
        onAnnotationExpired?.(annotation.id);
        continue;
      }

      const animation = annotation.style?.animation || 'pulse';
      let opacity = 1;

      if (animation === 'pulse') {
        opacity = 0.7 + pulse * 0.3;
      } else if (animation === 'fade') {
        const remaining = annotation.expiresAt ? annotation.expiresAt - now : 5000;
        opacity = Math.min(1, remaining / 1000);
      }

      switch (annotation.type) {
        case 'arrow':
          drawArrow(ctx, annotation, opacity);
          break;
        case 'circle':
          drawCircle(ctx, annotation, opacity, animation === 'pulse' ? pulse : 0);
          break;
        case 'highlight':
          drawHighlight(ctx, annotation, opacity);
          break;
        case 'text':
          drawText(ctx, annotation, opacity);
          break;
      }
    }

    setPulsePhase((prev) => prev + 0.1);
    animationRef.current = requestAnimationFrame(render);
  }, [annotations, containerWidth, containerHeight, pulsePhase, drawArrow, drawCircle, drawHighlight, drawText, onAnnotationExpired]);

  useEffect(() => {
    if (annotations.length > 0) {
      animationRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [annotations, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = containerWidth;
      canvas.height = containerHeight;
    }
  }, [containerWidth, containerHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={containerWidth}
      height={containerHeight}
      className={cn('absolute inset-0 pointer-events-none', className)}
    />
  );
}
