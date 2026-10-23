export function catcher(r) {
  return {
    x: 300,
    drops: [],
    input(a, g) {
      if (a.type === "move" || a.type === "tap")
        g.x = Math.max(25, Math.min(575, a.x));
    },
    update(g) {
      g.x = Math.max(
        25,
        Math.min(
          575,
          g.x + ((g.keys.right ? 1 : 0) - (g.keys.left ? 1 : 0)) * 8,
        ),
      );
      if (g.t % 13 === 0)
        g.drops.push({
          x: 25 + r() * 550,
          y: -20,
          type: r() < 0.24 ? "bomb" : r() < 0.2 ? "gold" : "coin",
        });
      for (const d of g.drops) {
        d.y += 4 + g.t / 650;
        if (d.y > 340 && d.y < 380 && Math.abs(d.x - g.x) < 36) {
          g.score += d.type === "bomb" ? -35 : d.type === "gold" ? 25 : 8;
          d.y = 500;
        }
      }
      g.drops = g.drops.filter((d) => d.y < 430);
      if (g.t >= 1349) g.done = true;
    },
    draw(c, g) {
      for (const d of g.drops) {
        c.fillStyle =
          d.type === "bomb"
            ? "#ff6384"
            : d.type === "gold"
              ? "#fff0a1"
              : "#f6c85c";
        c.beginPath();
        c.arc(d.x, d.y, d.type === "gold" ? 13 : 10, 0, 7);
        c.fill();
      }
      c.fillStyle = "#72e4dd";
      c.fillRect(g.x - 30, 360, 60, 15);
      c.fillRect(g.x - 24, 375, 48, 14);
    },
  };
}
