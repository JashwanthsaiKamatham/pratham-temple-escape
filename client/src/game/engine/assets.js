import * as THREE from 'three';
import { getGameTextures } from '../textures';

export const UP = new THREE.Vector3(0, 1, 0);
export const LANE_WIDTH = 2.5;
export const TRACK_WIDTH = 8.4;
export const CHUNK_LENGTH = 12;

const std = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...opts });

export const MAT = {
  stone: std(0xc9a06a, { roughness: 0.9 }),
  stoneWarm: std(0xb98b55, { roughness: 0.92 }),
  stoneDark: std(0x6b533a, { roughness: 0.95 }),
  sandstone: std(0xd4a76a, { roughness: 0.88 }),
  gold: std(0xf0b429, { roughness: 0.28, metalness: 0.85 }),
  goldDark: std(0xb45309, { roughness: 0.4, metalness: 0.65 }),
  wood: std(0x8b5a2b, { roughness: 0.9 }),
  woodDark: std(0x5a3618, { roughness: 0.95 }),
  rope: std(0xb08d57, { roughness: 1 }),
  leaf: std(0x2f7d32, { roughness: 0.95 }),
  leafLight: std(0x4ade80, { roughness: 0.9 }),
  leafDeep: std(0x166534, { roughness: 0.95 }),
  trunk: std(0x5d4037, { roughness: 1 }),
  moss: std(0x4d7c0f, { roughness: 1 }),
  rock: std(0x78716c, { roughness: 1 }),
  rockDark: std(0x44403c, { roughness: 1 }),
  charcoal: std(0x1c1917, { roughness: 0.9 }),
  crystal: new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.2,
    transparent: true,
    opacity: 0.95
  }),
  crystalViolet: new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    emissive: 0x7c3aed,
    emissiveIntensity: 1.3,
    roughness: 0.2
  }),
  flame: new THREE.MeshBasicMaterial({ color: 0xff8a1f }),
  flameCore: new THREE.MeshBasicMaterial({ color: 0xfff0a8 }),
  ember: new THREE.MeshBasicMaterial({ color: 0xff3b00 }),
  water: new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.86,
    roughness: 0.1,
    metalness: 0.45,
    side: THREE.DoubleSide
  }),
  waterFall: new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    metalness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false
  }),
  coin: new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.95
  }),
  diamond: new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0e7490,
    emissiveIntensity: 0.9,
    roughness: 0.05,
    metalness: 0.4,
    transparent: true,
    opacity: 0.95
  }),
  spike: std(0x57534e, { roughness: 0.5, metalness: 0.35 }),
  pit: new THREE.MeshBasicMaterial({ color: 0x05070d }),
  shadowBlob: new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.24,
    depthWrite: false
  })
};

// ---------------------------------------------------------------------------
// Shared geometries
// ---------------------------------------------------------------------------
export const GEO = {
  coin: new THREE.CylinderGeometry(0.38, 0.38, 0.09, 18),
  coinRim: new THREE.TorusGeometry(0.38, 0.045, 8, 20),
  diamond: new THREE.OctahedronGeometry(0.4, 0),
  powerCore: new THREE.IcosahedronGeometry(0.46, 0),
  powerRing: new THREE.TorusGeometry(0.68, 0.06, 8, 26),
  post: new THREE.BoxGeometry(0.34, 1.9, 0.34),
  plank: new THREE.BoxGeometry(2.2, 0.16, 0.22),
  spikeCone: new THREE.ConeGeometry(0.16, 0.85, 6),
  boulder: new THREE.DodecahedronGeometry(1.0, 0),
  rubble: new THREE.DodecahedronGeometry(0.42, 0),
  crystalShard: new THREE.ConeGeometry(0.34, 1.5, 5),
  flameCone: new THREE.ConeGeometry(0.24, 0.9, 7),
  flameCoreCone: new THREE.ConeGeometry(0.12, 0.55, 6)
};

// ---------------------------------------------------------------------------
// Ground material per biome
// ---------------------------------------------------------------------------
let groundMaterials = null;
function makeGroundMaterials() {
  const tex = getGameTextures();
  const mk = (texture, color, roughness = 0.95) => {
    const t = texture.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2);
    return new THREE.MeshStandardMaterial({ map: t, color, roughness });
  };
  return {
    temple: mk(tex.templeFloor, 0xffffff),
    jungle: mk(tex.templeFloor, 0x9ca86b),
    bridge: mk(tex.woodBridge, 0xffffff),
    waterfall: mk(tex.templeFloor, 0xa8c9d8),
    cave: mk(tex.caveFloor, 0xffffff, 0.7),
    ruins: mk(tex.pillarStone, 0xd9b184)
  };
}

export function getWaterTexture() {
  return getGameTextures().waterTex;
}

const tintedCache = new Map();

export function groundMaterialFor(biomeId, tint) {
  const key = `${biomeId}_${tint ?? 'base'}`;
  if (tintedCache.has(key)) return tintedCache.get(key);
  const base = (groundMaterials || (groundMaterials = makeGroundMaterials()))[biomeId];
  let mat = base;
  if (tint != null) {
    mat = base.clone();
    mat.color.setHex(tint === 0xffffff ? 0xffffff : tint);
    if (mat.map) mat.map = base.map;
  }
  tintedCache.set(key, mat);
  return mat;
}

// ---------------------------------------------------------------------------
// Prop factories (each returns a THREE.Group)
// ---------------------------------------------------------------------------
export function createPillar({ height = 5.4, radius = 0.42, wealth = 1 } = {}) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.6, 0.5, radius * 2.6), MAT.stoneDark);
  base.position.y = 0.25;
  g.add(base);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius, height, 12),
    MAT.sandstone
  );
  shaft.position.y = 0.5 + height / 2;
  shaft.castShadow = true;
  g.add(shaft);

  // Carved rings
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.12, 12),
      MAT.stoneWarm
    );
    ring.position.y = 0.9 + i * (height / 3.4);
    g.add(ring);
  }

  const capital = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 3.1, 0.5, radius * 3.1),
    MAT.sandstone
  );
  capital.position.y = 0.5 + height + 0.2;
  g.add(capital);

  if (wealth > 0) {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.5, 0.9, 4), MAT.gold);
    crown.position.y = 0.5 + height + 0.9;
    crown.rotation.y = Math.PI / 4;
    g.add(crown);
  }
  return g;
}

export function createTorana(width = 9.6, height = 4.6) {
  const g = new THREE.Group();
  const left = createPillar({ height: height - 0.9, radius: 0.34, wealth: 0.5 });
  left.position.x = -width / 2;
  g.add(left);

  const right = createPillar({ height: height - 0.9, radius: 0.34, wealth: 0.5 });
  right.position.x = width / 2;
  g.add(right);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, 0.62, 0.8), MAT.sandstone);
  lintel.position.y = height;
  lintel.castShadow = true;
  g.add(lintel);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 1.8, 0.16, 0.9), MAT.gold);
  trim.position.y = height + 0.36;
  g.add(trim);

  // Hanging brass bells
  [-2.6, 0, 2.6].forEach((x) => {
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 8), MAT.gold);
    bell.position.set(x, height - 0.42, 0.3);
    g.add(bell);
  });

  return g;
}

export function createTree(scale = 1, variant = 0) {
  const g = new THREE.Group();
  const trunkH = 3.2 * scale;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.34 * scale, trunkH, 7),
    MAT.trunk
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  const leafMat = variant % 3 === 0 ? MAT.leafDeep : variant % 3 === 1 ? MAT.leaf : MAT.leafLight;
  for (let i = 0; i < 3; i++) {
    const canopy = new THREE.Mesh(
      new THREE.IcosahedronGeometry((1.35 - i * 0.22) * scale, 0),
      leafMat
    );
    canopy.position.set(
      (Math.random() - 0.5) * 0.7 * scale,
      trunkH + i * 0.75 * scale,
      (Math.random() - 0.5) * 0.7 * scale
    );
    canopy.scale.y = 0.82;
    canopy.castShadow = true;
    g.add(canopy);
  }
  return g;
}

export function createBush(scale = 1) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * scale, 0), MAT.leaf);
    b.position.set((Math.random() - 0.5) * 0.8, 0.35 * scale, (Math.random() - 0.5) * 0.8);
    b.scale.y = 0.7;
    g.add(b);
  }
  return g;
}

export function createVine(length = 3) {
  const g = new THREE.Group();
  const vine = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.02, length, 5),
    MAT.leafDeep
  );
  vine.position.y = -length / 2;
  g.add(vine);
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 5, 4), MAT.leafLight);
    leaf.scale.set(1, 0.35, 0.7);
    leaf.position.set(0.1, -length * (0.25 + i * 0.25), 0);
    g.add(leaf);
  }
  return g;
}

export function createCrystalCluster(scale = 1) {
  const g = new THREE.Group();
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const shard = new THREE.Mesh(GEO.crystalShard, i % 2 ? MAT.crystal : MAT.crystalViolet);
    shard.scale.set(
      (0.45 + Math.random() * 0.5) * scale,
      (0.6 + Math.random() * 0.9) * scale,
      (0.45 + Math.random() * 0.5) * scale
    );
    shard.position.set((Math.random() - 0.5) * 1.4 * scale, 0.5 * scale, (Math.random() - 0.5) * 1.4 * scale);
    shard.rotation.z = (Math.random() - 0.5) * 0.6;
    shard.rotation.x = (Math.random() - 0.5) * 0.4;
    g.add(shard);
  }
  return g;
}

export function createBrazier(scale = 1) {
  const g = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.22 * scale, 0.5 * scale, 10), MAT.stoneDark);
  bowl.position.y = 0.9 * scale;
  g.add(bowl);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 0.9 * scale, 8), MAT.stone);
  stem.position.y = 0.45 * scale;
  g.add(stem);

  const flame = new THREE.Mesh(GEO.flameCone, MAT.flame);
  flame.scale.setScalar(scale * 1.05);
  flame.position.y = 1.55 * scale;
  g.add(flame);

  const core = new THREE.Mesh(GEO.flameCoreCone, MAT.flameCore);
  core.scale.setScalar(scale);
  core.position.y = 1.5 * scale;
  g.add(core);
  return g;
}

export function createRopeRail(length, side) {
  const g = new THREE.Group();
  const postCount = Math.max(2, Math.round(length / 3.2));
  for (let i = 0; i <= postCount; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 6), MAT.woodDark);
    post.position.set(0, 0.75, -length / 2 + (i * length) / postCount);
    g.add(post);
  }
  [0.65, 1.35].forEach((y) => {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, length, 5), MAT.rope);
    rope.rotation.x = Math.PI / 2;
    rope.position.set(0, y, 0);
    g.add(rope);
  });
  return g;
}

export function createWaterfallSheet(width = 4, height = 10) {
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), MAT.waterFall);
  sheet.position.y = height / 2 - 1.5;
  g.add(sheet);

  const foam = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0xf0f9ff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.4
    })
  );
  foam.scale.set(1.6, 0.5, 1.1);
  foam.position.y = -1.0;
  g.add(foam);
  return g;
}

export function createBrokenColumn(height = 2.4) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, height, 10), MAT.sandstone);
  shaft.position.y = height / 2;
  shaft.castShadow = true;
  g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.22, 1.05), MAT.stoneWarm);
  cap.position.y = height + 0.1;
  cap.rotation.y = Math.random();
  g.add(cap);
  return g;
}

export function createFallenBlock(scale = 1) {
  const b = new THREE.Mesh(
    new THREE.BoxGeometry(0.9 * scale, 0.7 * scale, 0.9 * scale),
    MAT.stoneWarm
  );
  b.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3);
  b.position.y = 0.3 * scale;
  return b;
}

export function createJungleGate(height = 5.2) {
  const g = new THREE.Group();
  const left = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, height, 7), MAT.trunk);
  left.position.set(-4.6, height / 2, 0);
  g.add(left);
  const right = left.clone();
  right.position.x = 4.6;
  g.add(right);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 10, 6), MAT.trunk);
  top.rotation.z = Math.PI / 2;
  top.position.y = height - 0.2;
  g.add(top);
  for (let i = 0; i < 7; i++) {
    const vine = createVine(1.6 + Math.random() * 1.8);
    vine.position.set(-4 + i * 1.3, height - 0.3, 0);
    g.add(vine);
  }
  return g;
}

export function createDemonWall() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 6.4, 1.2), MAT.stoneDark);
  wall.position.y = 3.2;
  wall.castShadow = true;
  g.add(wall);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 1.5), MAT.gold);
  trim.position.y = 6.5;
  g.add(trim);

  // Carved demon face relief
  const face = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.0, 0.35), MAT.stoneWarm);
  face.position.set(0, 3.1, -0.66);
  face.rotation.y = Math.PI;
  g.add(face);

  [-0.95, 0.95].forEach((x) => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.2), MAT.ember);
    eye.position.set(x, 3.5, -0.86);
    g.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.2), MAT.stoneDark);
    brow.position.set(x, 3.78, -0.86);
    brow.rotation.z = x < 0 ? -0.22 : 0.22;
    g.add(brow);
  });

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 0.24), MAT.charcoal);
  mouth.position.set(0, 2.42, -0.86);
  g.add(mouth);

  for (let i = 0; i < 5; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 4), MAT.stone);
    tooth.position.set(-0.9 + i * 0.45, 2.42, -0.86);
    tooth.rotation.x = Math.PI;
    g.add(tooth);
  }
  return g;
}

export function createDais(radius = 3.8) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius + 0.15, 0.14, 28),
    MAT.stoneWarm
  );
  base.position.y = 0.05;
  base.receiveShadow = true;
  g.add(base);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.78, 0.09, 6, 30), MAT.gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  g.add(ring);

  const chakra = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.42, 0.06, 6, 24), MAT.goldDark);
  chakra.rotation.x = Math.PI / 2;
  chakra.position.y = 0.14;
  g.add(chakra);
  return g;
}
