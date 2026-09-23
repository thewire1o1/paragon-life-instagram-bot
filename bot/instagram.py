import time
import requests
from .config import IG_API_HOST, API_VERSION, IG_USER_ID
from .token_store import read_token


def _url(path: str) -> str:
    return f"{IG_API_HOST.rstrip('/')}/{API_VERSION}/{path.lstrip('/')}"


def _token():
    return read_token()


def get_me():
    r = requests.get(_url("me"), params={"fields": "user_id,username,name,account_type", "access_token": _token()}, timeout=30)
    r.raise_for_status()
    return r.json()


def get_recent_media(limit=12):
    me = get_me()
    user_id = IG_USER_ID or me.get("user_id") or me.get("id")
    fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
    r = requests.get(_url(f"{user_id}/media"), params={"fields": fields, "limit": limit, "access_token": _token()}, timeout=30)
    r.raise_for_status()
    return r.json().get("data", [])


def create_image_container(image_url: str, caption: str, alt_text: str | None = None):
    me = get_me()
    user_id = IG_USER_ID or me.get("user_id") or me.get("id")
    data = {"image_url": image_url, "caption": caption, "access_token": _token()}
    if alt_text:
        data["alt_text"] = alt_text[:1000]
    r = requests.post(_url(f"{user_id}/media"), data=data, timeout=60)
    r.raise_for_status()
    return r.json()["id"]


def publish_container(container_id: str):
    me = get_me()
    user_id = IG_USER_ID or me.get("user_id") or me.get("id")
    r = requests.post(_url(f"{user_id}/media_publish"), data={"creation_id": container_id, "access_token": _token()}, timeout=60)
    r.raise_for_status()
    return r.json()["id"]


def wait_until_ready(container_id: str, timeout_seconds=120):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        r = requests.get(_url(container_id), params={"fields": "status_code,status", "access_token": _token()}, timeout=30)
        r.raise_for_status()
        data = r.json()
        code = data.get("status_code")
        if code in (None, "FINISHED"):
            return data
        if code in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Instagram container failed: {data}")
        time.sleep(5)
    raise TimeoutError("Instagram media container did not become ready in time")


def get_comments(media_id: str, limit=50):
    fields = "id,text,username,timestamp"
    r = requests.get(_url(f"{media_id}/comments"), params={"fields": fields, "limit": limit, "access_token": _token()}, timeout=30)
    r.raise_for_status()
    return r.json().get("data", [])


def reply_to_comment(comment_id: str, message: str):
    r = requests.post(_url(f"{comment_id}/replies"), data={"message": message, "access_token": _token()}, timeout=30)
    r.raise_for_status()
    return r.json()


def refresh_long_lived_token():
    token = _token()
    r = requests.get("https://graph.instagram.com/refresh_access_token", params={"grant_type": "ig_refresh_token", "access_token": token}, timeout=30)
    r.raise_for_status()
    return r.json()
