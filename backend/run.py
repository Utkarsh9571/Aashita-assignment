import os
import uvicorn
from app.core.config import get_settings


def start():
    """
    Production entrypoint for Render and other cloud platforms.
    Reads PORT from the environment (defaulting to Settings.PORT or 8000).
    Binds to 0.0.0.0 to accept external traffic from cloud reverse proxies.
    """
    settings = get_settings()
    port = int(os.environ.get("PORT", settings.PORT))
    print(f"Starting Meeting Room Booking API on 0.0.0.0:{port} (env: {settings.ENVIRONMENT})...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    start()
