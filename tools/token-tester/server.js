// Minimal local harness for checking the HF22 private-token flow by hand.
//
//   node tools/token-tester/server.js [--lws http://host:port] [--port 8088]
//   then open http://localhost:8088
//
// It serves the page plus the built WASM module, and proxies /lws/* through to
// the light wallet server. The proxy is the point: the LWS sends no CORS
// headers, so a browser cannot call it directly.
//
// Nothing is broadcast unless you tick "broadcast" in the page.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const args = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = args.indexOf("--" + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const LWS = new URL(argOf("lws", "http://161.97.158.125:8443"));
const PORT = parseInt(argOf("port", "8088"), 10);
const ROOT = path.resolve(__dirname, "../..");

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".wasm": "application/wasm" };

const serve = (res, file) => {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found: " + file); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
};

http.createServer((req, res) => {
  if (req.url.startsWith("/lws/")) {
    let body = "";
    req.on("data", c => (body += c));
    req.on("end", () => {
      const p = http.request(
        { hostname: LWS.hostname, port: LWS.port, path: "/" + req.url.slice(5), method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
        r => {
          let out = "";
          r.on("data", c => (out += c));
          r.on("end", () => {
            res.writeHead(200, { "Content-Type": "application/json" });
            // An empty body means the LWS rejected the request shape; say so
            // rather than handing the page unparseable JSON.
            res.end(out || JSON.stringify({ err_msg: "empty response from LWS (" + r.statusCode + ")" }));
          });
        }
      );
      p.on("error", e => { res.writeHead(200, {"Content-Type":"application/json"});
                           res.end(JSON.stringify({ err_msg: "proxy: " + e.message })); });
      p.write(body); p.end();
    });
    return;
  }
  if (req.url === "/" || req.url === "/index.html") return serve(res, path.join(__dirname, "index.html"));
  if (req.url.startsWith("/libapp_js/")) return serve(res, path.join(ROOT, req.url));
  res.writeHead(404); res.end("not found");
}).listen(PORT, () => {
  console.log("token tester on http://localhost:" + PORT);
  console.log("proxying to " + LWS.origin);
});
