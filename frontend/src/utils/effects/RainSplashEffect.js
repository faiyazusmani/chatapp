import { BaseEffect } from './BaseEffect';

export class RainSplashEffect extends BaseEffect {
  init() {
    this.particles = [];
    this.splashes = [];
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(100 * densityMult), 200);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: Math.random() * 20 + 10,
        vy: (Math.random() * 8 + 12) * (this.options.speed || 1),
        vx: -2 * (this.options.speed || 1),
        alpha: Math.random() * 0.5 + 0.3,
      });
    }
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;

      if (p.y > this.height) {
        // Trigger Splash Ring on collision with screen bottom
        if (Math.random() > 0.6) {
          this.splashes.push({
            x: p.x,
            y: this.height - Math.random() * 20,
            radius: 1,
            maxRadius: Math.random() * 12 + 6,
            alpha: 0.8,
          });
        }
        p.y = -20;
        p.x = Math.random() * (this.width + 100);
      }
    });

    // Update Splash rings
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.radius += 0.8 * speed;
      s.alpha -= 0.04 * speed;
      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.splashes.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Rain Streaks
    this.ctx.lineWidth = 1.2;
    this.particles.forEach((p) => {
      this.ctx.beginPath();
      this.ctx.strokeStyle = `rgba(147, 197, 253, ${p.alpha})`;
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(p.x + p.vx * 1.5, p.y + p.length);
      this.ctx.stroke();
    });

    // Splash Impact Circles
    this.splashes.forEach((s) => {
      this.ctx.beginPath();
      this.ctx.ellipse(s.x, s.y, s.radius, s.radius * 0.4, 0, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(147, 197, 253, ${s.alpha})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }
}
