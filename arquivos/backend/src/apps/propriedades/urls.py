from rest_framework.routers import DefaultRouter

from .views import PropriedadeViewSet

router = DefaultRouter()
router.register(r"propriedades", PropriedadeViewSet, basename="propriedade")

urlpatterns = router.urls