import { BaseEffect } from './BaseEffect';

export class FloatingCloudsEffect extends BaseEffect {
  init() {
    this.particles = [];
    const count = 6;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.7),
        radius: Math.random() * 80 + 60,
        vx: (Math.random() * 0.4 + 0.1) * (this.options.speed || 1),
        alpha: Math.random() * 0.15 + 0.08,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.x += p.vx * speed;
      if (p.x - p.radius > this.width) {
        p.x = -p.radius * 2;
        p.y = Math.random() * (this.height * 0.7);
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = '#ffffff';

      // Draw Volumetric Cloud Puff
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.arc(p.x + p.radius * 0.5, p.y - p.radius * 0.2, p.radius * 0.7, 0, Math.PI * 2);
      this.ctx.arc(p.x - p.radius * 0.5, p.y - p.radius * 0.2, p.radius * 0.7, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }
}
