import { getEffectClass } from './EffectRegistry';

export class EffectManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.currentEffect = null;
    this.currentEffectId = null;
    this.animFrameId = null;
    this.lastTime = 0;
    this.isTabActive = true;
    this.boundResizeHandler = null;
    this.boundVisibilityHandler = null;
  }

  mount(canvas) {
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.resizeCanvas();

    // Attach Event Listeners
    this.boundResizeHandler = () => this.handleResize();
    this.boundVisibilityHandler = () => this.handleVisibilityChange();

    window.addEventListener('resize', this.boundResizeHandler);
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement || document.body;
    const width = parent.offsetWidth || window.innerWidth;
    const height = parent.offsetHeight || window.innerHeight;

    this.canvas.width = width;
    this.canvas.height = height;

    if (this.currentEffect) {
      this.currentEffect.resize(width, height);
    }
  }

  handleResize() {
    this.resizeCanvas();
  }

  handleVisibilityChange() {
    this.isTabActive = !document.hidden;
  }

  // Switch Effect with Strict Single-Effect Cleanup
  switchEffect(effectId, options = {}) {
    // 1. Completely destroy previous active effect
    this.stopCurrentEffect();

    if (!effectId || effectId === 'none' || options.reduceMotion) {
      this.currentEffectId = 'none';
      return;
    }

    const EffectClass = getEffectClass(effectId);
    if (!EffectClass || !this.canvas || !this.ctx) return;

    // 2. Instantiate and initialize new single effect
    this.currentEffectId = effectId;
    this.currentEffect = new EffectClass(this.canvas, this.ctx, options);
    this.currentEffect.init();

    // 3. Start clean RAF Animation Loop
    this.lastTime = performance.now();
    this.startLoop();
  }

  startLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const loop = (now) => {
      if (!this.currentEffect) return;

      const deltaTime = Math.min(now - this.lastTime, 64); // Cap delta to prevent huge jumps
      this.lastTime = now;

      if (this.isTabActive) {
        this.currentEffect.update(deltaTime);
        this.currentEffect.draw();
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  stopCurrentEffect() {
    // Cancel Animation Loop
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Call Destroy on current effect class instance
    if (this.currentEffect) {
      try {
        this.currentEffect.destroy();
      } catch (e) {
        console.error('[EffectManager] Error destroying effect:', e);
      }
      this.currentEffect = null;
    }

    // Clear Canvas
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.currentEffectId = null;
  }

  unmount() {
    this.stopCurrentEffect();

    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    this.canvas = null;
    this.ctx = null;
  }
}
