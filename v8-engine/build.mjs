import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../.agents/skills/anatomy/kit/iso-kit.mjs";
import { lineOnTop, radialTicks, ring, segment, slabOf, towardViewer } from "../.agents/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 380;

// V8 defaults (flag-definitions.h): feedback vector + Sparkplug after ~8 calls,
// Maglev after ~400, TurboFan after ~3000. The real budget also scales with bytecode size.
const TIERS = ["Ignition", "Sparkplug", "Maglev", "TurboFan"];
const LIMITS = [0, 8, 400, 3000];
const DECADES = 4;

const PLATE = { x: -166, y: -58, w: 320, d: 114, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const STATIONS = [-44, 8, 62, 118];
const GEAR_R = [8, 11, 14, 17];
const GEAR_TEETH = [14, 20, 26, 32];
const MESH_Y = -14;
const PEDESTAL_H = 8;
const GEAR_Z = PEDESTAL_H + 1.2;
const GEAR_TOP = 15;

const RAIL_FROM = -88;
const RAIL_TO = 140;
const RAIL_YS = [0, 22];
const RAIL_H = 3;

const CARRIAGE = { x: -15, y: -4, w: 30, d: 34, r: 3 };
const CARRIAGE_Z = RAIL_H;
const CARRIAGE_TOP = 8;
const ARM = { x: -5, y: -13, w: 10, d: 10, r: 2 };
const ARM_TOP = 9.5;
const PINION = [0, -9.6];
const PINION_R = 3.6;
const PINION_TEETH = 9;

const DRUM = [-78, 12];
const DRUM_R = 6;
const DRUM_Z = 3;
const DRUM_TOP = 10;
const BAND_Y = DRUM[1] + DRUM_R;
const BAND_Z = [4.5, 8.5];

const RACK = { x: -66, y: 7, w: 200, d: 3, r: 0.6 };

const DIAL = [-136, -30];
const DIAL_R = 20;
const DIAL_Z = 38;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const SCALE_FROM = (-150 * Math.PI) / 180;
const SCALE_SPAN = (300 * Math.PI) / 180;

const gearCentre = (index) => [STATIONS[index], MESH_Y - GEAR_R[index]];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [DIAL[0], DIAL[1] - DIAL_R, DIAL_TOP + 2], [DIAL[0] + DIAL_R, DIAL[1], DIAL_TOP + 2]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 56 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// Live geometry: these functions are also sent to the page with toString(), so they only use kit globals and P.
function teethSide(cx, cy, r, z0, z1, count, phase) {
  const [vx, vy] = towardViewer(P);
  let d = "";
  for (let index = 0; index < count; index++) {
    const angle = phase + (index / count) * Math.PI * 2;
    if (Math.cos(angle) * vx + Math.sin(angle) * vy < 0.15) continue;
    d += segment([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z0 + 0.4], [cx + r * Math.cos(angle), cy + r * Math.sin(angle), z1 - 0.4], P);
  }
  return d;
}

function gearFace(cx, cy, r, z, count, phase, holes) {
  const root = r - 1.4;
  const teeth = radialTicks(cx, cy, r, count, count + 1, z, [1.4, 1.4], P, phase);
  let d = teeth.minor + teeth.major + ring(cx, cy, root, z, P, 48);
  if (holes) {
    for (let index = 0; index < 4; index++) {
      const angle = phase + ((index + 0.5) / 4) * Math.PI * 2;
      d += ring(cx + Math.sin(angle) * r * 0.52, cy - Math.cos(angle) * r * 0.52, r * 0.17, z, P, 20);
    }
  }
  d += lineOnTop([cx + Math.sin(phase) * 2.6, cy - Math.cos(phase) * 2.6], [cx + Math.sin(phase) * root, cy - Math.cos(phase) * root], z, P);
  return d;
}

function needleAt(value) {
  const angle = SCALE_FROM + SCALE_SPAN * Math.min(1, Math.max(0, value / DECADES));
  const [x, y] = DIAL;
  return lineOnTop([x - Math.sin(angle) * 3.4, y + Math.cos(angle) * 3.4], [x + Math.sin(angle) * (DIAL_R - 5), y - Math.cos(angle) * (DIAL_R - 5)], DIAL_TOP + 0.2, P);
}

function bandAt(carriageX) {
  const end = carriageX + CARRIAGE.x;
  return slabOf({ x: DRUM[0], y: BAND_Y - 0.3, w: Math.max(0.6, end - DRUM[0]), d: 0.6, r: 0.2 }, BAND_Z[0], BAND_Z[1] - BAND_Z[0], P, 1);
}

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -PLATE_H + 3, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  const strip = { x: RACK.x, y: 40, w: RACK.w, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // One index notch per station, rooted on the strip's back edge.
  out.push(L(STATIONS.map((x) => lineOnTop([x, strip.y], [x, strip.y + 5.2], 0.6, P)).join(""), { tone: "hi" }));

  const label = { x: -150, y: 28, w: 46, d: 18, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + 6, label.y + 7.6], 0.8, P, "x"), "V8", { size: 5, tone: "mid" }));
  out.push(L(lineOnTop([label.x + 6, label.y + 11], [label.x + 38, label.y + 11], 0.8, P), { tone: "lo", free: true }));
  out.push(L(lineOnTop([label.x + 6, label.y + 13.6], [label.x + 30, label.y + 13.6], 0.8, P), { tone: "lo", free: true }));
  out.push(L(lineOnTop([label.x + 22, label.y + 6], [label.x + 38, label.y + 6], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 3, label.y + 3, 0.8]), at([label.x + label.w - 3, label.y + label.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

function dial() {
  const out = [];
  const [x, y] = DIAL;
  const base = { x: x - 13, y: y - 13, w: 26, d: 26, r: 3 };
  out.push(S(k.slabOf(base, 0, 9, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(base, 3), 9, P), { tone: "faint" }));
  out.push(D(k.corners(base, 4).map(([px, py]) => at([px, py, 9])), { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 4.4, 9, 3, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.9, 12, DIAL_Z - 12, P, 20), { tone: "mid", crease: "none" }));
  out.push(L([20, 28].map((z) => k.sideArc(x, y, 2.9, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3.4, DIAL_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3.4, P, 40), { tone: "faint" }));
  const bezel = DIAL_R - 2.2;
  out.push(L(k.ring(x, y, bezel, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, bezel, DECADES * 10, 10, DIAL_TOP, [1.3, 2.8], P, SCALE_FROM, SCALE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // Tier marks at log10(8), log10(400), log10(3000), each ending on a dot.
  const marks = LIMITS.slice(1).map((limit) => SCALE_FROM + SCALE_SPAN * (Math.log10(limit) / DECADES));
  out.push(L(marks.map((angle) => lineOnTop([x + Math.sin(angle) * (bezel - 5), y - Math.cos(angle) * (bezel - 5)], [x + Math.sin(angle) * bezel, y - Math.cos(angle) * bezel], DIAL_TOP, P)).join(""), { tone: "hi" }));
  out.push(D(marks.map((angle) => at([x + Math.sin(angle) * (bezel - 5), y - Math.cos(angle) * (bezel - 5), DIAL_TOP])), { size: 0.6, tone: "hi" }));
  out.push(L(k.ring(x, y, 1.6, DIAL_TOP, P, 16), { tone: "mid" }));
  return out.join("");
}

function gear(index) {
  const [cx, cy] = gearCentre(index);
  const r = GEAR_R[index];
  const pedestal = { x: cx - r - 2, y: cy - r - 2, w: 2 * r + 4, d: MESH_Y - (cy - r - 2), r: 2 };
  const out = [];
  out.push(S(k.slabOf(pedestal, 0, PEDESTAL_H, P, 3, 0.6), { tone: "mid" }));
  out.push(D(Array.from({ length: index + 1 }, (_, dot) => at([pedestal.x + 3 + dot * 2.4, pedestal.y + pedestal.d - 1.6, PEDESTAL_H])), { size: 0.5, tone: "hi" }));
  out.push(D([at([pedestal.x + pedestal.w - 2.4, pedestal.y + 2.4, PEDESTAL_H])], { size: 0.45 }));
  out.push(S(k.cylinder(cx, cy, r - 3, PEDESTAL_H, GEAR_Z - PEDESTAL_H, P, 40), { tone: "mid" }));
  out.push(S(k.cylinder(cx, cy, r, GEAR_Z, GEAR_TOP - GEAR_Z, P, 64, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(teethSide(cx, cy, r, GEAR_Z, GEAR_TOP, GEAR_TEETH[index], 0), { tone: "lo" }).replace("<path", `<path data-part="teeth-${index}"`));
  out.push(L(gearFace(cx, cy, r, GEAR_TOP, GEAR_TEETH[index], 0, r > 9), { tone: "lo" }).replace("<path", `<path data-part="face-${index}"`));
  out.push(S(k.cylinder(cx, cy, 2.6, GEAR_TOP, 1.8, P, 20), { tone: "mid" }));
  out.push(D([at([cx, cy, GEAR_TOP + 1.8])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAIL_YS) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 4, r: 1 }, 0, RAIL_H, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 6, (RAIL_FROM + RAIL_TO) / 2, RAIL_TO - 6].map((x) => at([x, y + 2, RAIL_H])), { size: 0.4 }));
  }
  return out;
}

function rack() {
  const out = [S(k.slabOf(RACK, 0, 1.6, P, 2, 0.3), { tone: "lo" })];
  const ticks = k.topTicks(RACK.x + 2, RACK.x + RACK.w - 2, 3, 1000, RACK.y, 1.6, [RACK.d, RACK.d], P);
  out.push(L(ticks.minor + ticks.major, { tone: "faint" }));
  return out.join("");
}

function stop(x) {
  const plan = { x, y: -2, w: 6, d: 30, r: 1.2 };
  return S(k.slabOf(plan, 0, 11, P, 3, 0.5), { tone: "mid" }) + D([at([x + 3, 2, 11]), at([x + 3, 24, 11])], { size: 0.45 });
}

function drum() {
  const [x, y] = DRUM;
  const block = { x: x - 9, y: y - 8, w: 18, d: 16, r: 2 };
  const out = [S(k.slabOf(block, 0, DRUM_Z, P, 3, 0.4), { tone: "mid" })];
  out.push(D([at([block.x + 2.4, block.y + 2.4, DRUM_Z]), at([block.x + block.w - 2.4, block.y + 2.4, DRUM_Z])], { size: 0.45 }));
  out.push(S(k.cylinder(x, y, DRUM_R, DRUM_Z, DRUM_TOP - DRUM_Z, P, 40, 0.4), { tone: "mid" }));
  out.push(L([BAND_Z[0], BAND_Z[1]].map((z) => k.sideArc(x, y, DRUM_R, z, P, 24)).join(""), { tone: "faint" }));
  out.push(L([2.6, 3.6, 4.6].map((r) => k.ring(x, y, r, DRUM_TOP, P, 32)).join(""), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 1.6, DRUM_TOP, 1.2, P, 16), { tone: "mid" }));
  return out.join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CARRIAGE, 3), CARRIAGE_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(ARM, CARRIAGE_TOP, ARM_TOP - CARRIAGE_TOP, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(CARRIAGE, CARRIAGE_Z, CARRIAGE_TOP - CARRIAGE_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(D([-10, -3.5, 3.5, 10].map((x) => at([x, CARRIAGE.y + CARRIAGE.d - 2.4, CARRIAGE_TOP])), { size: 0.4, tone: "lo" }));
  for (const y of RAIL_YS) {
    const block = { x: -12, y: y - 1, w: 24, d: 6, r: 1.2 };
    out.push(S(k.slabOf(block, CARRIAGE_TOP, 2, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([-9, y + 2, CARRIAGE_TOP + 2]), at([9, y + 2, CARRIAGE_TOP + 2])], { size: 0.45 }));
  }
  // Band clamp on the left face, where the spring band ends.
  out.push(S(k.slabOf({ x: CARRIAGE.x - 2, y: BAND_Y - 2.4, w: 2, d: 4.8, r: 0.6 }, BAND_Z[0] - 1, BAND_Z[1] - BAND_Z[0] + 2, P, 2), { tone: "mid" }));
  // Pawl knob: trips the ratchet when a guard fails.
  const knob = [CARRIAGE.x + CARRIAGE.w - 7, CARRIAGE.y + CARRIAGE.d + 3];
  out.push(S(k.slabOf({ x: knob[0] - 2, y: CARRIAGE.y + CARRIAGE.d - 1, w: 4, d: 4, r: 1 }, CARRIAGE_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(knob[0], knob[1] + 1, 3, CARRIAGE_Z, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1] + 1, 3, CARRIAGE_Z, CARRIAGE_Z + 5, 18, P), { tone: "lo" }));
  // Pinion that meshes with the selected gear.
  out.push(S(k.cylinder(PINION[0], PINION[1], PINION_R, ARM_TOP, GEAR_TOP - ARM_TOP, P, 28), { tone: "hi", crease: "lo" }));
  out.push(L(teethSide(PINION[0], PINION[1], PINION_R, ARM_TOP, GEAR_TOP, PINION_TEETH, 0), { tone: "lo" }).replace("<path", `<path data-part="pinion-teeth"`));
  out.push(L(gearFace(PINION[0], PINION[1], PINION_R, GEAR_TOP, PINION_TEETH, 0, false), { tone: "lo" }).replace("<path", `<path data-part="pinion-face"`));
  out.push(S(k.cylinder(PINION[0], PINION[1], 1.4, GEAR_TOP, 1.2, P, 16), { tone: "mid" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A gearbox on a bench plate that explains V8 tiering. A dial gauge counts calls on a log scale with marks at 8, 400 and 3000. A carriage on rails carries a pinion. It steps along a ratchet rack to four gears of growing size: Ignition, Sparkplug, Maglev and TurboFan. A constant-force spring band pulls the carriage back to the first gear when a type guard fails.",
  body: [
    plate(),
    dial(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
    ...STATIONS.map((_, index) => index).sort((a, b) => k.depthOf([...gearCentre(a), 0], P) - k.depthOf([...gearCentre(b), 0], P)).map(gear),
    rails()[0],
    rack(),
    stop(RAIL_FROM - 6),
    drum(),
    `<g data-part="band">${S(bandAt(STATIONS[0]), { tone: "lo", crease: "none" })}</g>`,
    rails()[1],
    stop(RAIL_TO),
    `<g data-part="carriage" transform="${k.translateAlong(P, [STATIONS[0], 0, 0])}">${carriage()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const TIERS = ${JSON.stringify(TIERS)}, LIMITS = ${JSON.stringify(LIMITS)}, DECADES = ${DECADES};
const STATIONS = ${JSON.stringify(STATIONS)}, GEAR_R = ${JSON.stringify(GEAR_R)}, GEAR_TEETH = ${JSON.stringify(GEAR_TEETH)};
const MESH_Y = ${MESH_Y}, GEAR_Z = ${GEAR_Z}, GEAR_TOP = ${GEAR_TOP}, ARM_TOP = ${ARM_TOP};
const PINION = ${JSON.stringify(PINION)}, PINION_R = ${PINION_R}, PINION_TEETH = ${PINION_TEETH};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, SCALE_FROM = ${SCALE_FROM}, SCALE_SPAN = ${SCALE_SPAN};
const DRUM = ${JSON.stringify(DRUM)}, BAND_Y = ${BAND_Y}, BAND_Z = ${JSON.stringify(BAND_Z)}, CARRIAGE = ${JSON.stringify(CARRIAGE)};
const gearCentre = ${gearCentre.toString()};
${teethSide.toString()}
${gearFace.toString()}
${needleAt.toString()}
${bandAt.toString()}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const part = (name) => svg.querySelector('[data-part="' + name + '"]');
const carriage = part("carriage"), needle = part("needle"), band = part("band");
const teeth = STATIONS.map((_, i) => part("teeth-" + i)), faces = STATIONS.map((_, i) => part("face-" + i));
const pinionTeeth = part("pinion-teeth"), pinionFace = part("pinion-face");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const SPIN = [0.5, 1.1, 2.2, 4.4];
const RATE = 0.5;
const HOLD = 2.6;

let budget = 0, shown = 0, x = STATIONS[0], speed = 0, spin = 0, pinion = 0, hold = 0, deoptFor = 0;
const phase = STATIONS.map(() => 0);
let frame = 0, last = 0, visible = false;

const tierOf = (calls) => LIMITS.reduce((best, limit, index) => (calls >= limit ? index : best), 0);
const callsOf = (value) => Math.round(Math.pow(10, value)) - 1;

function deopt() {
  budget = 0;
  hold = 0;
  deoptFor = 1.6;
  run();
}

function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  needle.setAttribute("d", needleAt(shown));
  band.innerHTML = solidSvg(bandAt(x), { tone: "lo", crease: "none" });
  STATIONS.forEach((_, index) => {
    const [cx, cy] = gearCentre(index);
    teeth[index].setAttribute("d", teethSide(cx, cy, GEAR_R[index], GEAR_Z, GEAR_TOP, GEAR_TEETH[index], phase[index]));
    faces[index].setAttribute("d", gearFace(cx, cy, GEAR_R[index], GEAR_TOP, GEAR_TEETH[index], phase[index], GEAR_R[index] > 9));
  });
  pinionTeeth.setAttribute("d", teethSide(PINION[0], PINION[1], PINION_R, ARM_TOP, GEAR_TOP, PINION_TEETH, pinion));
  pinionFace.setAttribute("d", gearFace(PINION[0], PINION[1], PINION_R, GEAR_TOP, PINION_TEETH, pinion, false));
  const calls = callsOf(budget);
  const tier = tierOf(calls);
  const text = deoptFor > 0 ? "deopt · back to Ignition" : TIERS[tier] + " · " + calls.toLocaleString("en-US") + " calls";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(tier));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (deoptFor > 0) deoptFor = Math.max(0, deoptFor - dt);
  else if (budget < DECADES - 0.3) budget = Math.min(DECADES - 0.3, budget + RATE * dt);
  else if ((hold += dt) > HOLD) deopt();
  shown += (budget - shown) * (1 - Math.exp(-dt / (deoptFor > 0 ? 0.12 : 0.18)));
  const tier = tierOf(callsOf(budget));
  const target = STATIONS[tier];
  const stiff = deoptFor > 0 ? 140 : 70, drag = deoptFor > 0 ? 13 : 15;
  for (let step = 0; step < 4; step++) {
    speed += ((target - x) * stiff - speed * drag) * dt / 4;
    x += speed * dt / 4;
  }
  const engaged = Math.abs(target - x) < 1.2 ? tier : -1;
  spin += ((engaged < 0 ? 0 : SPIN[tier]) - spin) * (1 - Math.exp(-dt / 0.35));
  if (engaged >= 0) {
    phase[tier] += spin * dt;
    pinion -= spin * dt * GEAR_R[tier] / PINION_R;
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}

function run() {
  if (still.matches) { draw(); return; }
  if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
}

function stepStill() {
  deoptFor = 0;
  const tier = tierOf(callsOf(budget));
  budget = tier === TIERS.length - 1 ? 0 : Math.log10(LIMITS[tier + 1] + 1);
  shown = budget;
  x = STATIONS[tierOf(callsOf(budget))];
  draw();
}

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("click", () => (still.matches ? stepStill() : deopt()));
stage.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " " && event.key.toLowerCase() !== "d") return;
  event.preventDefault();
  if (still.matches) stepStill(); else deopt();
});
if (still.matches) { budget = Math.log10(LIMITS[2] + 1); shown = budget; x = STATIONS[2]; }
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "V8 tiering gearbox",
  hint: "Click or press D to fail a type guard",
  readout: `Ignition · 0 calls`,
  keys: [
    { mark: "lit", label: "Needle: calls to the function, log scale, marks at 8, 400 and 3000" },
    { mark: "raised", label: "Gears 1 to 4: Ignition, Sparkplug, Maglev, TurboFan" },
    { mark: "flat", label: "Spring band: deoptimization pulls the carriage back to gear 1" },
  ],
  caption:
    "V8 runs every function first in Ignition, its bytecode interpreter. As calls add up, the carriage steps along the ratchet to faster tiers: Sparkplug after about 8 calls, Maglev after about 400, TurboFan after about 3000 (V8 defaults; the real budget also scales with the size of the bytecode). Optimized code depends on the types it saw. When a type guard fails, the pawl trips, the spring band pulls the carriage back to Ignition, and the function must earn its tiers again.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="V8 tiering gearbox: press D to deoptimize" aria-valuemin="0" aria-valuemax="3" aria-valuenow="0">${svg}</div>`,
});

const file = theme === "light" ? "v8-engine-light.html" : "v8-engine.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "V8 tiering gearbox", theme, body, script: kitScript() + live }));
console.log("wrote", file);
