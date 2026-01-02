'use client';

import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  brightness: number;
}

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create nodes in radial pattern
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const numNodes = 150; // Number of nodes
    const nodes: Node[] = [];

    for (let i = 0; i < numNodes; i++) {
      // Create nodes in concentric circles
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.min(canvas.width, canvas.height) * 0.6;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Brightness based on distance from center (closer = brighter)
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = Math.min(canvas.width, canvas.height) * 0.6;
      const brightness = 1 - (distFromCenter / maxDist) * 0.7; // 0.3 to 1.0

      nodes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.2, // Slow drift
        vy: (Math.random() - 0.5) * 0.2,
        brightness
      });
    }

    nodesRef.current = nodes;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentCenterX = canvas.width / 2;
      const currentCenterY = canvas.height / 2;
      const maxDist = Math.min(canvas.width, canvas.height) * 0.6;

      // Update node positions (gentle drift)
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Update brightness based on current distance from center
        const distFromCenter = Math.sqrt(
          (node.x - currentCenterX) ** 2 + (node.y - currentCenterY) ** 2
        );
        node.brightness = Math.max(0.3, 1 - (distFromCenter / maxDist) * 0.7);
      });

      // Draw connections (lines between nearby nodes)
      const maxConnectionDist = 150;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.lineWidth = 1;

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

      // Draw nodes (golden dots with glow)
      nodes.forEach(node => {
        const size = 2 + node.brightness * 2;
        const glowSize = 8 + node.brightness * 12;

        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowSize);
        gradient.addColorStop(0, `rgba(255, 215, 0, ${node.brightness * 0.6})`);
        gradient.addColorStop(0.5, `rgba(255, 215, 0, ${node.brightness * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `rgba(255, 215, 0, ${node.brightness})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
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
      style={{ opacity: 0.5 }}
    />
  );
}
