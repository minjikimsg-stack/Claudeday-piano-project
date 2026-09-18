// Vercel Serverless Function — 악보 이미지 판독
// API 키는 Vercel 환경변수 ANTHROPIC_API_KEY 에만 존재 (코드/프론트에 절대 넣지 말 것)

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(401).json({ error: "ANTHROPIC_API_KEY not set" });
    return;
  }
  const { image, media_type } = req.body || {};
  if (!image) {
    res.status(400).json({ error: "no image" });
    return;
  }

  const prompt =
    "이 이미지는 피아노 악보의 짧은 구간(1~4마디)입니다. 멜로디(가장 위 성부)만 대략적으로 전사하세요. " +
    "화음이면 가장 높은 음만. 완벽할 필요 없고 대략적이면 됩니다.\n" +
    "다음 JSON만 출력하세요 (설명·마크다운·코드펜스 금지):\n" +
    '{"fifths":정수(-7~7 조표),"mode":"major"|"minor","beats":정수,"beatType":정수,' +
    '"notes":[{"m":MIDI번호정수,"d":박자길이(0.25|0.5|0.75|1|1.5|2|3|4)}]}\n' +
    "쉼표는 생략. notes는 왼쪽부터 순서대로. 확신 없으면 추정치로 채우세요.";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type || "image/png",
                  data: image,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const body = await r.text();
      res.status(r.status).json({ error: "anthropic_error", detail: body.slice(0, 300) });
      return;
    }
    const data = await r.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "parse_or_network_failed" });
  }
};
