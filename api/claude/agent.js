// api/claude/agent.js
export const config = { runtime: 'edge' }; // 速い＆Node依存なし

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing "prompt"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,               // ← Vercel の環境変数
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3.5-sonnet-latest',                        // モデル指定が必須
        max_tokens: 512,                                          // これも必須
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Anthropic 側のエラーをそのまま返す（デバッグ用）
      return new Response(
        JSON.stringify({ error: 'Anthropic API error', detail: data }),
        { status: res.status, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }

    // Claude の返答テキストを抽出
    const text = (data.content || [])
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('');

    return new Response(JSON.stringify({ ok: true, text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Server error', message: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
    );
  }
}
