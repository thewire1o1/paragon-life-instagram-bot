import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API_VERSION = os.getenv("IG_API_VERSION", "v26.0")
IG_API_HOST = os.getenv("IG_API_HOST", "https://graph.instagram.com")
IG_USER_ID = os.getenv("IG_USER_ID", "")
SELF_USERNAME = os.getenv("IG_USERNAME", "paragon.life")
OPENAI_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-5.6-luna")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2")
POST_HOUR_LOCAL = int(os.getenv("POST_HOUR_LOCAL", "9"))
TZ_NAME = os.getenv("TZ_NAME", "America/Los_Angeles")
TOKEN_FILE = ROOT / "state" / "ig_token.enc"
STATE_FILE = ROOT / "state" / "state.json"
BRAND_FILE = ROOT / "brand.json"
ASSET_DIR = ROOT / "assets"
