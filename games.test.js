import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  replay,
  definitions,
  baseReward,
} from "../games/engine.js";
function simulate(id, choose = () => [], seed = 123) {
  const g = createGame(id, seed),
    events = [];
  while (!g.done) {
    const inputs = choose(g);
    for (const a of inputs) events.push({ ...a, tick: g.t });
    g.step(inputs);
  }
  return { g, events };
}
for (const def of definitions)
  test(`${def.id}: terminal state and deterministic server replay`, () => {
    const { g, events } = simulate(def.id);
    const result = replay(def.id, 123, events, g.t);
    assert.equal(result.score, g.score);
    assert.equal(result.ticks, g.t);
    assert.ok(g.t <= 2700);
    assert.ok(g.score >= 0);
  });
test("target: hit rewards precision and rejects missed taps", () => {
  const hit = simulate("target", (g) =>
    g.t % 10 === 0 ? [{ type: "tap", x: g.x, y: g.y }] : [],
  );
  const miss = simulate("target", (g) =>
    g.t % 10 === 0 ? [{ type: "tap", x: 0, y: 0 }] : [],
  );
  assert.ok(hit.g.score > 100);
  assert.equal(miss.g.score, 0);
  assert.equal(replay("target", 123, hit.events, hit.g.t).score, hit.g.score);
});
test("memory: all eight pairs can be solved", () => {
  const { g, events } = simulate("memory", (g) => {
    if (g.t % 2) return [];
    const i = g.open.length
      ? g.cards.findIndex(
          (v, i) =>
            v === g.cards[g.open[0]] &&
            !g.open.includes(i) &&
            !g.matched.includes(i),
        )
      : g.cards.findIndex((_, i) => !g.matched.includes(i));
    return [
      { type: "tap", x: 150 + (i % 4) * 100, y: 60 + Math.floor(i / 4) * 90 },
    ];
  });
  assert.equal(g.matched.length, 16);
  assert.equal(g.tries, 8);
  assert.ok(g.score > 280);
  assert.equal(replay("memory", 123, events, g.t).score, g.score);
});
test("reaction: five valid rounds reward reaction speed", () => {
  const { g, events } = simulate("reaction", (g) =>
    g.t === g.ready + 6 ? [{ type: "tap", x: 300, y: 200 }] : [],
  );
  assert.equal(g.times.length, 5);
  assert.ok(g.times.every((ms) => ms === 200));
  assert.equal(g.score, 400);
  assert.equal(replay("reaction", 123, events, g.t).score, 400);
});
test("basketball: trajectory crosses hoop and awards a basket", () => {
  const { g, events } = simulate("basketball", (g) =>
    !g.flying ? [{ type: "throw", x: 54, y: -108 }] : [],
  );
  assert.ok(g.score > 0);
  assert.equal(replay("basketball", 123, events, g.t).score, g.score);
});
test("catcher: catching coins scores, replay agrees", () => {
  const { g, events } = simulate("catcher", (g) => {
    const coin = g.drops.filter(
      (d) => d.type !== "bomb" && d.y > 300 && d.y < 340,
    )[0];
    return coin ? [{ type: "move", x: coin.x, y: 360 }] : [];
  });
  assert.ok(g.score > 0);
  assert.equal(replay("catcher", 123, events, g.t).score, g.score);
});
test("reward is capped", () => {
  assert.equal(baseReward(90000), 600);
  assert.equal(baseReward(-100), 0);
  assert.equal(baseReward(123.9), 123);
});
test("reject incomplete, unordered, oversized and forged logs", () => {
  assert.throws(() => replay("target", 1, [], 20), /beendet/);
  assert.throws(() => replay("target", 1, [], 999999));
  assert.throws(() => replay("target", 1, Array(6001).fill({}), 900));
  assert.throws(() =>
    replay(
      "target",
      1,
      [
        { tick: 2, type: "tap", x: 2, y: 2 },
        { tick: 1, type: "tap", x: 2, y: 2 },
      ],
      900,
    ),
  );
  assert.throws(() =>
    replay("target", 1, [{ tick: 0, type: "tap", x: Infinity, y: 0 }], 900),
  );
  assert.throws(() =>
    replay("target", 1, [{ tick: 0, type: "score", x: 999, y: 0 }], 900),
  );
  assert.throws(() => replay("fake", 1, [], 900));
});
