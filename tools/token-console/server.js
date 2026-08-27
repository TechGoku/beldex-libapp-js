// Dev server for the token console.
//
// Two jobs: serve the page, and proxy /lws/* to the light wallet server. The
// proxy is not optional -- the LWS sends no CORS headers, so a browser refuses
// every direct call to it.
//
//   node tools/token-console/server.js [--lws host:port] [--port 8080]
//
// The WASM module is served from ../../libapp_js.

const http = require("http");
const fs   = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const [LWS_HOST, LWS_PORT] = argOf("--lws", "161.97.158.125:8443").split(":");
const PORT = parseInt(argOf("--port", "8080"), 10);

const ROOT     = __dirname;
const WASM_DIR = path.resolve(__dirname, "..", "..", "libapp_js");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".map":  "application/json",
  ".json": "application/json",
};

const send = (res, code, body, type) => {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
};

const serveFile = (res, file) => {
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "not found: " + path.basename(file));
    send(res, 200, buf, TYPES[path.extname(file)] || "application/octet-stream");
  });
};

http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  // ---- LWS proxy -----------------------------------------------------------
  if (url.startsWith("/lws/")) {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      const upstream = http.request(
        {
          host: LWS_HOST,
          port: LWS_PORT,
          path: "/" + url.slice(5),
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        up => {
          let out = "";
          up.on("data", c => (out += c));
          // Pass the upstream status through untouched. A rejected broadcast
          // arrives as a bare 500 with no body, and flattening that to 200
          // would hide the only signal the page gets.
          up.on("end", () => send(res, up.statusCode, out, "application/json"));
        }
      );
      upstream.on("error", e =>
        send(res, 502, JSON.stringify({ error: "lws unreachable: " + e.message }), "application/json")
      );
      upstream.setTimeout(30000, () => {
        upstream.destroy();
        send(res, 504, JSON.stringify({ error: "lws timeout" }), "application/json");
      });
      upstream.write(body);
      upstream.end();
    });
    return;
  }

  // ---- static --------------------------------------------------------------
  if (url === "/" || url === "/index.html") return serveFile(res, path.join(ROOT, "index.html"));
  if (url.startsWith("/wasm/"))             return serveFile(res, path.join(WASM_DIR, path.basename(url)));
  return send(res, 404, "not found");
}).listen(PORT, () => {
  console.log(`token console   http://localhost:${PORT}`);
  console.log(`proxying /lws/* http://${LWS_HOST}:${LWS_PORT}`);
  console.log(`wasm from       ${WASM_DIR}`);
});
