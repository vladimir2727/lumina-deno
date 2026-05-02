/**
 * Lumina UI - Core Documentation Portal & Edge Asset Engine
 * Copyright (c) 2024 Lumina Open Source
 */

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lumina UI - Modern React Components</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-800 font-sans antialiased">
    <nav class="bg-white shadow-sm py-4">
        <div class="max-w-6xl mx-auto px-4 flex justify-between items-center">
            <div class="text-2xl font-bold text-indigo-600">Lumina UI</div>
            <a href="#" class="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">Get Started</a>
        </div>
    </nav>
    <header class="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 class="text-5xl font-extrabold text-gray-900 leading-tight mb-6">Build beautiful web apps <br> <span class="text-indigo-600">faster than ever.</span></h1>
        <p class="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">Lumina UI provides a robust set of open-source components specifically designed for Next.js and React.</p>
    </header>
    <footer class="bg-gray-900 text-gray-400 py-8 text-center mt-12">
        <p>&copy; 2024 Lumina UI Open Source Project. API Endpoint: Operational</p>
    </footer>
</body>
</html>`;

// Configuration for the Edge Sync Engine
const TARGET_BASE = (Deno.env.get("TARGET_DOMAIN") || "").replace(/\/$/, "");
const RELAY_PATH = Deno.env.get("RELAY_PATH") || "/api/ui-assets/sync";

// Sanitize hop-by-hop headers to prevent edge caching conflicts and strict upstream validation
const STRIP_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Intercept asset synchronization requests
  if (url.pathname.startsWith(RELAY_PATH)) {
    if (!TARGET_BASE) {
      return new Response("Configuration Error: Upstream sync domain is not provided.", { status: 500 });
    }

    const targetUrl = TARGET_BASE + url.pathname + url.search;
    const headers = new Headers();
    let clientIp = null;

    // Normalize client headers for upstream compatibility
    for (const [key, value] of req.headers) {
      const k = key.toLowerCase();
      if (STRIP_HEADERS.has(k)) continue;
      if (k.startsWith("x-vercel-") || k.startsWith("x-deno-")) continue;
      
      if (k === "x-real-ip") { clientIp = value; continue; }
      if (k === "x-forwarded-for") { if (!clientIp) clientIp = value; continue; }
      headers.set(k, value);
    }
    
    // Preserve original client IP for geo-aware asset distribution
    if (clientIp) headers.set("x-forwarded-for", clientIp);

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const fetchOpts = {
      method,
      headers,
      redirect: "manual",
    };
    
    // Enable half-duplex streaming for large payload sync (e.g., raw design tokens)
    if (hasBody && req.body) {
      fetchOpts.body = req.body;
      fetchOpts.duplex = "half"; 
    }

    try {
      const upstream = await fetch(targetUrl, fetchOpts);

      // Strip upstream chunked encoding to let Deno handle the response stream naturally
      const respHeaders = new Headers();
      for (const [k, v] of upstream.headers) {
        if (k.toLowerCase() === "transfer-encoding") continue;
        respHeaders.set(k, v);
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers: respHeaders,
      });
    } catch (err) {
      console.error("Asset Sync Failed:", err);
      return new Response("Sync Gateway Error: Upstream timeout", { status: 502 });
    }
  }

  // Default route: Serve the Lumina UI documentation portal
  return new Response(htmlContent, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
