import { useEffect, useRef } from 'react';
import { useAppearance } from '../../context/AppearanceContext';
import { EffectManager } from '../../utils/effects/EffectManager';

export default function WallpaperEffectsLayer() {
  const { appearanceState } = useAppearance();
  const canvasRef = useRef(null);
  const managerRef = useRef(null);

  const effectId = appearanceState.activeEffectId || 'none';
  const animSettings = appearanceState.animationControls || {};

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!managerRef.current) {
      managerRef.current = new EffectManager();
      managerRef.current.mount(canvas);
    }

    managerRef.current.switchEffect(effectId, animSettings);

    return () => {
      if (managerRef.current) {
        managerRef.current.unmount();
        managerRef.current = null;
      }
    };
    // Granular field deps are intentional: avoids re-running the effect when
    // unrelated appearance fields change (animSettings identity changes often).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectId, animSettings.speed, animSettings.density, animSettings.batterySaver, animSettings.reduceMotion]);

  if (effectId === 'none' || animSettings.reduceMotion) return null;

  return (
    <div
      className={`wallpaper-effects-container effect-${effectId}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
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
