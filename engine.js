import { target } from "./target.js";
import { snake } from "./snake.js";
import { racer } from "./racer.js";
import { bricks } from "./bricks.js";
import { reaction } from "./reaction.js";
import { memory } from "./memory.js";
import { basketball } from "./basketball.js";
import { catcher } from "./catcher.js";
export const definitions = [
  [
    "target",
    "Zielscheiben",
    "🎯",
    "Präzision zahlt sich aus.",
    "Triff die beweglichen Ziele. Die Mitte bringt mehr Punkte.",
    "30 SEK",
    "pink",
    target,
  ],
  [
    "snake",
    "Neon Snake",
    "🐍",
    "Klein anfangen. Groß abräumen.",
    "Pfeiltasten, WASD oder Richtungstasten. Sammle Futter, meide Wände und dich selbst.",
    "SURVIVAL",
    "green",
    snake,
  ],
  [
    "racer",
    "Dodge Racer",
    "🏎️",
    "Deine Spur. Dein Highscore.",
    "Mit A/D, Pfeiltasten oder den Bildschirmtasten Hindernissen ausweichen.",
    "SURVIVAL",
    "blue",
    racer,
  ],
  [
    "bricks",
    "Brick Breaker",
    "🧱",
    "Mach die Wand zu Coins.",
    "Bewege den Schläger mit Maus, Touch oder A/D. Zerstöre alle Blöcke.",
    "ARCADE",
    "purple",
    bricks,
  ],
  [
    "reaction",
    "Blitzreaktion",
    "⚡",
    "Wie schnell bist du wirklich?",
    "Erst bei GRÜN tippen! Fünf Runden; Frühstarts kosten Punkte.",
    "5 RUNDEN",
    "yellow",
    reaction,
  ],
  [
    "memory",
    "Memory Match",
    "🧠",
    "Gutes Gedächtnis. Gute Gewinne.",
    "Finde acht Kartenpaare. Weniger Versuche und mehr Restzeit bringen einen Bonus.",
    "BRAIN",
    "purple",
    memory,
  ],
  [
    "basketball",
    "Hoop Hustle",
    "🏀",
    "Ein Wurf. Ein neuer Rekord.",
    "Ziehe vom Ball entgegen der Wurfrichtung und lass los. Stärke und Winkel bestimmen den Wurf.",
    "45 SEK",
    "orange",
    basketball,
  ],
  [
    "catcher",
    "Coin Catcher",
    "🪙",
    "Goldregen? Immer her damit.",
    "Mit A/D, Pfeiltasten oder Touch bewegen. Gold fangen, rote Bomben meiden.",
    "45 SEK",
    "yellow",
    catcher,
  ],
].map(([id, name, icon, tagline, help, badge, color, factory]) => ({
  id,
  name,
  icon,
  tagline,
  help,
  badge,
  color,
  factory,
}));
export function createGame(id, seed) {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const def = definitions.find((d) => d.id === id);
  if (!def) throw Error("Unbekanntes Spiel");
  const g = {
    id,
    t: 0,
    score: 0,
    done: false,
    keys: {},
    rand,
    ...def.factory(rand),
  };
  g.step = (actions = []) => {
    if (g.done) return;
    for (const a of actions) {
      if (a.type === "key") g.keys[a.key] = a.down;
      else g.input?.(a, g);
    }
    g.update(g);
    g.t++;
    if (g.t >= 2700) g.done = true;
    g.score = Math.max(0, Math.min(5000, Math.floor(g.score)));
  };
  return g;
}
export function replay(id, seed, events, ticks) {
  if (
    !Number.isInteger(ticks) ||
    ticks < 1 ||
    ticks > 2700 ||
    !Array.isArray(events) ||
    events.length > 6000
  )
    throw Error("Ungültiger Spielverlauf");
  const g = createGame(id, seed);
  let last = -1;
  for (const e of events) {
    if (
      !Number.isInteger(e.tick) ||
      e.tick < last ||
      e.tick < 0 ||
      e.tick >= ticks ||
      !["key", "tap", "move", "throw"].includes(e.type)
    )
      throw Error("Ungültige Eingabe");
    if (
      e.type === "key" &&
      (!["left", "right", "up", "down"].includes(e.key) ||
        typeof e.down !== "boolean")
    )
      throw Error("Ungültige Taste");
    if (
      e.type !== "key" &&
      (!Number.isFinite(e.x) ||
        !Number.isFinite(e.y) ||
        Math.abs(e.x) > 1000 ||
        Math.abs(e.y) > 1000)
    )
      throw Error("Ungültige Position");
    last = e.tick;
  }
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    const list = [];
    while (i < events.length && events[i].tick === t) list.push(events[i++]);
    g.step(list);
  }
  if (!g.done) throw Error("Spiel noch nicht beendet");
  return { score: g.score, ticks: g.t };
}
export function baseReward(score) {
  return Math.min(600, Math.max(0, Math.floor(score)));
}
export const text = (c, str, x, y, size = 24, color = "#fff") => {
  c.fillStyle = color;
  c.font = `700 ${size}px system-ui`;
  c.textAlign = "center";
  c.fillText(str, x, y);
};
export function circle(c, x, y, r, color) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}
