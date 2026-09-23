import base64
import json
from pathlib import Path
from PIL import Image
from openai import OpenAI
from .config import BRAND_FILE, OPENAI_MODEL, IMAGE_MODEL

client = OpenAI()


def _brand():
    return json.loads(BRAND_FILE.read_text())


def make_post_plan(recent_media):
    brand = _brand()
    compact = []
    for m in recent_media[:10]:
        compact.append({
            "caption": (m.get("caption") or "")[:800],
            "media_type": m.get("media_type"),
            "timestamp": m.get("timestamp"),
            "like_count": m.get("like_count"),
            "comments_count": m.get("comments_count"),
            "permalink": m.get("permalink"),
        })
    prompt = f"""
You are the content strategist for {brand['account']} ({brand['brand']}).
Brand voice: {brand['voice']}.
Core subjects: {json.dumps(brand['core_subjects'])}
Rules: {json.dumps(brand['rules'])}
Recent posts/performance: {json.dumps(compact)}

Create ONE Instagram feed-post concept for today. Aim to improve saves, shares, meaningful comments and follower conversion without sounding spammy. Rotate themes so the feed does not repeat itself.

Important visual rule: this account documents a real Porsche build. Do not depict a specific modification as completed unless it is explicitly established in the brand facts or recent-post context. If a literal vehicle rendering would require guessing details, use a premium close-up, abstract engineering detail, workshop/editorial composition, or tasteful concept image that does not falsely document completed work.

Return JSON only with:
caption: final caption ready to post
image_prompt: a premium vertical image-generation prompt. No logos or text baked into the image.
alt_text: concise accessible description
reason: one sentence explaining the content choice
"""
    resp = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
        text={"format": {"type": "json_object"}},
    )
    return json.loads(resp.output_text)


def generate_image(prompt: str, output_path: Path):
    result = client.images.generate(
        model=IMAGE_MODEL,
        prompt=prompt,
        size="1024x1536",
        quality="medium",
        output_format="jpeg",
    )
    item = result.data[0]
    b64 = getattr(item, "b64_json", None)
    if not b64:
        raise RuntimeError("Image API did not return image bytes")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_suffix(".source.jpg")
    temp_path.write_bytes(base64.b64decode(b64))

    with Image.open(temp_path) as image:
        image = image.convert("RGB")
        width, height = image.size
        target_height = int(width * 5 / 4)
        if height < target_height:
            target_width = int(height * 4 / 5)
            left = (width - target_width) // 2
            image = image.crop((left, 0, left + target_width, height))
        else:
            top = (height - target_height) // 2
            image = image.crop((0, top, width, top + target_height))
        image.save(output_path, format="JPEG", quality=92, optimize=True)

    temp_path.unlink(missing_ok=True)
    return output_path


def make_comment_reply(comment_text: str, commenter: str, post_caption: str):
    brand = _brand()
    prompt = f"""
Write a short natural Instagram reply from {brand['account']} to @{commenter}.
Their comment: {comment_text}
Post context: {post_caption[:1200]}
Voice: {brand['voice']}.
Do not be salesy. Do not claim facts not established. If the comment is only an emoji or generic praise, answer briefly. If it asks a clear question, answer only if the post context supports it; otherwise respond naturally without inventing details. Do not argue, insult, or escalate hostile comments.
Output only the reply text.
"""
    resp = client.responses.create(model=OPENAI_MODEL, input=prompt)
    return resp.output_text.strip()[:1000]
