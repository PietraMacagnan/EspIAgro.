from rest_framework.routers import DefaultRouter

from .views import MonitoramentoViewSet

router = DefaultRouter()
router.register(r"monitoramentos", MonitoramentoViewSet, basename="monitoramento")

urlpatterns = router.urls