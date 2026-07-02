from rest_framework.routers import DefaultRouter

from .views import AnomaliaViewSet

router = DefaultRouter()
router.register(r"anomalias", AnomaliaViewSet, basename="anomalia")

urlpatterns = router.urls