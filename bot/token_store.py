import base64
import hashlib
import os
from cryptography.fernet import Fernet
from .config import TOKEN_FILE


def _fernet():
    source = os.environ.get("OPENAI_API_KEY")
    if not source:
        raise RuntimeError("OPENAI_API_KEY is missing")
    digest = hashlib.sha256(("paragon-life-instagram-token-v1\0" + source).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def read_token() -> str:
    if not TOKEN_FILE.exists():
        bootstrap = os.environ.get("IG_ACCESS_TOKEN")
        if bootstrap:
            return bootstrap
        raise RuntimeError("No Instagram token is available")
    return _fernet().decrypt(TOKEN_FILE.read_bytes()).decode()


def write_token(token: str) -> None:
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_bytes(_fernet().encrypt(token.encode()))
