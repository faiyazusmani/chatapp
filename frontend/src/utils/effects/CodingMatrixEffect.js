import { BaseEffect } from './BaseEffect';

export class CodingMatrixEffect extends BaseEffect {
  init() {
    this.particles = [];
    const fontSize = 14;
    this.columns = Math.floor(this.width / fontSize);

    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.floor(Math.random() * -50);
    }

    this.symbols = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ⚛const async await function=>{}';
  }

  update(deltaTime) {
    const speed = (this.options.speed || 1) * (deltaTime / 16);
    for (let i = 0; i < this.drops.length; i++) {
      this.drops[i] += 1 * speed;
      if (this.drops[i] * 14 > this.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
    }
  }

  draw() {
    // Semi-transparent black trail mask for Matrix drop fade effect
    this.ctx.fillStyle = 'rgba(2, 16, 8, 0.15)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#22c55e';
    this.ctx.font = "13px 'Fira Code', monospace";

    for (let i = 0; i < this.drops.length; i++) {
      const text = this.symbols.charAt(Math.floor(Math.random() * this.symbols.length));
      const x = i * 14;
      const y = this.drops[i] * 14;

      // Glow lead character in bright white-green
      if (Math.random() > 0.8) {
        this.ctx.fillStyle = '#86efac';
      } else {
        this.ctx.fillStyle = '#22c55e';
      }

      this.ctx.fillText(text, x, y);
    }
  }
}
