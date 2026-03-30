from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL : str
    DATABASE_URL_SYNC: str
    REDIS_URL : str
    SECRET_KEY : str
    ALGORITHM : str
    ACCESS_TOKEN_EXPIRE_MINUTES : int = 10
    ENVIRONMENT : str
    
    
    class Config:
        env_file = '.env'
    
settings = Settings()
    