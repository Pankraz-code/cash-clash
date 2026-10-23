export function target(r) {
  return {
    x: 100 + r() * 400,
    y: 80 + r() * 220,
    life: 0,
    input(a, g) {
      if (a.type === "tap" && g.t - g.life > 4) {
        const d = Math.hypot(a.x - g.x, a.y - g.y);
        if (d < 32) {
          g.score += Math.round(8 + (32 - d) / 2);
          g.x = 40 + r() * 520;
          g.y = 50 + r() * 290;
          g.life = g.t;
        }
      }
    },
    update(g) {
      g.x = Math.max(34, Math.min(566, g.x + Math.sin(g.t / 12) * 2));
      g.y = Math.max(50, Math.min(350, g.y + Math.cos(g.t / 19)));
      if (g.t >= 899) g.done = true;
    },
    draw(c, g) {
      for (const [rr, col] of [
        [32, "#fa6093"],
        [21, "#fff"],
        [10, "#ff356f"],
      ]) {
        c.beginPath();
        c.arc(g.x, g.y, rr, 0, 7);
        c.fillStyle = col;
        c.fill();
      }
    },
  };
}
