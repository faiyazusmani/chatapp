import { BaseEffect } from './BaseEffect';

export class CrystalLightEffect extends BaseEffect {
  init() {
    this.particles = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(25 * densityMult), 60);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 12 + 6,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 0.02 - 0.01) * (this.options.speed || 1),
        vy: (Math.random() * 0.5 - 0.25) * (this.options.speed || 1),
        alpha: Math.random() * 0.5 + 0.3,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.angle += p.rotSpeed * speed;
      p.y += p.vy * speed;
      if (p.y > this.height) p.y = 0;
      if (p.y < 0) p.y = this.height;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.globalAlpha = p.alpha;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
      this.ctx.lineWidth = 1;

      // Draw Diamond Crystal Shard
      this.ctx.beginPath();
      this.ctx.moveTo(0, -p.size);
      this.ctx.lineTo(p.size * 0.6, 0);
      this.ctx.lineTo(0, p.size);
      this.ctx.lineTo(-p.size * 0.6, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }
}
