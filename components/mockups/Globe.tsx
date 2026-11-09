"use client";

import { useEffect, useRef, useState } from "react";
import { LINKS, REGIONS } from "@/lib/mockups/globeDemo";
import styles from "./Globe.module.css";

type V3 = [number, number, number];
type Col = [number, number, number];

interface GNode {
  p: V3;
  w: number;
  x: number;
  y: number;
}
interface Edge {
  pts: V3[];
  w: number;
}
interface Island {
  s: V3;
  t: V3;
  b: V3;
  rad: number;
  a1: number;
  a2: number;
  nodes: GNode[];
  edges: Edge[];
  contour: V3[];
  dust: { p: V3; w: number }[];
}
interface Arc {
  pts: V3[];
  off: number;
  sp: number;
  spark: boolean;
  A?: number;
  B?: number;
}

interface Props {
  onSelect?: (index: number, name: string) => void;
}

// Перенос reference/bound-globe.html: чистый canvas 2D, логика без изменений.
// Всё, что создаётся в эффекте, снимается в cleanup.
export default function Globe({ onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSelectRef = useRef(onSelect);
  const [selected, setSelected] = useState(-1);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = mq.matches;
    const onMq = () => {
      reduce = mq.matches;
    };
    mq.addEventListener("change", onMq);

    let W = 0,
      H = 0,
      R = 0,
      dpr = 1;
    const RED: Col = [224, 74, 93],
      HOT: Col = [255, 176, 160];
    const rgba = (c: Col, a: number) => "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")";

    /* ---------- математика ---------- */
    function mulberry(a: number) {
      return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a: V3, b: V3): V3 => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const norm = (v: V3): V3 => {
      const l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    };
    function fib(n: number): V3[] {
      const a: V3[] = [],
        g = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) * 2) / n,
          r = Math.sqrt(1 - y * y),
          t = g * i;
        a.push([Math.cos(t) * r, y, Math.sin(t) * r]);
      }
      return a;
    }
    function onSphere(s: V3, t: V3, b: V3, d: number, ph: number): V3 {
      const c = Math.cos(d),
        sn = Math.sin(d),
        cp = Math.cos(ph),
        sp = Math.sin(ph);
      return [
        s[0] * c + (t[0] * cp + b[0] * sp) * sn,
        s[1] * c + (t[1] * cp + b[1] * sp) * sn,
        s[2] * c + (t[2] * cp + b[2] * sp) * sn,
      ];
    }
    function slerp(a: V3, b: V3, t: number, om: number): V3 {
      const s = Math.sin(om) || 1e-6,
        k1 = Math.sin((1 - t) * om) / s,
        k2 = Math.sin(t * om) / s;
      return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
    }
    function basis(s: V3): [V3, V3] {
      const t = norm(cross(s, Math.abs(s[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
      return [t, cross(s, t)];
    }
    function mkArc(a: V3, b: V3, k: number, N: number): V3[] {
      const om = Math.acos(Math.min(1, dot(a, b))),
        P: V3[] = [];
      for (let s = 0; s <= N; s++) {
        const t = s / N,
          p = slerp(a, b, t, om),
          l = 1 + k * Math.sin(Math.PI * t) * (om / Math.PI + 0.3);
        P.push([p[0] * l, p[1] * l, p[2] * l]);
      }
      return P;
    }

    /* ---------- острова: россыпь светящихся точек ---------- */
    const rng = mulberry(7),
      seeds = fib(REGIONS.length);
    const isl: Island[] = REGIONS.map((r, i) => {
      const s = seeds[i],
        bs = basis(s);
      return {
        s,
        t: bs[0],
        b: bs[1],
        rad: 0.072 * Math.sqrt(r.people),
        a1: rng() * 6.28,
        a2: rng() * 6.28,
        nodes: [],
        edges: [],
        contour: [],
        dust: [],
      };
    });
    const boundary = (I: Island, phi: number) =>
      I.rad * (1 + 0.08 * Math.sin(2 * phi + I.a1) + 0.05 * Math.sin(3 * phi + I.a2));

    isl.forEach((I, i) => {
      for (let j = 0; j < 96; j++) {
        const ph = (j / 96) * Math.PI * 2;
        I.contour.push(onSphere(I.s, I.t, I.b, boundary(I, ph), ph));
      }
      const n = REGIONS[i].people;
      const P: { x: number; y: number; w: number }[] = [{ x: 0, y: 0, w: 1 }];
      for (let k = 1; k < n; k++) {
        const f = rng() * Math.PI * 2,
          d = Math.sqrt(rng()) * I.rad * 0.8;
        P.push({ x: d * Math.cos(f), y: d * Math.sin(f), w: Math.pow(rng(), 1.5) });
      }
      const h = (I.rad * 1.15) / Math.sqrt(n);
      for (let it = 0; it < 120; it++) {
        for (let a = 0; a < n; a++)
          for (let b = a + 1; b < n; b++) {
            const dx = P[b].x - P[a].x,
              dy = P[b].y - P[a].y,
              d2 = Math.hypot(dx, dy) || 1e-6;
            if (d2 < h) {
              const m = ((h - d2) * 0.5) / d2,
                ux = dx * m,
                uy = dy * m;
              if (a > 0) {
                P[a].x -= ux;
                P[a].y -= uy;
              }
              if (b > 0) {
                P[b].x += ux;
                P[b].y += uy;
              }
            }
          }
        for (let c = 1; c < n; c++) {
          const r = Math.hypot(P[c].x, P[c].y),
            lim = boundary(I, Math.atan2(P[c].y, P[c].x)) * 0.84;
          if (r > lim) {
            P[c].x *= lim / r;
            P[c].y *= lim / r;
          }
        }
      }
      P.forEach((q) => {
        const r = Math.hypot(q.x, q.y),
          ph = Math.atan2(q.y, q.x);
        I.nodes.push({ p: onSphere(I.s, I.t, I.b, r, ph), w: q.w, x: q.x, y: q.y });
      });
      /* россыпь мелких точек вокруг: остров читается по плотности, без контура */
      const dp: number[][] = [];
      I.nodes.forEach((q) => dp.push([q.x, q.y]));
      for (let m = 0, tries = 0; m < n * 3 && tries < 3000; tries++) {
        const f2 = rng() * Math.PI * 2,
          d3 = Math.pow(rng(), 0.6) * boundary(I, f2) * 0.98,
          x = d3 * Math.cos(f2),
          y = d3 * Math.sin(f2);
        let ok = true;
        for (let e = 0; e < dp.length; e++)
          if (Math.hypot(dp[e][0] - x, dp[e][1] - y) < h * 0.3) {
            ok = false;
            break;
          }
        if (!ok) continue;
        dp.push([x, y]);
        m++;
        I.dust.push({ p: onSphere(I.s, I.t, I.b, d3, f2), w: Math.pow(rng(), 2.2) });
      }
      const seen: Record<string, number> = {},
        comp: number[] = [];
      for (let z = 0; z < n; z++) comp.push(z);
      const find = (x: number): number => {
        while (comp[x] !== x) x = comp[x] = comp[comp[x]];
        return x;
      };
      const link = (a: number, b: number) => {
        const key = Math.min(a, b) + "-" + Math.max(a, b);
        if (seen[key]) return;
        seen[key] = 1;
        I.edges.push({
          pts: mkArc(I.nodes[a].p, I.nodes[b].p, 0.004, 5),
          w: 0.6 + 0.5 * Math.min(I.nodes[a].w, I.nodes[b].w),
        });
        comp[find(a)] = find(b);
      };
      const near = (a: number) =>
        I.nodes
          .map((q, b) => ({
            b,
            d: b === a ? 1e9 : Math.hypot(q.x - I.nodes[a].x, q.y - I.nodes[a].y),
          }))
          .sort((u, v) => u.d - v.d);
      for (let a2 = 0; a2 < n; a2++) {
        const o = near(a2),
          kk = a2 === 0 ? 3 : 2;
        for (let q = 0; q < kk; q++) link(a2, o[q].b);
      }
      for (;;) {
        let best: { a: number; b: number; d: number } | null = null;
        for (let a3 = 0; a3 < n; a3++)
          for (let b3 = a3 + 1; b3 < n; b3++) {
            if (find(a3) === find(b3)) continue;
            const dd = Math.hypot(I.nodes[a3].x - I.nodes[b3].x, I.nodes[a3].y - I.nodes[b3].y);
            if (!best || dd < best.d) best = { a: a3, b: b3, d: dd };
          }
        if (!best) break;
        link(best.a, best.b);
      }
    });

    /* ---------- сеть по всему шару ---------- */
    /* «океанские» узлы: равномерно по сфере, вне островов */
    const ocean = fib(110)
      .filter((p) => isl.every((I) => Math.acos(Math.min(1, dot(p, I.s))) > I.rad * 1.3))
      .map((p) => ({ p, w: rng() }));
    const pool: V3[] = ocean.map((o) => o.p).concat(isl.map((I) => I.nodes[0].p));
    const net: { pts: V3[] }[] = [],
      seenN: Record<string, number> = {};
    pool.forEach((p, a) => {
      const o = pool.map((q, b) => ({ b, d: b === a ? -2 : dot(p, q) })).sort((x, y) => y.d - x.d);
      for (let k = 0; k < 3; k++) {
        const b = o[k].b,
          key = Math.min(a, b) + "-" + Math.max(a, b);
        if (seenN[key] || Math.acos(o[k].d) > 0.8) continue;
        seenN[key] = 1;
        net.push({ pts: mkArc(p, pool[b], 0.025, 8) });
      }
    });
    /* дуги между островами: от ближайших друг к другу точек */
    const arcs: Arc[] = [];
    LINKS.forEach((L) => {
      const A = isl[L[0]],
        B = isl[L[1]],
        n = 1 + (L[2] > 3 ? 1 : 0) + (L[2] > 4 ? 1 : 0);
      const ia = A.nodes.map((q, k) => ({ k, d: dot(q.p, B.s) })).sort((u, v) => v.d - u.d);
      const ib = B.nodes.map((q, k) => ({ k, d: dot(q.p, A.s) })).sort((u, v) => v.d - u.d);
      for (let k = 0; k < n; k++)
        arcs.push({
          pts: mkArc(A.nodes[ia[k].k].p, B.nodes[ib[k].k].p, 0.1, 44),
          A: L[0],
          B: L[1],
          off: rng(),
          sp: 0.1 + rng() * 0.06,
          spark: true,
        });
    });
    /* высокие дуги-оболочка вокруг планеты */
    const allNodes: V3[] = [];
    isl.forEach((I) => I.nodes.forEach((q) => allNodes.push(q.p)));
    ocean.forEach((o) => allNodes.push(o.p));
    const shell: Arc[] = [];
    for (let q = 0; shell.length < 44 && q < 4000; q++) {
      const a = allNodes[Math.floor(rng() * allNodes.length)],
        b = allNodes[Math.floor(rng() * allNodes.length)],
        om = Math.acos(Math.min(1, dot(a, b)));
      if (om < 0.9 || om > 2.5) continue;
      shell.push({
        pts: mkArc(a, b, 0.09 + rng() * 0.2, 56),
        off: rng(),
        sp: 0.05 + rng() * 0.07,
        spark: shell.length % 3 === 0,
      });
    }
    /* орбитальные кольца */
    const rings: { pts: V3[]; sp: number; off: number }[] = [];
    for (let r = 0; r < 7; r++) {
      const ax = norm([rng() - 0.5, rng() - 0.5, rng() - 0.5]),
        bs = basis(ax),
        rad = 1.04 + rng() * 0.1,
        P: V3[] = [];
      for (let k = 0; k <= 120; k++) {
        const an = (k / 120) * Math.PI * 2;
        P.push([
          (bs[0][0] * Math.cos(an) + bs[1][0] * Math.sin(an)) * rad,
          (bs[0][1] * Math.cos(an) + bs[1][1] * Math.sin(an)) * rad,
          (bs[0][2] * Math.cos(an) + bs[1][2] * Math.sin(an)) * rad,
        ]);
      }
      // sp и off в рисовании не используются, но тянут значения из генератора, как в референсе
      rings.push({ pts: P, sp: (rng() < 0.5 ? -1 : 1) * (0.03 + rng() * 0.03), off: rng() });
    }
    /* звёзды */
    const stars: { x: number; y: number; r: number; a: number; f: number }[] = [];
    for (let k = 0; k < 140; k++)
      stars.push({ x: rng(), y: rng(), r: 0.4 + rng() * 1.1, a: 0.15 + rng() * 0.5, f: rng() * 6 });

    /* ---------- вид и вращение ---------- */
    let yaw = 0.5,
      pitch = -0.2,
      vx = 0,
      vy = 0,
      tgt: { a: number; b: number } | null = null,
      sel = -1,
      hover = -1,
      lastTouch = 0,
      dragging = false;
    let ripples: { i: number; t0: number }[] = [];
    function rot(p: V3): V3 {
      const ca = Math.cos(yaw),
        sa = Math.sin(yaw),
        cb = Math.cos(pitch),
        sb = Math.sin(pitch);
      const x1 = p[0] * ca + p[2] * sa,
        z1 = -p[0] * sa + p[2] * ca;
      return [x1, p[1] * cb - z1 * sb, p[1] * sb + z1 * cb];
    }
    function unrot(u: number, v: number, w: number): V3 {
      const ca = Math.cos(yaw),
        sa = Math.sin(yaw),
        cb = Math.cos(pitch),
        sb = Math.sin(pitch);
      const y = v * cb + w * sb,
        z1 = -v * sb + w * cb;
      return [u * ca - z1 * sa, y, u * sa + z1 * ca];
    }
    function rotateTo(i: number) {
      const s = seeds[i],
        z1 = Math.sqrt(s[0] * s[0] + s[2] * s[2]);
      tgt = { a: Math.atan2(-s[0], s[2]), b: Math.atan2(s[1], z1) };
    }
    const angDiff = (t: number, a: number) =>
      ((((t - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv!.getBoundingClientRect();
      W = r.width;
      H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.4;
    }
    window.addEventListener("resize", resize);
    resize();
    const X = (q: V3) => W / 2 + R * q[0];
    const Y = (q: V3) => H / 2 - R * q[1];

    /* ---------- рисование ---------- */
    const c2 = ctx;
    function fz(z: number) {
      const t = (z - 0.03) / 0.3;
      return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
    }
    const vis = (q: V3) => q[2] > 0.02 || q[0] * q[0] + q[1] * q[1] > 1.002;
    /* штрих по точкам: видимые участки одним путём */
    function strokePts(P: V3[], col: string, a: number, w: number) {
      c2.beginPath();
      let open = false,
        zs = 0,
        c = 0;
      for (let i = 0; i < P.length; i++) {
        const q = rot(P[i]);
        if (vis(q)) {
          if (open) c2.lineTo(X(q), Y(q));
          else {
            c2.moveTo(X(q), Y(q));
            open = true;
          }
          zs += q[2];
          c++;
        } else open = false;
      }
      if (!c) return;
      c2.globalAlpha = a * (0.5 + 0.5 * Math.max(0, Math.min(1, zs / c + 0.5)));
      c2.strokeStyle = col;
      c2.lineWidth = w;
      c2.stroke();
    }
    function glow(x: number, y: number, r: number, col: Col, a: number, hot?: Col) {
      c2.fillStyle = rgba(col, 1);
      c2.globalAlpha = a * 0.1;
      c2.beginPath();
      c2.arc(x, y, r * 4, 0, 6.2832);
      c2.fill();
      c2.globalAlpha = a * 0.22;
      c2.beginPath();
      c2.arc(x, y, r * 2.2, 0, 6.2832);
      c2.fill();
      c2.globalAlpha = a;
      c2.fillStyle = rgba(hot || col, 1);
      c2.beginPath();
      c2.arc(x, y, r, 0, 6.2832);
      c2.fill();
    }
    function rr(x: number, y: number, w: number, h: number, r: number) {
      c2.beginPath();
      c2.moveTo(x + r, y);
      c2.arcTo(x + w, y, x + w, y + h, r);
      c2.arcTo(x + w, y + h, x, y + h, r);
      c2.arcTo(x, y + h, x, y, r);
      c2.arcTo(x, y, x + w, y, r);
      c2.closePath();
    }
    function spark(a: Arc, T: number, u: number) {
      const N = a.pts.length - 1,
        t = (T * a.sp + a.off) % 1;
      for (let k = 0; k < 9; k++) {
        let tt = t - k * 0.012;
        if (tt < 0) tt += 1;
        const q = rot(a.pts[Math.floor(tt * N)]);
        if (!vis(q)) continue;
        const f = fz(q[2] + 0.1) || (q[0] * q[0] + q[1] * q[1] > 1 ? 1 : 0);
        c2.fillStyle = rgba(k ? RED : HOT, 1);
        c2.globalAlpha = (1 - k / 9) * (k ? 0.55 : 1) * f;
        c2.beginPath();
        c2.arc(X(q), Y(q), (k ? 1.4 : 2.2) * u * (1 - k * 0.06), 0, 6.2832);
        c2.fill();
      }
    }
    function draw(time: number) {
      const u = R / 230,
        T = time / 1000,
        cx = W / 2,
        cy = H / 2;
      c2.globalCompositeOperation = "source-over";
      c2.globalAlpha = 1;
      c2.clearRect(0, 0, W, H);
      /* звёзды */
      stars.forEach((s) => {
        c2.globalAlpha = s.a * (reduce ? 1 : 0.7 + 0.3 * Math.sin(T * 1.2 + s.f));
        c2.fillStyle = "#f3d9d6";
        c2.beginPath();
        c2.arc(s.x * W, s.y * H, s.r, 0, 6.2832);
        c2.fill();
      });
      c2.globalAlpha = 1;
      /* атмосфера */
      const at = c2.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.32);
      at.addColorStop(0, rgba(RED, 0.42));
      at.addColorStop(0.25, rgba(RED, 0.16));
      at.addColorStop(1, rgba(RED, 0));
      c2.fillStyle = at;
      c2.beginPath();
      c2.arc(cx, cy, R * 1.32, 0, 6.2832);
      c2.fill();
      /* тело планеты */
      const g = c2.createRadialGradient(cx - R * 0.32, cy - R * 0.38, R * 0.05, cx, cy, R);
      g.addColorStop(0, "#6a1a2c");
      g.addColorStop(0.5, "#2c0e17");
      g.addColorStop(1, "#0d0508");
      c2.beginPath();
      c2.arc(cx, cy, R, 0, 6.2832);
      c2.fillStyle = g;
      c2.fill();
      c2.globalCompositeOperation = "lighter";
      const rim = c2.createRadialGradient(cx, cy, R * 0.78, cx, cy, R);
      rim.addColorStop(0, rgba(RED, 0));
      rim.addColorStop(1, rgba(RED, 0.3));
      c2.fillStyle = rim;
      c2.beginPath();
      c2.arc(cx, cy, R, 0, 6.2832);
      c2.fill();
      c2.globalAlpha = 0.55;
      c2.lineWidth = 1.2 * u;
      c2.strokeStyle = rgba(RED, 1);
      c2.beginPath();
      c2.arc(cx, cy, R, 0, 6.2832);
      c2.stroke();
      c2.globalAlpha = 1;

      /* орбитальные кольца */
      rings.forEach((r) => strokePts(r.pts, rgba(RED, 1), 0.1, 0.8 * u));
      /* сеть по поверхности */
      net.forEach((e) => strokePts(e.pts, rgba(RED, 1), sel < 0 ? 0.3 : 0.14, 0.7 * u));
      /* «океанские» узлы */
      ocean.forEach((o, k) => {
        const q = rot(o.p),
          f = fz(q[2]);
        if (f <= 0) return;
        const tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(T * 1.6 + k);
        glow(X(q), Y(q), (0.8 + 0.9 * o.w) * u, RED, f * tw * (sel < 0 ? 0.9 : 0.4), HOT);
      });
      /* связи внутри островов */
      isl.forEach((I, i) => {
        const act = sel < 0 || i === sel;
        I.edges.forEach((e) => strokePts(e.pts, rgba(HOT, 1), act ? 0.38 : 0.14, 0.8 * u));
      });
      /* дуги между островами */
      arcs.forEach((a) => {
        const act = sel < 0 || a.A === sel || a.B === sel;
        strokePts(a.pts, rgba(RED, 1), act ? 0.75 : 0.2, 1.1 * u);
        if (!reduce && act) spark(a, T, u);
      });
      /* высокие дуги-оболочка */
      shell.forEach((a) => {
        strokePts(a.pts, rgba(RED, 1), sel < 0 ? 0.3 : 0.12, 0.7 * u);
        if (!reduce && a.spark && sel < 0) spark(a, T, u);
      });
      /* пульс от сердца острова */
      if (!reduce)
        isl.forEach((I, i) => {
          if (sel >= 0 && i !== sel) return;
          for (let k = 0; k < 2; k++) {
            const age = (T / 3.8 + i * 0.37 + k * 0.5) % 1,
              th = I.rad * (0.15 + 1.15 * age),
              ring: V3[] = [];
            for (let j = 0; j <= 60; j++)
              ring.push(onSphere(I.s, I.t, I.b, th, (j / 60) * Math.PI * 2));
            strokePts(ring, rgba(RED, 1), Math.pow(1 - age, 1.6) * 0.7, 1.1 * u);
          }
        });
      /* люди: светящиеся точки разного размера */
      isl.forEach((I, i) => {
        const act = sel < 0 || i === sel;
        I.nodes.forEach((nd, j) => {
          const q = rot(nd.p),
            f = fz(q[2]);
          if (f <= 0) return;
          const heart = j === 0,
            beat = !reduce && heart ? 0.5 + 0.5 * Math.sin(T * 3.2 + i) : 0;
          const r = (heart ? 4.2 + 1.0 * beat : 0.9 + 3.4 * nd.w) * u * (0.8 + 0.2 * q[2]);
          glow(X(q), Y(q), r, heart ? RED : nd.w > 0.6 ? HOT : RED, (act ? 1 : 0.4) * f, HOT);
        });
      });
      /* россыпь мелких точек */
      isl.forEach((I, i) => {
        const act = sel < 0 || i === sel,
          boost = i === sel || i === hover ? 1.25 : 1;
        I.dust.forEach((d) => {
          const q = rot(d.p),
            f = fz(q[2]);
          if (f <= 0) return;
          glow(
            X(q),
            Y(q),
            (0.5 + 1.5 * d.w) * u * (0.8 + 0.2 * q[2]),
            RED,
            Math.min(1, (act ? 0.9 : 0.35) * f * boost),
            HOT,
          );
        });
      });
      /* рябь от нажатого острова */
      ripples = ripples.filter((r) => time - r.t0 < 1900);
      ripples.forEach((r) => {
        const age = (time - r.t0) / 1700;
        if (age < 0 || age > 1) return;
        const I = isl[r.i],
          th = (1 - Math.pow(1 - age, 2)) * 1.15,
          ring: V3[] = [];
        for (let j = 0; j <= 90; j++)
          ring.push(onSphere(I.s, I.t, I.b, th, (j / 90) * Math.PI * 2));
        strokePts(ring, rgba(HOT, 1), Math.pow(1 - age, 1.4) * 0.9, 1.6 * u);
      });

      /* подписи: тёмные плашки под островом */
      c2.globalCompositeOperation = "source-over";
      c2.globalAlpha = 1;
      const fs = Math.max(11, Math.round(R / 21));
      c2.font = "500 " + fs + "px -apple-system,Segoe UI,Roboto,sans-serif";
      c2.textAlign = "center";
      c2.textBaseline = "middle";
      const dn = unrot(0, -1, 0);
      isl.forEach((I, i) => {
        const qc = rot(I.s),
          f = fz(qc[2] - 0.22);
        if (f <= 0) return;
        const k = dot(dn, I.s),
          tv = norm([dn[0] - I.s[0] * k, dn[1] - I.s[1] * k, dn[2] - I.s[2] * k]),
          dl = I.rad * 1.22;
        const p: V3 = [
            I.s[0] * Math.cos(dl) + tv[0] * Math.sin(dl),
            I.s[1] * Math.cos(dl) + tv[1] * Math.sin(dl),
            I.s[2] * Math.cos(dl) + tv[2] * Math.sin(dl),
          ],
          q = rot(p);
        const on = i === sel || i === hover,
          txt = REGIONS[i].name,
          w = c2.measureText(txt).width + fs * 1.4,
          h = fs * 1.9;
        const x = Math.max(8, Math.min(W - 8 - w, X(q) - w / 2)),
          y = Y(q) + fs * 0.5;
        c2.globalAlpha = f * (sel < 0 || on ? 1 : 0.5);
        rr(x, y, w, h, h / 2);
        c2.fillStyle = "rgba(12,6,8,.78)";
        c2.fill();
        c2.lineWidth = 1;
        c2.strokeStyle = on ? rgba(HOT, 0.9) : rgba(RED, 0.4);
        c2.stroke();
        c2.fillStyle = on ? "#FFD9D2" : "#F1EBE8";
        c2.fillText(txt, x + w / 2, y + h / 2 + 0.5);
      });
      c2.globalAlpha = 1;
    }

    let last = 0,
      raf = 0;
    function frame(t: number) {
      const dt = Math.min(40, t - last);
      last = t;
      if (!dragging) {
        if (tgt) {
          yaw += angDiff(tgt.a, yaw) * 0.08;
          pitch += (tgt.b - pitch) * 0.08;
          if (Math.abs(angDiff(tgt.a, yaw)) < 0.002 && Math.abs(tgt.b - pitch) < 0.002) tgt = null;
        } else {
          yaw += vx;
          pitch += vy;
          vx *= 0.95;
          vy *= 0.95;
          if (!reduce && sel < 0 && t - lastTouch > 4000) yaw += (0.0016 * dt) / 16;
        }
        pitch = Math.max(-1.3, Math.min(1.3, pitch));
      }
      draw(t);
      raf = requestAnimationFrame(frame);
    }

    /* ---------- нажатия ---------- */
    function hit(mx: number, my: number) {
      const u = (mx - W / 2) / R,
        v = (H / 2 - my) / R,
        r2 = u * u + v * v;
      if (r2 > 1) return -1;
      const p = unrot(u, v, Math.sqrt(1 - r2));
      for (let i = 0; i < isl.length; i++) {
        const I = isl[i],
          cs = dot(p, I.s);
        if (cs < Math.cos(I.rad * 1.5)) continue;
        const th = Math.acos(Math.min(1, cs)),
          phi = Math.atan2(dot(p, I.b), dot(p, I.t));
        if (th < boundary(I, phi) * 1.12) return i;
      }
      return -1;
    }
    const pos = (e: PointerEvent): [number, number] => {
      const r = cv!.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    function pick(i: number) {
      sel = i;
      lastTouch = performance.now();
      setSelected(i);
      if (i >= 0) {
        rotateTo(i);
        const now = performance.now();
        if (!reduce) for (let k = 0; k < 3; k++) ripples.push({ i, t0: now + k * 260 });
        onSelectRef.current?.(i, REGIONS[i].name);
      }
    }
    let px = 0,
      py = 0,
      moved = 0;
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      dragging = true;
      tgt = null;
      moved = 0;
      vx = vy = 0;
      const p = pos(e);
      px = p[0];
      py = p[1];
      cv.classList.add(styles.drag);
      lastTouch = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      const p = pos(e);
      if (dragging) {
        const dx = p[0] - px,
          dy = p[1] - py;
        px = p[0];
        py = p[1];
        moved += Math.abs(dx) + Math.abs(dy);
        const k = 1 / R;
        yaw += dx * k;
        pitch += dy * k;
        vx = dx * k * 0.6;
        vy = dy * k * 0.6;
        lastTouch = performance.now();
      } else {
        const h = hit(p[0], p[1]);
        if (h !== hover) {
          hover = h;
          cv.classList.toggle(styles.pick, h >= 0);
        }
      }
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      cv.classList.remove(styles.drag);
      if (moved < 6) {
        const p = pos(e);
        pick(hit(p[0], p[1]));
      }
    };
    const onLeave = () => {
      hover = -1;
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointerleave", onLeave);

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      mq.removeEventListener("change", onMq);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Тёмный шар с красной сетью связей: острова из светящихся точек, дуги между ними"
      />
      <div className={styles.cap}>
        <div className={styles.name}>{selected >= 0 ? REGIONS[selected].name : ""}</div>
        <div className={styles.sub}>
          {selected >= 0
            ? `${REGIONS[selected].people} людей (демо)`
            : "Вращай шар, нажми на остров. Макет, данные демонстрационные."}
        </div>
      </div>
    </div>
  );
}
