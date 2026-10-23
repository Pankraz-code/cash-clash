export function basketball() {
  return {
    ball: { x: 150, y: 335, vx: 0, vy: 0 },
    flying: false,
    combo: 0,
    hit: false,
    input(a, g) {
      if (a.type === "throw" && !g.flying) {
        g.ball.vx = Math.max(2, Math.min(14, a.x / 9));
        g.ball.vy = Math.max(-17, Math.min(-3, a.y / 9));
        g.flying = true;
        g.hit = false;
      }
    },
    update(g) {
      if (g.flying) {
        const b = g.ball,
          old = b.y;
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.32;
        if (
          !g.hit &&
          b.vy > 0 &&
          old < 155 &&
          b.y >= 155 &&
          b.x > 438 &&
          b.x < 512
        ) {
          g.combo++;
          g.score += 30 + Math.min(30, g.combo * 5);
          g.hit = true;
        }
        if (b.y > 420 || b.x > 650) {
          if (!g.hit) g.combo = 0;
          g.flying = false;
          g.ball = { x: 150, y: 335, vx: 0, vy: 0 };
        }
      }
      if (g.t >= 1349) g.done = true;
    },
    draw(c, g) {
      c.fillStyle = "#657295";
      c.fillRect(520, 70, 7, 120);
      c.fillStyle = "#fc9868";
      c.fillRect(435, 153, 85, 5);
      c.strokeStyle = "#ced1e4";
      c.beginPath();
      c.moveTo(442, 160);
      c.lineTo(455, 202);
      c.lineTo(499, 202);
      c.lineTo(512, 160);
      c.stroke();
      c.fillStyle = "#ff9e54";
      c.beginPath();
      c.arc(g.ball.x, g.ball.y, 17, 0, 7);
      c.fill();
      c.fillStyle = "#b4adc8";
      c.font = "16px system-ui";
      c.textAlign = "center";
      c.fillText(`Combo ×${g.combo}`, 300, 35);
    },
  };
}
