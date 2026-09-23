import subprocess
from datetime import datetime, timedelta, timezone
from .config import ROOT, SELF_USERNAME
from .state_store import load_state, save_state
from .instagram import get_recent_media, get_comments, reply_to_comment
from .ai import make_comment_reply

MAX_REPLIES_PER_RUN = 12
LOOKBACK_HOURS = 36


def _git(*args):
    subprocess.run(["git", *args], cwd=ROOT, check=True)


def _recent_enough(timestamp: str | None) -> bool:
    if not timestamp:
        return False
    try:
        ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        return ts >= datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HOURS)
    except ValueError:
        return False


def run():
    state = load_state()
    replied = set(state.get("replied_comment_ids", []))
    changed = False
    replies_sent = 0

    for media in get_recent_media(8):
        caption = media.get("caption") or ""
        for c in get_comments(media["id"], 50):
            cid = c.get("id")
            user = c.get("username") or ""
            text = (c.get("text") or "").strip()
            if not cid or cid in replied or not text:
                continue
            if user.lower().lstrip("@") == SELF_USERNAME.lower().lstrip("@"):
                replied.add(cid)
                changed = True
                continue
            if not _recent_enough(c.get("timestamp")):
                replied.add(cid)
                changed = True
                continue
            if replies_sent >= MAX_REPLIES_PER_RUN:
                continue

            reply = make_comment_reply(text, user, caption)
            if reply:
                reply_to_comment(cid, reply)
                replied.add(cid)
                replies_sent += 1
                changed = True
                print(f"Replied to @{user}: {reply}")

    if changed:
        state["replied_comment_ids"] = list(replied)[-2000:]
        save_state(state)
        _git("config", "user.name", "paragon-life-bot")
        _git("config", "user.email", "actions@users.noreply.github.com")
        _git("add", "state/state.json")
        _git("commit", "-m", "state: comment replies")
        _git("push")


if __name__ == "__main__":
    run()
