from .token_store import write_token
import os

if __name__ == "__main__":
    token = os.environ.get("IG_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("IG_ACCESS_TOKEN required for one-time bootstrap")
    write_token(token)
    print("Encrypted Instagram token written to state/ig_token.enc")
