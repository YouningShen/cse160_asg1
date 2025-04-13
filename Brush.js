class Brush {
    constructor() {
      this.type = 'brush';
      this.position = [0.0, 0.0, 0.0];
      this.color = [1.0, 1.0, 1.0, 1.0];
      this.size = 5.0;
      this.bristleCount = 20;
  
      // Precompute random offsets for bristle flakes
      this.offsets = [];
      for (let i = 0; i < this.bristleCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const dist = Math.random(); // normalized; scale with size later
        this.offsets.push([angle, dist]);
      }
    }
  
    render() {
      const [cx, cy] = this.position;
      const rgba = this.color;
      const size = this.size;
      const radius = size / 200.0;
      const flakeSize = size / 800.0;
  
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
  
      for (const [angle, distNorm] of this.offsets) {
        const dist = distNorm * radius;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
  
        const px = cx + dx;
        const py = cy + dy;
  
        drawTriangle([
          px, py,
          px + flakeSize, py,
          px, py + flakeSize
        ]);
      }
    }
  }
  