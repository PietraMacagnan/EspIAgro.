from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.monitoramento.models import Monitoramento
from apps.monitoramento.serializers import MonitoramentoSerializer
from apps.relatorios.models import Relatorio
from apps.relatorios.serializers import RelatorioSerializer
from .models import Talhao
from .serializers import TalhaoSerializer


class TalhaoViewSet(viewsets.ModelViewSet):
    """
    API completa de Talhões (CRUD).

    Endpoints:
    - GET /api/talhoes/
    - POST /api/talhoes/
    - GET /api/talhoes/{id}/
    - PUT /api/talhoes/{id}/
    - PATCH /api/talhoes/{id}/
    - DELETE /api/talhoes/{id}/

    Filtros suportados:
    - GET /api/talhoes/?propriedade={id}
    - GET /api/talhoes/?ativa=true
    - GET /api/talhoes/?somente_com_poligono=true

    Endpoints extras:
    - GET /api/talhoes/{id}/dashboard/
    - GET /api/talhoes/geojson/
    """

    serializer_class = TalhaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = (
                Talhao.objects.select_related("propriedade", "usuario")
                .all()
                .order_by("nome")
            )
        else:
            queryset = (
                Talhao.objects.select_related("propriedade", "usuario")
                .filter(usuario=user)
                .order_by("nome")
            )

        propriedade_id = self.request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(propriedade_id=propriedade_id)

        ativa = self.request.query_params.get("ativa")
        if ativa is not None:
            valor = ativa.lower() in ("true", "1", "sim", "yes")
            queryset = queryset.filter(ativa=valor)

        somente_com_poligono = self.request.query_params.get("somente_com_poligono")
        if somente_com_poligono is not None:
            valor = somente_com_poligono.lower() in ("true", "1", "sim", "yes")
            if valor:
                queryset = queryset.exclude(poligono__isnull=True)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user

        if user.is_authenticated:
            serializer.save(usuario=user)
        else:
            serializer.save()

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):
        """
        Dashboard consolidado de um talhão específico.
        """
        talhao = self.get_object()
        user = request.user
        propriedade = talhao.propriedade

        monitoramentos_qs = Monitoramento.objects.select_related(
            "talhao",
            "usuario",
        ).filter(talhao=talhao)

        relatorios_qs = Relatorio.objects.select_related(
            "monitoramento",
            "talhao",
            "propriedade",
            "usuario",
        ).filter(talhao=talhao)

        if not user.is_superuser:
            monitoramentos_qs = monitoramentos_qs.filter(usuario=user)
            relatorios_qs = relatorios_qs.filter(usuario=user)

        total_monitoramentos = monitoramentos_qs.count()
        total_relatorios = relatorios_qs.count()

        distribuicao_nivel_raw = (
            monitoramentos_qs.values("nivel_atencao")
            .annotate(total=Count("id"))
            .order_by("nivel_atencao")
        )

        distribuicao_nivel = {
            "baixo": 0,
            "medio": 0,
            "alto": 0,
            "critico": 0,
        }
        for item in distribuicao_nivel_raw:
            nivel = item.get("nivel_atencao")
            total = item.get("total", 0)
            if nivel in distribuicao_nivel:
                distribuicao_nivel[nivel] = total

        alertas_criticos_qs = monitoramentos_qs.filter(
            Q(nivel_atencao=Monitoramento.NivelAtencao.CRITICO)
            | Q(exige_acao_imediata=True)
            | Q(status_diagnostico=Monitoramento.StatusDiagnostico.ALERTA)
        ).order_by("-data_observacao", "-created_at")

        monitoramentos_recentes = monitoramentos_qs.order_by(
            "-data_observacao",
            "-created_at",
        )[:5]

        relatorios_recentes = relatorios_qs.order_by("-created_at")[:5]

        serializer_talhao = self.get_serializer(
            talhao,
            context={"request": request},
        )
        serializer_monitoramentos = MonitoramentoSerializer(
            monitoramentos_recentes,
            many=True,
            context={"request": request},
        )
        serializer_relatorios = RelatorioSerializer(
            relatorios_recentes,
            many=True,
            context={"request": request},
        )

        alertas_criticos = []
        for monitoramento in alertas_criticos_qs[:5]:
            alertas_criticos.append(
                {
                    "id": monitoramento.id,
                    "data_observacao": str(monitoramento.data_observacao),
                    "nivel_atencao": monitoramento.nivel_atencao,
                    "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                    "status_diagnostico": monitoramento.status_diagnostico,
                    "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                    "exige_acao_imediata": monitoramento.exige_acao_imediata,
                    "resumo_diagnostico": monitoramento.resumo_diagnostico,
                }
            )

        propriedade_resumo = None
        if propriedade:
            propriedade_resumo = {
                "id": propriedade.id,
                "nome": propriedade.nome,
                "municipio": propriedade.municipio,
                "uf": propriedade.uf,
                "area_total_ha": (
                    float(propriedade.area_total_ha)
                    if propriedade.area_total_ha is not None
                    else None
                ),
                "ativa": propriedade.ativa,
            }

        return Response(
            {
                "talhao": serializer_talhao.data,
                "propriedade": propriedade_resumo,
                "resumo": {
                    "total_monitoramentos": total_monitoramentos,
                    "total_relatorios": total_relatorios,
                    "total_alertas_criticos": alertas_criticos_qs.count(),
                },
                "distribuicao_nivel_atencao": distribuicao_nivel,
                "monitoramentos_recentes": serializer_monitoramentos.data,
                "relatorios_recentes": serializer_relatorios.data,
                "alertas_criticos": alertas_criticos,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="geojson")
    def geojson(self, request):
        """
        Retorna os talhões no formato GeoJSON para uso em mapa.
        """
        queryset = self.filter_queryset(self.get_queryset())

        features = []
        for talhao in queryset:
            if not talhao.poligono:
                continue

            centroide = talhao.centroide
            bbox = talhao.poligono.extent if talhao.poligono else None

            features.append(
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": talhao.poligono.coords,
                    },
                    "properties": {
                        "id": talhao.id,
                        "nome": talhao.nome,
                        "cultivar": talhao.cultivar,
                        "sistema_cultivo": talhao.sistema_cultivo,
                        "data_plantio": (
                            str(talhao.data_plantio)
                            if talhao.data_plantio
                            else None
                        ),
                        "area_ha": (
                            float(talhao.area_ha)
                            if talhao.area_ha is not None
                            else None
                        ),
                        "ativa": talhao.ativa,
                        "propriedade_id": talhao.propriedade_id,
                        "propriedade_nome": (
                            talhao.propriedade.nome if talhao.propriedade else None
                        ),
                        "centroide": (
                            {
                                "type": "Point",
                                "coordinates": [centroide.x, centroide.y],
                            }
                            if centroide
                            else None
                        ),
                        "centroide_latitude": (
                            centroide.y if centroide else None
                        ),
                        "centroide_longitude": (
                            centroide.x if centroide else None
                        ),
                        "bbox": (
                            {
                                "xmin": bbox[0],
                                "ymin": bbox[1],
                                "xmax": bbox[2],
                                "ymax": bbox[3],
                            }
                            if bbox
                            else None
                        ),
                    },
                }
            )

        return Response(
            {
                "type": "FeatureCollection",
                "features": features,
            }
        )