// DAILY LIFE AI - Shopping Agent backend
// Node.js 18+; uses only built-in modules.
const http = require("node:http");
const BASE = "https://mcp.priceinindia.website/mcp";
const PORT = process.env.PORT || 3000;

async function mcpCall(name, args) {
  const headers = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };
  const init = await fetch(BASE, {
    method: "POST", headers,
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "daily-life-ai-shopping-agent", version: "4.0.0" }
      }
    })
  });
  if (!init.ok) throw new Error(`Price source initialize failed (${init.status})`);
  const sessionId = init.headers.get("mcp-session-id");
  const initText = await init.text();
  const initData = parseMcpBody(initText);
  const negotiated = initData?.result?.protocolVersion || "2025-11-25";
  const h = { ...headers, "MCP-Protocol-Version": negotiated };
  if (sessionId) h["Mcp-Session-Id"] = sessionId;

  // MCP initialized notification
  await fetch(BASE, {
    method: "POST", headers: h,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
  });

  const response = await fetch(BASE, {
    method: "POST", headers: h,
    body: JSON.stringify({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name, arguments: args }
    })
  });
  if (!response.ok) throw new Error(`Price search failed (${response.status})`);
  const data = parseMcpBody(await response.text());
  if (data?.error) throw new Error(data.error.message || "Price source returned an error");
  return data?.result || data;
}
function parseMcpBody(body) {
  const trimmed = body.trim();
  if (!trimmed) return {};
  try { return JSON.parse(trimmed); } catch {}
  // Streamable HTTP may return Server-Sent Events.
  const events = trimmed.split(/\r?\n/).filter(line => line.startsWith("data:"));
  for (let i = events.length - 1; i >= 0; i--) {
    try { return JSON.parse(events[i].slice(5).trim()); } catch {}
  }
  throw new Error("Could not read the response from the price service");
}
function structured(result) {
  if (result && result.structuredContent) return result.structuredContent;
  const texts = (result?.content || []).filter(x => x.type === "text").map(x => x.text);
  for (const t of texts) { try { return JSON.parse(t); } catch {} }
  return { message: texts.join("\n") };
}
function send(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
async function readBody(req) {
  let s = "";
  for await (const chunk of req) { s += chunk; if (s.length > 12000) throw new Error("Request too large"); }
  return s ? JSON.parse(s) : {};
}
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/health") return send(res, 200, { ok: true, service: "DAILY LIFE AI Shopping Agent" });
  if (req.method !== "POST" || !["/api/search", "/api/compare"].includes(req.url)) {
    return send(res, 404, { error: "Not found" });
  }
  try {
    const body = await readBody(req);
    const query = String(body.query || "").trim();
    if (query.length < 2 || query.length > 200) return send(res, 400, { error: "कृपया 2 से 200 अक्षरों में प्रोडक्ट लिखें।" });
    let result;
    if (req.url === "/api/search") {
      const args = { query, sort: "price_asc", page: 1, per_page: 20 };
      if (Number.isFinite(Number(body.maxPrice)) && Number(body.maxPrice) > 0) args.max_price = Number(body.maxPrice);
      if (body.brand) args.brand = String(body.brand).slice(0, 80);
      result = structured(await mcpCall("search_products", args));
    } else {
      result = structured(await mcpCall("compare_prices", { query, ...(body.brand ? { brand: String(body.brand).slice(0,80) } : {}) }));
    }
    return send(res, 200, { ok: true, data: result, checkedAt: new Date().toISOString() });
  } catch (e) {
    return send(res, 502, { error: e.message || "अभी प्रोडक्ट डेटा नहीं मिल पाया।" });
  }
});
server.listen(PORT, () => console.log(`DAILY LIFE AI backend running on port ${PORT}`));
