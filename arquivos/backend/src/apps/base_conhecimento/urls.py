from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import FonteConhecimentoViewSet

router = DefaultRouter()
router.register(r"base-conhecimento", FonteConhecimentoViewSet, basename="base-conhecimento")

urlpatterns = [
    path("", include(router.urls)),
]