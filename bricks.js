export function bricks() {
  return {
    x: 300,
    bx: 300,
    by: 310,
    vx: 4,
    vy: -5,
    blocks: Array.from({ length: 40 }, (_, i) => ({
      x: 35 + (i % 8) * 67,
      y: 45 + Math.floor(i / 8) * 27,
      on: true,
    })),
    input(a, g) {
      if (a.type === "move" || a.type === "tap")
        g.x = Math.max(48, Math.min(552, a.x));
    },
    update(g) {
      g.x = Math.max(
        48,
        Math.min(
          552,
          g.x + ((g.keys.right ? 1 : 0) - (g.keys.left ? 1 : 0)) * 9,
        ),
      );
      g.bx += g.vx;
      g.by += g.vy;
      if (g.bx < 7 || g.bx > 593) g.vx *= -1;
      if (g.by < 7) g.vy = Math.abs(g.vy);
      if (g.vy > 0 && g.by >= 354 && g.by < 369 && Math.abs(g.bx - g.x) < 55) {
        g.vy = -Math.abs(g.vy);
        g.vx = (g.bx - g.x) / 10;
      }
      for (const b of g.blocks)
        if (
          b.on &&
          g.bx > b.x - 7 &&
          g.bx < b.x + 67 &&
          g.by > b.y - 7 &&
          g.by < b.y + 24
        ) {
          b.on = false;
          g.score += 10;
          g.vy *= -1;
          break;
        }
      if (g.by > 410) g.done = true;
      if (g.blocks.every((b) => !b.on)) {
        g.score += 200;
        g.done = true;
      }
    },
    draw(c, g) {
      g.blocks.forEach((b, i) => {
        if (b.on) {
          c.fillStyle = ["#9776ff", "#5ce5dc", "#f5bb64", "#f27dac", "#7999ff"][
            Math.floor(i / 8)
          ];
          c.fillRect(b.x, b.y, 60, 20);
        }
      });
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(g.bx, g.by, 7, 0, 7);
      c.fill();
      c.fillStyle = "#8c7fff";
      c.fillRect(g.x - 48, 365, 96, 10);
    },
  };
}
