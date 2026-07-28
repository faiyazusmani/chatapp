import { BaseEffect } from './BaseEffect';

export class FallingLeavesEffect extends BaseEffect {
  init() {
    this.particles = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(30 * densityMult), 70);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 10 + 8,
        vx: (Math.random() * 2 - 0.5) * (this.options.speed || 1),
        vy: (Math.random() * 1.5 + 0.8) * (this.options.speed || 1),
        angle: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.03 + 0.01,
        color: ['#d97706', '#b45309', '#f59e0b', '#78350f', '#ea580c'][Math.floor(Math.random() * 5)],
        alpha: Math.random() * 0.4 + 0.6,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.x += (p.vx + Math.sin(p.angle) * 1.2) * speed;
      p.y += p.vy * speed;
      p.angle += p.swaySpeed * speed;

      if (p.y > this.height) {
        p.y = -20;
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

      // Draw Maple Leaf shape path
      this.ctx.beginPath();
      this.ctx.moveTo(0, -p.size);
      this.ctx.lineTo(p.size * 0.3, -p.size * 0.4);
      this.ctx.lineTo(p.size * 0.8, -p.size * 0.5);
      this.ctx.lineTo(p.size * 0.5, 0);
      this.ctx.lineTo(p.size * 0.6, p.size * 0.5);
      this.ctx.lineTo(0, p.size * 0.2);
      this.ctx.lineTo(-p.size * 0.6, p.size * 0.5);
      this.ctx.lineTo(-p.size * 0.5, 0);
      this.ctx.lineTo(-p.size * 0.8, -p.size * 0.5);
      this.ctx.lineTo(-p.size * 0.3, -p.size * 0.4);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }
}
