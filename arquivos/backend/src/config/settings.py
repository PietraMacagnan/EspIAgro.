"""
Django settings for config project.

Base inicial do backend do EspIAgro.
Fase atual:
- PostgreSQL + PostGIS
- JWT
- Swagger
- Upload de mídia
- Clima em tempo real
- CORS liberado para frontend local
- Preparação para cadastro de usuário e recuperação de senha
"""

from datetime import timedelta
from pathlib import Path
import os

from dotenv import load_dotenv

# --------------------------------------------------
# Paths / Env
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")

# --------------------------------------------------
# Windows GIS libs (GDAL / GEOS)
# Só ativam se existirem no .env
# --------------------------------------------------
GDAL_LIBRARY_PATH = os.getenv("GDAL_LIBRARY_PATH", "")
GEOS_LIBRARY_PATH = os.getenv("GEOS_LIBRARY_PATH", "")

if GDAL_LIBRARY_PATH:
    os.environ["GDAL_LIBRARY_PATH"] = GDAL_LIBRARY_PATH

if GEOS_LIBRARY_PATH:
    os.environ["GEOS_LIBRARY_PATH"] = GEOS_LIBRARY_PATH

# --------------------------------------------------
# Segurança / Ambiente
# --------------------------------------------------
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-espiagro-change-this-in-production",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost",
).split(",")

# --------------------------------------------------
# Aplicações
# --------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # GIS
    "django.contrib.gis",

    # Terceiros
    "corsheaders",
    "rest_framework",
    "drf_spectacular",

    # Apps do projeto
    "apps.auth_api",
    "apps.propriedades",
    "apps.talhoes",
    "apps.monitoramento",
    "apps.anomalias",
    "apps.relatorios",
    "apps.base_conhecimento",
    "apps.alertas.apps.AlertasConfig",
]

# --------------------------------------------------
# Middlewares
# --------------------------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --------------------------------------------------
# Banco de Dados
# Fase atual: PostgreSQL + PostGIS
# --------------------------------------------------
DB_ENGINE = os.getenv("DB_ENGINE", "django.db.backends.sqlite3")
DB_NAME = os.getenv("DB_NAME", "db.sqlite3")
DB_USER = os.getenv("DB_USER", "")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "")
DB_PORT = os.getenv("DB_PORT", "")

if DB_ENGINE == "django.db.backends.sqlite3":
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": BASE_DIR / DB_NAME if not Path(DB_NAME).is_absolute() else DB_NAME,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": DB_ENGINE,
            "NAME": DB_NAME,
            "USER": DB_USER,
            "PASSWORD": DB_PASSWORD,
            "HOST": DB_HOST,
            "PORT": DB_PORT,
        }
    }

# --------------------------------------------------
# Validação de Senha
# --------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# --------------------------------------------------
# Internacionalização
# --------------------------------------------------
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Cuiaba"

USE_I18N = True
USE_TZ = True

# --------------------------------------------------
# Arquivos estáticos
# --------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# --------------------------------------------------
# Arquivos de mídia (uploads)
# --------------------------------------------------
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# --------------------------------------------------
# Chave primária padrão
# --------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --------------------------------------------------
# Django REST Framework
# --------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

# --------------------------------------------------
# JWT
# --------------------------------------------------
JWT_ACCESS_MINUTES = int(os.getenv("JWT_ACCESS_MINUTES", "1440"))
JWT_REFRESH_DAYS = int(os.getenv("JWT_REFRESH_DAYS", "30"))

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=JWT_ACCESS_MINUTES),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=JWT_REFRESH_DAYS),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": False,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------------------------------------
# Swagger / OpenAPI
# --------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "EspIAgro API",
    "DESCRIPTION": (
        "API oficial do EspIAgro - Plataforma inteligente de monitoramento agrícola."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --------------------------------------------------
# CORS / Frontend local
# --------------------------------------------------
ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "192.168.1.6",
    "54.232.189.113",
    "10.250.151.190",
    "192.168.1.3",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://192.168.1.6:5173",
    "http://54.232.189.113:5173",
    "http://10.250.151.190:5173",
    "http://192.168.1.3:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://192.168.1.6:5173",
    "http://54.232.189.113:5173",
    "http://10.250.151.190:5173",
    "http://192.168.1.3:5173",
]

# --------------------------------------------------
# APIs externas
# --------------------------------------------------
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

# --------------------------------------------------
# Uploads
# --------------------------------------------------
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB

# --------------------------------------------------
# Frontend / URLs públicas
# Usado em fluxos como recuperação de senha
# --------------------------------------------------
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
FRONTEND_RESET_PASSWORD_PATH = os.getenv(
    "FRONTEND_RESET_PASSWORD_PATH",
    "/reset-password",
)

# --------------------------------------------------
# Email
# Preparação para recuperação de senha e notificações futuras
# Em desenvolvimento pode usar console backend
# --------------------------------------------------
EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False") == "True"

DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "EspIAgro <no-reply@espiagro.local>",
)

SERVER_EMAIL = DEFAULT_FROM_EMAIL

# --------------------------------------------------
# Tokens / segurança para fluxos auxiliares
# --------------------------------------------------
PASSWORD_RESET_TIMEOUT = int(
    os.getenv("PASSWORD_RESET_TIMEOUT", str(60 * 60)),
)