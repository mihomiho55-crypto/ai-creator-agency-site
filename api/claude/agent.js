// api/claude/agent.js
// Minimal Claude proxy for static sites on Vercel.
// POST /api/claude/agent  { prompt, system?, max_tokens?, temperature? }

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "*"; // 必要なら自分のドメインに絞る

function send(res, status, json, extra = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  Object.entries(extra).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(json));
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST /api/claude/agent" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return send(res, 500, { error: "Missing ANTHROPIC_API_KEY" });
  }

  try {
    const { prompt, system, max_tokens = 400, temperature = 0.7 } = await readJson(req);
    if (!prompt || typeof prompt !== "string") {
      return send(res, 400, { error: "Missing 'prompt' (string)" });
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        temperature,
        system:
          system ||
          "You rewrite and improve social posts for engagement. If input is Japanese, answer in Japanese.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      // 失敗時は素のテキストも返してデバッグしやすく
      return send(res, r.status, { error: "Anthropic API error", detail: text });
    }

    const data = JSON.parse(text);
    const output = data?.content?.[0]?.text ?? "";
    return send(res, 200, { output, usage: data?.usage || null });
  } catch (e) {
    return send(res, 500, { error: "Server error", detail: String(e) });
  }
};
