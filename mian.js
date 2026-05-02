// ==========================================
// 1.(Lumina UI)
// ==========================================
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

// ==========================================
// 2. engine
// ==========================================
Deno.serve(async (req) => {
  // read Deno
  const TARGET_DOMAIN = (Deno.env.get("TARGET_DOMAIN") || "").replace(/\/$/, ""); 
  const RELAY_PATH = Deno.env.get("RELAY_PATH") || "/api/ui-assets/sync";

  const url = new URL(req.url);

 
  if (url.pathname.startsWith(RELAY_PATH)) {
    if (!TARGET_DOMAIN) {
      return new Response("Backend server not configured in Deno Env.", { status: 500 });
    }

    const targetUrl = TARGET_DOMAIN + url.pathname + url.search;
    

    const headers = new Headers(req.headers);
    headers.delete("host");
    
  
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    if (clientIp) {
      headers.set("x-forwarded-for", clientIp);
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
        body: hasBody ? req.body : undefined,
        redirect: "manual",
      });

      
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (err) {
      console.error("Upstream connection failed:", err);
      return new Response("Gateway Connection Timeout", { status: 502 });
    }
  }

 
  return new Response(htmlContent, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});