import { ArenaAPI, upgradePrice, wheelLabels } from "./api.js";
import { definitions, createGame } from "./games/engine.js";
const $ = (s) => document.querySelector(s),
  api = new ArenaAPI(),
  fmt = (n) => new Intl.NumberFormat("de-DE").format(n),
  multi = (p) => (1 + (p?.level || 0) / 10).toFixed(1).replace(".", ","),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let ready = false,
  busy = false,
  sound = false,
  audio,
  selected = null,
  game = null,
  run = null,
  events = [],
  pending = [],
  frame = 0,
  last = 0,
  acc = 0,
  playing = false,
  settling = false,
  spinning = false,
  angle = 0,
  drag = null,
  filter = "all",
  favorites = new Set(JSON.parse(localStorage.getItem("cc-favorites") || "[]"));
const toast = (message) => {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 5500);
};
function beep(freq = 660) {
  if (!sound) return;
  try {
    audio ??= new AudioContext();
    audio.resume();
    const o = audio.createOscillator(),
      gain = audio.createGain();
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    o.connect(gain);
    gain.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.12);
  } catch {}
}
async function action(fn) {
  if (busy) return;
  busy = true;
  try {
    await fn();
  } catch (e) {
    toast(friendly(e));
  } finally {
    busy = false;
    renderControls();
  }
}
function friendly(e) {
  const message =
    e.message || "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  if (/fetch|network/i.test(message))
    return "Verbindung unterbrochen. Prüfe dein Internet und versuche es erneut.";
  return message;
}
function requireRoom() {
  if (!ready) {
    toast("Die Verbindung ist noch nicht bereit.");
    return false;
  }
  if (!api.member) {
    toast("Gib oben deinen Namen ein und erstelle eine Lobby.");
    $("#player-name").focus();
    return false;
  }
  return true;
}
function renderControls() {
  const p = api.member;
  $("#entry").hidden = !!p;
  $("#room-bar").hidden = !p;
  $("#multiplier").textContent = multi(p);
  $("#next-multiplier").textContent =
    multi({ level: (p?.level || 0) + 1 }) + "×";
  $("#upgrade-cost").textContent =
    p?.level >= 30 ? "MAX" : "◈ " + fmt(upgradePrice(p?.level || 0));
  $("#upgrade").disabled =
    busy || !p || p.level >= 30 || p.coins < upgradePrice(p.level);
  $("#balance-label").textContent = p
    ? `Dein Guthaben: ${fmt(p.coins)} Coins`
    : "Betritt eine Lobby, um loszulegen.";
  $("#profile").textContent = p?.name.slice(0, 1).toUpperCase() || "P";
  if (p) $("#copy-code").textContent = api.room.code + " ⧉";
  $("#setup-hint").hidden = !api.local;
  document
    .querySelectorAll(".upgrade-track span")
    .forEach((el, i) =>
      el.classList.toggle("active", i <= (p?.level || 0) % 5),
    );
}
function renderBoard(players) {
  renderControls();
  $("#player-count").textContent =
    players.filter((p) => p.online).length +
    " online · " +
    players.length +
    " Spieler";
  $("#board-status").textContent = api.member
    ? api.local
      ? "LOKAL"
      : "LIVE"
    : "VORSCHAU";
  $("#board-footer").textContent = api.member
    ? `${api.member.games} Spiele · ${fmt(api.member.earned)} Coins erspielt`
    : "Deine nächste Siegesserie beginnt hier.";
  $("#leaderboard").innerHTML = players.length
    ? players
        .map(
          (p, i) =>
            `<tr class="${p.user_id === api.id ? "me" : ""}"><td class="rank">${["🥇", "🥈", "🥉"][i] || String(i + 1).padStart(2, "0")}</td><td><div class="player-cell"><span class="player-avatar">${esc(p.name.slice(0, 1).toUpperCase())}</span><div><span class="player-name">${esc(p.name)}</span>${p.user_id === api.id ? '<span class="you-label">DU</span>' : ""}<small>${!p.online ? "○ Offline" : p.status === "lobby" ? "● In der Lobby" : "▶ Spielt " + esc(definitions.find((d) => d.id === p.status)?.name || "gerade")}</small></div></div></td><td>◈ ${fmt(p.coins)}</td><td>${multi(p)}×</td></tr>`,
        )
        .join("")
    : '<tr><td colspan="4" class="empty-board"><strong>♛</strong>Der erste Platz ist noch frei.<br>Erstelle deine Lobby und starte die Challenge.</td></tr>';
}
function renderGames() {
  const list = definitions.filter(
    (d) => filter === "all" || favorites.has(d.id),
  );
  $("#game-grid").innerHTML =
    list
      .map(
        (d) =>
          `<article class="game-card ${d.color}"><div class="game-art"><span class="game-badge">${d.badge}</span><button class="favorite" data-favorite="${d.id}" aria-label="${d.name} als Favorit markieren" aria-pressed="${favorites.has(d.id)}">${favorites.has(d.id) ? "♥" : "♡"}</button><span class="game-symbol" aria-hidden="true">${d.icon}</span></div><div class="game-body"><h3>${d.name}</h3><p>${d.tagline}</p><div class="game-card-bottom"><span>◈ BIS ZU 600 × BOOST</span><button class="play-button" data-play="${d.id}">Spielen ↗</button></div></div></article>`,
      )
      .join("") || "<p>Noch keine Favoriten. Markiere Spiele mit dem Herz.</p>";
}
$("#game-grid").addEventListener("click", (e) => {
  const fav = e.target.closest("[data-favorite]"),
    play = e.target.closest("[data-play]");
  if (fav) {
    const id = fav.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    localStorage.setItem("cc-favorites", JSON.stringify([...favorites]));
    renderGames();
  }
  if (play && requireRoom()) openGame(play.dataset.play);
});
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      filter = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((el) => el.classList.toggle("selected", el === b));
      renderGames();
    }),
);
$("#player-name").value = sessionStorage.getItem("cc-name") || "";
async function join(code) {
  if (!ready) throw Error("Bitte warte, bis die Verbindung bereit ist.");
  const name = $("#player-name").value.trim();
  if (name.length < 2 || name.length > 20)
    throw Error("Dein Name benötigt 2 bis 20 Zeichen.");
  await api.join(name, code);
  sessionStorage.setItem("cc-name", name);
  toast(
    api.local
      ? "Lokale Übungslobby erstellt. Viel Spaß!"
      : "Du bist in der Lobby! Teile den Raumcode mit deinen Freunden.",
  );
  beep();
}
$("#lobby-form").onsubmit = (e) => {
  e.preventDefault();
  action(() => join(null));
};
$("#join-room").onclick = () =>
  action(async () => {
    const code = $("#room-input").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code))
      throw Error("Bitte gib einen sechsstelligen Raumcode ein.");
    await join(code);
  });
$("#copy-code").onclick = () =>
  action(async () => {
    await navigator.clipboard.writeText(api.room.code);
    toast("Raumcode kopiert.");
  });
$("#leave").onclick = () =>
  action(async () => {
    if (playing || settling || spinning)
      throw Error("Beende zuerst deine aktuelle Aktion.");
    await api.leave();
    toast("Du hast den Raum verlassen.");
  });
$("#upgrade").onclick = () => {
  if (requireRoom())
    action(async () => {
      await api.upgrade();
      toast(`Boost verbessert: ${multi(api.member)}×!`);
      beep(880);
    });
};
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").textContent = sound ? "♪ An" : "♪ Aus";
  $("#sound").setAttribute(
    "aria-label",
    sound ? "Sound ausschalten" : "Sound einschalten",
  );
  beep();
};
function openGame(id) {
  selected = definitions.find((d) => d.id === id);
  $("#game-title").textContent = selected.name;
  $("#intro-icon").textContent = selected.icon;
  $("#game-help").textContent = selected.help;
  $("#play-help").textContent = selected.help;
  $("#game-intro").hidden = false;
  $("#game-play").hidden = true;
  $("#game-result").hidden = true;
  $("#game-dialog").showModal();
}
async function startGame() {
  if (playing || settling) return;
  $("#start-game").disabled = true;
  $("#retry-game").disabled = true;
  try {
    run = await api.start(selected.id);
    run.game = selected.id;
    game = createGame(selected.id, run.seed);
    events = [];
    pending = [];
    playing = true;
    acc = 0;
    last = performance.now();
    $("#game-intro").hidden = true;
    $("#game-result").hidden = true;
    $("#game-play").hidden = false;
    $("#canvas").focus();
    frame = requestAnimationFrame(loop);
  } catch (e) {
    toast(friendly(e));
  } finally {
    $("#start-game").disabled = false;
    $("#retry-game").disabled = false;
  }
}
$("#retry-save").onclick = () => {
  if (!settling) endGame();
};
$("#start-game").onclick = startGame;
$("#retry-game").onclick = startGame;
function enqueue(a) {
  if (playing && pending.length < 30 && events.length < 6000) pending.push(a);
}
function loop(now) {
  if (!playing) return;
  acc += Math.min(500, now - last);
  last = now;
  while (acc >= 1000 / 30 && !game.done) {
    const input = pending.splice(0);
    for (const a of input) events.push({ ...a, tick: game.t });
    const before = game.score;
    game.step(input);
    if (game.score > before) beep(480 + (game.score % 400));
    acc -= 1000 / 30;
  }
  const c = $("#canvas").getContext("2d");
  c.clearRect(0, 0, 600, 400);
  c.strokeStyle = "#ffffff04";
  for (let x = 0; x < 600; x += 25) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 400);
    c.stroke();
  }
  game.draw(c, game);
  if (drag && selected.id === "basketball" && !game.flying) {
    c.strokeStyle = "#ffdb92";
    c.setLineDash([5, 5]);
    c.beginPath();
    c.moveTo(drag.x, drag.y);
    c.lineTo(drag.cx, drag.cy);
    c.stroke();
    c.setLineDash([]);
  }
  $("#game-score").textContent = fmt(game.score) + " Punkte";
  $("#game-time").textContent =
    `${Math.floor(game.t / 1800)}:${String(Math.floor(game.t / 30) % 60).padStart(2, "0")}`;
  if (game.done) endGame();
  else frame = requestAnimationFrame(loop);
}
async function endGame() {
  playing = false;
  settling = true;
  $("#retry-save").hidden = true;
  cancelAnimationFrame(frame);
  $("#close-game").disabled = true;
  $("#game-play").hidden = true;
  $("#game-result").hidden = false;
  $("#result-coins").textContent = "Wird geprüft …";
  $("#result-details").textContent = "Dein Spielverlauf wird ausgewertet.";
  $("#retry-game").disabled = true;
  $("#back-lobby").disabled = true;
  try {
    const result = await api.finish(run, events, game.t, game.score);
    $("#result-coins").textContent = "+" + fmt(result.reward) + " Coins";
    $("#result-details").textContent =
      fmt(result.score) +
      " Punkte · " +
      (api.local
        ? "Lokaler Übungsstand"
        : "Serverseitig geprüft und gespeichert");
    beep(920);
  } catch (e) {
    $("#result-coins").textContent = "Nicht gespeichert";
    $("#result-details").textContent = friendly(e);
    toast("Die Belohnung wurde nicht gutgeschrieben.");
    $("#retry-save").hidden = false;
  } finally {
    settling = false;
    $("#close-game").disabled = false;
    $("#retry-game").disabled = false;
    $("#back-lobby").disabled = false;
    api.status("lobby").catch(() => {});
  }
}
async function closeGame() {
  if (settling) return;
  playing = false;
  cancelAnimationFrame(frame);
  drag = null;
  pending = [];
  $("#game-dialog").close();
  await api.status("lobby").catch((e) => toast(friendly(e)));
}
$("#close-game").onclick = closeGame;
$("#back-lobby").onclick = closeGame;
$("#game-dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeGame();
});
const keyMap = {
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
};
for (const type of ["keydown", "keyup"])
  window.addEventListener(type, (e) => {
    if (!playing || !keyMap[e.key]) return;
    e.preventDefault();
    if (e.repeat) return;
    enqueue({ type: "key", key: keyMap[e.key], down: type === "keydown" });
  });
window.addEventListener("blur", () => {
  for (const key of ["left", "right", "up", "down"])
    enqueue({ type: "key", key, down: false });
});
document.querySelectorAll("[data-key]").forEach((b) => {
  b.onpointerdown = (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    enqueue({ type: "key", key: b.dataset.key, down: true });
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(type, () =>
      enqueue({ type: "key", key: b.dataset.key, down: false }),
    );
});
const canvas = $("#canvas"),
  pos = (e) => {
    const b = canvas.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - b.left) * 600) / b.width),
      y: Math.round(((e.clientY - b.top) * 400) / b.height),
    };
  };
canvas.onpointerdown = (e) => {
  e.preventDefault();
  if (!playing) return;
  canvas.setPointerCapture(e.pointerId);
  const p = pos(e);
  if (selected.id === "basketball") {
    if (!game.flying && Math.hypot(p.x - game.ball.x, p.y - game.ball.y) < 65)
      drag = { ...p, cx: p.x, cy: p.y };
  } else enqueue({ type: "tap", ...p });
};
canvas.onpointermove = (e) => {
  if (!playing) return;
  const p = pos(e);
  if (drag) {
    drag.cx = p.x;
    drag.cy = p.y;
  } else if (["bricks", "catcher"].includes(selected.id))
    enqueue({ type: "move", ...p });
};
canvas.onpointerup = (e) => {
  if (drag) {
    const p = pos(e);
    enqueue({ type: "throw", x: drag.x - p.x, y: drag.y - p.y });
    drag = null;
  }
};
canvas.onpointercancel = () => (drag = null);
$("#open-wheel").onclick = () => {
  if (requireRoom()) $("#wheel-dialog").showModal();
};
$("#close-wheel").onclick = () => {
  if (!spinning) $("#wheel-dialog").close();
};
$("#wheel-dialog").addEventListener("cancel", (e) => {
  if (spinning) e.preventDefault();
});
document
  .querySelectorAll("#wheel span")
  .forEach((el, i) => el.style.setProperty("--angle", 22.5 + i * 45 + "deg"));
$("#spin").onclick = () => {
  if (spinning || !requireRoom()) return;
  spinning = true;
  $("#spin").disabled = true;
  $("#close-wheel").disabled = true;
  (async () => {
    try {
      const result = await api.spin();
      const desired = (360 - (result.index * 45 + 22.5)) % 360;
      angle += 1800 + ((desired - (angle % 360) + 360) % 360);
      $("#wheel").style.transform = `rotate(${angle}deg)`;
      $("#wheel-result").textContent = "Das Rad dreht sich …";
      await new Promise((r) => setTimeout(r, 4100));
      $("#wheel-result").textContent =
        `${wheelLabels[result.index]} → ${result.delta >= 0 ? "+" : ""}${fmt(result.delta)} Coins`;
      beep(720);
      toast("Glücksrad-Ergebnis gespeichert.");
    } catch (e) {
      toast(friendly(e));
    } finally {
      spinning = false;
      $("#close-wheel").disabled = false;
      updateCooldown();
    }
  })();
};
function updateCooldown() {
  const next = api.member?.next_spin;
  const remain = Math.ceil(
    ((typeof next === "string" ? new Date(next).getTime() : Number(next) || 0) -
      Date.now()) /
      1000,
  );
  $("#spin").disabled = spinning || remain > 0;
  $("#spin").textContent =
    remain > 0
      ? `Nächster Dreh in ${Math.floor(remain / 60)}:${String(remain % 60).padStart(2, "0")}`
      : "Kostenlos drehen ↗";
}
setInterval(updateCooldown, 1000);
$("#profile").onclick = () => {
  if (!requireRoom()) return;
  action(async () => {
    const best = await api.best();
    $("#stats-content").innerHTML =
      `<p>${esc(api.member.name)} · ${api.local ? "Lokales Training" : "Diese Lobby"}</p><div class="stats-row"><span>Gespielte Challenges</span><strong>${api.member.games}</strong></div><div class="stats-row"><span>In Minispielen verdient</span><strong>${fmt(api.member.earned)} Coins</strong></div><div class="stats-row"><span>Aktueller Boost</span><strong>${multi(api.member)}×</strong></div>` +
      definitions
        .map(
          (d) =>
            `<div class="stats-row"><span>${d.icon} ${d.name}</span><strong>${fmt(best[d.id] || 0)} Punkte</strong></div>`,
        )
        .join("");
    $("#stats-dialog").showModal();
  });
};
$("#close-stats").onclick = () => $("#stats-dialog").close();
api.onchange = renderBoard;
api.onconnection = (s) => ($("#connection").textContent = s);
renderBoard([]);
renderGames();
api
  .init()
  .then(async () => {
    ready = true;
    $("#connection").textContent = api.room
      ? "● LIVE VERBUNDEN"
      : "● BEREIT FÜR P2P";
    await api.refresh();
  })
  .catch((e) => {
    ready = false;
    $("#connection").textContent = "● VERBINDUNG FEHLGESCHLAGEN";
    toast("PeerJS konnte nicht verbunden werden: " + friendly(e));
  });
