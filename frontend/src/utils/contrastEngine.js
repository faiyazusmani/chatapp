/**
 * Smart Adaptive Contrast Engine (WCAG 2.1 sRGB Luminance & Contrast Calculator)
 * Computes optimal text, icon, border, timestamp, and link colors based on background color & wallpaper luminance.
 */

// Parse any hex, rgb, or rgba string to { r, g, b, a }
export const parseColorToRGB = (colorStr) => {
  if (!colorStr || typeof colorStr !== 'string') {
    return { r: 15, g: 23, b: 42, a: 1 };
  }

  const str = colorStr.trim().toLowerCase();

  // Hex format (#ffffff or #fff)
  if (str.startsWith('#')) {
    let hex = str.substring(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    if (isNaN(num)) return { r: 15, g: 23, b: 42, a: 1 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    };
  }

  // RGB or RGBA format (rgb(255, 255, 255) or rgba(0, 0, 0, 0.8))
  if (str.startsWith('rgb')) {
    const parts = str.match(/[\d.]+/g);
    if (parts && parts.length >= 3) {
      return {
        r: Math.min(255, Math.max(0, parseFloat(parts[0]))),
        g: Math.min(255, Math.max(0, parseFloat(parts[1]))),
        b: Math.min(255, Math.max(0, parseFloat(parts[2]))),
        a: parts.length >= 4 ? parseFloat(parts[3]) : 1,
      };
    }
  }

  // Fallback dark color
  return { r: 15, g: 23, b: 42, a: 1 };
};

// Calculate WCAG 2.1 sRGB Relative Luminance
export const calculateLuminance = (r, g, b) => {
  const normalize = (c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };

  const R = normalize(r);
  const G = normalize(g);
  const B = normalize(b);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

// Calculate Contrast Ratio between two RGB objects or color strings (1:1 to 21:1)
export const calculateContrastRatio = (color1, color2) => {
  const rgb1 = typeof color1 === 'string' ? parseColorToRGB(color1) : color1;
  const rgb2 = typeof color2 === 'string' ? parseColorToRGB(color2) : color2;

  const L1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const L2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Get Readable Text Color (WCAG AA/AAA compliant)
export const getReadableTextColor = (
  bgColor,
  preferredDark = '#0f172a',
  preferredLight = '#f8fafc'
) => {
  const rgb = typeof bgColor === 'string' ? parseColorToRGB(bgColor) : bgColor;
  const lum = calculateLuminance(rgb.r, rgb.g, rgb.b);

  const contrastWithLight = calculateContrastRatio(rgb, parseColorToRGB(preferredLight));
  const contrastWithDark = calculateContrastRatio(rgb, parseColorToRGB(preferredDark));

  if (lum > 0.5) {
    return contrastWithDark >= 4.5 ? preferredDark : '#000000';
  } else {
    return contrastWithLight >= 4.5 ? preferredLight : '#ffffff';
  }
};

// Get Adaptive Muted Text Color
export const getAdaptiveMutedText = (bgColor) => {
  const rgb = typeof bgColor === 'string' ? parseColorToRGB(bgColor) : bgColor;
  const lum = calculateLuminance(rgb.r, rgb.g, rgb.b);

  return lum > 0.5 ? '#475569' : '#94a3b8';
};

// Get Adaptive Border Stroke
export const getAdaptiveBorder = (bgColor) => {
  const rgb = typeof bgColor === 'string' ? parseColorToRGB(bgColor) : bgColor;
  const lum = calculateLuminance(rgb.r, rgb.g, rgb.b);

  return lum > 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.08)';
};

// Get Adaptive Drop Shadow for Text over bright wallpapers
export const getAdaptiveTextShadow = (bgLuminance, wallpaperBrightness = 100) => {
  if (bgLuminance > 0.6 || wallpaperBrightness > 110) {
    return '0 1px 3px rgba(0, 0, 0, 0.8), 0 0 1px rgba(0, 0, 0, 0.9)';
  }
  return 'none';
};

// Auto Overlay Opacity Boost if wallpaper is too bright
export const getAutoOverlayOpacity = (bgLuminance, wallpaperBrightness = 100, currentOverlay = 0.2) => {
  if (bgLuminance > 0.75 || wallpaperBrightness > 120) {
    return Math.max(currentOverlay, 0.35);
  }
  return currentOverlay;
};
