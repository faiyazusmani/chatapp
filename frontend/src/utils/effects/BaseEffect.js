/**
 * Abstract Base Class for all Wallpaper Effects
 * Provides standardized lifecycle hooks: init(), update(), draw(), resize(), and destroy().
 */

export class BaseEffect {
  constructor(canvas, ctx, options = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.options = options;
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
  }

  // Lifecycle hooks to be overridden by effect subclasses
  init() {}

  // eslint-disable-next-line no-unused-vars -- base hook signature; subclasses may use deltaTime
  update(deltaTime = 16) {}

  draw() {}

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  // Complete memory cleanup and destruction
  destroy() {
    this.particles = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}
