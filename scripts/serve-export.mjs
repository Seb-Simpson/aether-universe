// Serve only exported files at the exact Pages mount; no SPA/Next-server fallback.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("out");
const mount = "/aether-universe";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (path === mount) {
      res.writeHead(308, { Location: `${mount}/` });
      res.end();
      return;
    }
    if (!path.startsWith(`${mount}/`)) throw new Error("Outside mount");
    let file = resolve(root, path.slice(mount.length + 1));
    if (file !== root && !file.startsWith(root + sep))
      throw new Error("Outside export");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}).listen(Number(process.env.PORT ?? 3000), "0.0.0.0", () =>
  console.log(
    `Static export: http://localhost:${process.env.PORT ?? 3000}${mount}/`,
  ),
);
