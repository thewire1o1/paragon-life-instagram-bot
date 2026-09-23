import subprocess
from .config import ROOT
from .instagram import refresh_long_lived_token
from .token_store import write_token


def run():
    data = refresh_long_lived_token()
    token = data["access_token"]
    write_token(token)
    subprocess.run(["git", "config", "user.name", "paragon-life-bot"], cwd=ROOT, check=True)
    subprocess.run(["git", "config", "user.email", "actions@users.noreply.github.com"], cwd=ROOT, check=True)
    subprocess.run(["git", "add", "state/ig_token.enc"], cwd=ROOT, check=True)
    subprocess.run(["git", "commit", "-m", "auth: refresh Instagram token"], cwd=ROOT, check=True)
    subprocess.run(["git", "push"], cwd=ROOT, check=True)
    print(f"Instagram token refreshed; expires_in={data.get('expires_in')}")


if __name__ == "__main__":
    run()
