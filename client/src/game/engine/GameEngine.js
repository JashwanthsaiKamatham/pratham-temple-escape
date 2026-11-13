import * as THREE from 'three';
import { World } from './World';
import { PrathamCharacter } from '../PrathamBuilder';
import { TempleGuardian } from '../GuardianBuilder';
import { BIOMES, POWERUPS } from '../constants';
import { pathTransform, rightOf } from './path';
import { getGameTextures } from '../textures';
import { sound } from '../../audio/SoundEngine';

const BASE_SPEED = 15;
const MAX_SPEED = 32;
const LANE_X = [-2.5, 0, 2.5];
const GRAVITY = 58;
const JUMP_VELOCITY = 15.4;
const SLIDE_TIME = 0.68;
const FLY_HEIGHT = 3.1;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export class GameEngine {
  constructor(container, opts = {}) {
    this.container = container;
    this.onHud = opts.onHud || (() => {});
    this.onEvent = opts.onEvent || (() => {});
    this.onStateChange = opts.onStateChange || (() => {});
    this.onGameOver = opts.onGameOver || (() => {});
    this.onJunction = opts.onJunction || (() => {});
    this.onBiome = opts.onBiome || (() => {});

    this.state = 'loading';
    this.outfitId = opts.outfitId || 'classic';
    this.muted = false;

    this.clock = new THREE.Clock();
    this.time = 0;
    this.hudAccumulator = 0;
    this.disposed = false;
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------
  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xfcd34d, 0.011);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 400);
    this.camera.position.set(0, 6.5, -11);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    // --- Sky dome (custom vertical gradient shader for cinematic skies) ---
    this.skyUniforms = {
      topColor: { value: new THREE.Color(0x2fa8e0) },
      midColor: { value: new THREE.Color(0x8fd3f4) },
      horizonColor: { value: new THREE.Color(0xffd88a) }
    };
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        varying vec3 vWorld;
        void main() {
          float h = clamp(normalize(vWorld).y, -1.0, 1.0);
          vec3 col = mix(horizonColor, midColor, smoothstep(-0.05, 0.14, h));
          col = mix(col, topColor, smoothstep(0.06, 0.55, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), this.skyMaterial);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    // --- Distant terrain / horizon layers so the track never floats ---
    this.valleyMaterial = new THREE.MeshStandardMaterial({
      map: getGameTextures().groundNoise,
      color: 0xb08e60,
      roughness: 1,
      metalness: 0
    });
    this.valley = new THREE.Mesh(new THREE.CircleGeometry(150, 48), this.valleyMaterial);
    this.valley.rotation.x = -Math.PI / 2;
    this.valley.position.y = -0.62;
    this.valley.receiveShadow = false;
    this.scene.add(this.valley);

    this.hills = new THREE.Group();
    this.scene.add(this.hills);
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0xa8895f, roughness: 1, fog: true });
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + (i % 2) * 0.09;
      const radius = 210 + (i % 4) * 34;
      const height = 26 + (i % 5) * 11;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(height * 0.9, height, 5), ridgeMat);
      hill.position.set(Math.cos(angle) * radius, height / 2 - 8, Math.sin(angle) * radius);
      hill.rotation.y = angle;
      this.hills.add(hill);
    }
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.2;
      const radius = 132 + (i % 3) * 20;
      const height = 15 + (i % 4) * 6;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(height * 1.5, height, 4), ridgeMat);
      hill.position.set(Math.cos(angle) * radius, height / 2 - 6, Math.sin(angle) * radius);
      hill.rotation.y = angle;
      this.hills.add(hill);
    }

    // --- Lights ---
    this.hemi = new THREE.HemisphereLight(0xfff3c4, 0x8b6b3f, 0.75);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0xfef3c7, 0.55);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff3c4, 2.1);
    this.sun.position.set(14, 26, -8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 90;
    this.sun.shadow.camera.left = -26;
    this.sun.shadow.camera.right = 26;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.bias = -0.0009;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;

    // --- World ---
    this.world = new World(this.scene);

    // --- Hero ---
    this.pratham = new PrathamCharacter(this.outfitId);
    this.scene.add(this.pratham.group);

    // --- Guardian ---
    this.guardian = new TempleGuardian();
    this.guardian.group.scale.setScalar(0.92);
    this.scene.add(this.guardian.group);

    // --- Shadow blob under hero ---
    this.shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 20),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.26,
        depthWrite: false
      })
    );
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadowBlob);

    // --- Run state ---
    this.resetRunState();

    this.trail = [];
    this.camForward = new THREE.Vector3(0, 0, 1);
    this.camLookAt = new THREE.Vector3(0, 1.4, 6);
    this.camPosSmooth = new THREE.Vector3(0, 6.5, -11);
    this.tmpTangent = new THREE.Vector3();
    this.tmpPos = new THREE.Vector3();

    this.applyBiome(BIOMES[0].id);
    this.setState('menu');
    this.placeCharacter(0, 6, 1);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(this.container);

    this.renderer.setAnimationLoop(() => this.tick());
    return this;
  }

  resetRunState() {
    this.trail = [];
    this.camForward = new THREE.Vector3(0, 0, 1);
    this.segmentIndex = 0;
    this.s = 0;
    this.lane = 1;
    this.laneX = 0;
    this.height = 0;
    this.vy = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.speed = BASE_SPEED;
    this.distance = 0;
    this.score = 0;
    this.runCoins = 0;
    this.runDiamonds = 0;
    this.multiplier = 1;
    this.activePowerups = {};
    this.shieldArmed = false;
    this.turnCommitted = false;
    this.turnGrace = 0;
    this.turnArmed = null;
    this.junction = null;
    this.mode = 'running';
    this.guardianDistance = 24;
    this.crashTimer = 0;
    this.biomeId = BIOMES[0].id;
    this.hitFlash = 0;
    this.comboClean = 0;
  }

  placeCharacter(dist = 0, laneX = 0, height = 0) {
    const seg = this.world.segmentAt(0);
    if (!seg) return;
    const pos = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    pathTransform(seg, dist, true, pos, tangent);
    rightOf(tangent, this.tmpRight || (this.tmpRight = new THREE.Vector3()));
    pos.addScaledVector(this.tmpRight, laneX);
    pos.y = height;
    this.pratham.group.position.copy(pos);
    this.pratham.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    this.shadowBlob.position.set(pos.x, 0.03, pos.z);
  }

  setOutfit(outfitId) {
    this.outfitId = outfitId;
    if (this.pratham) this.pratham.applyOutfit(outfitId);
  }

  setState(next) {
    this.state = next;
    this.onStateChange(next);
  }

  resize() {
    if (!this.renderer || !this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  }

  applyBiome(biomeId) {
    const biome = BIOMES.find((b) => b.id === biomeId) || BIOMES[0];
    if (this.biomeId !== biomeId) {
      this.biomeId = biomeId;
      this.onBiome(biome.name);
    }
    this.skyUniforms.topColor.value.setHex(biome.skyTop);
    this.skyUniforms.midColor.value
      .setHex(biome.skyHorizon)
      .lerp(new THREE.Color(biome.skyTop), 0.35);
    this.skyUniforms.horizonColor.value.setHex(biome.skyHorizon);
    if (this.valleyMaterial) {
      this.valleyMaterial.color.setHex(
        biome.id === 'jungle'
          ? 0x6f8a4a
          : biome.id === 'cave'
            ? 0x37344c
            : biome.id === 'ruins'
              ? 0xa8763f
              : biome.id === 'bridge'
                ? 0xb9905f
                : biome.id === 'waterfall'
                  ? 0x8fa9a8
                  : 0xb08e60
      );
    }
    if (this.hills) {
      const hillColor = new THREE.Color(biome.fogColor).lerp(new THREE.Color(0x000000), 0.12);
      this.hills.children.forEach((h) => h.material.color.copy(hillColor));
    }
    if (this.scene.fog) {
      this.scene.fog.color.setHex(biome.fogColor);
      this.scene.fog.density = biome.fogDensity;
    }
    this.sun.color.setHex(biome.sunColor);
    this.sun.intensity = biome.sunIntensity;
    this.ambient.color.setHex(biome.ambientColor);
    this.ambient.intensity = biome.ambientIntensity;
    this.hemi.color.setHex(biome.skyHorizon);
    this.hemi.groundColor.setHex(biome.fogColor);
    this.hemi.intensity = 0.45;
  }

  // -------------------------------------------------------------------------
  // Run lifecycle
  // -------------------------------------------------------------------------
  startRun() {
    this.world.reset();
    this.resetRunState();
    this.camLookAt.set(0, 1.4, 6);
    this.camPosSmooth.set(0, 4.4, -8);
    this.applyBiome(BIOMES[0].id);
    this.setState('running');
    sound.init();
    sound.startMusic();
    this.clock.getDelta();
    this.emitHud();
  }

  restart() {
    this.startRun();
  }

  pause() {
    if (this.state !== 'running') return;
    this.setState('paused');
    sound.stopMusic();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('running');
    sound.startMusic();
    this.clock.getDelta();
  }

  toggleMute() {
    this.muted = sound.toggleMute();
    if (this.muted) {
      sound.stopMusic();
    } else if (this.state === 'running') {
      sound.startMusic();
    }
    return this.muted;
  }

  gameOver(reason) {
    if (this.state === 'gameover') return;
    this.mode = 'crashed';
    this.setState('gameover');
    sound.stopMusic();
    sound.playCrash();
    this.onGameOver({
      reason,
      score: Math.floor(this.score),
      coins: this.runCoins,
      diamonds: this.runDiamonds,
      distance: Math.floor(this.distance)
    });
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------
  input(action) {
    if (this.state !== 'running') return;

    if (action === 'mute') {
      this.toggleMute();
      return;
    }

    // Junction turns take priority near an upcoming bend
    if (this.junction && (action === 'left' || action === 'right')) {
      if (action === this.junction.dir) {
        this.turnArmed = { dir: action, at: this.time };
        if (this.junction.inside) {
          this.turnCommitted = true;
        }
        sound.playTurn();
        this.onJunction({ dir: action, armed: true, remaining: this.junction.remaining });
        return;
      }
      // wrong direction: flash a warning but let them correct it
      sound.playSwipe();
      this.onJunction({ dir: this.junction.dir, armed: false, wrong: true, remaining: this.junction.remaining });
      return;
    }

    if (this.activePowerups.fly) {
      if (action === 'down') this.cancelFly();
      return;
    }

    switch (action) {
      case 'left':
        if (this.lane > 0) {
          this.lane -= 1;
          sound.playSwipe();
        }
        break;
      case 'right':
        if (this.lane < 2) {
          this.lane += 1;
          sound.playSwipe();
        }
        break;
      case 'up':
        if (this.height <= 0.01 && !this.sliding) {
          this.vy = JUMP_VELOCITY;
          this.sliding = false;
          sound.playJump();
        }
        break;
      case 'down':
        if (this.height > 0.4) {
          // fast drop
          this.vy = Math.min(this.vy, -22);
        } else {
          this.sliding = true;
          this.slideTimer = SLIDE_TIME;
          sound.playSlide();
        }
        break;
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Turn handling
  // -------------------------------------------------------------------------
  updateJunction() {
    const seg = this.world.segmentAt(this.segmentIndex);
    if (!seg) {
      this.junction = null;
      return;
    }

    if (seg.type === 'turn') {
      if (!this.turnCommitted) {
        this.turnGrace -= this.dt;
        if (this.turnGrace <= 0) {
          this.gameOver('missed-turn');
          return;
        }
        this.junction = { dir: seg.turn, remaining: 0, urgent: true, inside: true };
      } else {
        this.junction = null;
      }
      return;
    }

    const next = this.world.segmentAt(seg.index + 1);
    if (!next || next.type !== 'turn') {
      this.junction = null;
      return;
    }

    const remaining = seg.length - this.s;
    if (remaining <= 26) {
      this.junction = { dir: next.turn, remaining, urgent: remaining < 11 };
      if (this.turnArmed && this.time - this.turnArmed.at > 3) this.turnArmed = null;
    } else {
      this.junction = null;
    }
  }

  enterSegment(seg) {
    if (seg.type === 'turn') {
      const armed = this.turnArmed && this.time - this.turnArmed.at < 3.2 && this.turnArmed.dir === seg.turn;
      this.turnCommitted = Boolean(armed);
      // Give the player a generous grace window *inside* the bend to swipe correctly
      this.turnGrace = 0.85;
      if (armed) {
        this.turnArmed = null;
      } else {
        this.onEvent({ type: 'junction-warning' });
      }
    } else {
      this.turnCommitted = false;
      this.turnArmed = null;
    }
    this.junction = null;
  }

  // -------------------------------------------------------------------------
  // Power-ups
  // -------------------------------------------------------------------------
  activatePowerup(type) {
    const cfg = POWERUPS[type];
    if (!cfg) return;
    this.activePowerups[type] = cfg.duration;
    sound.playPowerup();

    if (type === 'shield') this.shieldArmed = true;
    if (type === 'fly') {
      this.vy = 12;
      this.height = 0.4;
      this.sliding = false;
    }
    this.onEvent({ type: 'powerup', powerup: type, name: cfg.name, duration: cfg.duration });
  }

  cancelFly() {
    if (this.activePowerups.fly) {
      delete this.activePowerups.fly;
      this.vy = -6;
      this.onEvent({ type: 'powerup-end', powerup: 'fly' });
    }
  }

  tickPowerups(dt) {
    Object.keys(this.activePowerups).forEach((key) => {
      this.activePowerups[key] -= dt;
      if (this.activePowerups[key] <= 0) {
        delete this.activePowerups[key];
        if (key === 'shield') this.shieldArmed = false;
        if (key === 'fly') this.cancelFly();
        this.onEvent({ type: 'powerup-end', powerup: key });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Frame loop
  // -------------------------------------------------------------------------
  tick() {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this.dt = dt;
    this.time += dt;

    if (this.state === 'menu') {
      this.updateShowcase(dt);
    } else if (this.state === 'running') {
      this.updateRun(dt);
    } else if (this.state === 'paused') {
      this.pratham.updateAnimation(dt, { mode: 'menu', time: this.time });
    } else if (this.state === 'gameover') {
      this.updateGameOver(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  updateShowcase(dt) {
    this.guardian.group.visible = true;
    const spot = new THREE.Vector3(0, 0, 6);
    this.pratham.group.position.copy(spot);
    this.pratham.group.rotation.y = Math.sin(this.time * 0.5) * 0.35 + Math.PI;
    this.pratham.updateAnimation(dt, { mode: 'menu', time: this.time });

    this.shadowBlob.position.set(spot.x, 0.02, spot.z);
    this.shadowBlob.scale.setScalar(1);

    const radius = 8.2;
    const angle = this.time * 0.22;
    const camX = spot.x + Math.sin(angle) * radius;
    const camZ = spot.z - Math.cos(angle) * radius;
    this.camera.position.lerp(new THREE.Vector3(camX, 3.4 + Math.sin(this.time * 0.4) * 0.35, camZ), 0.08);
    this.camera.lookAt(spot.x, 1.25, spot.z);

    this.guardian.group.visible = true;
    this.guardian.group.position.set(-13, 0, -4);
    this.guardian.group.rotation.y = Math.PI * 0.6;
    this.guardian.update(dt, 4);

    this.sunTarget.position.copy(spot);
    this.sun.position.set(spot.x + 14, 26, spot.z - 8);
    this.sky.position.copy(this.camera.position);
    this.valley.position.set(spot.x, -0.62, spot.z);
    this.hills.position.set(spot.x, 0, spot.z);
  }

  // Walk back through the recorded player trail to find the point ~`dist` metres behind
  sampleTrail(dist) {
    const trail = this.trail;
    if (trail.length < 2) return null;
    let acc = 0;
    for (let i = trail.length - 1; i > 0; i--) {
      const d = trail[i].pos.distanceTo(trail[i - 1].pos);
      if (acc + d >= dist) {
        const t = (dist - acc) / Math.max(0.0001, d);
        return {
          pos: trail[i].pos.clone().lerp(trail[i - 1].pos, t),
          height: trail[i].height + (trail[i - 1].height - trail[i].height) * t
        };
      }
      acc += d;
    }
    return { pos: trail[0].pos.clone(), height: trail[0].height };
  }

  updateRun(dt) {
    const world = this.world;

    world.ensureAhead(this.segmentIndex);
    let seg = world.segmentAt(this.segmentIndex);
    if (!seg) {
      this.gameOver('fall');
      return;
    }

    this.tickPowerups(dt);

    // --- speed ramps with distance ---
    const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * 0.012);
    this.speed = damp(this.speed, targetSpeed * (this.activePowerups.boost ? 1.55 : 1), 1.6, dt);

    // --- horizontal lane spring ---
    const targetLaneX = LANE_X[this.lane];
    this.laneX = damp(this.laneX, targetLaneX, 13, dt);
    const laneTilt = clamp((targetLaneX - this.laneX) * 0.16, -0.4, 0.4);

    // --- vertical ---
    if (this.activePowerups.fly) {
      this.height = damp(this.height, FLY_HEIGHT, 4.5, dt);
      this.vy = 0;
      this.sliding = false;
    } else {
      if (this.vy !== 0 || this.height > 0) {
        this.vy -= GRAVITY * dt;
        this.height += this.vy * dt;
        if (this.height <= 0) {
          this.height = 0;
          this.vy = 0;
          this.mode = 'running';
        }
      }
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) this.sliding = false;
    }

    // --- advance along the path ---
    const step = this.speed * dt;
    this.s += step;
    this.distance += step;

    while (seg && this.s >= seg.length) {
      this.s -= seg.length;
      this.segmentIndex += 1;
      world.ensureAhead(this.segmentIndex);
      seg = world.segmentAt(this.segmentIndex);
      if (!seg) {
        this.gameOver('fall');
        return;
      }
      this.enterSegment(seg);
    }

    this.updateJunction();

    if (this.state !== 'running') return;

    // --- collectibles, obstacles & scenery ---
    this.checkCollectibles(seg, dt);
    this.checkObstacles(seg);

    this.score = this.distance * 2 + this.runCoins * 12 + this.runDiamonds * 60;

    // --- position on track ---
    const committed = seg.type === 'turn' ? this.turnCommitted : true;
    pathTransform(seg, this.s, committed, this.tmpPos, this.tmpTangent);
    rightOf(this.tmpTangent, this.tmpRight || (this.tmpRight = new THREE.Vector3()));
    const playerPos = this.tmpPos.clone().addScaledVector(this.tmpRight, this.laneX);
    playerPos.y = this.height;

    // --- hero transform ---
    this.pratham.group.position.copy(playerPos);
    this.pratham.group.rotation.y = Math.atan2(this.tmpTangent.x, this.tmpTangent.z);

    let animMode = 'running';
    if (this.activePowerups.fly) animMode = 'flying';
    else if (this.sliding) animMode = 'sliding';
    else if (this.height > 0.15) animMode = 'jumping';

    this.pratham.updateAnimation(dt, {
      mode: animMode,
      speed: this.speed,
      laneTilt,
      hasShield: Boolean(this.shieldArmed),
      hasMagnet: Boolean(this.activePowerups.magnet),
      time: this.time
    });

    this.shadowBlob.position.set(playerPos.x, 0.03, playerPos.z);
    const shadowScale = clamp(1 - this.height * 0.16, 0.35, 1.05);
    this.shadowBlob.scale.setScalar(shadowScale);
    this.shadowBlob.material.opacity = 0.28 * shadowScale;

    // --- guardian chase ---
    this.guardianDistance = damp(
      this.guardianDistance,
      this.activePowerups.boost ? 32 : 24,
      0.9,
      dt
    );
    const guardianPos = playerPos.clone().addScaledVector(this.tmpTangent, -this.guardianDistance);
    this.guardian.group.position.set(guardianPos.x, 0, guardianPos.z);
    this.guardian.group.rotation.y = Math.atan2(this.tmpTangent.x, this.tmpTangent.z);
    this.guardian.update(dt, this.speed);


    // --- chase camera: rides the recorded path so corners never cut in front ---
    this.trail.push({ pos: playerPos.clone(), height: this.height });
    if (this.trail.length > 300) this.trail.shift();

    const behind = this.sampleTrail(9.0);
    const validTrail = behind && behind.pos.distanceTo(playerPos) < 22 && behind.pos.distanceTo(playerPos) > 3;
    const camTargetPos = validTrail
      ? behind.pos.clone()
      : playerPos.clone().addScaledVector(this.tmpTangent, -9.0);
    camTargetPos.y = (validTrail ? behind.height : this.height) * 0.4 + 4.6;

    this.camPosSmooth.lerp(camTargetPos, 1 - Math.exp(-14 * dt));

    // Guarantee the lens always stays behind Pratham, even mid-junction
    const relToHero = this.camPosSmooth.clone().sub(playerPos);
    if (relToHero.dot(this.tmpTangent) > -4.2) {
      this.camPosSmooth
        .copy(playerPos)
        .addScaledVector(this.tmpTangent, -9.2)
        .add(new THREE.Vector3(0, 4.6 + this.height * 0.3, 0));
    }

    this.camForward.lerp(this.tmpTangent, 1 - Math.exp(-7 * dt)).normalize();
    const camLookTarget = playerPos
      .clone()
      .addScaledVector(this.camForward, 6.0)
      .add(new THREE.Vector3(0, 1.45 + this.height * 0.25, 0));
    this.camLookAt.lerp(camLookTarget, 1 - Math.exp(-11 * dt));

    this.camera.position.copy(this.camPosSmooth);
    this.camera.lookAt(this.camLookAt);
    this.camera.rotation.z += laneTilt * 0.03;

    // Never let the huge Guardian sit between the lens and Pratham — mid-junction
    // the chase camera can swing wide enough to look straight at it.
    const toGuardian = this.guardian.group.position.clone().sub(this.camera.position);
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const guardianInView = toGuardian.clone().normalize().dot(camDir) > 0.35;
    this.guardian.group.visible = !(guardianInView && toGuardian.length() < 18);

    // Fade palms/pillars that drift between the lens and Pratham on tight turns.
    world.updateOcclusion(this.camera.position, playerPos, dt);

    this.sunTarget.position.copy(playerPos);
    this.sun.position.set(playerPos.x + 16, 30, playerPos.z - 10);
    this.sky.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.valley.position.set(playerPos.x, -0.62, playerPos.z);
    this.hills.position.set(playerPos.x, 0, playerPos.z);

    // --- biome + world animation ---
    this.applyBiome(seg.biome);
    world.update(dt, this.time, this.segmentIndex);
    world.pruneBefore(this.segmentIndex);

    // --- HUD ---
    this.hudAccumulator += dt;
    if (this.hudAccumulator > 0.08) {
      this.hudAccumulator = 0;
      this.emitHud();
    }
  }

  updateGameOver(dt) {
    this.crashTimer += dt;
    this.guardian.group.visible = true;
    this.pratham.updateAnimation(dt, { mode: 'crashed', time: this.time });

    // Guardian lunges over the fallen hero
    const playerPos = this.pratham.group.position;
    const lunge = clamp(this.crashTimer / 0.9, 0, 1);
    this.guardianDistance = 24 * (1 - lunge);
    const dir = new THREE.Vector3(
      Math.sin(this.pratham.group.rotation.y),
      0,
      Math.cos(this.pratham.group.rotation.y)
    );
    const gp = playerPos.clone().addScaledVector(dir, -this.guardianDistance);
    this.guardian.group.position.lerp(new THREE.Vector3(gp.x, 0, gp.z), 0.2);
    this.guardian.group.rotation.y = this.pratham.group.rotation.y;
    this.guardian.update(dt, 10);

    this.camera.position.lerp(
      playerPos.clone().addScaledVector(dir, -8).add(new THREE.Vector3(0, 5.2, 0)),
      1 - Math.exp(-4 * dt)
    );
    this.camera.lookAt(playerPos.x, 1.2, playerPos.z);
    this.world.update(dt, this.time, this.segmentIndex);
  }

  emitHud() {
    const powerups = Object.keys(this.activePowerups).map((key) => ({
      id: key,
      remaining: Math.max(0, this.activePowerups[key]),
      duration: POWERUPS[key].duration
    }));
    this.onHud({
      score: Math.floor(this.score),
      coins: this.runCoins,
      diamonds: this.runDiamonds,
      distance: Math.floor(this.distance),
      speed: Math.round(this.speed * 3.6),
      powerups,
      shield: Boolean(this.shieldArmed),
      biome: this.biomeId,
      junction: this.junction
    });
  }

  // -------------------------------------------------------------------------
  // Collision & collection
  // -------------------------------------------------------------------------
  checkCollectibles(seg, dt) {
    const magnet = Boolean(this.activePowerups.magnet);
    const doubleCoins = Boolean(this.activePowerups.doubleCoins);

    seg.collectibles.forEach((item) => {
      if (item.collected) return;
      const dDist = item.dist - this.s;

      if (magnet && dDist > -2 && dDist < 14 && Math.abs(item.laneX - this.laneX) < 7) {
        const target = this.pratham.group.position.clone().add(new THREE.Vector3(0, 1, 0));
        item.group.position.lerp(target, 1 - Math.exp(-7 * dt));
      }

      const collectRadius = magnet ? 1.9 : 1.05;
      if (
        Math.abs(dDist) < collectRadius &&
        Math.abs(item.laneX - this.laneX) < collectRadius &&
        Math.abs(item.y - (this.height + 0.85)) < 1.5
      ) {
        item.collected = true;
        item.group.visible = false;
        if (item.kind === 'coin') {
          const gain = doubleCoins ? 2 : 1;
          this.runCoins += gain;
          sound.playCoin(doubleCoins);
          this.onEvent({ type: 'coin', amount: gain });
        } else {
          this.runDiamonds += 1;
          sound.playDiamond();
          this.onEvent({ type: 'diamond' });
        }
      }
    });

    seg.powerups.forEach((item) => {
      if (item.collected) return;
      const dDist = item.dist - this.s;
      if (Math.abs(dDist) < 1.3 && Math.abs(item.laneX - this.laneX) < 1.3) {
        item.collected = true;
        item.group.visible = false;
        this.activatePowerup(item.type);
      }
    });
  }

  checkObstacles(seg) {
    const flying = Boolean(this.activePowerups.fly);
    const boosting = Boolean(this.activePowerups.boost);
    const sliding = this.sliding;

    seg.obstacles.forEach((obs) => {
      if (obs.broken) return;
      const dDist = obs.dist - this.s;
      const depth = obs.halfDepth + 0.5;
      if (Math.abs(dDist) > depth) return;
      if (Math.abs(obs.laneX - this.laneX) > 1.15) return;

      if (flying) return;

      if (boosting) {
        obs.broken = true;
        obs.group.visible = false;
        this.onEvent({ type: 'smash' });
        return;
      }

      let cleared = false;
      if (obs.required === 'slide') cleared = sliding && this.height < 0.3;
      else if (obs.required === 'jump') cleared = this.height > obs.hitY;
      else cleared = false; // dodge obstacles must be avoided by lane change

      if (cleared) return;

      if (obs.topBlock && this.height > obs.hitY) {
        // clipped the overhead beam
      }

      if (this.shieldArmed) {
        this.shieldArmed = false;
        delete this.activePowerups.shield;
        obs.broken = true;
        obs.group.visible = false;
        sound.playShieldBreak();
        this.onEvent({ type: 'shield-break' });
        this.guardianDistance = Math.min(this.guardianDistance + 6, 34);
        return;
      }

      obs.broken = true;
      this.gameOver(obs.kind);
    });
  }

  dispose() {
    this.disposed = true;
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    window.removeEventListener('resize', this._onResize);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this.world) this.world.dispose();
    sound.stopMusic();
  }
}
