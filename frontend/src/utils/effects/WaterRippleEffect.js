import { BaseEffect } from './BaseEffect';

export class WaterRippleEffect extends BaseEffect {
  init() {
    this.particles = [];
    this.spawnTimer = 0;
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);
    this.spawnTimer += deltaTime;

    if (this.spawnTimer > 1200 / (this.options.speed || 1)) {
      this.spawnTimer = 0;
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 5,
        maxRadius: Math.random() * 80 + 40,
        alpha: 0.8,
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.radius += 0.8 * speed;
      p.alpha -= 0.008 * speed;
      if (p.alpha <= 0 || p.radius >= p.maxRadius) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // Inner Highlight ring
      if (p.radius > 15) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius - 10, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha * 0.5})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    });
  }
}
