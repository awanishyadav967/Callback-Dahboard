const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_LOGS = 100;
const ignoredLogPaths = new Set(["/api/logs", "/api/status"]);

const logs = [];

app.set("trust proxy", true);

// Capture useful request metadata for authorized callback testing.
app.use((req, res, next) => {
  if (!ignoredLogPaths.has(req.path)) {
    logs.unshift({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.get("user-agent") || "",
      referer: req.get("referer") || req.get("referrer") || ""
    });

    if (logs.length > MAX_LOGS) {
      logs.length = MAX_LOGS;
    }
  }

  next();
});

// Serve the static dashboard after logging so visits to / are captured.
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    uptimeSeconds: Math.round(process.uptime()),
    logCount: logs.length,
    maxLogs: MAX_LOGS
  });
});

app.get("/api/logs", (req, res) => {
  res.json({ logs });
});

app.delete("/api/logs", (req, res) => {
  logs.length = 0;
  res.json({ ok: true, logsCleared: true });
});

app.get("/ping", (req, res) => {
  res.type("text/plain").send("pong");
});

app.get("/track/:testId", (req, res) => {
  res.json({
    ok: true,
    message: "Authorized test callback received.",
    testId: req.params.testId,
    timestamp: new Date().toISOString()
  });
});

app.get("/poc.js", (req, res) => {
  res.type("application/javascript").send(`(() => {
  "use strict";

  console.log("Authorized Security PoC Executed");

  const bannerId = "authorized-security-poc-banner";
  if (document.getElementById(bannerId)) {
    return;
  }

  const banner = document.createElement("div");
  banner.id = bannerId;
  banner.textContent = "CSP PoC Executed — Authorized Security Test";
  banner.setAttribute("role", "status");
  banner.style.cssText = [
    "position:fixed",
    "top:16px",
    "left:50%",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "max-width:calc(100vw - 32px)",
    "padding:12px 16px",
    "border-radius:8px",
    "background:#111827",
    "color:#ffffff",
    "font:600 14px/1.4 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
    "box-shadow:0 12px 30px rgba(0,0,0,.24)",
    "text-align:center"
  ].join(";");

  document.documentElement.appendChild(banner);
})();`);
});

// Basic 404 and error handlers keep API failures predictable.
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Authorized security testing dashboard running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing server or set a different PORT.`);
    process.exit(1);
  }

  console.error("Server failed to start:", err);
  process.exit(1);
});
