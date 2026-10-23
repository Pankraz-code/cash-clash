export function snake(r) {
  let food = () => ({ x: Math.floor(r() * 24), y: Math.floor(r() * 16) });
  return {
    body: [
      { x: 10, y: 8 },
      { x: 9, y: 8 },
      { x: 8, y: 8 },
    ],
    dir: { x: 1, y: 0 },
    food: food(),
    update(g) {
      if (g.t % 5) return;
      let d = g.dir;
      if (g.keys.up && d.y === 0) d = { x: 0, y: -1 };
      else if (g.keys.down && d.y === 0) d = { x: 0, y: 1 };
      else if (g.keys.left && d.x === 0) d = { x: -1, y: 0 };
      else if (g.keys.right && d.x === 0) d = { x: 1, y: 0 };
      g.dir = d;
      const h = { x: g.body[0].x + d.x, y: g.body[0].y + d.y };
      const eat = h.x === g.food.x && h.y === g.food.y;
      const collision = g.body
        .slice(0, eat ? undefined : -1)
        .some((p) => p.x === h.x && p.y === h.y);
      if (h.x < 0 || h.x >= 24 || h.y < 0 || h.y >= 16 || collision) {
        g.done = true;
        return;
      }
      g.body.unshift(h);
      if (eat) {
        g.score += 30;
        do {
          g.food = food();
        } while (
          g.body.length < 384 &&
          g.body.some((p) => p.x === g.food.x && p.y === g.food.y)
        );
        if (g.body.length === 384) g.done = true;
      } else g.body.pop();
    },
    draw(c, g) {
      c.fillStyle = "#7cf5b2";
      g.body.forEach((p, i) => {
        c.globalAlpha = i ? 0.65 : 1;
        c.fillRect(p.x * 25 + 2, p.y * 25 + 2, 21, 21);
      });
      c.globalAlpha = 1;
      c.fillStyle = "#ff6e9a";
      c.fillRect(g.food.x * 25 + 4, g.food.y * 25 + 4, 17, 17);
    },
  };
}
