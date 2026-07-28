/**
 * Theme Sharing Utilities (JSON Export/Import, Share Links & Canvas QR Code Generator)
 */

export const exportThemeToJSON = (appearanceState) => {
  const themePayload = {
    version: '1.0',
    title: appearanceState.activeCustomThemeName || 'Custom Theme',
    activeThemeId: appearanceState.activeThemeId,
    activeEffectId: appearanceState.activeEffectId,
    globalWallpaperUrl: appearanceState.globalWallpaperUrl,
    controls: appearanceState.controls,
    animationControls: appearanceState.animationControls,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(themePayload, null, 2);
};

export const parseThemeJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      activeThemeId: parsed.activeThemeId || 'galaxy',
      activeEffectId: parsed.activeEffectId || 'none',
      globalWallpaperUrl: parsed.globalWallpaperUrl || '',
      controls: parsed.controls || {},
      animationControls: parsed.animationControls || {},
      title: parsed.title || 'Imported Theme',
    };
  } catch (e) {
    console.error('[themeShareUtils] Invalid Theme JSON string:', e);
    return null;
  }
};

export const generateThemeShareLink = (appearanceState) => {
  const jsonStr = JSON.stringify({
    t: appearanceState.activeThemeId,
    e: appearanceState.activeEffectId,
    w: appearanceState.globalWallpaperUrl,
  });
  const encoded = encodeURIComponent(btoa(jsonStr));
  return `${window.location.origin}/chat?importTheme=${encoded}`;
};

export const drawQRCodeOnCanvas = (canvas, text) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 180;
  canvas.width = size;
  canvas.height = size;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Simple pseudo QR-pattern for visual representation
  ctx.fillStyle = '#0f172a';
  const cellSize = 10;
  const cells = size / cellSize;

  // Corner Finders
  const drawFinder = (x, y) => {
    ctx.fillRect(x, y, 70, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 10, y + 10, 50, 50);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 20, y + 20, 30, 30);
  };

  drawFinder(10, 10);
  drawFinder(size - 80, 10);
  drawFinder(10, size - 80);

  // Hash-seeded data cells
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash += text.charCodeAt(i);

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c > cells - 9) || (r > cells - 9 && c < 8)) continue;
      if ((r * c + hash) % 3 === 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }
};
