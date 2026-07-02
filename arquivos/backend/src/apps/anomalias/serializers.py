from rest_framework import serializers

from .models import Anomalia


class AnomaliaSerializer(serializers.ModelSerializer):
    monitoramento_id = serializers.IntegerField(source="monitoramento.id", read_only=True)
    talhao_nome = serializers.CharField(source="monitoramento.talhao.nome", read_only=True)
    estadio_fenologico = serializers.CharField(
        source="monitoramento.estadio_fenologico",
        read_only=True,
    )

    class Meta:
        model = Anomalia
        fields = [
            "id",
            "monitoramento",
            "monitoramento_id",
            "talhao_nome",
            "estadio_fenologico",
            "tipo",
            "nome",
            "severidade",
            "percentual_plantas_afetadas",
            "observacao",
            "exige_atencao",
            "ativa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "monitoramento_id",
            "talhao_nome",
            "estadio_fenologico",
            "created_at",
            "updated_at",
        ]