import { BaseEffect } from './BaseEffect';

export class EmberParticlesEffect extends BaseEffect {
  init() {
    this.particles = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(50 * densityMult), 110);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: this.height + Math.random() * 50,
        radius: Math.random() * 3 + 1,
        vy: (Math.random() * 1.8 + 0.8) * (this.options.speed || 1),
        vx: (Math.random() * 1 - 0.5) * (this.options.speed || 1),
        color: ['#f97316', '#ea580c', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)],
        alpha: Math.random() * 0.7 + 0.3,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.y -= p.vy * speed;
      p.x += (p.vx + Math.sin(p.y * 0.02) * 0.5) * speed;
      p.alpha -= 0.003 * speed;

      if (p.y < -10 || p.alpha <= 0) {
        p.y = this.height + Math.random() * 20;
        p.x = Math.random() * this.width;
        p.alpha = Math.random() * 0.7 + 0.3;
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = p.color;
      this.ctx.fill();
    });

    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }
}
