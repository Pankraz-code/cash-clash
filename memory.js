export function memory(r) {
  const cards = Array.from({ length: 16 }, (_, i) => i % 8);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return {
    cards,
    open: [],
    matched: [],
    hide: 0,
    tries: 0,
    input(a, g) {
      if (a.type !== "tap" || g.hide > g.t) return;
      const col = Math.floor((a.x - 105) / 100),
        row = Math.floor((a.y - 20) / 90);
      if (col < 0 || col > 3 || row < 0 || row > 3) return;
      const i = row * 4 + col;
      if (g.open.includes(i) || g.matched.includes(i)) return;
      g.open.push(i);
      if (g.open.length === 2) {
        g.tries++;
        if (cards[g.open[0]] === cards[g.open[1]]) {
          g.matched.push(...g.open);
          g.open = [];
          g.score += 35;
          if (g.matched.length === 16) {
            g.score += Math.max(0, 200 - g.tries * 4 - Math.floor(g.t / 30));
            g.done = true;
          }
        } else g.hide = g.t + 22;
      }
    },
    update(g) {
      if (g.hide && g.t >= g.hide) {
        g.open = [];
        g.hide = 0;
      }
    },
    draw(c, g) {
      g.cards.forEach((v, i) => {
        const x = 105 + (i % 4) * 100,
          y = 20 + Math.floor(i / 4) * 90;
        const show = g.matched.includes(i) || g.open.includes(i);
        c.fillStyle = show ? "#514087" : "#26263e";
        c.fillRect(x, y, 90, 80);
        c.fillStyle = "#fff";
        c.font = "30px system-ui";
        c.textAlign = "center";
        c.fillText(
          show ? ["◆", "★", "●", "♥", "☀", "♣", "▲", "✿"][v] : "?",
          x + 45,
          y + 51,
        );
      });
    },
  };
}
