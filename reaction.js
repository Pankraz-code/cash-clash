export function reaction(r) {
  return {
    round: 0,
    ready: 45 + Math.floor(r() * 90),
    times: [],
    feedback: "Warte auf Grün …",
    input(a, g) {
      if (a.type !== "tap" || g.t < g.next) return;
      if (g.t < g.ready) {
        g.times.push(1000);
        g.feedback = "Zu früh!";
      } else {
        const ms = Math.round(((g.t - g.ready) * 1000) / 30);
        g.times.push(ms);
        g.score += Math.max(0, 120 - Math.floor(ms / 5));
        g.feedback = `${ms} ms`;
      }
      g.round++;
      g.next = g.t + 25;
      g.ready = g.t + 60 + Math.floor(r() * 90);
      if (g.round === 5) g.done = true;
    },
    next: 0,
    update(g) {
      if (g.t - g.ready > 150) {
        g.input({ type: "tap" }, g);
      }
    },
    draw(c, g) {
      c.fillStyle = g.t >= g.ready ? "#41dcab" : "#30234a";
      c.fillRect(65, 80, 470, 240);
      c.fillStyle = "#fff";
      c.textAlign = "center";
      c.font = "bold 32px system-ui";
      c.fillText(g.t >= g.ready ? "JETZT TIPPEN!" : g.feedback, 300, 205);
      c.font = "18px system-ui";
      c.fillText(`Runde ${Math.min(5, g.round + 1)} / 5`, 300, 255);
    },
  };
}
