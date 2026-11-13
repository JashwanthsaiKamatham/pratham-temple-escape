import * as THREE from 'three';

// Giant Mysterious Temple Guardian (Ancient Stone & Shadow Rakshasa Demon) chasing PRATHAM
export class TempleGuardian {
  constructor() {
    this.group = new THREE.Group();
    this.cycle = 0;

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.55,
      metalness: 0.25
    });
    const runeGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.25
    });
    const fireEyeMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });

    // Hulking Torso
    this.torso = new THREE.Group();
    this.torso.position.y = 2.55;
    this.group.add(this.torso);

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.85, 1.15), obsidianMat);
    chest.castShadow = true;
    this.torso.add(chest);

    // Glowing Ancient Chest Sigil
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), runeGoldMat);
    core.position.set(0, 0.15, 0.58);
    this.torso.add(core);
    this.core = core;

    // Floating Shoulder Monoliths
    [-1.3, 1.3].forEach((x) => {
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.85), obsidianMat);
      pauldron.position.set(x, 0.65, 0);
      pauldron.rotation.z = x < 0 ? 0.25 : -0.25;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.9), runeGoldMat);
      trim.position.y = 0.28;
      pauldron.add(trim);
      this.torso.add(pauldron);
    });

    // Horned Guardian Mask & Head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.32, 0.22);
    this.torso.add(this.head);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 0.95), obsidianMat);
    this.head.add(skull);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.02), runeGoldMat);
    crown.position.y = 0.48;
    this.head.add(crown);

    // Curved Demon Horns
    [-0.58, 0.58].forEach((x) => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.95, 6), runeGoldMat);
      horn.position.set(x, 0.85, 0.05);
      horn.rotation.z = x < 0 ? 0.42 : -0.42;
      this.head.add(horn);
    });

    // Blazing Eyes
    [-0.25, 0.25].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), fireEyeMat);
      eye.position.set(x, 0.12, 0.48);
      eye.rotation.z = x < 0 ? -0.18 : 0.18;
      this.head.add(eye);
    });

    // Massive Pounding Arms
    this.leftArm = this._buildArm(-1.25, obsidianMat, runeGoldMat);
    this.rightArm = this._buildArm(1.25, obsidianMat, runeGoldMat);
    this.torso.add(this.leftArm);
    this.torso.add(this.rightArm);

    // Legs
    this.leftLeg = this._buildLeg(-0.52, obsidianMat);
    this.rightLeg = this._buildLeg(0.52, obsidianMat);
    this.group.add(this.leftLeg);
    this.group.add(this.rightLeg);
  }

  _buildArm(x, obsidianMat, runeGoldMat) {
    const arm = new THREE.Group();
    arm.position.set(x, 0.45, 0.1);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.35, 0.52), obsidianMat);
    upper.position.y = -0.6;
    upper.castShadow = true;
    arm.add(upper);

    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.85, 0.64), obsidianMat);
    gauntlet.position.set(0, -1.45, 0.18);
    arm.add(gauntlet);

    const bracer = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.68), runeGoldMat);
    bracer.position.set(0, -1.15, 0.18);
    arm.add(bracer);

    return arm;
  }

  _buildLeg(x, obsidianMat) {
    const leg = new THREE.Group();
    leg.position.set(x, 1.6, 0);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.65, 0.68), obsidianMat);
    pillar.position.y = -0.8;
    leg.add(pillar);
    return leg;
  }

  update(dt, speed = 18) {
    this.cycle += dt * (speed * 0.55);
    const s = Math.sin(this.cycle);
    const c = Math.cos(this.cycle);

    this.torso.position.y = 2.55 + Math.abs(c) * 0.28;
    this.torso.rotation.x = 0.28 + Math.sin(this.cycle * 2) * 0.06;
    this.torso.rotation.z = s * 0.08;

    this.leftArm.rotation.x = s * 1.1 - 0.35;
    this.rightArm.rotation.x = -s * 1.1 - 0.35;
    this.leftLeg.rotation.x = -s * 0.8;
    this.rightLeg.rotation.x = s * 0.8;
    this.core.rotation.y += dt * 3.0;
  }
}
