import json
from openai import OpenAI
from .config import OPENAI_MODEL
from .instagram import get_me, get_recent_media


def run():
    me = get_me()
    recent = get_recent_media(1)
    client = OpenAI()
    response = client.responses.create(
        model=OPENAI_MODEL,
        input="Reply with exactly: OK",
        max_output_tokens=8,
    )
    print(json.dumps({
        "instagram": {
            "username": me.get("username"),
            "id": me.get("user_id") or me.get("id"),
            "recent_media_visible": bool(recent),
        },
        "openai": response.output_text.strip(),
        "ready": True,
    }))


if __name__ == "__main__":
    run()
