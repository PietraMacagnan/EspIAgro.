import json

from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.monitoramento.models import Monitoramento
from apps.monitoramento.serializers import MonitoramentoSerializer
from apps.relatorios.models import Relatorio
from apps.relatorios.serializers import RelatorioSerializer
from apps.talhoes.models import Talhao
from apps.talhoes.serializers import TalhaoSerializer
from .models import Propriedade
from .serializers import PropriedadeSerializer


class PropriedadeViewSet(viewsets.ModelViewSet):
    """
    API completa de Propriedades.

    Endpoints principais:
    - GET /api/propriedades/
    - POST /api/propriedades/
    - GET /api/propriedades/{id}/
    - PUT /api/propriedades/{id}/
    - PATCH /api/propriedades/{id}/
    - DELETE /api/propriedades/{id}/

    Filtros suportados:
    - GET /api/propriedades/?ativa=true
    - GET /api/propriedades/?propriedade=1
    - GET /api/propriedades/?talhao=1

    Endpoints extras:
    - GET /api/propriedades/{id}/talhoes/
    - GET /api/propriedades/{id}/dashboard/
    - GET /api/propriedades/geojson/
    - GET /api/propriedades/mapa/

    Fase 4 — Camada geoespacial:
    - propriedades em Polygon/PostGIS
    - talhões em Polygon/PostGIS
    - monitoramentos em Point via latitude/longitude
    - retorno consolidado para frontend de mapa
    - metadados de camadas para mapa padrão/satélite
    - estrutura compatível para uso posterior em QGIS, frontend e relatórios espaciais
    """

    serializer_class = PropriedadeSerializer
    permission_classes = [IsAuthenticated]

    # ---------------------------------------------------------------------
    # Helpers gerais
    # ---------------------------------------------------------------------
    def _to_bool(self, value):
        if value is None:
            return None

        value = str(value).strip().lower()

        if value in ("true", "1", "sim", "yes", "s"):
            return True

        if value in ("false", "0", "nao", "não", "no", "n"):
            return False

        return None

    def _get_queryset_propriedades_base(self, request):
        user = request.user

        if user.is_superuser:
            queryset = Propriedade.objects.all().order_by("nome")
        else:
            queryset = Propriedade.objects.filter(usuario=user).order_by("nome")

        ativa = self._to_bool(request.query_params.get("ativa"))
        if ativa is not None:
            queryset = queryset.filter(ativa=ativa)

        propriedade_id = request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(id=propriedade_id)

        talhao_id = request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(talhoes__id=talhao_id).distinct()

        return queryset

    def _get_queryset_talhoes_base(self, request):
        user = request.user

        queryset = Talhao.objects.select_related(
            "propriedade",
            "usuario",
        ).all()

        if not user.is_superuser:
            queryset = queryset.filter(
                Q(usuario=user) | Q(propriedade__usuario=user)
            ).distinct()

        propriedade_id = request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(propriedade_id=propriedade_id)

        talhao_id = request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(id=talhao_id)

        ativa = self._to_bool(request.query_params.get("ativa"))
        if ativa is not None:
            queryset = queryset.filter(ativa=ativa)

        return queryset.order_by("nome")

    def _get_queryset_monitoramentos_base(self, request):
        user = request.user

        queryset = Monitoramento.objects.select_related(
            "usuario",
            "talhao",
            "talhao__propriedade",
        ).all()

        if not user.is_superuser:
            queryset = queryset.filter(
                Q(usuario=user)
                | Q(talhao__usuario=user)
                | Q(talhao__propriedade__usuario=user)
            ).distinct()

        propriedade_id = request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(talhao__propriedade_id=propriedade_id)

        talhao_id = request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(talhao_id=talhao_id)

        return queryset.order_by("-data_observacao", "-created_at")

    def _geom_to_geojson(self, geom):
        if not geom:
            return None

        try:
            return json.loads(geom.geojson)
        except Exception:
            return None

    def _bbox_dict(self, geom):
        if not geom:
            return None

        try:
            xmin, ymin, xmax, ymax = geom.extent
            return {
                "xmin": xmin,
                "ymin": ymin,
                "xmax": xmax,
                "ymax": ymax,
            }
        except Exception:
            return None

    def _centroide_dict(self, geom):
        if not geom:
            return None

        try:
            centroide = geom.centroid
            if not centroide:
                return None

            return {
                "type": "Point",
                "coordinates": [centroide.x, centroide.y],
            }
        except Exception:
            return None

    def _centroide_latitude(self, geom):
        if not geom:
            return None

        try:
            centroide = geom.centroid
            return centroide.y if centroide else None
        except Exception:
            return None

    def _centroide_longitude(self, geom):
        if not geom:
            return None

        try:
            centroide = geom.centroid
            return centroide.x if centroide else None
        except Exception:
            return None

    def _calcular_bbox_geral(self, *feature_collections):
        bboxes = []

        for feature_collection in feature_collections:
            for feature in feature_collection.get("features", []):
                properties = feature.get("properties", {}) or {}
                bbox = properties.get("bbox")

                if not bbox:
                    continue

                try:
                    bboxes.append(
                        {
                            "xmin": float(bbox["xmin"]),
                            "ymin": float(bbox["ymin"]),
                            "xmax": float(bbox["xmax"]),
                            "ymax": float(bbox["ymax"]),
                        }
                    )
                except Exception:
                    continue

        if not bboxes:
            return None

        return {
            "xmin": min(item["xmin"] for item in bboxes),
            "ymin": min(item["ymin"] for item in bboxes),
            "xmax": max(item["xmax"] for item in bboxes),
            "ymax": max(item["ymax"] for item in bboxes),
        }

    def _calcular_centro_bbox(self, bbox):
        if not bbox:
            return None

        try:
            longitude = (float(bbox["xmin"]) + float(bbox["xmax"])) / 2
            latitude = (float(bbox["ymin"]) + float(bbox["ymax"])) / 2

            return {
                "latitude": latitude,
                "longitude": longitude,
                "point": {
                    "type": "Point",
                    "coordinates": [longitude, latitude],
                },
            }
        except Exception:
            return None

    def _calcular_zoom_sugerido(self, bbox):
        if not bbox:
            return 12

        try:
            delta_x = abs(float(bbox["xmax"]) - float(bbox["xmin"]))
            delta_y = abs(float(bbox["ymax"]) - float(bbox["ymin"]))
            maior_delta = max(delta_x, delta_y)

            if maior_delta <= 0.005:
                return 17

            if maior_delta <= 0.01:
                return 16

            if maior_delta <= 0.03:
                return 15

            if maior_delta <= 0.08:
                return 13

            if maior_delta <= 0.2:
                return 11

            return 9
        except Exception:
            return 12

    def _feature_collection(self, features):
        return {
            "type": "FeatureCollection",
            "features": features,
        }

    def _configuracao_camadas_mapa(self):
        """
        Metadados para o frontend renderizar camadas de mapa.

        Observação:
        - o backend apenas informa as camadas sugeridas;
        - a visualização satélite será implementada no frontend;
        - nenhuma chamada externa é feita aqui.
        """
        return {
            "srid": 4326,
            "sistema_referencia": "EPSG:4326 - WGS84",
            "camada_padrao": "osm",
            "camada_satelite_disponivel": True,
            "camadas_base": [
                {
                    "id": "osm",
                    "nome": "Mapa padrão",
                    "tipo": "ruas",
                    "url_template": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    "atribuicao": "OpenStreetMap contributors",
                    "ativo": True,
                },
                {
                    "id": "satelite",
                    "nome": "Satélite",
                    "tipo": "satelite",
                    "url_template": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    "atribuicao": "Esri, Maxar, Earthstar Geographics and contributors",
                    "ativo": True,
                },
            ],
            "camadas_operacionais": [
                {
                    "id": "propriedades",
                    "nome": "Propriedades",
                    "tipo_geometria": "Polygon",
                    "origem": "/api/propriedades/geojson/",
                    "cor_sugerida": "#8B5E34",
                    "ordem": 1,
                },
                {
                    "id": "talhoes",
                    "nome": "Talhões",
                    "tipo_geometria": "Polygon",
                    "origem": "/api/talhoes/geojson/",
                    "cor_sugerida": "#2563EB",
                    "ordem": 2,
                },
                {
                    "id": "monitoramentos",
                    "nome": "Monitoramentos",
                    "tipo_geometria": "Point",
                    "origem": "/api/propriedades/mapa/",
                    "cor_sugerida": "#16A34A",
                    "ordem": 3,
                },
            ],
            "orientacao_frontend": (
                "Renderizar primeiro a camada base selecionada, depois propriedades, "
                "talhões e pontos de monitoramento. A camada satélite deve ser alternável "
                "no frontend."
            ),
        }

    # ---------------------------------------------------------------------
    # Queryset principal
    # ---------------------------------------------------------------------
    def get_queryset(self):
        return self._get_queryset_propriedades_base(self.request)

    def perform_create(self, serializer):
        user = self.request.user

        if user.is_authenticated:
            serializer.save(usuario=user)
        else:
            serializer.save()

    # ---------------------------------------------------------------------
    # Builders GeoJSON
    # ---------------------------------------------------------------------
    def _montar_feature_propriedade(self, propriedade):
        geometry = self._geom_to_geojson(propriedade.poligono)

        if not geometry:
            return None

        bbox = self._bbox_dict(propriedade.poligono)
        centroide = self._centroide_dict(propriedade.poligono)

        return {
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "id": propriedade.id,
                "camada": "propriedades",
                "tipo_geometria": "Polygon",
                "nome": propriedade.nome,
                "municipio": propriedade.municipio,
                "uf": propriedade.uf,
                "area_total_ha": (
                    float(propriedade.area_total_ha)
                    if propriedade.area_total_ha is not None
                    else None
                ),
                "descricao": propriedade.descricao,
                "ativa": propriedade.ativa,
                "centroide": centroide,
                "centroide_latitude": self._centroide_latitude(
                    propriedade.poligono
                ),
                "centroide_longitude": self._centroide_longitude(
                    propriedade.poligono
                ),
                "bbox": bbox,
                "created_at": (
                    propriedade.created_at.isoformat()
                    if propriedade.created_at
                    else None
                ),
                "updated_at": (
                    propriedade.updated_at.isoformat()
                    if propriedade.updated_at
                    else None
                ),
            },
        }

    def _montar_feature_talhao(self, talhao):
        geometry = self._geom_to_geojson(talhao.poligono)

        if not geometry:
            return None

        bbox = self._bbox_dict(talhao.poligono)
        centroide = self._centroide_dict(talhao.poligono)

        return {
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "id": talhao.id,
                "camada": "talhoes",
                "tipo_geometria": "Polygon",
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
                "observacoes": talhao.observacoes,
                "ativa": talhao.ativa,
                "propriedade_id": talhao.propriedade_id,
                "propriedade_nome": (
                    talhao.propriedade.nome if talhao.propriedade else None
                ),
                "centroide": centroide,
                "centroide_latitude": self._centroide_latitude(talhao.poligono),
                "centroide_longitude": self._centroide_longitude(talhao.poligono),
                "bbox": bbox,
                "created_at": (
                    talhao.created_at.isoformat()
                    if talhao.created_at
                    else None
                ),
                "updated_at": (
                    talhao.updated_at.isoformat()
                    if talhao.updated_at
                    else None
                ),
            },
        }

    def _montar_feature_monitoramento(self, monitoramento, request):
        if monitoramento.latitude is None or monitoramento.longitude is None:
            return None

        latitude = float(monitoramento.latitude)
        longitude = float(monitoramento.longitude)

        foto_url = None
        if monitoramento.foto_monitoramento:
            try:
                foto_url = request.build_absolute_uri(
                    monitoramento.foto_monitoramento.url
                )
            except Exception:
                foto_url = monitoramento.foto_monitoramento.url

        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude],
            },
            "properties": {
                "id": monitoramento.id,
                "camada": "monitoramentos",
                "tipo_geometria": "Point",
                "talhao_id": monitoramento.talhao_id,
                "talhao_nome": (
                    monitoramento.talhao.nome if monitoramento.talhao else None
                ),
                "propriedade_id": (
                    monitoramento.talhao.propriedade_id
                    if monitoramento.talhao
                    and monitoramento.talhao.propriedade_id
                    else None
                ),
                "propriedade_nome": (
                    monitoramento.talhao.propriedade.nome
                    if monitoramento.talhao
                    and monitoramento.talhao.propriedade
                    else None
                ),
                "data_observacao": str(monitoramento.data_observacao),
                "estadio_fenologico": monitoramento.estadio_fenologico,
                "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
                "cultura": monitoramento.cultura,
                "escopo_agronomico": monitoramento.escopo_agronomico,
                "altura_planta_cm": (
                    float(monitoramento.altura_planta_cm)
                    if monitoramento.altura_planta_cm is not None
                    else None
                ),
                "populacao_plantas": monitoramento.populacao_plantas,
                "sanidade": monitoramento.sanidade,
                "umidade_solo": (
                    float(monitoramento.umidade_solo)
                    if monitoramento.umidade_solo is not None
                    else None
                ),
                "nivel_atencao": monitoramento.nivel_atencao,
                "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                "status_diagnostico": monitoramento.status_diagnostico,
                "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                "possui_anomalias": monitoramento.possui_anomalias,
                "exige_acao_imediata": monitoramento.exige_acao_imediata,
                "resumo_diagnostico": monitoramento.resumo_diagnostico,
                "score_risco": (
                    float(monitoramento.score_risco)
                    if monitoramento.score_risco is not None
                    else 0.0
                ),
                "faixa_risco": monitoramento.faixa_risco,
                "faixa_risco_display": monitoramento.get_faixa_risco_display(),
                "prioridade_operacional": monitoramento.prioridade_operacional,
                "prioridade_operacional_display": monitoramento.get_prioridade_operacional_display(),
                "justificativa_risco": monitoramento.justificativa_risco,
                "foto_monitoramento_url": foto_url,
                "status_imagem_ia": monitoramento.status_imagem_ia,
                "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
                "latitude": latitude,
                "longitude": longitude,
                "bbox": {
                    "xmin": longitude,
                    "ymin": latitude,
                    "xmax": longitude,
                    "ymax": latitude,
                },
                "clima": {
                    "disponivel_para_consulta": True,
                    "endpoint": f"/api/monitoramentos/{monitoramento.id}/clima/",
                    "observacao": (
                        "O clima é consultado sob demanda para evitar lentidão "
                        "no carregamento do mapa."
                    ),
                },
                "created_at": (
                    monitoramento.created_at.isoformat()
                    if monitoramento.created_at
                    else None
                ),
                "updated_at": (
                    monitoramento.updated_at.isoformat()
                    if monitoramento.updated_at
                    else None
                ),
            },
        }

    # ---------------------------------------------------------------------
    # Endpoints relacionais
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="talhoes")
    def listar_talhoes(self, request, pk=None):
        """
        Lista todos os talhões vinculados a uma propriedade específica.
        """
        propriedade = self.get_object()
        talhoes = propriedade.talhoes.all().order_by("nome")
        serializer = TalhaoSerializer(talhoes, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):
        """
        Dashboard consolidado de uma propriedade específica.
        """
        propriedade = self.get_object()
        user = request.user

        talhoes_qs = propriedade.talhoes.all().order_by("nome")

        monitoramentos_qs = Monitoramento.objects.select_related(
            "talhao",
            "usuario",
        ).filter(talhao__propriedade=propriedade)

        relatorios_qs = Relatorio.objects.select_related(
            "monitoramento",
            "talhao",
            "propriedade",
            "usuario",
        ).filter(propriedade=propriedade)

        if not user.is_superuser:
            monitoramentos_qs = monitoramentos_qs.filter(
                Q(usuario=user)
                | Q(talhao__usuario=user)
                | Q(talhao__propriedade__usuario=user)
            ).distinct()

            relatorios_qs = relatorios_qs.filter(usuario=user)

        total_talhoes = talhoes_qs.count()
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
            | Q(faixa_risco=Monitoramento.FaixaRisco.CRITICO)
            | Q(
                prioridade_operacional=Monitoramento.PrioridadeOperacional.IMEDIATA
            )
        ).order_by("-score_risco", "-data_observacao", "-created_at")

        monitoramentos_recentes = monitoramentos_qs.order_by(
            "-data_observacao",
            "-created_at",
        )[:5]

        relatorios_recentes = relatorios_qs.order_by("-created_at")[:5]

        serializer_talhoes = TalhaoSerializer(
            talhoes_qs,
            many=True,
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
                    "talhao_id": monitoramento.talhao_id,
                    "talhao_nome": (
                        monitoramento.talhao.nome
                        if monitoramento.talhao
                        else None
                    ),
                    "data_observacao": str(monitoramento.data_observacao),
                    "nivel_atencao": monitoramento.nivel_atencao,
                    "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                    "status_diagnostico": monitoramento.status_diagnostico,
                    "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                    "score_risco": (
                        float(monitoramento.score_risco)
                        if monitoramento.score_risco is not None
                        else 0.0
                    ),
                    "faixa_risco": monitoramento.faixa_risco,
                    "faixa_risco_display": monitoramento.get_faixa_risco_display(),
                    "prioridade_operacional": monitoramento.prioridade_operacional,
                    "prioridade_operacional_display": monitoramento.get_prioridade_operacional_display(),
                    "exige_acao_imediata": monitoramento.exige_acao_imediata,
                    "resumo_diagnostico": monitoramento.resumo_diagnostico,
                    "justificativa_risco": monitoramento.justificativa_risco,
                }
            )

        serializer_propriedade = self.get_serializer(
            propriedade,
            context={"request": request},
        )

        return Response(
            {
                "propriedade": serializer_propriedade.data,
                "resumo": {
                    "total_talhoes": total_talhoes,
                    "total_monitoramentos": total_monitoramentos,
                    "total_relatorios": total_relatorios,
                    "total_alertas_criticos": alertas_criticos_qs.count(),
                },
                "distribuicao_nivel_atencao": distribuicao_nivel,
                "talhoes": serializer_talhoes.data,
                "monitoramentos_recentes": serializer_monitoramentos.data,
                "relatorios_recentes": serializer_relatorios.data,
                "alertas_criticos": alertas_criticos,
            },
            status=status.HTTP_200_OK,
        )

    # ---------------------------------------------------------------------
    # Endpoints GeoJSON / Mapa
    # ---------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="geojson")
    def geojson(self, request):
        """
        Retorna propriedades em GeoJSON para mapa, frontend ou QGIS.
        """
        queryset = self.filter_queryset(self.get_queryset())

        features = []
        for propriedade in queryset:
            feature = self._montar_feature_propriedade(propriedade)

            if feature:
                features.append(feature)

        feature_collection = self._feature_collection(features)

        bbox_geral = self._calcular_bbox_geral(feature_collection)

        return Response(
            {
                "type": "FeatureCollection",
                "features": features,
                "metadata": {
                    "camada": "propriedades",
                    "tipo_geometria": "Polygon",
                    "srid": 4326,
                    "sistema_referencia": "EPSG:4326 - WGS84",
                    "total": len(features),
                    "bbox_geral": bbox_geral,
                    "centro_sugerido": self._calcular_centro_bbox(bbox_geral),
                },
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="mapa")
    def mapa(self, request):
        """
        Endpoint consolidado para frontend de mapa.

        Retorna:
        - propriedades em GeoJSON
        - talhões em GeoJSON
        - monitoramentos em GeoJSON Point
        - resumo consolidado
        - bbox geral
        - centro sugerido
        - zoom sugerido
        - metadados de camadas base, incluindo satélite
        - estrutura compatível com frontend e QGIS
        """
        propriedades_qs = self._get_queryset_propriedades_base(request)
        talhoes_qs = self._get_queryset_talhoes_base(request)
        monitoramentos_qs = self._get_queryset_monitoramentos_base(request)

        somente_com_poligono = self._to_bool(
            request.query_params.get("somente_com_poligono")
        )
        if somente_com_poligono is True:
            propriedades_qs = propriedades_qs.exclude(poligono__isnull=True)
            talhoes_qs = talhoes_qs.exclude(poligono__isnull=True)

        somente_com_ponto = self._to_bool(
            request.query_params.get("somente_com_ponto")
        )
        if somente_com_ponto is True:
            monitoramentos_qs = monitoramentos_qs.exclude(
                latitude__isnull=True
            ).exclude(
                longitude__isnull=True
            )

        propriedades_features = []
        for propriedade in propriedades_qs:
            feature = self._montar_feature_propriedade(propriedade)

            if feature:
                propriedades_features.append(feature)

        talhoes_features = []
        for talhao in talhoes_qs:
            feature = self._montar_feature_talhao(talhao)

            if feature:
                talhoes_features.append(feature)

        monitoramentos_features = []
        for monitoramento in monitoramentos_qs:
            feature = self._montar_feature_monitoramento(
                monitoramento=monitoramento,
                request=request,
            )

            if feature:
                monitoramentos_features.append(feature)

        propriedades_fc = self._feature_collection(propriedades_features)
        talhoes_fc = self._feature_collection(talhoes_features)
        monitoramentos_fc = self._feature_collection(monitoramentos_features)

        bbox_geral = self._calcular_bbox_geral(
            propriedades_fc,
            talhoes_fc,
            monitoramentos_fc,
        )

        centro_sugerido = self._calcular_centro_bbox(bbox_geral)
        zoom_sugerido = self._calcular_zoom_sugerido(bbox_geral)

        return Response(
            {
                "escopo_agronomico": "milho",
                "resumo": {
                    "total_propriedades": propriedades_qs.count(),
                    "total_propriedades_com_poligono": len(
                        propriedades_features
                    ),
                    "total_talhoes": talhoes_qs.count(),
                    "total_talhoes_com_poligono": len(talhoes_features),
                    "total_monitoramentos": monitoramentos_qs.count(),
                    "total_monitoramentos_com_ponto": len(
                        monitoramentos_features
                    ),
                },
                "mapa": {
                    "srid": 4326,
                    "sistema_referencia": "EPSG:4326 - WGS84",
                    "bbox_geral": bbox_geral,
                    "centro_sugerido": centro_sugerido,
                    "zoom_sugerido": zoom_sugerido,
                    "camadas": self._configuracao_camadas_mapa(),
                    "observacoes": [
                        "O backend retorna os dados espaciais em GeoJSON.",
                        "A troca entre mapa padrão e satélite deve ser feita no frontend.",
                        "Dados climáticos são consultados por monitoramento para evitar lentidão no mapa.",
                        "Estrutura preparada para uso posterior em QGIS e relatórios espaciais.",
                    ],
                },
                "qgis": {
                    "compatibilidade_geojson": True,
                    "camadas_disponiveis": [
                        {
                            "id": "propriedades",
                            "nome": "Propriedades",
                            "tipo_geometria": "Polygon",
                            "endpoint": "/api/propriedades/geojson/",
                        },
                        {
                            "id": "talhoes",
                            "nome": "Talhões",
                            "tipo_geometria": "Polygon",
                            "endpoint": "/api/talhoes/geojson/",
                        },
                        {
                            "id": "monitoramentos",
                            "nome": "Monitoramentos",
                            "tipo_geometria": "Point",
                            "endpoint": "/api/propriedades/mapa/",
                        },
                    ],
                },
                "propriedades": propriedades_fc,
                "talhoes": talhoes_fc,
                "monitoramentos": monitoramentos_fc,
            },
            status=status.HTTP_200_OK,
        )