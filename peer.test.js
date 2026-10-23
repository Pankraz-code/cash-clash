import test from "node:test";
import assert from "node:assert/strict";
import { ArenaAPI } from "../api.js";
import { createGame } from "../games/engine.js";

function host() {
  const oldLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
  };
  const api = new ArenaAPI();
  globalThis.localStorage = oldLocalStorage;
  api.id = "host";
  api.host = true;
  api.room = { id: "ABC123", code: "ABC123" };
  api.state = { members: {}, runs: {}, best: {}, starts: {} };
  api.online = new Set(["host"]);
  api.member = api.defaultMember("Host", "host");
  api.state.members.host = api.member;
  return api;
}

test("host validates joins, names, room size and purchases", () => {
  const api = host();
  assert.equal(api.handle("join", { name: "Gast" }, "guest").member.coins, 1000);
  assert.throws(() => api.handle("join", { name: "GAST" }, "other"), /vergeben/);
  api.handle("upgrade", {}, "guest");
  assert.equal(api.state.members.guest.coins, 500);
  assert.equal(api.state.members.guest.level, 1);
  assert.throws(() => api.handle("upgrade", {}, "guest"), /fehlen/);
  for (let i = 2; i < 30; i++) api.handle("join", { name: `Player${i}` }, `p${i}`);
  assert.throws(() => api.handle("join", { name: "Overflow" }, "full"), /voll/);
});

test("wheel cooldown and leaving are host-authoritative", () => {
  const api = host();
  const result = api.handle("spin", {}, "host");
  assert.ok(result.index >= 0 && result.index < 8);
  assert.throws(() => api.handle("spin", {}, "host"), /bereit/);
  api.handle("leave", {}, "host");
  assert.throws(() => api.handle("upgrade", {}, "host"), /Lobby/);
});

test("host replays games and a repeated result pays only once", () => {
  const api = host();
  const run = api.handle("start", { game: "target" }, "host");
  const game = createGame("target", run.seed), events = [];
  while (!game.done) {
    const actions = game.t % 10 === 0 ? [{ type: "tap", x: game.x, y: game.y }] : [];
    events.push(...actions.map((action) => ({ ...action, tick: game.t })));
    game.step(actions);
  }
  api.state.runs.host.started_at -= 31000;
  const args = { run_id: run.id, ticks: game.t, events, score: 999999 };
  const first = api.handle("finish", args, "host");
  const second = api.handle("finish", args, "host");
  assert.deepEqual(second, first);
  assert.equal(first.score, game.score);
  assert.equal(api.member.games, 1);
  assert.equal(api.member.coins, 1000 + first.reward);
  assert.equal(api.handle("best", {}, "host").target, game.score);
});
