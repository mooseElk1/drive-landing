export type Quat = [number, number, number, number]; // [w, x, y, z]

/**
 * Creates a quaternion representing a rotation around a specified axis.
 *
 * Converts from axis-angle representation to quaternion representation.
 * The quaternion represents a rotation of `angle` radians around the specified axis.
 *
 * Formula: q = [cos(θ/2), sin(θ/2) * axis_vector]
 * Where θ is the rotation angle and axis_vector is the unit vector along the rotation axis.
 *
 * @param axis The rotation axis ('x', 'y', or 'z')
 * @param angle The rotation angle in radians (positive follows right-hand rule)
 * @returns A unit quaternion [w, x, y, z] representing the rotation
 * @throws Error if axis is not 'x', 'y', or 'z'
 */
export function fromAxisAngle(axis: 'x' | 'y' | 'z', angle: number): Quat {
  const s = Math.sin(angle / 2);
  const c = Math.cos(angle / 2);

  switch (axis) {
    case 'x':
      return [c, s, 0.0, 0.0];
    case 'y':
      return [c, 0.0, s, 0.0];
    case 'z':
      return [c, 0.0, 0.0, s];
    default:
      throw new Error(`Invalid axis: ${axis}`);
  }
}

/**
 * Multiplies two quaternions using the Hamilton product formula.
 *
 * Quaternion multiplication is non-commutative, so order matters.
 * The result represents the composition of rotations: first rotation `b`, then rotation `a`.
 *
 * Formula: q1 * q2 = (w1*w2 - x1*x2 - y1*y2 - z1*z2) +
 *                   (w1*x2 + x1*w2 + y1*z2 - z1*y2)i +
 *                   (w1*y2 - x1*z2 + y1*w2 + z1*x2)j +
 *                   (w1*z2 + x1*y2 - y1*x2 + z1*w2)k
 *
 * @param a First quaternion [w, x, y, z]
 * @param b Second quaternion [w, x, y, z]
 * @returns The product quaternion [w, x, y, z]
 */
export function multiply(a: Quat, b: Quat): Quat {
  const [w1, x1, y1, z1] = a;
  const [w2, x2, y2, z2] = b;
  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
}

export function conjugate(q: Quat): Quat {
  const [w, x, y, z] = q;
  return [w, -x, -y, -z];
}

/**
 * Rotate a vector (x,y,z) by quaternion q (body->world).
 * Returns a new [x,y,z] array.
 */
export function rotateVector(
  q: Quat,
  v: [number, number, number]
): [number, number, number] {
  const qv: Quat = [0, v[0], v[1], v[2]];
  const t = multiply(q, qv);
  const r = multiply(t, conjugate(q));
  return [r[1], r[2], r[3]];
}

/**
 * Builds a body->world quaternion from W3C device orientation angles.
 *
 * world->body = Rz(alpha) * Rx(beta) * Ry(gamma)
 * body->world = Ry(-gamma) * Rx(-beta) * Rz(-alpha)
 */
export function fromW3CAngles(
  alpha: number,
  beta: number,
  gamma: number
): Quat {
  return multiply(
    fromAxisAngle('y', -gamma),
    multiply(fromAxisAngle('x', -beta), fromAxisAngle('z', -alpha))
  );
}
