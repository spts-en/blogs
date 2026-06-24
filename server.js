const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const ALLOWED_ORIGINS = [
    "*"
 // "http://localhost:3000",
 // "http://127.0.0.1:8000",
//  "https://localhost:3000",
//  "https://127.0.0.1:3000"
];

const clients = new Map();
const STATIC_ROOT = path.join(__dirname);

function normalizeOrigin(value) {
  if (!value) return "";
  return value.replace(/\/$/, "");
}

function sendJson(res, data, status = 200, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(payload),
    ...headers
  });
  res.end(payload);
}

function sendText(res, text, status = 200, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(text);
}

function sendStatic(res, filePath, contentType) {
  if (!isPathInside(STATIC_ROOT, filePath)) {
    sendText(res, "Not Found", 404);
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, "Not Found", 404);
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=60"
    });
    res.end(data);
  });
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return !!relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function buildCorsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return {};
  }
  const normalized = normalizeOrigin(origin);
  if (ALLOWED_ORIGINS.includes("*")) {
    return {
      "Access-Control-Allow-Origin": "*"
    };
  }
  if (ALLOWED_ORIGINS.includes(normalized)) {
    return {
      "Access-Control-Allow-Origin": normalized,
      "Access-Control-Allow-Credentials": "true"
    };
  }
  return {};
}

function validateOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) {
    return true;
  }
  const normalized = normalizeOrigin(origin);
  return ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(normalized);
}

function validateBrowserGenerosity(req, route) {
  const accept = req.headers.accept || "";
  const secFetchSite = req.headers["sec-fetch-site"];
  const apiRoute = [
    "/blog-index",
    "/blog-index.json",
    "/menu",
    "/menu.json"
  ];

  const isApiPath = apiRoute.includes(route) || route.startsWith("/blogs/") || route.startsWith("/api/");

  if (isApiPath) {
    if (!accept.includes("application/json") && !accept.includes("*/*")) {
      return false;
    }
    if (typeof secFetchSite === "string" && secFetchSite === "cross-site") {
      return false;
    }
  }

  return true;
}

function rateLimit(req) {
  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = clients.get(ip) || { count: 0, windowStart: now };

  if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
  } else {
    entry.count += 1;
  }

  clients.set(ip, entry);
  return {
    allowed: entry.count <= MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count),
    reset: entry.windowStart + RATE_LIMIT_WINDOW_MS
  };
}

function getApiData(route) {
  if (route === "/api/blog-index" || route === "/blog-index" || route === "/blog-index.json") {
    return readJson(path.join(STATIC_ROOT, "blog-index.json"));
  }

  if (route === "/api/menu" || route === "/menu" || route === "/menu.json") {
    return readJson(path.join(STATIC_ROOT, "menu.json"));
  }

  const blogRoute = route.startsWith("/api/blogs/")
    ? route.replace("/api/blogs/", "")
    : route.startsWith("/blogs/")
      ? route.replace("/blogs/", "")
      : null;

  if (blogRoute !== null) {
    if (!/^[a-z0-9-]+$/.test(blogRoute)) {
      return null;
    }
    return readJson(path.join(STATIC_ROOT, "blogs", `${blogRoute}.json`));
  }

  return undefined;
}

function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url);
  const route = parsedUrl.pathname;
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept"
    });
    res.end();
    return;
  }

  if (!["GET", "OPTIONS"].includes(req.method)) {
    sendJson(res, { error: "Method not allowed" }, 405, corsHeaders);
    return;
  }

  if (!validateOrigin(req)) {
    sendJson(res, { error: "Origin not allowed" }, 403, corsHeaders);
    return;
  }

  if (!validateBrowserGenerosity(req, route)) {
    sendJson(res, { error: "Browser headers not allowed" }, 403, corsHeaders);
    return;
  }

  const limit = rateLimit(req);
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.reset / 1000))
  };

  if (!limit.allowed) {
    sendJson(
      res,
      { error: "Rate limit exceeded" },
      429,
      { ...corsHeaders, ...rateLimitHeaders }
    );
    return;
  }

  if (route === "/" || route === "/index.html") {
    sendStatic(res, path.join(STATIC_ROOT, "index.html"), "text/html; charset=utf-8");
    return;
  }

  if (route === "/index.js") {
    sendStatic(res, path.join(STATIC_ROOT, "index.js"), "application/javascript; charset=utf-8");
    return;
  }

  const staticTypes = {
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml"
  };

  if (route === "/favicon.ico") {
    sendText(res, "", 204, { ...corsHeaders, ...rateLimitHeaders });
    return;
  }

  const apiPaths = [
    "/api/blog-index",
    "/blog-index",
    "/blog-index.json",
    "/api/menu",
    "/menu",
    "/menu.json"
  ];

  if (apiPaths.includes(route) || route.startsWith("/api/blogs/") || route.startsWith("/blogs/")) {
    const data = getApiData(route);
    if (data === null) {
      sendJson(res, { error: "Not found" }, 404, { ...corsHeaders, ...rateLimitHeaders });
      return;
    }
    sendJson(res, data, 200, { ...corsHeaders, ...rateLimitHeaders });
    return;
  }

  if (route.startsWith("/images/")) {
    const filePath = path.join(STATIC_ROOT, route);
    const type = staticTypes[path.extname(route)] || "application/octet-stream";
    sendStatic(res, filePath, type);
    return;
  }

  sendJson(res, { error: "Not found" }, 404, { ...corsHeaders, ...rateLimitHeaders });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
