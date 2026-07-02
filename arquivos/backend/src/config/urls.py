"""
URL configuration do projeto EspIAgro.

Aqui definimos:
- Admin
- Auth JWT
- Auth expandida (cadastro, recuperação e redefinição de senha)
- API modular
- Swagger / Redoc
- Media em ambiente de desenvolvimento
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # -------------------------
    # ADMIN
    # -------------------------
    path("admin/", admin.site.urls),

    # -------------------------
    # AUTH JWT ATUAL
    # -------------------------
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/verify/", TokenVerifyView.as_view(), name="token_verify"),

    # -------------------------
    # AUTH EXPANDIDA
    # -------------------------
    path("api/auth/", include("apps.auth_api.urls")),

    # -------------------------
    # API BASE (MODULAR)
    # -------------------------
    path(
        "api/",
        include(
            [
                path("", include("apps.propriedades.urls")),
                path("", include("apps.talhoes.urls")),
                path("", include("apps.monitoramento.urls")),
                path("", include("apps.anomalias.urls")),
                path("", include("apps.relatorios.urls")),
                path("", include("apps.base_conhecimento.urls")),
                path("", include("apps.alertas.urls")),
            ]
        ),
    ),

    # -------------------------
    # DOCUMENTAÇÃO
    # -------------------------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

# --------------------------------------------------
# MEDIA (somente desenvolvimento)
# --------------------------------------------------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)