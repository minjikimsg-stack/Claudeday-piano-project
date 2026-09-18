// Vercel Serverless Function — 악보 이미지 판독
// API 키는 Vercel 환경변수 ANTHROPIC_API_KEY 에만 존재

const HAND_SPEC = {
  right: {
    label: "오른쪽 손(위쪽 보표, 높은음자리표) 성부만",
    detail:
      "아래쪽 보표(낮은음자리표/왼손)는 완전히 무시하세요. " +
      "위쪽 보표에 화음이 있으면 동시에 울리는 음을 모두 하나의 항목에 담으세요.",
  },
  left: {
    label: "왼쪽 손(아래쪽 보표, 낮은음자리표) 성부만",
    detail:
      "위쪽 보표(높은음자리표/오른손)는 완전히 무시하세요. " +
      "아래쪽 보표에 화음이 있으면 동시에 울리는 음을 모두 하나의 항목에 담으세요.",
  },
  both: {
    label: "양손 전체(위·아래 보표 모두)",
    detail:
      "같은 시점에 울리는 양손의 음을 하나의 항목으로 합쳐서 담으세요. " +
      "정확한 성부 분리보다, 동시에 울리는 음들을 빠뜨리지 않는 것이 중요합니다.",
  },
};

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
  const { image, media_type, hand } = req.body || {};
  if (!image) {
    res.status(400).json({ error: "no image" });
    return;
  }
  const spec = HAND_SPEC[hand] || HAND_SPEC.right;

  const prompt =
    "이 이미지는 피아노 악보의 짧은 구간입니다. 아래 지시에 따라 음표를 전사하세요.\n\n" +
    "[전사 대상] " + spec.label + "\n" + spec.detail + "\n\n" +
    "[작업 순서]\n" +
    "1. 먼저 조표(샵/플랫 개수)와 박자표를 읽습니다.\n" +
    "2. 대상 보표의 음표를 왼쪽에서 오른쪽 순서로 훑습니다.\n" +
    "3. 각 음표의 오선 위 위치를 세어 음높이를 정하고, 조표와 그 마디의 임시표를 반영해 MIDI 번호로 바꿉니다.\n" +
    "4. 세로로 겹쳐 그려진 음표(화음)는 하나의 항목에 여러 MIDI 번호로 담습니다.\n" +
    "5. 음표 머리 모양과 기둥·꼬리로 길이를 정합니다. 점음표는 1.5배입니다.\n\n" +
    "[정확도 기준] 완벽할 필요는 없습니다. 음높이가 애매하면 가장 그럴듯한 값을 쓰고 계속 진행하세요. " +
    "다만 음의 개수와 순서, 화음 여부는 최대한 원본과 맞추세요. 쉼표는 생략합니다.\n\n" +
    "[출력 형식] 아래 JSON만 출력하세요. 설명·마크다운·코드펜스 금지.\n" +
    '{"fifths":정수(-7~7),"mode":"major"|"minor","beats":정수,"beatType":정수,' +
    '"notes":[{"m":[MIDI번호들],"d":박자길이}]}\n' +
    '- "m"은 항상 배열입니다. 단음은 [60]처럼 한 개, 화음은 [60,64,67]처럼 여러 개.\n' +
    '- "d"는 4분음표=1 기준: 0.25|0.5|0.75|1|1.5|2|3|4 중 하나.\n' +
    "- MIDI 참고: 가온다(C4)=60, 그 위 라(A4)=69.";

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
        max_tokens: 4000,
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
    let clean = text.replace(/```json|```/g, "").trim();
    const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
    if (s >= 0 && e > s) clean = clean.slice(s, e + 1);
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: "parse_or_network_failed" });
  }
};
