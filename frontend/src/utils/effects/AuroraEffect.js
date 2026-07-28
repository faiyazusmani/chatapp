import { BaseEffect } from './BaseEffect';

export class AuroraEffect extends BaseEffect {
  init() {
    this.time = 0;
  }

  update(deltaTime) {
    this.time += (0.008 * (this.options.speed || 1)) * (deltaTime / 16);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const waves = [
      { color: 'rgba(34, 197, 94, 0.18)', speed: 1, heightMult: 0.3 },
      { color: 'rgba(168, 85, 247, 0.15)', speed: 1.5, heightMult: 0.4 },
      { color: 'rgba(6, 182, 212, 0.12)', speed: 0.8, heightMult: 0.2 },
    ];

    waves.forEach((w) => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height);

      for (let x = 0; x <= this.width; x += 20) {
        const y =
          Math.sin(x * 0.005 + this.time * w.speed) * 60 +
          Math.cos(x * 0.003 + this.time) * 40 +
          this.height * w.heightMult;
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(this.width, this.height);
      this.ctx.closePath();

      this.ctx.fillStyle = w.color;
      this.ctx.fill();
    });
  }
}
