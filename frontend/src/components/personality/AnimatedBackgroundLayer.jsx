import { useEffect, useRef, useState } from 'react';
import { useWallpaper } from '../../context/WallpaperContext';

export default function AnimatedBackgroundLayer() {
  const { activePersonality } = useWallpaper();
  const animationType = activePersonality?.theme?.animation || 'none';

  const canvasRef = useRef(null);
  const [isTabActive, setIsTabActive] = useState(true);

  // Tab Visibility Listener to pause animation on background tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Canvas Particles Animation Loop (Stars, Snow, Rain, Matrix, Petals)
  useEffect(() => {
    if (!isTabActive || animationType === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Setup based on type
    const particles = [];
    const count = animationType === 'matrix' ? 35 : animationType === 'rain' ? 60 : 40;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: animationType === 'rain' ? Math.random() * 6 + 4 : animationType === 'snow' ? Math.random() * 1.5 + 0.5 : Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.7 + 0.3,
        char: String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96)),
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (animationType === 'stars') {
        ctx.fillStyle = '#ffffff';
        particles.forEach((p) => {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          p.y -= p.speedY * 0.3;
          if (p.y < 0) p.y = canvas.height;
        });
      } else if (animationType === 'snow') {
        ctx.fillStyle = '#e0f2fe';
        particles.forEach((p) => {
          ctx.globalAlpha = p.opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speedY;
          p.x += Math.sin(p.y * 0.02) * 0.5;
          if (p.y > canvas.height) p.y = 0;
        });
      } else if (animationType === 'rain') {
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 1.2;
        particles.forEach((p) => {
          ctx.globalAlpha = p.opacity * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 2, p.y + p.size * 5);
          ctx.stroke();

          p.y += p.speedY;
          if (p.y > canvas.height) {
            p.y = 0;
            p.x = Math.random() * canvas.width;
          }
        });
      } else if (animationType === 'matrix') {
        ctx.fillStyle = '#22c55e';
        ctx.font = '12px monospace';
        particles.forEach((p) => {
          ctx.globalAlpha = p.opacity;
          ctx.fillText(p.char, p.x, p.y);

          p.y += p.speedY * 2;
          if (p.y > canvas.height) {
            p.y = 0;
            p.char = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
          }
        });
      } else if (animationType === 'petals') {
        ctx.fillStyle = '#f472b6';
        particles.forEach((p) => {
          ctx.globalAlpha = p.opacity * 0.7;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 2, p.size, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speedY * 0.8;
          p.x += Math.cos(p.y * 0.03) * 1.2;
          if (p.y > canvas.height) p.y = 0;
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [animationType, isTabActive]);

  if (animationType === 'none') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
