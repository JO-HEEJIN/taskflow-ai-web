'use client';

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  brightness: number;
  color: string;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI displays
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      // Set actual render buffer size (scaled)
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      // Enforce display size via CSS
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      // Normalize coordinate system to match CSS pixels
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create nodes in radial pattern
    const width = window.innerWidth;
    const height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const numNodes = window.innerWidth < 768 ? 80 : 150; // Reduce nodes on mobile for performance
    const nodes: Node[] = [];

    // Various yellow/gold colors
    const colors = [
      'rgb(255, 215, 0)',   // Gold
      'rgb(255, 193, 7)',   // Amber
      'rgb(255, 235, 59)',  // Yellow
      'rgb(255, 160, 0)',   // Dark Orange
      'rgb(255, 179, 0)',   // Orange Gold
    ];

    // Timer exclusion zone (circular area in center)
    const timerRadius = Math.min(width, height) * 0.15;

    for (let i = 0; i < numNodes; i++) {
      let x, y, distFromCenter;

      // Keep generating positions until we find one outside the timer area
      do {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(width, height) * 0.6;

        x = centerX + Math.cos(angle) * radius;
        y = centerY + Math.sin(angle) * radius;
        distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      } while (distFromCenter < timerRadius);

      // Brightness based on distance from center (closer = brighter)
      const maxDist = Math.min(width, height) * 0.6;
      const brightness = 1 - (distFromCenter / maxDist) * 0.7;

      // Random color from palette
      const color = colors[Math.floor(Math.random() * colors.length)];

      nodes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5, // Increased velocity for visible movement
        vy: (Math.random() - 0.5) * 1.5,
        brightness,
        color
      });
    }

    // Animation loop
    const animate = () => {
      // Use window dimensions for logic to handle resize dynamically
      const currentW = window.innerWidth;
      const currentH = window.innerHeight;
      const currentCenterX = currentW / 2;
      const currentCenterY = currentH / 2;

      // Clear the scaled canvas area
      ctx.clearRect(0, 0, currentW, currentH);

      // Update node positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > currentW) node.vx *= -1;
        if (node.y < 0 || node.y > currentH) node.vy *= -1;

        // Update brightness based on current distance from center
        const distFromCenter = Math.sqrt(
          (node.x - currentCenterX) ** 2 + (node.y - currentCenterY) ** 2
        );
        const maxDist = Math.min(currentW, currentH) * 0.6;
        node.brightness = Math.max(0.3, 1 - (distFromCenter / maxDist) * 0.7);
      });

      // Draw connections (lines between nearby nodes)
      const maxConnectionDist = 150;
      ctx.lineWidth = 1; // 1 CSS pixel (will be sharp on Retina)

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectionDist) {
            const opacity = (1 - dist / maxConnectionDist) * 0.3 * Math.min(nodes[i].brightness, nodes[j].brightness);
            ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes (colorful dots)
      nodes.forEach(node => {
        // Extract RGB values from node.color
        const rgbMatch = node.color.match(/\d+/g);
        if (!rgbMatch) return;
        const [r, g, b] = rgbMatch.map(Number);

        // Draw dot
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${node.brightness})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2); // Slightly larger dots for visibility
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
