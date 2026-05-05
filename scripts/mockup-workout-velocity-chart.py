#!/usr/bin/env python3
"""Replay workout JSON → velocity (post-fix pipeline) + comparison PNG."""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import MutableSequence

FOO_DT = 0.01
VEL_LEAK = 0.999
VEL_LPF_HZ = 3.0
HPF_HZ = 0.5
Z_ACC_THRESH = 0.12
Z_GYRO_THRESH = 0.1
Z_MIN_TIME = 0.40
Z_BIAS_ALPHA_ACTIVE = 0.1
WINDOW_SM_SIZE = 5
VEL_ARM_THRESHOLD = 0.5
VEL_DIRECTION_THRESHOLD = 0.08
VEL_DIRECTION_MIN_SAMPLES = 3
MILLISECOND_THRESHOLD = 1e10
Z_ACTIVE = 8


def to_seconds(ts: float) -> float:
    return ts / 1000 if ts > MILLISECOND_THRESHOLD else ts


def magnitude(x: float, y: float, z: float) -> float:
    return math.sqrt(x * x + y * y + z * z)


class LowPassFirstOrder:
    def __init__(self, cutoff_hz: float, dt_: float) -> None:
        rc = 1 / (2 * math.pi * cutoff_hz)
        self.alpha = dt_ / (rc + dt_)
        self.prev_output = 0.0

    def add(self, value: float) -> float:
        self.prev_output = (1 - self.alpha) * self.prev_output + self.alpha * value
        return self.prev_output


class HighPassFirstOrder:
    def __init__(self, cutoff_hz: float, dt_: float) -> None:
        rc = 1 / (2 * math.pi * cutoff_hz)
        self.alpha = rc / (rc + dt_)
        self.prev_input = 0.0
        self.prev_output = 0.0

    def add(self, value: float) -> float:
        out = self.alpha * (self.prev_output + value - self.prev_input)
        self.prev_input = value
        self.prev_output = out
        return out


class MovingAverage:
    def __init__(self, window_size: int) -> None:
        self.window_size = window_size
        self.buffer = [0.0] * window_size
        self.sum_val = 0.0
        self.idx = 0
        self.count = 0

    def add(self, value: float) -> float:
        replaced = self.buffer[self.idx]
        self.buffer[self.idx] = value
        self.sum_val += value - replaced
        self.idx = (self.idx + 1) % self.window_size
        if self.count < self.window_size:
            self.count += 1
        return self.sum_val / self.count


class ZuptDetector:
    def __init__(self, dt_: float, min_time: float) -> None:
        self.acc_thresh = Z_ACC_THRESH
        self.gyro_thresh = Z_GYRO_THRESH
        self.count = 0
        self.min_samples = max(1, int(math.floor(min_time / dt_)))

    def add_sample(self, acc_mag: float, gyro_mag: float) -> int:
        a_ok = acc_mag < self.acc_thresh
        g_ok = gyro_mag < self.gyro_thresh
        if a_ok and g_ok:
            self.count += 1
        else:
            self.count = 0
        status = 0
        if a_ok:
            status |= 1
        if g_ok:
            status |= 2
        if 0 < self.count < self.min_samples:
            status |= 4
        if self.count >= self.min_samples:
            status |= Z_ACTIVE
        return status


def from_axis_angle(axis: str, angle_rad: float) -> list[float]:
    h = angle_rad / 2
    s, c = math.sin(h), math.cos(h)
    if axis == "x":
        return [c, s, 0.0, 0.0]
    if axis == "y":
        return [c, 0.0, s, 0.0]
    return [c, 0.0, 0.0, s]


def quat_mul(a: MutableSequence[float], b: MutableSequence[float]) -> list[float]:
    w1, x1, y1, z1 = a[0], a[1], a[2], a[3]
    w2, x2, y2, z2 = b[0], b[1], b[2], b[3]
    return [
        w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
        w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
        w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
        w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    ]


def conjugate(q):
    return [q[0], -q[1], -q[2], -q[3]]


def rotate_vector(q: MutableSequence[float], v: MutableSequence[float]):
    qv = [0.0, v[0], v[1], v[2]]
    t = quat_mul(q, qv)
    r = quat_mul(t, conjugate(q))
    return [r[1], r[2], r[3]]


def from_w3c_angles_deg(alpha_deg: float, beta_deg: float, gamma_deg: float):
    alpha = math.radians(alpha_deg)
    beta = math.radians(beta_deg)
    gamma = math.radians(gamma_deg)
    return quat_mul(
        from_axis_angle("y", -gamma),
        quat_mul(from_axis_angle("x", -beta), from_axis_angle("z", -alpha)),
    )


def replay_workout(obj: dict):
    ch = obj["data"]["channels"]

    def ga(name: str) -> list[float]:
        v = ch.get(name, [])
        return [float(x) for x in v]

    accx, accy, accz = ga("accx"), ga("accy"), ga("accz")
    gx, gy, gz = ga("gyrox"), ga("gyroy"), ga("gyroz")
    rota, rotb, rotg = ga("rota"), ga("rotb"), ga("rotg")
    ts_arr = ga("timestamp")
    exported_vel = ga("velocity_magnitude")

    n = min(
        len(accx),
        len(accy),
        len(accz),
        len(gx),
        len(gy),
        len(gz),
        len(rota),
        len(rotb),
        len(rotg),
        len(ts_arr),
    )
    if n < 2:
        raise SystemExit("Too few samples")

    smx = MovingAverage(WINDOW_SM_SIZE)
    smy = MovingAverage(WINDOW_SM_SIZE)
    smz = MovingAverage(WINDOW_SM_SIZE)
    hpf_x = HighPassFirstOrder(HPF_HZ, FOO_DT)
    hpf_y = HighPassFirstOrder(HPF_HZ, FOO_DT)
    hpf_z = HighPassFirstOrder(HPF_HZ, FOO_DT)
    vlx, vly, vlz = (
        LowPassFirstOrder(VEL_LPF_HZ, FOO_DT),
        LowPassFirstOrder(VEL_LPF_HZ, FOO_DT),
        LowPassFirstOrder(VEL_LPF_HZ, FOO_DT),
    )
    zupt = ZuptDetector(FOO_DT, Z_MIN_TIME)

    bias = [0.0, 0.0, 0.0]
    prev_vel = {"x": 0.0, "y": 0.0, "z": 0.0}
    floor_armed = False
    sprint_dir = {"x": 0.0, "y": 0.0, "z": 0.0}
    prev_vel_abs = 0.0
    floor_below = 0
    session_start: float | None = None

    t_axis, vel_old, vel_new = [], [], []

    for i in range(n):
        raw = [accx[i], accy[i], accz[i]]
        rot = rotate_vector(from_w3c_angles_deg(rota[i], rotb[i], rotg[i]), raw)
        sx, sy, sz = smx.add(rot[0]), smy.add(rot[1]), smz.add(rot[2])

        zupt_status = zupt.add_sample(
            magnitude(raw[0], raw[1], raw[2]),
            magnitude(gx[i], gy[i], gz[i]),
        )
        is_rest = (zupt_status & Z_ACTIVE) != 0

        if is_rest:
            a = Z_BIAS_ALPHA_ACTIVE
            d = 1 - a
            bias[0] = d * bias[0] + a * sx
            bias[1] = d * bias[1] + a * sy
            bias[2] = d * bias[2] + a * sz

        out_x = rot[0] - bias[0]
        out_y = rot[1] - bias[1]
        out_z = rot[2] - bias[2]
        _ = hpf_x.add(sx - bias[0]), hpf_y.add(sy - bias[1]), hpf_z.add(sz - bias[2])

        avx = vlx.add(out_x)
        avy = vly.add(out_y)
        avz = vlz.add(out_z)

        vx = VEL_LEAK * (prev_vel["x"] + avx * FOO_DT)
        vy = VEL_LEAK * (prev_vel["y"] + avy * FOO_DT)
        vz = VEL_LEAK * (prev_vel["z"] + avz * FOO_DT)
        vabs = magnitude(vx, vy, vz)

        if session_start is None:
            session_start = to_seconds(ts_arr[i])

        cur = {"x": vx, "y": vy, "z": vz}
        cab = vabs

        if is_rest:
            cur = {"x": 0.0, "y": 0.0, "z": 0.0}
            cab = 0.0
            floor_armed = False
            floor_below = 0
            prev_vel_abs = 0.0
        else:
            if not floor_armed and cab >= VEL_ARM_THRESHOLD:
                floor_armed = True
                floor_below = 0
            if floor_armed:
                if cab >= prev_vel_abs and cab > 0:
                    sprint_dir = {
                        "x": cur["x"] / cab,
                        "y": cur["y"] / cab,
                        "z": cur["z"] / cab,
                    }
                sc = (
                    cur["x"] * sprint_dir["x"]
                    + cur["y"] * sprint_dir["y"]
                    + cur["z"] * sprint_dir["z"]
                )
                if sc < VEL_DIRECTION_THRESHOLD:
                    floor_below += 1
                    if floor_below >= VEL_DIRECTION_MIN_SAMPLES:
                        cur = {"x": 0.0, "y": 0.0, "z": 0.0}
                        cab = 0.0
                        floor_armed = False
                        floor_below = 0
                else:
                    floor_below = 0

        prev_vel_abs = cab
        prev_vel = cur

        elapsed = max(0.0, to_seconds(ts_arr[i]) - session_start)
        t_axis.append(elapsed)
        vel_old.append(exported_vel[i] if i < len(exported_vel) else float("nan"))
        vel_new.append(cab)

    return t_axis, vel_old, vel_new


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path", type=Path)
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("artifacts/workout-velocity-mockup.png"),
    )
    args = ap.parse_args()
    if not args.json_path.is_file():
        sys.exit(f"Not found: {args.json_path}")

    with open(args.json_path, encoding="utf-8") as f:
        obj = json.load(f)

    t_axis, vel_old, vel_new = replay_workout(obj)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    import matplotlib.pyplot as plt

    plt.figure(figsize=(12, 5), dpi=120)
    plt.plot(t_axis, vel_old, color="#8892a8", lw=1.2, label="Exported velocity_magnitude")
    plt.plot(
        t_axis,
        vel_new,
        color="#2563eb",
        lw=1.8,
        label="Replay: VEL LP 3 Hz + velLeak 0.999 + zupt 0.40s + sprint-direction floor",
    )
    plt.xlabel("Time (s)")
    plt.ylabel("Velocity magnitude (m/s)")
    plt.title(f"Velocity mockup — {args.json_path.name}")
    plt.legend(loc="upper right", fontsize=8)
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(args.output, bbox_inches="tight")
    print(f"Wrote {args.output.resolve()}")


if __name__ == "__main__":
    main()
