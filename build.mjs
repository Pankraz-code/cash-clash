import { mkdir, copyFile, cp, rm } from "node:fs/promises";
await rm("public", { recursive: true, force: true });
await mkdir("public");
for (const f of ["index.html", "style.css", "app.js", "config.js", "api.js"])
  await copyFile(f, `public/${f}`);
await cp("games", "public/games", { recursive: true });
