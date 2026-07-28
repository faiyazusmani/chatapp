import React, { useEffect, useRef } from 'react';
import { useAppearance } from '../../context/AppearanceContext';

export default function WallpaperEffectsLayer() {
  const { appearanceState } = useAppearance();
  const canvasRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const effectId = appearanceState.activeEffectId || 'none';
  const animSettings = appearanceState.animationControls || {};
  const isBatterySaver = animSettings.batterySaver;
  const isReduceMotion = animSettings.reduceMotion;
  const speedMult = animSettings.speed ?? 1;
  const densityMult = animSettings.density ?? 1;

  useEffect(() => {
    if (effectId === 'none' || isReduceMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.offsetWidth;
        height = canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Particle initializers based on active effect
    const particles = [];
    const count = Math.min(Math.floor(40 * densityMult), isBatterySaver ? 15 : 80);

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5 * speedMult,
        vy: (Math.random() * 1.5 + 0.5) * speedMult,
        radius: Math.random() * 3 + 1,
        alpha: Math.random() * 0.7 + 0.3,
        color:
          effectId === 'petals'
            ? '#f472b6'
            : effectId === 'leaves'
            ? '#f59e0b'
            : effectId === 'embers'
            ? '#f97316'
            : effectId === 'sparkles'
            ? '#e0e7ff'
            : '#ffffff',
      });
    }

    let isTabActive = true;
    const handleVisibilityChange = () => {
      isTabActive = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isTabActive || isBatterySaver && Math.random() > 0.6) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height) p.y = -10;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [effectId, isBatterySaver, isReduceMotion, speedMult, densityMult]);

  if (effectId === 'none') return null;

  return (
    <div
      className={`wallpaper-effects-container effect-${effectId}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Canvas Effects */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
