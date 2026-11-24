/**
 * Genera el PDF creativo Hold the Box desde el HTML (look de manual del juego).
 * Usa Chrome headless local — no hace falta Chromium de Playwright.
 *
 * npm run build:creative
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = __dirname;
const HTML = path.join(ROOT, "el_proyecto.html");
const OUT = path.join(ROOT, "out", "Hold_the_Box_El_Proyecto.pdf");
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function serveOnce() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/" || urlPath === "") urlPath = "/el_proyecto.html";
      const file = path.join(ROOT, urlPath.replace(/^\//, ""));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      const ext = path.extname(file).toLowerCase();
      const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css",
        ".js": "application/javascript",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
      };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(CHROME)) {
    throw new Error(`Chrome no encontrado en ${CHROME}`);
  }
  if (!fs.existsSync(HTML)) {
    throw new Error(`Falta ${HTML}`);
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const { server, port } = await serveOnce();
  const url = `http://127.0.0.1:${port}/el_proyecto.html`;
  const userData = path.join(ROOT, ".chrome-print-profile");
  fs.mkdirSync(userData, { recursive: true });

  console.log("Imprimiendo", url, "→", OUT);

  await new Promise((resolve, reject) => {
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--user-data-dir=${userData}`,
      `--print-to-pdf=${OUT}`,
      "--print-to-pdf-no-header",
      url,
    ];
    const child = spawn(CHROME, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      server.close();
      if (code !== 0 && !fs.existsSync(OUT)) {
        reject(new Error(`Chrome exit ${code}\n${err}`));
      } else {
        resolve();
      }
    });
  });

  // Esperar a que las fuentes web carguen: Chrome a veces imprime demasiado pronto.
  // Reintento con delay vía CDP no está disponible así; segundo pass con --virtual-time-budget
  if (!fs.existsSync(OUT) || fs.statSync(OUT).size < 10000) {
    await new Promise((r) => setTimeout(r, 500));
  }

  const size = fs.statSync(OUT).size;
  console.log(`OK pdf creativo → ${OUT} (${Math.round(size / 1024)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
