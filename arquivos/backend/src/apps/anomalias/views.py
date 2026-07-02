from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.monitoramento.models import Monitoramento
from .models import Anomalia
from .serializers import AnomaliaSerializer


class AnomaliaViewSet(viewsets.ModelViewSet):
    """
    API completa de Anomalias (CRUD).

    Filtros suportados:
    - GET /api/anomalias/?monitoramento={id}
    - GET /api/anomalias/?tipo=praga
    - GET /api/anomalias/?exige_atencao=true
    """

    serializer_class = AnomaliaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = Anomalia.objects.select_related(
                "monitoramento",
                "monitoramento__talhao",
                "monitoramento__usuario",
            ).all()
        else:
            queryset = Anomalia.objects.select_related(
                "monitoramento",
                "monitoramento__talhao",
                "monitoramento__usuario",
            ).filter(monitoramento__usuario=user)

        monitoramento_id = self.request.query_params.get("monitoramento")
        if monitoramento_id:
            queryset = queryset.filter(monitoramento_id=monitoramento_id)

        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        exige_atencao = self.request.query_params.get("exige_atencao")
        if exige_atencao is not None:
            valor = exige_atencao.lower() in ("true", "1", "sim", "yes")
            queryset = queryset.filter(exige_atencao=valor)

        return queryset.order_by("-created_at")

    def _atualizar_diagnostico_monitoramento(self, monitoramento: Monitoramento) -> None:
        """
        Regras iniciais de diagnóstico automático.

        Mantém o monitoramento sincronizado com suas anomalias ativas.
        """
        anomalias = monitoramento.anomalias.filter(ativa=True)

        if not anomalias.exists():
            monitoramento.possui_anomalias = False
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.BAIXO
            monitoramento.status_diagnostico = Monitoramento.StatusDiagnostico.CONCLUIDO
            monitoramento.exige_acao_imediata = False
            monitoramento.resumo_diagnostico = (
                "Monitoramento sem anomalias ativas registradas até o momento."
            )
            monitoramento.save(
                update_fields=[
                    "possui_anomalias",
                    "nivel_atencao",
                    "status_diagnostico",
                    "exige_acao_imediata",
                    "resumo_diagnostico",
                    "updated_at",
                ]
            )
            return

        monitoramento.possui_anomalias = True

        severidade_maxima = max(anomalias.values_list("severidade", flat=True))
        existe_anomalia_critica = anomalias.filter(exige_atencao=True).exists()

        if severidade_maxima >= 4 or existe_anomalia_critica:
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.CRITICO
            monitoramento.status_diagnostico = Monitoramento.StatusDiagnostico.ALERTA
            monitoramento.exige_acao_imediata = True
            monitoramento.resumo_diagnostico = (
                "Foram identificadas anomalias de alta criticidade. "
                "Recomenda-se atenção imediata ao monitoramento."
            )
        elif severidade_maxima == 3:
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.ALTO
            monitoramento.status_diagnostico = Monitoramento.StatusDiagnostico.EM_ANALISE
            monitoramento.exige_acao_imediata = False
            monitoramento.resumo_diagnostico = (
                "Foram registradas anomalias de severidade moderada. "
                "Recomenda-se acompanhamento próximo do talhão."
            )
        else:
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.MEDIO
            monitoramento.status_diagnostico = Monitoramento.StatusDiagnostico.EM_ANALISE
            monitoramento.exige_acao_imediata = False
            monitoramento.resumo_diagnostico = (
                "Foram registradas anomalias de baixa severidade. "
                "Manter observação contínua nas próximas avaliações."
            )

        monitoramento.save(
            update_fields=[
                "possui_anomalias",
                "nivel_atencao",
                "status_diagnostico",
                "exige_acao_imediata",
                "resumo_diagnostico",
                "updated_at",
            ]
        )

    def perform_create(self, serializer):
        anomalia = serializer.save()
        self._atualizar_diagnostico_monitoramento(anomalia.monitoramento)

    def perform_update(self, serializer):
        anomalia = serializer.save()
        self._atualizar_diagnostico_monitoramento(anomalia.monitoramento)

    def perform_destroy(self, instance):
        monitoramento = instance.monitoramento
        instance.delete()
        self._atualizar_diagnostico_monitoramento(monitoramento)