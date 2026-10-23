import { baseReward, definitions, replay } from "./engine.js";

export const prices = [500, 800, 1200, 1800, 2600];
export const upgradePrice = (level) =>
  prices[level] ?? Math.ceil((2600 * 1.45 ** (level - 4)) / 100) * 100;
export const wheelLabels = [
  "+100 Coins", "+250 Coins", "+500 Coins", "+1.000 Coins",
  "+10 %", "+25 %", "−10 %", "−25 %",
];
export function wheelDelta(index, coins) {
  return index < 4
    ? [100, 250, 500, 1000][index]
    : Math.trunc(coins * [0.1, 0.25, -0.1, -0.25][index - 4]);
}

const gameIds = new Set(definitions.map((game) => game.id));
const clone = (value) => structuredClone(value);
const randomCode = () =>
  [...crypto.getRandomValues(new Uint8Array(3))]
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
const fail = (message) => { throw Error(message); };

export class ArenaAPI {
  constructor() {
    this.local = false;
    this.member = null;
    this.room = null;
    this.players = [];
    this.pending = new Map();
    this.connections = new Map();
    this.onchange = () => {};
    this.onconnection = () => {};
    this.id = localStorage.getItem("cc-peer-player") || crypto.randomUUID();
    localStorage.setItem("cc-peer-player", this.id);
  }

  async init() {
    const { Peer } = await import(
      "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm"
    );
    this.Peer = Peer;
    this.onconnection("● BEREIT FÜR P2P");
    const saved = JSON.parse(sessionStorage.getItem("cc-p2p-session") || "null");
    if (saved?.code && saved?.name) {
      try {
        if (saved.host) await this.createHost(saved.name, saved.code);
        else await this.joinGuest(saved.name, saved.code);
      } catch {
        sessionStorage.removeItem("cc-p2p-session");
        this.peer?.destroy();
        this.peer = null;
        this.member = null;
        this.room = null;
      }
    }
  }

  openPeer(id) {
    return new Promise((resolve, reject) => {
      const peer = new this.Peer(id, { debug: 1 });
      const timer = setTimeout(() => {
        peer.destroy();
        reject(Error("Der Verbindungsdienst antwortet nicht."));
      }, 12000);
      peer.once("open", () => {
        clearTimeout(timer);
        peer.off("error", reject);
        resolve(peer);
      });
      peer.once("error", (error) => {
        clearTimeout(timer);
        peer.destroy();
        reject(error);
      });
    });
  }

  defaultMember(name, id = this.id) {
    return {
      user_id: id,
      room_id: this.room.code,
      name,
      coins: 1000,
      level: 0,
      status: "lobby",
      games: 0,
      earned: 0,
      active: true,
      next_spin: 0,
    };
  }

  async join(name, code = null) {
    if (this.member) fail("Verlasse zuerst deine aktuelle Lobby.");
    if (code) await this.joinGuest(name, code);
    else await this.createHost(name);
    sessionStorage.setItem("cc-p2p-session", JSON.stringify({ host: this.host, code: this.room.code, name }));
    await this.refresh();
  }

  async createHost(name, restoredCode = null) {
    let lastError;
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = restoredCode || randomCode();
      try {
        this.peer = await this.openPeer(`cash-clash-${code}`);
        this.host = true;
        this.room = { id: code, code };
        const stored = JSON.parse(localStorage.getItem(`cc-room-${code}`) || "null");
        this.state = stored || { members: {}, runs: {}, best: {}, starts: {} };
        this.member = this.defaultMember(name);
        this.state.members[this.id] = this.member;
        this.online = new Set([this.id]);
        this.peer.on("connection", (connection) => this.accept(connection));
        this.peer.on("disconnected", () => this.onconnection("● SIGNALDIENST GETRENNT"));
        this.peer.on("error", () => this.onconnection("● VERBINDUNG PRÜFEN"));
        this.saveHost();
        this.publish();
        this.onconnection("● LIVE VERBUNDEN");
        return;
      } catch (error) {
        lastError = error;
        if (error?.type !== "unavailable-id") break;
        if (restoredCode) {
          // A page reload can leave the old signalling socket alive briefly.
          // Retry the same room ID so the lobby and its local state survive.
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }
    }
    throw Error(lastError?.type === "unavailable-id"
      ? "Es konnte kein freier Raumcode erzeugt werden. Bitte erneut versuchen."
      : "Der kostenlose Verbindungsdienst ist gerade nicht erreichbar.");
  }

  async joinGuest(name, code) {
    this.peer = await this.openPeer();
    this.host = false;
    this.room = { id: code, code };
    this.connection = this.peer.connect(`cash-clash-${code}`, { reliable: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error("Dieser Raum wurde nicht gefunden.")), 12000);
      this.connection.once("open", () => { clearTimeout(timer); resolve(); });
      this.connection.once("error", () => { clearTimeout(timer); reject(Error("Verbindung zur Lobby fehlgeschlagen.")); });
    });
    this.bindGuest(this.connection);
    const result = await this.remote("join", { name, playerId: this.id });
    this.member = result.member;
    this.onconnection("● LIVE VERBUNDEN");
  }

  bindGuest(connection) {
    connection.on("data", (message) => {
      if (!message || typeof message !== "object") return;
      if (message.type === "response") {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        message.error ? pending.reject(Error(message.error)) : pending.resolve(message.result);
      } else if (message.type === "state") {
        this.players = message.players;
        const me = this.players.find((player) => player.user_id === this.id);
        if (me) this.member = me;
        this.refresh();
      } else if (message.type === "closed") {
        this.onconnection("● LOBBY WURDE GESCHLOSSEN");
      }
    });
    connection.on("close", () => this.onconnection("● LOBBY-VERBINDUNG GETRENNT"));
    connection.on("error", () => this.onconnection("● VERBINDUNG PRÜFEN"));
  }

  accept(connection) {
    connection.on("data", async (message) => {
      if (message?.type !== "request" || typeof message.id !== "string") return;
      try {
        if (!connection.playerId && message.action !== "join") fail("Bitte tritt der Lobby erneut bei.");
        const playerId = connection.playerId || message.args?.playerId;
        const result = this.handle(message.action, message.args || {}, playerId);
        if (message.action === "join") {
          connection.playerId = playerId;
          this.connections.set(playerId, connection);
          this.online.add(playerId);
          connection.on("close", () => {
            this.connections.delete(playerId);
            this.online.delete(playerId);
            this.publish();
          });
        }
        this.saveHost();
        this.publish();
        // State is sent first on the same reliable connection so guest UI and
        // toasts already see the authoritative member values on resolution.
        connection.send({ type: "response", id: message.id, result: clone(result) });
      } catch (error) {
        connection.send({ type: "response", id: message.id, error: error.message });
      }
    });
  }

  remote(action, args = {}) {
    if (this.host) return Promise.resolve(this.handle(action, args, this.id));
    if (!this.connection?.open) return Promise.reject(Error("Die Lobby-Verbindung ist getrennt."));
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error("Die Lobby antwortet nicht."));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.connection.send({ type: "request", id, action, args });
    });
  }

  memberFor(playerId) {
    const member = this.state.members[playerId];
    if (!member?.active) fail("Betritt zuerst eine Lobby.");
    return member;
  }

  handle(action, args, playerId) {
    const now = Date.now();
    if (action === "join") {
      const name = typeof args.name === "string" ? args.name.trim() : "";
      if (!/^[\s\S]{2,20}$/.test(name) || /[\x00-\x1f\x7f]/.test(name)) fail("Bitte wähle einen Namen mit 2 bis 20 Zeichen.");
      if (Object.values(this.state.members).filter((member) => member.active).length >= 30 && !this.state.members[playerId]?.active) fail("Dieser Raum ist voll (30 Spieler).");
      if (Object.values(this.state.members).some((member) => member.active && member.user_id !== playerId && member.name.toLowerCase() === name.toLowerCase())) fail("Dieser Name ist in der Lobby schon vergeben.");
      const member = this.state.members[playerId] || this.defaultMember(name, playerId);
      Object.assign(member, { name, active: true, status: "lobby" });
      this.state.members[playerId] = member;
      return { member };
    }
    const member = this.memberFor(playerId);
    if (action === "leave") {
      member.active = false;
      member.status = "lobby";
      delete this.state.runs[playerId];
      return {};
    }
    if (action === "status") {
      if (args.status !== "lobby" && !gameIds.has(args.status)) fail("Ungültiger Status.");
      member.status = args.status;
      return {};
    }
    if (action === "upgrade") {
      if (member.level >= 30) fail("Maximaler Boost erreicht.");
      const cost = upgradePrice(member.level);
      if (member.coins < cost) fail("Dafür fehlen dir noch Coins.");
      member.coins -= cost;
      member.level++;
      return {};
    }
    if (action === "spin") {
      if (member.next_spin > now) fail("Dein nächster Dreh ist noch nicht bereit.");
      const index = crypto.getRandomValues(new Uint8Array(1))[0] % 8;
      const delta = Math.min(wheelDelta(index, member.coins), 1_000_000_000 - member.coins);
      member.coins = Math.max(0, member.coins + delta);
      member.next_spin = now + 180000;
      return { index, delta };
    }
    if (action === "start") {
      if (!gameIds.has(args.game)) fail("Unbekanntes Spiel.");
      const starts = (this.state.starts[playerId] || []).filter((time) => time > now - 3600000);
      if (starts.some((time) => time > now - 5000)) fail("Bitte warte 5 Sekunden zwischen Spielstarts.");
      if (starts.length >= 120) fail("Stundenlimit erreicht. Zeit für eine Pause.");
      starts.push(now);
      this.state.starts[playerId] = starts;
      const run = {
        id: crypto.randomUUID(),
        seed: crypto.getRandomValues(new Uint32Array(1))[0],
        game: args.game,
        started_at: now,
        level: member.level,
      };
      this.state.runs[playerId] = run;
      member.status = args.game;
      return { id: run.id, seed: run.seed, game: run.game };
    }
    if (action === "finish") {
      const run = this.state.runs[playerId];
      if (!run || args.run_id !== run.id) fail("Spiel nicht gefunden oder durch einen neuen Start ersetzt.");
      if (run.finished_at) return { score: run.score, reward: run.reward };
      const elapsed = now - run.started_at;
      if (elapsed < 0 || elapsed > 600000 || args.ticks > elapsed / 1000 * 30 + 30) fail("Ungültige Spieldauer.");
      let result;
      try { result = replay(run.game, run.seed, args.events, args.ticks); }
      catch { fail("Ungültiger oder unvollständiger Spielverlauf."); }
      const reward = Math.min(
        Math.floor(baseReward(result.score) * (1 + run.level / 10)),
        1_000_000_000 - member.coins,
      );
      Object.assign(run, { finished_at: now, score: result.score, reward });
      member.coins += reward;
      member.games++;
      member.earned += reward;
      member.status = "lobby";
      this.state.best[playerId] ||= {};
      this.state.best[playerId][run.game] = Math.max(this.state.best[playerId][run.game] || 0, result.score);
      return { score: result.score, reward };
    }
    if (action === "best") return this.state.best[playerId] || {};
    fail("Unbekannte Aktion.");
  }

  saveHost() {
    if (this.host && this.room) localStorage.setItem(`cc-room-${this.room.code}`, JSON.stringify(this.state));
  }

  publish() {
    if (!this.host) return;
    this.players = Object.values(this.state.members)
      .filter((member) => member.active)
      .map((member) => ({ ...member, online: this.online.has(member.user_id) }))
      .sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name));
    const message = { type: "state", players: clone(this.players) };
    for (const connection of this.connections.values()) if (connection.open) connection.send(message);
    const me = this.players.find((player) => player.user_id === this.id);
    if (me) this.member = me;
    this.onchange(this.players);
  }

  async refresh() {
    if (!this.room) this.onchange([]);
    else if (this.host) this.publish();
    else this.onchange(this.players);
  }

  async leave() {
    if (!this.member) return;
    if (this.host) {
      this.handle("leave", {}, this.id);
      for (const connection of this.connections.values()) if (connection.open) connection.send({ type: "closed" });
      this.saveHost();
    } else {
      await this.remote("leave").catch(() => {});
    }
    this.connection?.close();
    this.peer?.destroy();
    this.pending.clear();
    this.connections.clear();
    sessionStorage.removeItem("cc-p2p-session");
    this.member = null;
    this.room = null;
    this.players = [];
    this.onchange([]);
    this.onconnection("● BEREIT FÜR P2P");
  }

  async status(status) {
    if (!this.member) return;
    await this.remote("status", { status });
    if (this.host) { this.saveHost(); this.publish(); }
  }

  async upgrade() {
    await this.remote("upgrade");
    if (this.host) { this.saveHost(); this.publish(); }
  }

  async start(game) {
    const result = await this.remote("start", { game });
    if (this.host) { this.saveHost(); this.publish(); }
    return result;
  }

  async finish(run, events, ticks) {
    const result = await this.remote("finish", { run_id: run.id, events, ticks });
    if (this.host) { this.saveHost(); this.publish(); }
    return result;
  }

  async spin() {
    const result = await this.remote("spin");
    if (this.host) { this.saveHost(); this.publish(); }
    return result;
  }

  async best() {
    return this.remote("best");
  }
}
