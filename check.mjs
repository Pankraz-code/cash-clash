import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
for (const dir of [".", "games", "scripts", "tests"])
  for (const f of readdirSync(dir))
    if (/\.(js|mjs)$/.test(f))
      execFileSync(process.execPath, ["--check", `${dir}/${f}`], {
        stdio: "inherit",
      });
console.log("JavaScript syntax OK");
