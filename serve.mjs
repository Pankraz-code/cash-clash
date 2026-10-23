import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd(),
  types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
  };
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const p = path.resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
      );
      if (
        !p.startsWith(root + path.sep) ||
        ![".html", ".js", ".css"].includes(path.extname(p)) ||
        p.includes(path.sep + "netlify" + path.sep)
      )
        throw Error();
      res.setHeader("Content-Type", types[path.extname(p)]);
      res.end(await readFile(p));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
