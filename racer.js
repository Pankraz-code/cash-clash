export function racer(r) {
  return {
    x: 300,
    obstacles: [],
    update(g) {
      g.x = Math.max(
        130,
        Math.min(
          470,
          g.x + ((g.keys.right ? 1 : 0) - (g.keys.left ? 1 : 0)) * 7,
        ),
      );
      if (g.t % Math.max(12, 35 - Math.floor(g.t / 100)) === 0)
        g.obstacles.push({ x: 150 + Math.floor(r() * 4) * 100, y: -50 });
      for (const o of g.obstacles) {
        o.y += 4 + g.t / 220;
        if (Math.abs(g.x - o.x) < 33 && Math.abs(335 - o.y) < 40) g.done = true;
      }
      g.obstacles = g.obstacles.filter((o) => o.y < 460);
      g.score = Math.floor(g.t / 4);
    },
    draw(c, g) {
      c.fillStyle = "#20243e";
      c.fillRect(100, 0, 400, 400);
      c.strokeStyle = "#6c7493";
      c.setLineDash([20, 20]);
      for (let x = 200; x < 500; x += 100) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, 400);
        c.stroke();
      }
      c.setLineDash([]);
      c.fillStyle = "#fd718d";
      for (const o of g.obstacles) c.fillRect(o.x - 22, o.y - 30, 44, 60);
      c.fillStyle = "#6de5ff";
      c.fillRect(g.x - 19, 305, 38, 60);
      c.fillStyle = "#152238";
      c.fillRect(g.x - 13, 315, 26, 15);
    },
  };
}
