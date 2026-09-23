import json
from .config import STATE_FILE

DEFAULT = {"last_post_date": None, "replied_comment_ids": [], "history": []}


def load_state():
    if not STATE_FILE.exists():
        return DEFAULT.copy()
    try:
        data = json.loads(STATE_FILE.read_text())
        out = DEFAULT.copy()
        out.update(data)
        return out
    except Exception:
        return DEFAULT.copy()


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, sort_keys=True))
