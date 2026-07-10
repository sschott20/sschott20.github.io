const SITE_ORIGIN = "https://sschott20.github.io";
const SITE_HOST = "sschott20.github.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Methods": "POST",
};

function utcDay(offset = 0) {
  const d = new Date(Date.now() - offset * 86400000);
  return d.toISOString().slice(0, 10);
}

async function bump(env, key) {
  const v = parseInt((await env.COUNTER.get(key)) || "0", 10);
  await env.COUNTER.put(key, String(v + 1));
}

// POST /hit — body is JSON sent as text/plain (avoids CORS preflight):
// { p: pathname, r: document.referrer, n: first-visit-today boolean }
async function handleHit(request, env) {
  if (request.headers.get("Origin") === SITE_ORIGIN) {
    let data = {};
    try {
      data = JSON.parse(await request.text()) || {};
    } catch (e) {
      // old snippet or malformed body: still count the visit itself
    }
    const today = utcDay();
    const writes = [bump(env, "visits"), bump(env, "day:" + today)];

    if (typeof data.p === "string" && data.p.startsWith("/")) {
      writes.push(bump(env, "page:" + data.p.split("?")[0].slice(0, 64)));
    }
    try {
      const refUrl = data.r ? new URL(data.r) : null;
      if (refUrl && refUrl.hostname !== SITE_HOST) {
        // keep the referrer as the browser sent it (usually just the origin,
        // per referrer policy), minus query/fragment which can carry tokens
        writes.push(bump(env, "ref:" + (refUrl.origin + refUrl.pathname).slice(0, 128)));
      }
    } catch (e) {
      // unparseable referrer: skip the dimension, keep the visit
    }
    if (data.n === true) {
      writes.push(bump(env, "uniq:" + today));
      // countries count unique visitors (per day), not page loads
      if (request.cf && request.cf.country) {
        writes.push(bump(env, "country:" + request.cf.country));
      }
    }
    await Promise.all(writes);
  }
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function readPrefix(env, prefix, limit) {
  const list = await env.COUNTER.list({ prefix });
  const vals = await Promise.all(list.keys.map((k) => env.COUNTER.get(k.name)));
  return list.keys
    .map((k, i) => [k.name.slice(prefix.length), parseInt(vals[i] || "0", 10)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

// GET /stats — everything the dashboard needs, one JSON blob
async function handleStats(env) {
  const days = [];
  for (let i = 29; i >= 0; i--) days.push(utcDay(i));

  const [total, dayVals, uniqVals, pages, refs, countries] = await Promise.all([
    env.COUNTER.get("visits"),
    Promise.all(days.map((d) => env.COUNTER.get("day:" + d))),
    Promise.all(days.map((d) => env.COUNTER.get("uniq:" + d))),
    readPrefix(env, "page:", 8),
    readPrefix(env, "ref:", 100),
    readPrefix(env, "country:", 8),
  ]);

  const body = {
    total: parseInt(total || "0", 10),
    days: days.map((d, i) => ({
      d,
      v: parseInt(dayVals[i] || "0", 10),
      u: parseInt(uniqVals[i] || "0", 10),
    })),
    pages,
    refs,
    countries,
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Visits — sschott20.github.io</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap');
:root {
  --bg: #fdfdfb; --fg: #1a1a1a; --muted: #6a6a6a; --rule: #e6e3dc;
  --bar: #b8823a; --bar-today: #7d5518; --wash: #f4efe6;
}
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0; background: var(--bg); color: var(--fg);
  font-family: 'EB Garamond', Garamond, 'Times New Roman', Times, serif;
  font-size: 19px; line-height: 1.55;
  font-feature-settings: "kern", "liga", "onum";
  -webkit-font-smoothing: antialiased;
}
main { max-width: 680px; margin: 0 auto; padding: 4.5rem 1.5rem 5rem; }
@media (max-width: 600px) { main { padding: 3rem 1.25rem 4rem; } }
.kicker {
  text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.8rem;
  color: var(--muted); margin: 0 0 0.4rem;
}
.hero {
  font-size: 4rem; line-height: 1.05; font-weight: 500; margin: 0;
  font-feature-settings: "kern", "liga", "lnum";
}
.hero-sub { color: var(--muted); font-style: italic; margin: 0.35rem 0 0; }
.tiles {
  display: flex; gap: 2.5rem; flex-wrap: wrap;
  margin: 2.25rem 0 0; padding-top: 1.25rem; border-top: 1px solid var(--rule);
}
.tile .label {
  text-transform: uppercase; letter-spacing: 0.12em; font-size: 0.72rem;
  color: var(--muted);
}
.tile .value {
  font-size: 1.55rem; font-weight: 600;
  font-feature-settings: "kern", "lnum";
}
.tile .note { color: var(--muted); font-size: 0.85rem; font-style: italic; }
h2 {
  font-size: 1rem; text-transform: uppercase; letter-spacing: 0.12em;
  font-weight: 500; color: var(--muted); margin: 3rem 0 0.75rem;
  padding-bottom: 0.4rem; border-bottom: 1px solid var(--rule);
}
.chart-wrap { position: relative; }
svg { display: block; width: 100%; height: auto; }
.tooltip {
  position: absolute; pointer-events: none; display: none;
  background: var(--fg); color: var(--bg); padding: 0.3rem 0.6rem;
  font-size: 0.85rem; white-space: nowrap; border-radius: 2px;
  transform: translate(-50%, calc(-100% - 10px));
  font-feature-settings: "lnum";
}
.tooltip .tt-date { opacity: 0.75; }
.cols { display: flex; gap: 2.5rem; flex-wrap: wrap; }
.col { flex: 1 1 160px; min-width: 150px; }
table { border-collapse: collapse; width: 100%; font-size: 0.95rem; table-layout: fixed; }
td { padding: 0.18rem 0; vertical-align: baseline; border-bottom: 1px solid transparent; }
td.num {
  width: 4.5rem; text-align: right; color: var(--muted);
  font-feature-settings: "lnum", "tnum"; font-variant-numeric: tabular-nums;
}
td.key { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 1rem; }
.empty { color: var(--muted); font-style: italic; font-size: 0.95rem; }
table.wide { max-width: 420px; }
footer {
  margin-top: 4rem; padding-top: 1.25rem; border-top: 1px solid var(--rule);
  color: var(--muted); font-size: 0.9rem; font-style: italic;
}
footer a { color: var(--muted); }
.bar-g:hover .bar { opacity: 0.8; }
.axis-text { font-size: 12px; fill: var(--muted); font-family: inherit; }
.bar-label { font-size: 12.5px; fill: var(--fg); font-family: inherit; font-weight: 600; }
.gridline { stroke: var(--rule); stroke-width: 1; }
</style>
</head>
<body>
<main>
  <p class="kicker">Circulation ledger</p>
  <h1 class="hero" id="total">—</h1>
  <p class="hero-sub">total visits to <a href="https://sschott20.github.io" style="color:inherit">sschott20.github.io</a></p>

  <div class="tiles">
    <div class="tile"><div class="label">Today</div><div class="value" id="today">—</div></div>
    <div class="tile"><div class="label">Unique today</div><div class="value" id="uniq">—</div></div>
    <div class="tile"><div class="label">Peak day, 30d</div><div class="value" id="peak">—</div><div class="note" id="peak-date"></div></div>
  </div>

  <h2>Last 30 days</h2>
  <div class="chart-wrap">
    <svg id="chart" viewBox="0 0 680 240" role="img" aria-label="Daily visits, last 30 days"></svg>
    <div class="tooltip" id="tt"></div>
  </div>
  <h2>Referrers</h2>
  <table id="refs" class="wide"></table>

  <h2>Pages &amp; countries</h2>
  <div class="cols">
    <div class="col"><p class="kicker" style="margin-bottom:0.35rem">Pages (visits)</p><table id="pages"></table></div>
    <div class="col"><p class="kicker" style="margin-bottom:0.35rem">Countries (unique)</p><table id="countries"></table></div>
  </div>

  <footer>
    Days are UTC. Counted by a <a href="https://github.com/sschott20/sschott20.github.io/tree/main/counter">tiny Cloudflare Worker</a> —
    no cookies, no fingerprinting, blockers welcome.
  </footer>
</main>
<script>
(function () {
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(n) { return n.toLocaleString("en-US"); }
  function shortDate(iso) {
    var d = new Date(iso + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  }

  fetch("/stats").then(function (r) { return r.json(); }).then(function (s) {
    var days = s.days, todayRow = days[days.length - 1];
    document.getElementById("total").textContent = fmt(s.total);
    document.getElementById("today").textContent = fmt(todayRow.v);
    document.getElementById("uniq").textContent = fmt(todayRow.u);

    var peak = days.reduce(function (a, b) { return b.v > a.v ? b : a; }, days[0]);
    document.getElementById("peak").textContent = fmt(peak.v);
    if (peak.v > 0) document.getElementById("peak-date").textContent = shortDate(peak.d);

    drawChart(days, peak);
    fillDims("pages", s.pages, function (k) { return k; });
    fillDims("refs", s.refs, function (k) { return k; });
    var regionNames;
    try { regionNames = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
    fillDims("countries", s.countries, function (k) {
      try { return (regionNames && regionNames.of(k)) || k; } catch (e) { return k; }
    });
  });

  function drawChart(days, peak) {
    var svg = document.getElementById("chart");
    var W = 680, H = 240, PAD_L = 34, PAD_R = 6, PAD_T = 24, PAD_B = 26;
    var plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
    var max = Math.max(1, peak.v);
    // clean tick step: 1/2/5 * 10^k, aiming for ~3 ticks
    var step = 1, mags = [1, 2, 5];
    outer: for (var p = 1; p < 1e9; p *= 10)
      for (var i = 0; i < 3; i++)
        if (max / (mags[i] * p) <= 3) { step = mags[i] * p; break outer; }
    var yMax = Math.ceil(max / step) * step;
    function y(v) { return PAD_T + plotH * (1 - v / yMax); }

    for (var t = 0; t <= yMax; t += step) {
      el("line", { x1: PAD_L, x2: W - PAD_R, y1: y(t), y2: y(t), class: "gridline" }, svg);
      var lbl = el("text", { x: PAD_L - 8, y: y(t) + 4, "text-anchor": "end", class: "axis-text" }, svg);
      lbl.textContent = fmt(t);
    }

    var band = plotW / days.length;
    var barW = Math.min(24, band - 2); // 2px surface gap between neighbors
    var tt = document.getElementById("tt");
    var wrap = svg.parentElement;

    days.forEach(function (row, i) {
      var cx = PAD_L + band * i + band / 2;
      var g = el("g", { class: "bar-g" }, svg);
      var h = plotH * (row.v / yMax);
      var x0 = cx - barW / 2, yTop = y(row.v), yBase = PAD_T + plotH;
      if (row.v > 0) {
        var r = Math.min(4, h);
        el("path", {
          class: "bar",
          fill: i === days.length - 1 ? "var(--bar-today)" : "var(--bar)",
          d: "M" + x0 + "," + yBase +
             " L" + x0 + "," + (yTop + r) +
             " Q" + x0 + "," + yTop + " " + (x0 + r) + "," + yTop +
             " L" + (x0 + barW - r) + "," + yTop +
             " Q" + (x0 + barW) + "," + yTop + " " + (x0 + barW) + "," + (yTop + r) +
             " L" + (x0 + barW) + "," + yBase + " Z",
        }, g);
      }
      // selective direct labels: the peak and today only
      if ((row === peak && row.v > 0) || i === days.length - 1) {
        var t2 = el("text", { x: cx, y: yTop - 7, "text-anchor": "middle", class: "bar-label" }, g);
        t2.textContent = fmt(row.v);
      }
      // x tick roughly weekly
      if (i % 7 === 1 || i === days.length - 1) {
        var t3 = el("text", { x: cx, y: H - 8, "text-anchor": "middle", class: "axis-text" }, svg);
        t3.textContent = shortDate(row.d);
      }
      // full-column hover target, bigger than the mark
      var hit = el("rect", { x: PAD_L + band * i, y: PAD_T, width: band, height: plotH, fill: "transparent" }, g);
      hit.addEventListener("mouseenter", function () {
        tt.innerHTML = "<span class='tt-date'>" + shortDate(row.d) + "</span> · " +
          fmt(row.v) + (row.v === 1 ? " visit" : " visits") +
          (row.u ? " · " + fmt(row.u) + " unique" : "");
        tt.style.display = "block";
        var box = wrap.getBoundingClientRect();
        var sx = box.width / W;
        tt.style.left = cx * sx + "px";
        tt.style.top = yTop * sx + "px";
      });
      hit.addEventListener("mouseleave", function () { tt.style.display = "none"; });
    });

    // baseline
    el("line", { x1: PAD_L, x2: W - PAD_R, y1: PAD_T + plotH, y2: PAD_T + plotH, stroke: "var(--fg)", "stroke-width": 1 }, svg);
  }

  function fillDims(id, rows, nameOf) {
    var t = document.getElementById(id);
    if (!rows || !rows.length) {
      t.outerHTML = "<p class='empty'>nothing yet</p>";
      return;
    }
    var html = "";
    rows.forEach(function (r) {
      var name = nameOf(r[0]).replace(/&/g, "&amp;").replace(/</g, "&lt;");
      html += "<tr><td class='key' title='" + name + "'>" + name + "</td><td class='num'>" + fmt(r[1]) + "</td></tr>";
    });
    t.innerHTML = html;
  }
})();
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/hit") {
      if (request.method === "POST") return handleHit(request, env);
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
      return new Response("not found", { status: 404 });
    }
    if (request.method === "GET" && pathname === "/stats") return handleStats(env);
    if (request.method === "GET" && pathname === "/") {
      return new Response(DASHBOARD_HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return new Response("not found", { status: 404 });
  },
};
