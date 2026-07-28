import { GalaxyEffect } from './GalaxyEffect';
import { CodingMatrixEffect } from './CodingMatrixEffect';
import { SakuraEffect } from './SakuraEffect';
import { FallingLeavesEffect } from './FallingLeavesEffect';
import { RainSplashEffect } from './RainSplashEffect';
import { SnowFlakesEffect } from './SnowFlakesEffect';
import { ShootingStarsEffect } from './ShootingStarsEffect';
import { EmberParticlesEffect } from './EmberParticlesEffect';
import { FloatingCloudsEffect } from './FloatingCloudsEffect';
import { WaterRippleEffect } from './WaterRippleEffect';
import { AuroraEffect } from './AuroraEffect';
import { CrystalLightEffect } from './CrystalLightEffect';

export const EFFECT_REGISTRY = {
  galaxy: GalaxyEffect,
  stars: GalaxyEffect,
  canvas_stars: GalaxyEffect,

  coding: CodingMatrixEffect,
  matrix: CodingMatrixEffect,

  sakura: SakuraEffect,
  petals: SakuraEffect,
  canvas_petals: SakuraEffect,

  leaves: FallingLeavesEffect,
  canvas_leaves: FallingLeavesEffect,

  rain: RainSplashEffect,
  canvas_rain: RainSplashEffect,

  snow: SnowFlakesEffect,
  canvas_snow: SnowFlakesEffect,

  shootingstars: ShootingStarsEffect,

  embers: EmberParticlesEffect,
  canvas_embers: EmberParticlesEffect,

  clouds: FloatingCloudsEffect,
  css_clouds: FloatingCloudsEffect,

  ripple: WaterRippleEffect,
  css_ripple: WaterRippleEffect,

  aurora: AuroraEffect,
  css_aurora: AuroraEffect,

  crystal: CrystalLightEffect,
  glass: CrystalLightEffect,
  css_glass: CrystalLightEffect,

  sparkles: GalaxyEffect,
  canvas_sparkles: GalaxyEffect,
  fireworks: EmberParticlesEffect,
  canvas_fireworks: EmberParticlesEffect,
};

export const getEffectClass = (effectId) => {
  return EFFECT_REGISTRY[effectId] || null;
};
