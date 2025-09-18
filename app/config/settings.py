from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    google_api_key: str
    app_name: str = "Autonomous Strategic Finance"
    debug: bool = False

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()