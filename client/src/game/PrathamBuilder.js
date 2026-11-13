import * as THREE from 'three';
import { OUTFITS } from './constants';

export class PrathamCharacter {
  constructor(initialOutfitId = 'classic') {
    this.group = new THREE.Group();
    this.bodyPivot = new THREE.Group();
    this.group.add(this.bodyPivot);

    this.materials = {
      skin: new THREE.MeshStandardMaterial({ color: 0xd99b72, roughness: 0.55 }),
      hair: new THREE.MeshStandardMaterial({ color: 0x1a1615, roughness: 0.7 }),
      jacket: new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.6 }),
      shirt: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }),
      scarf: new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.5 }),
      pants: new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.65 }),
      shoes: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
      shoeTrim: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
      backpack: new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.65 }),
      accent: new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.6,
        roughness: 0.25
      }),
      headband: new THREE.MeshStandardMaterial({ color: 0xd9480f, roughness: 0.45 }),
      eyeDark: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2 })
    };

    this._buildCharacter();
    this.applyOutfit(initialOutfitId);
    this.runCycle = 0;
  }

  _buildCharacter() {
    const m = this.materials;

    // --- TORSO (Shirt + Modern Adventurer Vest/Jacket + Belt) ---
    this.torso = new THREE.Group();
    this.torso.position.y = 1.18;
    this.bodyPivot.add(this.torso);

    const innerShirt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.64, 0.28), m.shirt);
    innerShirt.castShadow = true;
    this.torso.add(innerShirt);

    // Open-front explorer jacket panels
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.66, 0.32), m.jacket);
    leftPanel.position.set(-0.17, 0, 0.01);
    leftPanel.castShadow = true;
    this.torso.add(leftPanel);

    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.66, 0.32), m.jacket);
    rightPanel.position.set(0.17, 0, 0.01);
    rightPanel.castShadow = true;
    this.torso.add(rightPanel);

    const backJacket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.12), m.jacket);
    backJacket.position.set(0, 0, -0.11);
    backJacket.castShadow = true;
    this.torso.add(backJacket);

    // Adventurer neck scarf
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 8, 16), m.scarf);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 0.33, 0.02);
    this.torso.add(scarf);

    // Belt + Golden Temple Buckle
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.33), m.backpack);
    belt.position.set(0, -0.29, 0);
    this.torso.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.04), m.accent);
    buckle.position.set(0, -0.29, 0.17);
    this.torso.add(buckle);

    // --- ADVENTURER BACKPACK ---
    this.backpackGroup = new THREE.Group();
    this.backpackGroup.position.set(0, 0.03, -0.26);
    this.torso.add(this.backpackGroup);

    const mainPack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), m.backpack);
    mainPack.castShadow = true;
    this.backpackGroup.add(mainPack);

    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), m.jacket);
    packPocket.position.set(0, -0.08, -0.13);
    this.backpackGroup.add(packPocket);

    // Rolled sleeping mat / bedroll on top of backpack
    const bedroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.46, 12),
      m.scarf
    );
    bedroll.rotation.z = Math.PI / 2;
    bedroll.position.set(0, 0.3, -0.01);
    bedroll.castShadow = true;
    this.backpackGroup.add(bedroll);

    // Backpack straps
    [-0.15, 0.15].forEach((x) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.34), m.backpack);
      strap.position.set(x, 0.02, 0.24);
      this.backpackGroup.add(strap);
    });

    // Golden Garuda Energy Wings (visible during Flying Power-up!)
    this.wingsGroup = new THREE.Group();
    this.wingsGroup.position.set(0, 0.12, -0.08);
    this.wingsGroup.visible = false;
    const wingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    [-1, 1].forEach((dir) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.35, 5), wingMat);
      wing.rotation.z = dir * -1.18;
      wing.position.set(dir * 0.68, 0.12, 0);
      this.wingsGroup.add(wing);
    });
    this.backpackGroup.add(this.wingsGroup);

    // --- HEAD & STYLISH HAIR ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.42, 0.02);
    this.torso.add(this.headGroup);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.14, 10), m.skin);
    neck.position.y = 0.04;
    this.headGroup.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.36), m.skin);
    head.position.y = 0.24;
    head.castShadow = true;
    this.headGroup.add(head);

    // Stylish windswept hair
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.4), m.hair);
    hairTop.position.set(0, 0.42, -0.01);
    hairTop.castShadow = true;
    this.headGroup.add(hairTop);

    const hairFrontSpike = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.14), m.hair);
    hairFrontSpike.position.set(0, 0.46, 0.14);
    hairFrontSpike.rotation.x = -0.25;
    this.headGroup.add(hairFrontSpike);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.1), m.hair);
    hairBack.position.set(0, 0.28, -0.17);
    this.headGroup.add(hairBack);

    // Adventurer Headband
    const headband = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.065, 0.39), m.headband);
    headband.position.set(0, 0.35, 0);
    this.headGroup.add(headband);

    // Eyes & Eyebrows (facing +Z locally; character faces forward along track)
    [-0.085, 0.085].forEach((x) => {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.03), m.eyeDark);
      eye.position.set(x, 0.25, 0.18);
      this.headGroup.add(eye);

      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.03), m.hair);
      brow.position.set(x, 0.3, 0.185);
      this.headGroup.add(brow);
    });

    // --- ARTICULATED ARMS ---
    this.leftArm = this._createArm(-0.34);
    this.rightArm = this._createArm(0.34);
    this.torso.add(this.leftArm.shoulder);
    this.torso.add(this.rightArm.shoulder);

    // --- ARTICULATED LEGS + RUNNING SHOES ---
    this.leftLeg = this._createLeg(-0.14);
    this.rightLeg = this._createLeg(0.14);
    this.bodyPivot.add(this.leftLeg.hip);
    this.bodyPivot.add(this.rightLeg.hip);

    // --- SPECIAL POWER AURAS ---
    // Sacred Shield Bubble
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.28, 22, 18),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.28,
        roughness: 0.1
      })
    );
    this.shieldMesh.position.y = 1.05;
    this.shieldMesh.visible = false;
    this.group.add(this.shieldMesh);

    // Coin Magnet Ring
    this.magnetRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.05, 10, 32),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.75
      })
    );
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.position.y = 0.18;
    this.magnetRing.visible = false;
    this.group.add(this.magnetRing);
  }

  _createArm(xOffset) {
    const m = this.materials;
    const shoulder = new THREE.Group();
    shoulder.position.set(xOffset, 0.26, 0);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.16), m.jacket);
    sleeve.position.y = -0.12;
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.28, 0.13), m.skin);
    forearm.position.y = -0.13;
    forearm.castShadow = true;
    elbow.add(forearm);

    const wristBand = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.06, 0.145), m.headband);
    wristBand.position.y = -0.23;
    elbow.add(wristBand);

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.13), m.skin);
    hand.position.y = -0.3;
    elbow.add(hand);

    return { shoulder, elbow };
  }

  _createLeg(xOffset) {
    const m = this.materials;
    const hip = new THREE.Group();
    hip.position.set(xOffset, 0.86, 0);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.22), m.pants);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.41;
    hip.add(knee);

    const calf = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.36, 0.18), m.pants);
    calf.position.y = -0.17;
    calf.castShadow = true;
    knee.add(calf);

    // Modern Running Shoe
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.39, 0.05);
    knee.add(shoeGroup);

    const shoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.34), m.shoes);
    shoeBody.castShadow = true;
    shoeGroup.add(shoeBody);

    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.37), m.shoeTrim);
    shoeSole.position.y = -0.065;
    shoeGroup.add(shoeSole);

    const shoeStripe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.16), m.shoeTrim);
    shoeStripe.position.set(0, 0.01, 0.02);
    shoeGroup.add(shoeStripe);

    return { hip, knee };
  }

  applyOutfit(outfitId) {
    const outfit = OUTFITS.find((o) => o.id === outfitId) || OUTFITS[0];
    const c = outfit.colors;
    this.materials.jacket.color.setHex(c.jacket);
    this.materials.shirt.color.setHex(c.shirt);
    this.materials.scarf.color.setHex(c.scarf);
    this.materials.pants.color.setHex(c.pants);
    this.materials.shoes.color.setHex(c.shoes);
    this.materials.shoeTrim.color.setHex(c.shoeTrim);
    this.materials.backpack.color.setHex(c.backpack);
    this.materials.accent.color.setHex(c.accent);
    this.materials.headband.color.setHex(c.headband);
  }

  updateAnimation(dt, state) {
    const {
      mode = 'running', // 'menu', 'running', 'jumping', 'sliding', 'flying', 'crashed'
      speed = 18,
      laneTilt = 0,
      hasShield = false,
      hasMagnet = false,
      time = 0
    } = state;

    this.shieldMesh.visible = hasShield;
    if (hasShield) {
      this.shieldMesh.rotation.y += dt * 1.8;
      this.shieldMesh.scale.setScalar(1 + Math.sin(time * 6) * 0.035);
    }

    this.magnetRing.visible = hasMagnet;
    if (hasMagnet) {
      this.magnetRing.scale.setScalar(0.95 + Math.sin(time * 8) * 0.12);
    }

    this.wingsGroup.visible = mode === 'flying';
    if (mode === 'flying') {
      this.wingsGroup.children[0].rotation.y = Math.sin(time * 14) * 0.35;
      this.wingsGroup.children[1].rotation.y = -Math.sin(time * 14) * 0.35;
    }

    if (mode === 'menu') {
      // Heroic idle breathing & alert stance
      this.bodyPivot.rotation.set(0, 0, 0);
      this.bodyPivot.position.y = Math.sin(time * 2.5) * 0.03;
      this.torso.rotation.x = 0.04;
      this.headGroup.rotation.y = Math.sin(time * 1.2) * 0.22;

      this.leftArm.shoulder.rotation.x = -0.18 + Math.sin(time * 2.5) * 0.05;
      this.rightArm.shoulder.rotation.x = 0.15 - Math.sin(time * 2.5) * 0.05;
      this.leftArm.elbow.rotation.x = -0.45;
      this.rightArm.elbow.rotation.x = -0.45;

      this.leftLeg.hip.rotation.x = -0.06;
      this.rightLeg.hip.rotation.x = 0.08;
      this.leftLeg.knee.rotation.x = 0.08;
      this.rightLeg.knee.rotation.x = 0.05;
      return;
    }

    if (mode === 'crashed') {
      // Knocked back on temple stones
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, -1.25, dt * 8);
      this.bodyPivot.position.y = THREE.MathUtils.lerp(this.bodyPivot.position.y, 0.25, dt * 8);
      return;
    }

    if (mode === 'sliding') {
      // Low parkour slide under barriers
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, -1.12, dt * 16);
      this.bodyPivot.position.y = THREE.MathUtils.lerp(this.bodyPivot.position.y, -0.42, dt * 16);
      this.bodyPivot.rotation.z = laneTilt * 0.25;
      this.headGroup.rotation.x = 0.65;

      this.leftLeg.hip.rotation.x = -0.5;
      this.leftLeg.knee.rotation.x = 0.15;
      this.rightLeg.hip.rotation.x = 0.25;
      this.rightLeg.knee.rotation.x = 1.15;

      this.leftArm.shoulder.rotation.x = 0.6;
      this.rightArm.shoulder.rotation.x = -0.8;
      return;
    }

    if (mode === 'flying') {
      // Heroic forward flight pose
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0.72, dt * 10);
      this.bodyPivot.position.y = Math.sin(time * 6) * 0.08;
      this.bodyPivot.rotation.z = -laneTilt * 0.45;
      this.headGroup.rotation.x = -0.45;

      this.leftArm.shoulder.rotation.x = -2.5;
      this.rightArm.shoulder.rotation.x = -2.5;
      this.leftArm.elbow.rotation.x = -0.2;
      this.rightArm.elbow.rotation.x = -0.2;

      this.leftLeg.hip.rotation.x = 0.2;
      this.rightLeg.hip.rotation.x = 0.25;
      this.leftLeg.knee.rotation.x = 0.2;
      this.rightLeg.knee.rotation.x = 0.25;
      return;
    }

    if (mode === 'jumping') {
      // Athletic mid-air parkour tuck
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0.18, dt * 12);
      this.bodyPivot.position.y = 0;
      this.bodyPivot.rotation.z = -laneTilt * 0.35;
      this.headGroup.rotation.x = 0;

      this.leftArm.shoulder.rotation.x = -1.65;
      this.rightArm.shoulder.rotation.x = -1.25;
      this.leftArm.elbow.rotation.x = -0.5;
      this.rightArm.elbow.rotation.x = -0.6;

      this.leftLeg.hip.rotation.x = -0.85;
      this.leftLeg.knee.rotation.x = 1.15;
      this.rightLeg.hip.rotation.x = 0.35;
      this.rightLeg.knee.rotation.x = 0.85;
      return;
    }

    // --- SPRINTING CYCLE ---
    this.runCycle += dt * (speed * 0.72);
    const s = Math.sin(this.runCycle);
    const c = Math.cos(this.runCycle);

    this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0.18, dt * 14);
    this.bodyPivot.rotation.z = THREE.MathUtils.lerp(
      this.bodyPivot.rotation.z,
      -laneTilt * 0.35,
      dt * 12
    );
    this.bodyPivot.position.y = Math.abs(c) * 0.11;
    this.torso.rotation.y = s * 0.14;
    this.headGroup.rotation.x = -0.06;
    this.headGroup.rotation.y = -s * 0.07;

    // Legs swing opposite with realistic knee flexion on recovery
    this.leftLeg.hip.rotation.x = -s * 0.92;
    this.rightLeg.hip.rotation.x = s * 0.92;
    this.leftLeg.knee.rotation.x = Math.max(0.12, s * 1.15);
    this.rightLeg.knee.rotation.x = Math.max(0.12, -s * 1.15);

    // Arms pump vigorously opposite to legs
    this.leftArm.shoulder.rotation.x = s * 0.95;
    this.rightArm.shoulder.rotation.x = -s * 0.95;
    this.leftArm.elbow.rotation.x = -0.85 - Math.max(0, -s) * 0.35;
    this.rightArm.elbow.rotation.x = -0.85 - Math.max(0, s) * 0.35;

    // Backpack subtle bounce
    this.backpackGroup.rotation.x = Math.abs(s) * 0.08;
  }
}
