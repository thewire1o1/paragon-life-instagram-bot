import json
import os
import subprocess
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from .config import ASSET_DIR, POST_HOUR_LOCAL, TZ_NAME, ROOT, STATE_FILE
from .state_store import load_state, save_state
from .instagram import get_recent_media, create_image_container, wait_until_ready, publish_container
from .ai import make_post_plan, generate_image


def _git(*args):
    subprocess.run(["git", *args], cwd=ROOT, check=True)


def _repo_rel(path: Path) -> str:
    path = path if path.is_absolute() else ROOT / path
    return path.relative_to(ROOT).as_posix()


def _public_url(path: Path):
    repo = os.environ["GITHUB_REPOSITORY"]
    branch = os.getenv("GITHUB_REF_NAME", "main")
    return f"https://raw.githubusercontent.com/{repo}/{branch}/{_repo_rel(path)}"


def _commit_and_push(path: Path, message: str):
    _git("config", "user.name", "paragon-life-bot")
    _git("config", "user.email", "actions@users.noreply.github.com")
    _git("add", _repo_rel(path))
    _git("commit", "-m", message)
    _git("push")


def run(force=False):
    now = datetime.now(ZoneInfo(TZ_NAME))
    state = load_state()
    if not force:
        if now.hour != POST_HOUR_LOCAL:
            print(f"Not post hour ({now.isoformat()})")
            return
        if state.get("last_post_date") == now.date().isoformat():
            print("Already posted today")
            return

    recent = get_recent_media(12)
    plan = make_post_plan(recent)
    stamp = now.strftime("%Y-%m-%d-%H%M%S")
    image_path = ASSET_DIR / f"{stamp}.jpg"
    generate_image(plan["image_prompt"], image_path)
    _commit_and_push(image_path, f"asset: {stamp}")

    url = _public_url(image_path)
    time.sleep(12)
    container = create_image_container(url, plan["caption"], plan.get("alt_text"))
    wait_until_ready(container)
    media_id = publish_container(container)

    state["last_post_date"] = now.date().isoformat()
    state.setdefault("history", []).append({
        "date": now.isoformat(),
        "media_id": media_id,
        "caption": plan["caption"],
        "asset": _repo_rel(image_path),
        "reason": plan.get("reason"),
    })
    state["history"] = state["history"][-100:]
    save_state(state)
    _commit_and_push(STATE_FILE, f"state: posted {now.date().isoformat()}")
    print(json.dumps({"published": media_id, "asset": url, "caption": plan["caption"]}))


if __name__ == "__main__":
    run(force=os.getenv("FORCE_POST", "0") == "1")
