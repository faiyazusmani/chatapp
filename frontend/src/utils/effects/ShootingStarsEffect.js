import { BaseEffect } from './BaseEffect';

export class ShootingStarsEffect extends BaseEffect {
  init() {
    this.particles = [];
    const count = 5;

    for (let i = 0; i < count; i++) {
      this.resetStar(i);
    }
  }

  resetStar(i) {
    if (!this.particles) this.particles = [];
    this.particles[i] = {
      x: Math.random() * this.width,
      y: Math.random() * (this.height * 0.5),
      length: Math.random() * 120 + 60,
      speed: (Math.random() * 8 + 6) * (this.options.speed || 1),
      angle: Math.PI / 4,
      alpha: 1,
    };
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p, idx) => {
      p.x += Math.cos(p.angle) * p.speed * speed;
      p.y += Math.sin(p.angle) * p.speed * speed;
      p.alpha -= 0.015 * speed;

      if (p.alpha <= 0 || p.x > this.width || p.y > this.height) {
        this.resetStar(idx);
      }
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles.forEach((p) => {
      const tailX = p.x - Math.cos(p.angle) * p.length;
      const tailY = p.y - Math.sin(p.angle) * p.length;

      const grad = this.ctx.createLinearGradient(p.x, p.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
      grad.addColorStop(0.3, `rgba(56, 189, 248, ${p.alpha * 0.7})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(tailX, tailY);
      this.ctx.strokeStyle = grad;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Glowing head
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      this.ctx.fill();
    });
  }
}
