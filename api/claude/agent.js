// api/claude/agent.js
// 超シンプル版 Claude プロキシ
// POST /api/claude/agent  { prompt: "テキスト" }

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
const ALLOW_ORIGIN = process.env.CORS_ALLOW_ORIGIN || "*";

function send(res, status, json) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(json));
}

async function readJson(req) {
  return await new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
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

  // POST 以外は拒否
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST /api/claude/agent" });
  }

  // APIキー必須
  if (!process.env.ANTHROPIC_API_KEY) {
    return send(res, 500, { error: "Missing ANTHROPIC_API_KEY" });
  }

  try {
    const { prompt } = await readJson(req);

    if (!prompt || typeof prompt !== "string") {
      return send(res, 400, { error: "Missing 'prompt' (string)" });
    }

    // Anthropic Messages API への最小リクエスト
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            // 公式仕様通り：content はプレーン文字列
            content: prompt,
          },
        ],
      }),
    });

    const text = await r.text();

    if (!r.ok) {
      // エラー内容をそのまま返す（debug用）
      return send(res, r.status, {
        error: "Anthropic API error",
        detail: text,
      });
    }

    const data = JSON.parse(text);
    const output = data?.content?.[0]?.text || "";
    return send(res, 200, { output, usage: data.usage || null });
  } catch (e) {
    return send(res, 500, {
      error: "Server error",
      detail: String(e),
    });
  }
};
