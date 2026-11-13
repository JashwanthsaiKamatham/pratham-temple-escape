import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Track path math shared by the world builder and the game engine.
// A straight segment is a line along `dir`.
// A turn segment is a short approach straight followed by a 90-degree arc of
// radius TURN_RADIUS that exits perpendicular to the incoming direction.
// ---------------------------------------------------------------------------
export const TURN_RADIUS = 10;
export const TURN_SWEEP = Math.PI / 2;
export const TURN_ARC_LENGTH = TURN_RADIUS * TURN_SWEEP;
export const TURN_APPROACH = 7;
export const TURN_LENGTH = TURN_APPROACH + TURN_ARC_LENGTH;
export const TRACK_HALF = 4.2;

const _right = new THREE.Vector3();
const _tangent = new THREE.Vector3();

export function turnSign(turn) {
  return turn === 'left' ? 1 : -1;
}

export function rotateYVec(vec, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return new THREE.Vector3(vec.x * cos + vec.z * sin, 0, -vec.x * sin + vec.z * cos);
}

export function buildTurnGeometry(start, dir, turn) {
  const sign = turnSign(turn);
  const newDir = rotateYVec(dir, sign * TURN_SWEEP).normalize();
  // The bend begins after the short approach straight, so the arc centre sits
  // sideways from the approach end (not from the raw segment start).
  const approachEnd = start.clone().addScaledVector(dir, TURN_APPROACH);
  const center = approachEnd.clone().addScaledVector(newDir, TURN_RADIUS);
  // Radius vector (centre -> start) is -newDir; rotating it 90° gives the end radius.
  const base = newDir.clone().negate();
  const endRadius = rotateYVec(base, sign * TURN_SWEEP).normalize();
  const end = center.clone().addScaledVector(endRadius, TURN_RADIUS);

  // RingGeometry lies in XY and is rotated -90° about X: plane (x, y) -> world (x, 0, -y).
  // So ring angle phi satisfies cos(phi) = radius.x, sin(phi) = -radius.z.
  const phi0 = Math.atan2(-base.z, base.x);
  const thetaStart = sign > 0 ? phi0 : phi0 - TURN_SWEEP;

  return { sign, newDir, approachEnd, center, end, base, phi0, thetaStart };
}

// Where the runner sits `dist` metres into a turn segment.
// `committed` = the player swiped the correct junction direction in time.
export function turnPoint(seg, dist, committed, outPos, outTangent) {
  const approach = TURN_APPROACH;
  const sign = seg.sign || 1;
  const newDir =
    seg.newDir || rotateYVec(seg.dir, sign * TURN_SWEEP).normalize();
  const base = newDir.clone().negate();
  if (!committed) {
    outPos.copy(seg.start).addScaledVector(seg.dir, Math.min(dist, approach));
    outTangent.copy(seg.dir);
    return outPos;
  }
  if (dist <= 0) {
    outPos.copy(seg.start);
    outTangent.copy(seg.dir);
    return outPos;
  }
  if (dist <= approach) {
    outPos.copy(seg.start).addScaledVector(seg.dir, dist);
    outTangent.copy(seg.dir);
    return outPos;
  }
  const along = Math.min(dist - approach, TURN_ARC_LENGTH);
  const t = along / TURN_ARC_LENGTH;
  const u = rotateYVec(base, sign * TURN_SWEEP * t);
  outPos.copy(seg.center).addScaledVector(u, TURN_RADIUS);
  outPos.y = seg.start.y;
  outTangent.copy(rotateYVec(u, sign * TURN_SWEEP)).normalize();
  return outPos;
}

export function pathTransform(seg, dist, committed, outPos, outTangent) {
  if (seg.type === 'turn') return turnPoint(seg, dist, committed, outPos, outTangent);
  outPos.copy(seg.start).addScaledVector(seg.dir, dist);
  outTangent.copy(seg.dir);
  return outPos;
}

export function rightOf(dir, out = _right) {
  return out.set(-dir.z, 0, dir.x);
}

export function laneWorldPosition(seg, dist, laneX, committed = true, out = new THREE.Vector3()) {
  pathTransform(seg, dist, committed, out, _tangent);
  rightOf(_tangent, _right);
  out.addScaledVector(_right, laneX);
  return out;
}
