const SITE_ORIGIN = "https://sschott20.github.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST",
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "POST" && pathname === "/hit") {
      // Only count loads coming from the site itself
      if (request.headers.get("Origin") === SITE_ORIGIN) {
        const current = parseInt((await env.COUNTER.get("visits")) || "0", 10);
        await env.COUNTER.put("visits", String(current + 1));
      }
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "GET" && pathname === "/") {
      const count = (await env.COUNTER.get("visits")) || "0";
      return new Response(count + "\n", {
        headers: { "content-type": "text/plain" },
      });
    }

    return new Response("not found", { status: 404 });
  },
};
