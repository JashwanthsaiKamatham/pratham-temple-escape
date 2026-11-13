import * as THREE from 'three';
import { BIOMES, POWERUPS } from '../constants';
import * as A from './assets';
import {
  TURN_RADIUS,
  TURN_ARC_LENGTH,
  TURN_SWEEP,
  TRACK_HALF,
  TURN_APPROACH,
  buildTurnGeometry,
  pathTransform,
  rightOf,
  laneWorldPosition
} from './path';

const SEGMENTS_AHEAD = 5;

let UID = 0;

function rnd(min, max) {
  return min + Math.random() * (max - min);
}
function pick(arr) {
  return arr[Math.floor(arr.length * Math.random())];
}
function rotateYVecVec(vec, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new THREE.Vector3(vec.x * cos + vec.z * sin, 0, -vec.x * sin + vec.z * cos);
}

function biomeTint(id) {
  const biome = BIOMES.find((b) => b.id === id);
  return biome ? biome.groundTint : 0xffffff;
}

// ---------------------------------------------------------------------------
// Obstacle mesh factory
// ---------------------------------------------------------------------------
export function obstacleMesh(kind, palette = A.MAT) {
  const g = new THREE.Group();
  const add = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    g.add(m);
    return m;
  };

  let halfDepth = 0.8;
  let required = 'jump';
  let topBlock = false;
  let hitY = 0;

  switch (kind) {
    case 'barrier':
      halfDepth = 0.5;
      required = 'jump';
      hitY = 1.05;
      add(new THREE.BoxGeometry(2.1, 0.34, 0.22), palette.wood, [0, 1.02, 0]);
      add(new THREE.BoxGeometry(2.1, 0.24, 0.2), palette.wood, [0, 0.55, 0]);
      add(new THREE.BoxGeometry(0.2, 1.35, 0.2), palette.woodDark, [-0.98, 0.68, 0]);
      add(new THREE.BoxGeometry(0.2, 1.35, 0.2), palette.woodDark, [0.98, 0.68, 0]);
      add(new THREE.BoxGeometry(0.34, 0.34, 0.26), palette.gold, [0, 1.02, 0.02], [0, 0, Math.PI / 4]);
      break;

    case 'beam':
      halfDepth = 0.55;
      required = 'slide';
      hitY = 1.05;
      topBlock = true;
      add(new THREE.CylinderGeometry(0.34, 0.34, 2.7, 9), palette.trunk, [0, 1.52, 0], [0, 0, Math.PI / 2]);
      add(new THREE.BoxGeometry(0.22, 1.65, 0.22), palette.woodDark, [-1.32, 0.82, 0]);
      add(new THREE.BoxGeometry(0.22, 1.65, 0.22), palette.woodDark, [1.32, 0.82, 0]);
      for (let i = 0; i < 4; i++) {
        const v = A.createVine(0.5);
        v.position.set(-0.9 + i * 0.6, 1.28, 0);
        g.add(v);
      }
      break;

    case 'spikes':
      halfDepth = 0.85;
      required = 'jump';
      hitY = 0.9;
      add(new THREE.BoxGeometry(2.2, 0.16, 1.6), palette.stoneDark, [0, 0.08, 0]);
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
          const spike = new THREE.Mesh(A.GEO.spikeCone, palette.spike);
          spike.position.set(-0.9 + i * 0.45, 0.5, -0.4 + j * 0.8);
          spike.castShadow = true;
          g.add(spike);
        }
      }
      break;

    case 'boulder':
      halfDepth = 0.75;
      required = 'dodge';
      hitY = 1.9;
      const rock = add(A.GEO.boulder, palette.rock, [0, 1.05, 0]);
      rock.scale.set(1.15, 1.05, 1.1);
      add(A.GEO.rubble, palette.rockDark, [0.9, 0.28, 0.4]);
      add(A.GEO.rubble, palette.stoneWarm, [-0.85, 0.22, -0.5]);
      break;

    case 'fire':
      halfDepth = 0.7;
      required = 'jump';
      hitY = 0.85;
      add(new THREE.CylinderGeometry(0.9, 1.05, 0.24, 12), palette.charcoal, [0, 0.12, 0]);
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(A.GEO.flameCone, palette.flame);
        f.position.set(-0.6 + i * 0.4, 0.75, i % 2 ? 0.28 : -0.28);
        f.scale.setScalar(0.9 + (i % 2) * 0.35);
        g.add(f);
        const core = new THREE.Mesh(A.GEO.flameCoreCone, palette.flameCore);
        core.position.set(-0.6 + i * 0.4, 0.68, i % 2 ? 0.28 : -0.28);
        g.add(core);
      }
      break;

    case 'pit':
      halfDepth = 1.5;
      required = 'jump';
      hitY = 0.62;
      add(new THREE.BoxGeometry(2.4, 0.1, 2.8), palette.pit, [0, 0.02, 0]);
      add(new THREE.BoxGeometry(2.5, 0.28, 0.24), palette.stoneWarm, [0, 0.06, -1.42]);
      add(new THREE.BoxGeometry(2.5, 0.28, 0.24), palette.stoneWarm, [0, 0.06, 1.42]);
      for (let i = 0; i < 3; i++) {
        add(new THREE.ConeGeometry(0.13, 0.6, 5), palette.spike, [-0.7 + i * 0.7, 0.28, 0]);
      }
      break;

    case 'rockfall':
      halfDepth = 0.8;
      required = 'dodge';
      hitY = 1.75;
      const rf = add(new THREE.DodecahedronGeometry(0.85, 0), palette.rockDark, [0, 1.6, 0]);
      rf.scale.setScalar(1.05);
      add(new THREE.ConeGeometry(0.1, 0.5, 4), palette.rock, [0.7, 3.1, 0], [Math.PI, 0, 0]);
      add(new THREE.ConeGeometry(0.08, 0.4, 4), palette.rock, [-0.6, 2.9, 0.2], [Math.PI, 0, 0]);
      add(new THREE.ConeGeometry(0.08, 0.35, 4), palette.rock, [0.1, 3.3, -0.2], [Math.PI, 0, 0]);
      break;

    case 'pendulum':
      halfDepth = 0.6;
      required = 'slide';
      hitY = 1.05;
      topBlock = true;
      add(new THREE.BoxGeometry(0.16, 2.6, 0.16), palette.charcoal, [0, 2.4, 0]);
      const blade = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.12, 6, 14, Math.PI), palette.spike);
      blade.position.set(0, 1.55, 0.1);
      blade.rotation.z = Math.PI;
      g.add(blade);
      add(new THREE.BoxGeometry(1.5, 0.1, 0.16), palette.charcoal, [0, 1.12, 0.1]);
      break;

    case 'brokenbridge':
      halfDepth = 1.4;
      required = 'jump';
      hitY = 0.62;
      add(new THREE.BoxGeometry(2.4, 0.08, 2.6), palette.pit, [0, 0.03, 0]);
      for (let i = 0; i < 4; i++) {
        const plank = new THREE.Mesh(A.GEO.plank, palette.wood);
        plank.position.set(-1.1 + i * 0.7, 0.04, i % 2 ? 1.55 : -1.55);
        plank.rotation.z = (Math.random() - 0.5) * 0.35;
        plank.scale.x = 0.55;
        g.add(plank);
      }
      add(new THREE.BoxGeometry(0.14, 0.9, 0.14), palette.rope, [-1.2, 0.45, -1.42], [0, 0, 0.2]);
      add(new THREE.BoxGeometry(0.14, 0.9, 0.14), palette.rope, [1.2, 0.45, -1.42], [0, 0, -0.2]);
      break;

    default:
      add(new THREE.BoxGeometry(1.6, 1, 1), palette.rock);
  }

  return { group: g, halfDepth, required, topBlock, hitY };
}

export function powerupMesh(type) {
  const cfg = POWERUPS[type];
  const g = new THREE.Group();

  const core = new THREE.Mesh(
    A.GEO.powerCore,
    new THREE.MeshStandardMaterial({
      color: cfg.hex,
      emissive: cfg.hex,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      metalness: 0.3
    })
  );
  g.add(core);

  const ring = new THREE.Mesh(
    A.GEO.powerRing,
    new THREE.MeshBasicMaterial({ color: cfg.hex, transparent: true, opacity: 0.7 })
  );
  g.add(ring);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 14, 10),
    new THREE.MeshBasicMaterial({
      color: cfg.hex,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    })
  );
  g.add(halo);

  g.userData.spin = core;
  g.userData.ring = ring;
  return g;
}

// ---------------------------------------------------------------------------
// Endless world generator
// ---------------------------------------------------------------------------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.segments = [];
    this.reset();
  }

  reset() {
    this.segments.forEach((s) => this._disposeSegment(s));
    this.segments = [];

    this.biomeIndex = 0;
    this.segmentsInBiome = 0;
    this.lastWasTurn = false;
    this.nextStart = new THREE.Vector3(0, 0, 0);
    this.nextDir = new THREE.Vector3(0, 0, 1);
    this.nextIndex = 0;
    this.lastIndex = -1;

    this._addSegment({ length: 92, safe: true, biome: BIOMES[0].id });
    this._growAhead(0);
  }

  _growAhead(lastSegmentIndex) {
    let guard = 0;
    while (this.lastIndex < lastSegmentIndex + SEGMENTS_AHEAD && guard++ < 40) {
      this._addSegment();
    }
  }

  ensureAhead(playerSegmentIndex) {
    this._growAhead(playerSegmentIndex);
  }

  pruneBefore(playerSegmentIndex) {
    while (this.segments.length > 3 && this.segments[0].index < playerSegmentIndex - 1) {
      const seg = this.segments.shift();
      this._disposeSegment(seg);
    }
  }

  /**
   * Fade any scenery that sits between the chase camera and Pratham, so a palm
   * or pillar never blanks out the hero mid-turn. Materials are per-object
   * clones, so this only affects the one tree in the way.
   */
  updateOcclusion(camPos, heroPos, dt) {
    const k = 1 - Math.exp(-12 * dt);
    const s0 = this._occScratch || (this._occScratch = {
      toHero: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      objPos: new THREE.Vector3(),
      toObj: new THREE.Vector3(),
      perp: new THREE.Vector3()
    });

    s0.toHero.subVectors(heroPos, camPos);
    const segLen = s0.toHero.length();
    if (segLen < 0.001) return;
    s0.dir.copy(s0.toHero).divideScalar(segLen);

    for (let si = 0; si < this.segments.length; si++) {
      const list = this.segments[si].fadeables;
      if (!list || !list.length) continue;
      for (let fi = 0; fi < list.length; fi++) {
        const f = list[fi];
        const obj = f.object;
        let target = 1;

        if (obj.visible !== false) {
          obj.getWorldPosition(s0.objPos);
          s0.toObj.subVectors(s0.objPos, camPos);
          const along = s0.toObj.dot(s0.dir);
          if (along > 0.4 && along < segLen - 0.4) {
            s0.perp.copy(s0.dir).multiplyScalar(along);
            const perpDist = s0.toObj.sub(s0.perp).length();
            const r = f.radius * 1.25 + 0.85;
            if (perpDist < r) target = 0.16;
          }
        }

        f.fade += (target - f.fade) * k;

        if (f.fade > 0.992) {
          if (f.transparentOn) {
            for (let mi = 0; mi < f.materials.length; mi++) {
              const m = f.materials[mi];
              m.transparent = false;
              m.opacity = 1;
              m.depthWrite = true;
            }
            f.transparentOn = false;
          }
          f.fade = 1;
          continue;
        }

        if (!f.transparentOn) f.transparentOn = true;
        const op = Math.max(0.16, f.fade);
        for (let mi = 0; mi < f.materials.length; mi++) {
          const m = f.materials[mi];
          if (!m.transparent) {
            m.transparent = true;
            m.depthWrite = false;
          }
          m.opacity = op;
        }
      }
    }
  }

  segmentAt(index) {
    return this.segments.find((s) => s.index === index) || null;
  }

  _nextBiome() {
    if (this.segmentsInBiome >= 3) {
      this.biomeIndex = (this.biomeIndex + 1) % BIOMES.length;
      this.segmentsInBiome = 0;
    }
    this.segmentsInBiome++;
    return BIOMES[this.biomeIndex].id;
  }

  _addSegment(opts = {}) {
    const index = this.nextIndex++;
    const start = this.nextStart.clone();
    const dir = this.nextDir.clone();
    const biome = opts.biome || this._nextBiome();

    let isTurn = opts.type === 'turn';
    if (!opts.type && !opts.safe) {
      isTurn = !this.lastWasTurn && Math.random() < 0.42;
    }
    const turn = isTurn ? opts.turn || (Math.random() < 0.5 ? 'left' : 'right') : null;
    const length = isTurn ? TURN_ARC_LENGTH : opts.length || rnd(46, 68);

    const seg = {
      index,
      type: isTurn ? 'turn' : 'straight',
      length,
      turn: turn,
      sign: 0,
      center: new THREE.Vector3(),
      end: new THREE.Vector3(),
      biome,
      start,
      dir,
      right: new THREE.Vector3(-dir.z, 0, dir.x),
      group: new THREE.Group(),
      obstacles: [],
      collectibles: [],
      powerups: [],
      animated: [],
      safe: Boolean(opts.safe)
    };
    this.root.add(seg.group);

    if (isTurn) {
      const geom = buildTurnGeometry(start, dir, turn);
      seg.sign = geom.sign;
      seg.center.copy(geom.center);
      seg.end.copy(geom.end);
      seg.newDir = geom.newDir;
      this._buildTurnSurface(seg, geom);
      this.nextStart = geom.end.clone();
      this.nextDir = geom.newDir.clone();
    } else {
      this._buildStraightSurface(seg);
      if (!opts.safe) this._populate(seg);
      this._buildDecor(seg);
      this.nextStart = start.clone().addScaledVector(dir, length);
      this.nextDir = dir.clone();
    }

    this.segments.push(seg);
    this.lastIndex = index;
    this.lastWasTurn = isTurn;
    return seg;
  }

  _buildStraightSurface(seg) {
    const tiles = Math.max(2, Math.round(seg.length / A.CHUNK_LENGTH));
    const yaw = Math.atan2(seg.dir.x, seg.dir.z);
    const mat = A.groundMaterialFor(seg.biome, biomeTint(seg.biome));

    for (let i = 0; i < tiles; i++) {
      const d = (i + 0.5) * A.CHUNK_LENGTH;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(A.TRACK_WIDTH, 0.6, A.CHUNK_LENGTH + 0.08),
        mat
      );
      mesh.position.copy(seg.start).addScaledVector(seg.dir, d).add(new THREE.Vector3(0, -0.3, 0));
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      seg.group.add(mesh);
    }

    for (const laneX of [-A.LANE_WIDTH / 2, A.LANE_WIDTH / 2]) {
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.04, seg.length),
        A.MAT.stoneDark
      );
      groove.position
        .copy(seg.start)
        .addScaledVector(seg.dir, seg.length / 2)
        .addScaledVector(seg.right, laneX);
      groove.position.y = 0.02;
      groove.rotation.y = yaw;
      seg.group.add(groove);
    }

    // Path edge kerbs
    for (const side of [-1, 1]) {
      const kerb = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.34, seg.length),
        A.MAT.stoneWarm
      );
      kerb.position
        .copy(seg.start)
        .addScaledVector(seg.dir, seg.length / 2)
        .addScaledVector(seg.right, side * (A.TRACK_WIDTH / 2 + 0.17));
      kerb.position.y = 0.02;
      kerb.rotation.y = yaw;
      seg.group.add(kerb);
    }
  }

  _buildTurnSurface(seg, geom) {
    const mat = A.groundMaterialFor(seg.biome, biomeTint(seg.biome));
    const outer = TURN_RADIUS + TRACK_HALF;
    const inner = Math.max(0.8, TURN_RADIUS - TRACK_HALF);
    const yaw = Math.atan2(seg.dir.x, seg.dir.z);

    // Approach runway then a rounded plaza under the arc
    const approachTiles = Math.max(1, Math.round(TURN_APPROACH / A.CHUNK_LENGTH));
    for (let i = 0; i < approachTiles; i++) {
      const d = (i + 0.5) * (TURN_APPROACH / approachTiles);
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(A.TRACK_WIDTH, 0.6, TURN_APPROACH / approachTiles + 0.5),
        mat
      );
      tile.position.copy(seg.start).addScaledVector(seg.dir, d).add(new THREE.Vector3(0, -0.3, 0));
      tile.rotation.y = yaw;
      tile.receiveShadow = true;
      seg.group.add(tile);
    }
    for (const laneX of [-A.LANE_WIDTH / 2, A.LANE_WIDTH / 2]) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, TURN_APPROACH), A.MAT.stoneDark);
      groove.position
        .copy(seg.start)
        .addScaledVector(seg.dir, TURN_APPROACH / 2)
        .addScaledVector(seg.right, laneX);
      groove.position.y = 0.02;
      groove.rotation.y = yaw;
      seg.group.add(groove);
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 30, 1, geom.thetaStart, TURN_SWEEP),
      new THREE.MeshStandardMaterial({
        map: mat.map,
        color: 0xffffff,
        roughness: 0.9,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(geom.center).add(new THREE.Vector3(0, 0.012, 0));
    ring.renderOrder = 1;
    ring.receiveShadow = true;
    seg.group.add(ring);

    const plaza = new THREE.Mesh(
      new THREE.CircleGeometry(outer * 0.98, 34),
      new THREE.MeshStandardMaterial({
        map: mat.map,
        color: 0xffffff,
        roughness: 0.95
      })
    );
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.copy(geom.center).add(new THREE.Vector3(0, 0.006, 0));
    plaza.receiveShadow = true;
    seg.group.add(plaza);

    const chakra = new THREE.Mesh(new THREE.TorusGeometry(inner * 0.6, 0.12, 6, 30), A.MAT.gold);
    chakra.rotation.x = -Math.PI / 2;
    chakra.position.copy(geom.center).add(new THREE.Vector3(0, 0.03, 0));
    seg.group.add(chakra);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(inner * 0.32, 0.07, 6, 22), A.MAT.goldDark);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.copy(geom.center).add(new THREE.Vector3(0, 0.03, 0));
    seg.group.add(innerRing);

    // Lantern braziers along the inside edge of the corner arc
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      const rot = rotateYVecVec(geom.base, geom.sign * TURN_SWEEP * t);
      const p = geom.center.clone().addScaledVector(rot, inner * 0.62);
      const brazier = A.createBrazier(0.9);
      brazier.position.copy(p);
      seg.group.add(brazier);
    }
  }

  _populate(seg) {
    const difficulty = Math.min(1, seg.index / 26);
    const waveCount = 2 + Math.round(difficulty * 3);
    const usable = Math.max(20, seg.length - 14);
    const used = [];

    const pool = [
      'barrier',
      'barrier',
      'beam',
      'spikes',
      'boulder',
      'fire',
      'pit',
      'rockfall',
      'pendulum',
      'brokenbridge'
    ];

    for (let w = 0; w < waveCount; w++) {
      const dist = 10 + (usable / waveCount) * w + rnd(-2.5, 2.5);
      if (used.some((d) => Math.abs(d - dist) < 9)) continue;
      used.push(dist);

      const blocked = Math.random() < 0.4 + difficulty * 0.22 ? 2 : 1;
      const lanes = [0, 1, 2].sort(() => Math.random() - 0.5).slice(0, blocked);
      lanes.forEach((laneIdx) => {
        this._addObstacle(seg, pick(pool), dist + rnd(-0.5, 0.5), (laneIdx - 1) * A.LANE_WIDTH);
      });
    }

    const coinRuns = 2 + Math.floor(Math.random() * 2);
    for (let c = 0; c < coinRuns; c++) {
      const laneX = (Math.floor(Math.random() * 3) - 1) * A.LANE_WIDTH;
      const startDist = 10 + Math.random() * Math.max(4, seg.length - 30);
      const count = 4 + Math.floor(Math.random() * 5);
      const arc = Math.random() < 0.45;
      for (let i = 0; i < count; i++) {
        const d = startDist + i * 1.9;
        if (d > seg.length - 3) break;
        const y = arc ? 1.0 + Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 0.85 : 1.0;
        this._addCollectible(seg, 'coin', laneX, d, y);
      }
    }

    if (Math.random() < 0.55) {
      this._addCollectible(
        seg,
        'diamond',
        (Math.floor(Math.random() * 3) - 1) * A.LANE_WIDTH,
        rnd(14, Math.max(16, seg.length - 10)),
        1.35
      );
    }

    if (Math.random() < 0.3 && seg.index > 1) {
      this._addPowerup(
        seg,
        pick(Object.keys(POWERUPS)),
        (Math.floor(Math.random() * 3) - 1) * A.LANE_WIDTH,
        rnd(16, Math.max(18, seg.length - 8))
      );
    }
  }

  _addObstacle(seg, kind, dist, laneX) {
    const built = obstacleMesh(kind);
    const pos = laneWorldPosition(seg, THREE.MathUtils.clamp(dist, 0, seg.length), laneX);
    built.group.position.copy(pos);
    const tangent = new THREE.Vector3();
    pathTransform(seg, THREE.MathUtils.clamp(dist, 0, seg.length), true, pos, tangent);
    built.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    seg.group.add(built.group);

    const obstacle = {
      id: `o${UID++}`,
      kind,
      dist,
      laneX,
      worldPos: pos.clone(),
      group: built.group,
      halfDepth: built.halfDepth,
      required: built.required,
      topBlock: built.topBlock,
      hitY: built.hitY,
      broken: false
    };

    if (kind === 'fire' || kind === 'rockfall' || kind === 'pendulum') {
      seg.animated.push({
        kind: kind === 'fire' ? 'flicker' : kind === 'pendulum' ? 'swing' : 'bob',
        object: built.group,
        phase: Math.random() * Math.PI * 2
      });
    }

    seg.obstacles.push(obstacle);
  }

  _addCollectible(seg, kind, laneX, dist, y) {
    const g = new THREE.Group();
    if (kind === 'coin') {
      const body = new THREE.Mesh(A.GEO.coin, A.MAT.coin);
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const rim = new THREE.Mesh(A.GEO.coinRim, A.MAT.gold);
      rim.rotation.x = Math.PI / 2;
      g.add(rim);
    } else {
      const body = new THREE.Mesh(A.GEO.diamond, A.MAT.diamond);
      body.scale.set(1, 1.35, 1);
      g.add(body);
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 10, 8),
        new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          transparent: true,
          opacity: 0.18,
          depthWrite: false
        })
      );
      g.add(glow);
    }

    const pos = laneWorldPosition(seg, THREE.MathUtils.clamp(dist, 0, seg.length), laneX);
    pos.y += y;
    g.position.copy(pos);
    seg.group.add(g);

    seg.collectibles.push({
      id: `c${UID++}`,
      kind,
      laneX,
      dist,
      y,
      worldPos: pos.clone(),
      group: g,
      collected: false,
      phase: Math.random() * 6
    });
    seg.animated.push({ kind: 'spinCoin', object: g, phase: Math.random() * 6 });
  }

  _addPowerup(seg, type, laneX, dist) {
    const mesh = powerupMesh(type);
    const pos = laneWorldPosition(seg, THREE.MathUtils.clamp(dist, 0, seg.length), laneX);
    pos.y += 1.25;
    mesh.position.copy(pos);
    seg.group.add(mesh);

    seg.powerups.push({
      id: `p${UID++}`,
      type,
      laneX,
      dist,
      worldPos: pos.clone(),
      group: mesh,
      collected: false
    });
    seg.animated.push({ kind: 'spinPower', object: mesh, phase: Math.random() * 6 });
  }

  _registerFadeable(seg, obj, lateralDist) {
    const meshes = [];
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      if (Array.isArray(o.material)) return;
      const mat = o.material.clone();
      mat.transparent = false;
      o.material = mat;
      meshes.push(mat);
    });
    if (!meshes.length) return;
    seg.fadeables.push({
      object: obj,
      materials: meshes,
      radius: lateralDist < 3 ? 1.6 : 1.05,
      fade: 1
    });
  }

  _buildDecor(seg) {
    const yaw = Math.atan2(seg.dir.x, seg.dir.z);
    const halfW = A.TRACK_WIDTH / 2;
    const count = Math.max(3, Math.round(seg.length / 11));

    if (!seg.fadeables) seg.fadeables = [];

    const place = (obj, lateral, dist, y = 0) => {
      obj.position
        .copy(seg.start)
        .addScaledVector(seg.dir, dist)
        .addScaledVector(seg.right, lateral)
        .add(new THREE.Vector3(0, y, 0));
      obj.rotation.y = yaw + rnd(-0.25, 0.25);
      seg.group.add(obj);
      // Scenery close to the racing line can swing between the chase camera and
      // Pratham during junction turns. Register it so the engine can fade it out.
      if (Math.abs(lateral) < halfW + 7.5) this._registerFadeable(seg, obj, Math.abs(lateral));
      return obj;
    };

    for (let i = 0; i < count; i++) {
      const dist = (seg.length / count) * (i + 0.5) + rnd(-1.5, 1.5);
      const side = i % 2 === 0 ? 1 : -1;

      if (seg.biome === 'temple') {
        place(A.createPillar({ height: rnd(4.2, 6.4), radius: rnd(0.3, 0.45), wealth: 1 }), side * (halfW + 1.5), dist);
        if (i % 3 === 0) place(A.createBrazier(1.1), -side * (halfW + 0.9), dist + 2.5);
        if (i % 4 === 1) place(A.createBush(0.9), side * (halfW + 0.75), dist - 2);
      } else if (seg.biome === 'jungle') {
        place(A.createTree(rnd(0.95, 1.55), i), side * (halfW + rnd(1.8, 4.4)), dist);
        if (i % 2 === 0) place(A.createTree(rnd(0.7, 1.2), i + 1), -side * (halfW + rnd(3, 6.5)), dist + 4);
        if (i % 3 === 0) place(A.createBush(rnd(0.9, 1.4)), side * (halfW + 0.8), dist - 1.5);
        if (i === 1) place(A.createJungleGate(5.4), 0, dist);
      } else if (seg.biome === 'bridge') {
        const rail = A.createRopeRail(seg.length - 1.5, side);
        rail.position
          .copy(seg.start)
          .addScaledVector(seg.dir, seg.length / 2)
          .addScaledVector(seg.right, side * (halfW - 0.2));
        rail.rotation.y = yaw;
        seg.group.add(rail);
        if (i % 3 === 0) {
          const post = A.createPillar({ height: 3.2, radius: 0.26, wealth: 0 });
          place(post, -side * (halfW + 1.2), dist);
        }
      } else if (seg.biome === 'waterfall') {
        place(A.createTree(rnd(0.8, 1.3), i), side * (halfW + rnd(2.6, 5.2)), dist);
        if (i === 1 || i === Math.floor(count / 2)) {
          place(A.createWaterfallSheet(4.2, 11), side * (halfW + 3.6), dist + 1, 1.2);
        }
        if (i % 2 === 1) place(A.createBush(1.1), side * (halfW + 0.9), dist);
      } else if (seg.biome === 'cave') {
        place(A.createCrystalCluster(rnd(0.9, 1.7)), side * (halfW + rnd(1.2, 2.8)), dist);
        if (i % 3 === 0) place(A.createBrazier(0.9), -side * (halfW + 1.2), dist + 3);
        if (i % 4 === 2) {
          const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(1.4, 2.6), 0), A.MAT.rockDark);
          place(rock, side * (halfW + rnd(2.6, 5)), dist, rnd(3.5, 6.5));
        }
      } else if (seg.biome === 'ruins') {
        place(A.createBrokenColumn(rnd(1.8, 3.4)), side * (halfW + rnd(1.3, 2.5)), dist);
        if (i % 3 === 1) place(A.createFallenBlock(rnd(0.8, 1.3)), -side * (halfW + rnd(1, 1.9)), dist);
        if (i === 2) place(A.createDemonWall(), 0, dist);
        if (i % 4 === 2) place(A.createBrazier(1.0), side * (halfW + 1.1), dist - 3);
      }
    }

    // Far mid-ground silhouettes so the horizon is never empty
    const farCount = Math.max(3, Math.round(seg.length / 14));
    for (let i = 0; i < farCount; i++) {
      const lateral = (i % 2 === 0 ? 1 : -1) * rnd(9, 20);
      const dist = (seg.length / farCount) * (i + 0.5) + rnd(-3, 3);
      const roll = Math.random();
      if (seg.biome === 'jungle' || seg.biome === 'waterfall' || seg.biome === 'temple') {
        if (roll < 0.65) place(A.createTree(rnd(1.1, 1.9), i + 2), lateral, dist);
        else place(A.createBush(rnd(1.2, 2.0)), lateral, dist);
      } else if (seg.biome === 'ruins') {
        place(roll < 0.5 ? A.createBrokenColumn(rnd(2.6, 5.2)) : A.createFallenBlock(rnd(1.4, 2.2)), lateral, dist);
      } else if (seg.biome === 'cave') {
        place(A.createCrystalCluster(rnd(1.6, 2.8)), lateral, dist);
      } else {
        place(A.createTree(rnd(0.9, 1.4), i), lateral, dist);
      }
    }

    if (seg.biome === 'waterfall') {
      const waterMat = A.MAT.water.clone();
      const waterTex = A.getWaterTexture().clone();
      waterTex.needsUpdate = true;
      waterTex.repeat.set(8, Math.max(4, seg.length / 6));
      waterMat.map = waterTex;
      const water = new THREE.Mesh(new THREE.PlaneGeometry(120, seg.length + 40), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position
        .copy(seg.start)
        .addScaledVector(seg.dir, seg.length / 2)
        .add(new THREE.Vector3(0, -1.15, 0));
      seg.group.add(water);
    }

    if (seg.biome === 'bridge') {
      const abyss = new THREE.Mesh(new THREE.PlaneGeometry(90, seg.length + 28), A.MAT.pit);
      abyss.rotation.x = -Math.PI / 2;
      abyss.position
        .copy(seg.start)
        .addScaledVector(seg.dir, seg.length / 2)
        .add(new THREE.Vector3(0, -7.5, 0));
      seg.group.add(abyss);
    }
  }

  update(dt, time, playerSegmentIndex) {
    this.segments.forEach((seg) => {
      if (Math.abs(seg.index - playerSegmentIndex) > 2) return;
      seg.animated.forEach((a) => {
        if (a.kind === 'spinCoin') {
          a.object.rotation.y += dt * 3.1;
          a.object.position.y += Math.sin(time * 3 + a.phase) * dt * 0.16;
        } else if (a.kind === 'spinPower') {
          if (a.object.userData.spin) a.object.userData.spin.rotation.y += dt * 2.4;
          if (a.object.userData.ring) a.object.userData.ring.rotation.z += dt * 3.2;
          a.object.position.y += Math.sin(time * 2.4 + a.phase) * dt * 0.2;
        } else if (a.kind === 'flicker') {
          a.object.scale.y = 0.92 + Math.sin(time * 9 + a.phase) * 0.1;
        } else if (a.kind === 'swing') {
          a.object.rotation.z = Math.sin(time * 2.4 + a.phase) * 0.26;
        } else if (a.kind === 'bob') {
          a.object.position.y = Math.sin(time * 3.4 + a.phase) * 0.09;
        }
      });
    });
  }

  _disposeSegment(seg) {
    seg.group.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        const shared = Object.values(A.GEO).includes(obj.geometry);
        if (!shared) obj.geometry.dispose();
      }
    });
    this.root.remove(seg.group);
  }

  dispose() {
    this.segments.forEach((s) => this._disposeSegment(s));
    this.segments = [];
    this.scene.remove(this.root);
  }
}
