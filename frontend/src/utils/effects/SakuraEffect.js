import { BaseEffect } from './BaseEffect';

export class SakuraEffect extends BaseEffect {
  init() {
    this.particles = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(35 * densityMult), 80);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 8 + 6,
        vx: (Math.random() * 1.5 - 0.5) * (this.options.speed || 1),
        vy: (Math.random() * 1.2 + 0.8) * (this.options.speed || 1),
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() * 0.04 - 0.02) * (this.options.speed || 1),
        color: ['#f472b6', '#ec4899', '#fbcfe8', '#f43f5e'][Math.floor(Math.random() * 4)],
        alpha: Math.random() * 0.5 + 0.5,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.x += (p.vx + Math.sin(p.angle) * 0.8) * speed;
      p.y += p.vy * speed;
      p.angle += p.angularVelocity * speed;

      if (p.y > this.height) {
        p.y = -15;
        p.x = Math.random() * this.width;
      }
      if (p.x > this.width) p.x = 0;
      if (p.x < 0) p.x = this.width;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;

      // Draw custom Sakura Petal shape path
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.bezierCurveTo(-p.size, -p.size * 0.5, -p.size * 0.5, -p.size * 1.5, 0, -p.size);
      this.ctx.bezierCurveTo(p.size * 0.5, -p.size * 1.5, p.size, -p.size * 0.5, 0, 0);
      this.ctx.fill();

      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }
}
