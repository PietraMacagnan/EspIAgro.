from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AlertaViewSet

router = DefaultRouter()
router.register(r"alertas", AlertaViewSet, basename="alertas")

urlpatterns = [
    path("", include(router.urls)),
]