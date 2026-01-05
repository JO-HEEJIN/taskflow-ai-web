'use client';

import { useEffect, useRef } from 'react';

export function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stars - more stars, varied sizes
    const stars: Array<{
      x: number;
      y: number;
      radius: number;
      opacity: number;
      twinkleSpeed: number;
      twinklePhase: number;
      color: { r: number; g: number; b: number };
    }> = [];

    const numStars = 350; // More stars for richer sky
    for (let i = 0; i < numStars; i++) {
      // Star colors - mostly white/blue, some warm
      const colorRoll = Math.random();
      let color;
      if (colorRoll < 0.6) {
        // Cool blue-white (most common)
        color = { r: 200 + Math.random() * 55, g: 220 + Math.random() * 35, b: 255 };
      } else if (colorRoll < 0.85) {
        // Pure white
        color = { r: 255, g: 255, b: 255 };
      } else {
        // Warm yellow/orange (rare bright stars)
        color = { r: 255, g: 230 + Math.random() * 25, b: 180 + Math.random() * 40 };
      }

      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() < 0.9 ? Math.random() * 1.5 : 1.5 + Math.random() * 1.5, // Most small, few big
        opacity: Math.random(),
        twinkleSpeed: 0.01 + Math.random() * 0.04, // Varied twinkle speeds
        twinklePhase: Math.random() * Math.PI * 2,
        color,
      });
    }

    // Animation
    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      stars.forEach((star) => {
        // Twinkling effect - smooth sine wave
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
        star.opacity = 0.2 + twinkle * 0.8; // Range from 0.2 to 1.0

        const { r, g, b } = star.color;

        // Draw star with glow
        const glowRadius = star.radius * 3;
        const gradient = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          glowRadius
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${star.opacity})`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.5})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${star.opacity * 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bright core for bigger stars
        if (star.radius > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.9})`;
          ctx.fill();
        }
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.85 }}
    />
  );
}
