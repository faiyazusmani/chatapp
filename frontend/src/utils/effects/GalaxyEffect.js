import { BaseEffect } from './BaseEffect';

export class GalaxyEffect extends BaseEffect {
  init() {
    this.particles = [];
    const speedMult = this.options.speed || 1;
    const densityMult = this.options.density || 1;
    const count = Math.min(Math.floor(70 * densityMult), 150);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: (Math.random() * 0.02 + 0.005) * speedMult,
        color: ['#c084fc', '#a855f7', '#818cf8', '#e0e7ff', '#ffffff'][Math.floor(Math.random() * 5)],
      });
    }

    // Shooting Comets
    this.comets = [];
    for (let i = 0; i < 3; i++) {
      this.resetComet(i);
    }
  }

  resetComet(idx) {
    if (!this.comets) this.comets = [];
    this.comets[idx] = {
      x: Math.random() * this.width,
      y: Math.random() * (this.height * 0.4),
      length: Math.random() * 80 + 40,
      vx: (Math.random() * 4 + 3) * (this.options.speed || 1),
      vy: (Math.random() * 2 + 1.5) * (this.options.speed || 1),
      alpha: 1,
    };
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);

    this.particles.forEach((p) => {
      p.alpha += p.twinkleSpeed * speed;
      if (p.alpha > 1 || p.alpha < 0.2) p.twinkleSpeed = -p.twinkleSpeed;
    });

    if (this.comets) {
      this.comets.forEach((c, idx) => {
        c.x += c.vx * speed;
        c.y += c.vy * speed;
        c.alpha -= 0.01 * speed;
        if (c.alpha <= 0 || c.x > this.width || c.y > this.height) {
          this.resetComet(idx);
        }
      });
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Cosmic Dust Nebula Radial Gradient
    const gradient = this.ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.3,
      10,
      this.width * 0.5,
      this.height * 0.3,
      this.width * 0.6
    );
    gradient.addColorStop(0, 'rgba(139, 92, 246, 0.15)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Starfield
    this.particles.forEach((p) => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    });

    // Comets
    if (this.comets) {
      this.comets.forEach((c) => {
        this.ctx.beginPath();
        const tailX = c.x - c.length;
        const tailY = c.y - c.length * 0.5;
        const grad = this.ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${c.alpha})`);
        grad.addColorStop(1, 'rgba(168, 85, 247, 0)');

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(c.x, c.y);
        this.ctx.lineTo(tailX, tailY);
        this.ctx.stroke();
      });
    }

    this.ctx.globalAlpha = 1;
  }
}
