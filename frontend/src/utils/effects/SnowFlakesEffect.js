import { BaseEffect } from './BaseEffect';

export class SnowFlakesEffect extends BaseEffect {
  init() {
    this.particles = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(60 * densityMult), 130);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 4 + 2,
        vy: (Math.random() * 1 + 0.5) * (this.options.speed || 1),
        swaySpeed: (Math.random() * 0.02 + 0.008) * (this.options.speed || 1),
        angle: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.6 + 0.4,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.angle += p.swaySpeed * speed;
      p.x += Math.sin(p.angle) * 0.6 * speed;
      p.y += p.vy * speed;

      if (p.y > this.height) {
        p.y = -10;
        p.x = Math.random() * this.width;
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.globalAlpha = p.alpha;
      this.ctx.strokeStyle = '#e0f2fe';
      this.ctx.lineWidth = 1;

      // Draw 6-arm Snowflake Star
      for (let i = 0; i < 6; i++) {
        this.ctx.rotate(Math.PI / 3);
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(0, p.radius * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }
}
