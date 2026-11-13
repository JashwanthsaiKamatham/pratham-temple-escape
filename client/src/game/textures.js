import * as THREE from 'three';

function makeCanvasTexture(drawFn, repeatX = 1, repeatY = 1, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cachedTextures = null;

export function getGameTextures() {
  if (cachedTextures) return cachedTextures;

  // 1. Carved Ancient Indian Sandstone Path
  const templeFloor = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#c89d66';
    ctx.fillRect(0, 0, s, s);

    // Stone slabs
    ctx.strokeStyle = '#7c5832';
    ctx.lineWidth = 4;
    const rows = 4;
    const rowH = s / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();

      const cols = 3;
      const offset = (r % 2) * (s / 6);
      for (let c = 0; c <= cols; c++) {
        const x = (c * (s / cols) + offset) % s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();
      }
    }

    // Subtle weathering & moss speckles
    for (let i = 0; i < 350; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      ctx.fillStyle =
        i % 7 === 0
          ? 'rgba(74, 124, 56, 0.24)'
          : i % 2 === 0
            ? 'rgba(255, 236, 196, 0.16)'
            : 'rgba(85, 55, 25, 0.18)';
      ctx.fillRect(x, y, 4, 4);
    }

    // Golden temple lane border motifs
    ctx.fillStyle = 'rgba(217, 119, 6, 0.42)';
    ctx.fillRect(6, 0, 10, s);
    ctx.fillRect(s - 16, 0, 10, s);
  }, 1, 2);

  // 2. Wooden Suspension Bridge Planks
  const woodBridge = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(0, 0, s, s);
    const planks = 8;
    const h = s / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#784b2a' : '#5e391f';
      ctx.fillRect(0, i * h + 2, s, h - 4);
      ctx.fillStyle = '#2d1a0e';
      ctx.fillRect(0, i * h, s, 3);
      // Nail heads
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(18, i * h + h / 2, 3, 0, Math.PI * 2);
      ctx.arc(s - 18, i * h + h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1, 2);

  // 3. Dark Crystal Cave Stone Floor
  const caveFloor = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#27293d';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle =
        i % 9 === 0 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 8, 8);
    }
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, s - 16, s - 16);
  }, 1, 2);

  // 4. Carved Temple Pillar Stone
  const pillarStone = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#b78853';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#8c6239';
    for (let y = 16; y < s; y += 48) {
      ctx.fillRect(0, y, s, 10);
      for (let x = 12; x < s; x += 32) {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(x, y + 16, 14, 14);
        ctx.fillStyle = '#8c6239';
      }
    }
  }, 1, 2);

  // 5. Sacred River / Waterfall Texture
  const waterTex = makeCanvasTexture((ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#0369a1');
    grad.addColorStop(0.5, '#0891b2');
    grad.addColorStop(1, '#22d3ee');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Flowing current streaks + foam
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.22})`;
      const w = 2 + Math.random() * 5;
      const h = 14 + Math.random() * 46;
      ctx.fillRect(Math.random() * s, Math.random() * s, w, h);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(224, 252, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 3 + Math.random() * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 3, 3);

  // 6. Soft terrain noise for the distant valley floor
  const groundNoise = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const shade = Math.random() < 0.5 ? 0 : 255;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.02 + Math.random() * 0.05})`;
      const r = 2 + Math.random() * 7;
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 30, 30);

  cachedTextures = {
    templeFloor,
    woodBridge,
    caveFloor,
    pillarStone,
    waterTex,
    groundNoise
  };

  return cachedTextures;
}
