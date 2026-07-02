from django.utils import timezone
from rest_framework import serializers

from .models import Monitoramento


class MonitoramentoSerializer(serializers.ModelSerializer):
    talhao_nome = serializers.CharField(source="talhao.nome", read_only=True)
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)

    estadio_fenologico_display = serializers.CharField(
        source="get_estadio_fenologico_display",
        read_only=True,
    )
    nivel_atencao_display = serializers.CharField(
        source="get_nivel_atencao_display",
        read_only=True,
    )
    status_diagnostico_display = serializers.CharField(
        source="get_status_diagnostico_display",
        read_only=True,
    )
    status_imagem_ia_display = serializers.CharField(
        source="get_status_imagem_ia_display",
        read_only=True,
    )
    faixa_risco_display = serializers.CharField(
        source="get_faixa_risco_display",
        read_only=True,
    )
    prioridade_operacional_display = serializers.CharField(
        source="get_prioridade_operacional_display",
        read_only=True,
    )

    escopo_agronomico = serializers.CharField(read_only=True)

    foto_monitoramento_url = serializers.SerializerMethodField()
    imagem_monitoramento = serializers.SerializerMethodField()
    localizacao = serializers.SerializerMethodField()
    risco = serializers.SerializerMethodField()

    completude_coleta = serializers.SerializerMethodField()
    feedback_ui = serializers.SerializerMethodField()

    class Meta:
        model = Monitoramento
        fields = [
            "id",
            "usuario",
            "usuario_username",
            "talhao",
            "talhao_nome",
            "data_observacao",
            "estadio_fenologico",
            "estadio_fenologico_display",
            "cultura",
            "escopo_agronomico",
            "altura_planta_cm",
            "populacao_plantas",
            "sanidade",
            "umidade_solo",

            # imagem / IA visual
            "foto_monitoramento",
            "foto_monitoramento_url",
            "status_imagem_ia",
            "status_imagem_ia_display",
            "ia_estadio_fenologico_sugerido",
            "ia_confianca_imagem",
            "ia_resultado_imagem",
            "ia_observacoes_imagem",
            "ia_erro_imagem",
            "imagem_processada_em",
            "imagem_monitoramento",

            # diagnóstico geral
            "nivel_atencao",
            "nivel_atencao_display",
            "status_diagnostico",
            "status_diagnostico_display",
            "resumo_diagnostico",
            "possui_anomalias",
            "exige_acao_imediata",

            # score de risco
            "score_risco",
            "faixa_risco",
            "faixa_risco_display",
            "prioridade_operacional",
            "prioridade_operacional_display",
            "justificativa_risco",
            "risco",

            # geo
            "latitude",
            "longitude",
            "localizacao",

            # apoio ao frontend / UX da coleta
            "completude_coleta",
            "feedback_ui",

            "observacoes",
            "ativa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "usuario",
            "usuario_username",
            "talhao_nome",
            "estadio_fenologico_display",
            "cultura",
            "escopo_agronomico",
            "nivel_atencao_display",
            "status_diagnostico_display",
            "foto_monitoramento_url",
            "status_imagem_ia_display",
            "ia_estadio_fenologico_sugerido",
            "ia_confianca_imagem",
            "ia_resultado_imagem",
            "ia_observacoes_imagem",
            "ia_erro_imagem",
            "imagem_processada_em",
            "imagem_monitoramento",
            "faixa_risco_display",
            "prioridade_operacional_display",
            "risco",
            "localizacao",
            "completude_coleta",
            "feedback_ui",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Nesta fase do projeto, a cultura operacional oficial é milho.
        data["cultura"] = instance.cultura or instance.escopo_agronomico
        data["escopo_agronomico"] = instance.escopo_agronomico

        return data

    def validate_latitude(self, value):
        if value is None:
            return value

        valor = float(value)
        if valor < -90 or valor > 90:
            raise serializers.ValidationError(
                "Latitude inválida. Informe um valor entre -90 e 90."
            )
        return value

    def validate_longitude(self, value):
        if value is None:
            return value

        valor = float(value)
        if valor < -180 or valor > 180:
            raise serializers.ValidationError(
                "Longitude inválida. Informe um valor entre -180 e 180."
            )
        return value

    def validate_altura_planta_cm(self, value):
        if value is None:
            return value

        valor = float(value)
        if valor < 0:
            raise serializers.ValidationError(
                "A altura da planta não pode ser negativa."
            )
        return value

    def validate_populacao_plantas(self, value):
        if value is None:
            return value

        if value < 0:
            raise serializers.ValidationError(
                "A população de plantas não pode ser negativa."
            )
        return value

    def validate_sanidade(self, value):
        if not value:
            return value
        return value.strip()

    def validate_observacoes(self, value):
        if not value:
            return value
        return value.strip()

    def validate(self, attrs):
        data_observacao = attrs.get("data_observacao")
        if data_observacao and data_observacao > timezone.localdate():
            raise serializers.ValidationError(
                {
                    "data_observacao": (
                        "A data de observação não pode ser futura."
                    )
                }
            )

        return attrs

    def get_foto_monitoramento_url(self, obj):
        if not obj.foto_monitoramento:
            return None

        request = self.context.get("request")
        url = obj.foto_monitoramento.url

        if request:
            return request.build_absolute_uri(url)

        return url

    def get_imagem_monitoramento(self, obj):
        return {
            "escopo_agronomico": obj.escopo_agronomico,
            "possui_foto": bool(obj.foto_monitoramento),
            "foto_url": self.get_foto_monitoramento_url(obj),
            "foto_nome_arquivo": (
                obj.foto_monitoramento.name.split("/")[-1]
                if obj.foto_monitoramento
                else None
            ),
            "status_imagem_ia": obj.status_imagem_ia,
            "status_imagem_ia_display": obj.get_status_imagem_ia_display(),
            "ia_estadio_fenologico_sugerido": obj.ia_estadio_fenologico_sugerido,
            "ia_confianca_imagem": (
                float(obj.ia_confianca_imagem)
                if obj.ia_confianca_imagem is not None
                else None
            ),
            "ia_resultado_imagem": obj.ia_resultado_imagem,
            "ia_observacoes_imagem": obj.ia_observacoes_imagem,
            "ia_erro_imagem": obj.ia_erro_imagem,
            "imagem_processada_em": (
                obj.imagem_processada_em.isoformat()
                if obj.imagem_processada_em
                else None
            ),
        }

    def get_localizacao(self, obj):
        if obj.latitude is None or obj.longitude is None:
            return None

        return {
            "latitude": float(obj.latitude),
            "longitude": float(obj.longitude),
            "point": {
                "type": "Point",
                "coordinates": [float(obj.longitude), float(obj.latitude)],
            },
        }

    def get_risco(self, obj):
        return {
            "escopo_agronomico": obj.escopo_agronomico,
            "score_risco": (
                float(obj.score_risco)
                if obj.score_risco is not None
                else 0.0
            ),
            "faixa_risco": obj.faixa_risco,
            "faixa_risco_display": obj.get_faixa_risco_display(),
            "prioridade_operacional": obj.prioridade_operacional,
            "prioridade_operacional_display": obj.get_prioridade_operacional_display(),
            "justificativa_risco": obj.justificativa_risco,
        }

    def _campos_criticos(self, obj):
        return [
            {
                "campo": "talhao",
                "label": "Talhão",
                "preenchido": bool(obj.talhao_id),
                "valor": obj.talhao_id,
            },
            {
                "campo": "data_observacao",
                "label": "Data da observação",
                "preenchido": bool(obj.data_observacao),
                "valor": (
                    str(obj.data_observacao)
                    if obj.data_observacao
                    else None
                ),
            },
            {
                "campo": "estadio_fenologico",
                "label": "Estádio fenológico",
                "preenchido": bool(obj.estadio_fenologico),
                "valor": obj.estadio_fenologico,
            },
            {
                "campo": "sanidade",
                "label": "Sanidade observada",
                "preenchido": bool((obj.sanidade or "").strip()),
                "valor": obj.sanidade,
            },
            {
                "campo": "umidade_solo",
                "label": "Umidade do solo",
                "preenchido": obj.umidade_solo is not None,
                "valor": (
                    float(obj.umidade_solo)
                    if obj.umidade_solo is not None
                    else None
                ),
            },
        ]

    def _campos_recomendados(self, obj):
        return [
            {
                "campo": "altura_planta_cm",
                "label": "Altura da planta",
                "preenchido": obj.altura_planta_cm is not None,
                "valor": (
                    float(obj.altura_planta_cm)
                    if obj.altura_planta_cm is not None
                    else None
                ),
            },
            {
                "campo": "populacao_plantas",
                "label": "População de plantas",
                "preenchido": obj.populacao_plantas is not None,
                "valor": obj.populacao_plantas,
            },
            {
                "campo": "latitude",
                "label": "Latitude",
                "preenchido": obj.latitude is not None,
                "valor": (
                    float(obj.latitude)
                    if obj.latitude is not None
                    else None
                ),
            },
            {
                "campo": "longitude",
                "label": "Longitude",
                "preenchido": obj.longitude is not None,
                "valor": (
                    float(obj.longitude)
                    if obj.longitude is not None
                    else None
                ),
            },
            {
                "campo": "foto_monitoramento",
                "label": "Foto do monitoramento",
                "preenchido": bool(obj.foto_monitoramento),
                "valor": self.get_foto_monitoramento_url(obj),
            },
            {
                "campo": "observacoes",
                "label": "Observações de campo",
                "preenchido": bool((obj.observacoes or "").strip()),
                "valor": obj.observacoes,
            },
        ]

    def _inconsistencias_coleta(self, obj):
        inconsistencias = []

        if obj.latitude is not None:
            latitude = float(obj.latitude)
            if latitude < -90 or latitude > 90:
                inconsistencias.append(
                    "A latitude está fora do intervalo válido."
                )

        if obj.longitude is not None:
            longitude = float(obj.longitude)
            if longitude < -180 or longitude > 180:
                inconsistencias.append(
                    "A longitude está fora do intervalo válido."
                )

        if (
            obj.latitude is None
            and obj.longitude is not None
        ) or (
            obj.latitude is not None
            and obj.longitude is None
        ):
            inconsistencias.append(
                "A localização está incompleta. Informe latitude e longitude juntas."
            )

        if obj.umidade_solo is not None:
            umidade = float(obj.umidade_solo)
            if umidade < 0 or umidade > 100:
                inconsistencias.append(
                    "A umidade do solo deve estar entre 0 e 100%."
                )

        if obj.altura_planta_cm is not None and float(obj.altura_planta_cm) < 0:
            inconsistencias.append(
                "A altura da planta não pode ser negativa."
            )

        if obj.populacao_plantas is not None and obj.populacao_plantas < 0:
            inconsistencias.append(
                "A população de plantas não pode ser negativa."
            )

        if obj.data_observacao and obj.data_observacao > timezone.localdate():
            inconsistencias.append(
                "A data da observação está no futuro."
            )

        return inconsistencias

    def _calcular_percentual_completude(self, obj):
        campos_criticos = self._campos_criticos(obj)
        campos_recomendados = self._campos_recomendados(obj)

        total_peso = (len(campos_criticos) * 2) + len(campos_recomendados)
        preenchido = 0

        for item in campos_criticos:
            if item["preenchido"]:
                preenchido += 2

        for item in campos_recomendados:
            if item["preenchido"]:
                preenchido += 1

        if total_peso == 0:
            return 0

        return round((preenchido / total_peso) * 100, 2)

    def get_completude_coleta(self, obj):
        campos_criticos = self._campos_criticos(obj)
        campos_recomendados = self._campos_recomendados(obj)
        inconsistencias = self._inconsistencias_coleta(obj)

        pendentes_criticos = [
            item["label"] for item in campos_criticos if not item["preenchido"]
        ]
        pendentes_recomendados = [
            item["label"] for item in campos_recomendados if not item["preenchido"]
        ]

        percentual = self._calcular_percentual_completude(obj)

        pronto_para_diagnostico = (
            len(pendentes_criticos) == 0 and len(inconsistencias) == 0
        )
        pronto_para_relatorio = (
            pronto_para_diagnostico
            and len(pendentes_recomendados) <= 2
        )
        pronto_para_analise_imagem = bool(obj.foto_monitoramento)

        return {
            "escopo_agronomico": obj.escopo_agronomico,
            "percentual_completude": percentual,
            "campos_criticos": campos_criticos,
            "campos_recomendados": campos_recomendados,
            "pendentes_criticos": pendentes_criticos,
            "pendentes_recomendados": pendentes_recomendados,
            "inconsistencias": inconsistencias,
            "pronto_para_diagnostico": pronto_para_diagnostico,
            "pronto_para_relatorio": pronto_para_relatorio,
            "pronto_para_analise_imagem": pronto_para_analise_imagem,
        }

    def get_feedback_ui(self, obj):
        completude = self.get_completude_coleta(obj)

        pendentes_criticos = completude["pendentes_criticos"]
        pendentes_recomendados = completude["pendentes_recomendados"]
        inconsistencias = completude["inconsistencias"]
        percentual = completude["percentual_completude"]

        orientacoes = []

        if pendentes_criticos:
            orientacoes.append(
                "Preencha primeiro os campos críticos para liberar um diagnóstico mais confiável."
            )

        if "Sanidade observada" in pendentes_criticos:
            orientacoes.append(
                "Descreva visualmente a condição da planta, presença de pragas, doenças ou sintomas aparentes."
            )

        if "Umidade do solo" in pendentes_criticos:
            orientacoes.append(
                "Informe a umidade do solo estimada ou medida no momento da coleta."
            )

        if "Estádio fenológico" in pendentes_criticos:
            orientacoes.append(
                "Selecione o estádio fenológico observado no milho para manter coerência agronômica."
            )

        if "Foto do monitoramento" in pendentes_recomendados:
            orientacoes.append(
                "Adicione uma foto do monitoramento para aumentar a rastreabilidade visual e preparar a análise de imagem."
            )

        if "Latitude" in pendentes_recomendados or "Longitude" in pendentes_recomendados:
            orientacoes.append(
                "Registre a localização da coleta para permitir clima, mapa e rastreabilidade espacial."
            )

        if "Observações de campo" in pendentes_recomendados:
            orientacoes.append(
                "Use observações de campo para relatar o cenário real visível na lavoura."
            )

        if inconsistencias:
            orientacoes.append(
                "Corrija as inconsistências apontadas antes de usar os dados para diagnóstico e relatório."
            )

        if not pendentes_criticos and not inconsistencias and percentual >= 80:
            status_preenchimento = "completo"
            mensagem_status = (
                "Monitoramento bem preenchido. Os dados já sustentam diagnóstico e relatório com boa base."
            )
        elif not pendentes_criticos and not inconsistencias:
            status_preenchimento = "bom"
            mensagem_status = (
                "Monitoramento apto para diagnóstico, mas ainda pode ser enriquecido com mais contexto de campo."
            )
        elif len(pendentes_criticos) <= 2 and not inconsistencias:
            status_preenchimento = "parcial"
            mensagem_status = (
                "Monitoramento parcialmente preenchido. Complete os campos críticos restantes para melhorar a análise."
            )
        else:
            status_preenchimento = "incompleto"
            mensagem_status = (
                "Monitoramento incompleto ou inconsistente. O frontend deve orientar o usuário antes de prosseguir."
            )

        destaque_frontend = []
        for campo in pendentes_criticos:
            destaque_frontend.append(
                {
                    "tipo": "erro",
                    "campo": campo,
                    "mensagem": f"O campo '{campo}' é crítico para o diagnóstico."
                }
            )

        for problema in inconsistencias:
            destaque_frontend.append(
                {
                    "tipo": "alerta",
                    "campo": None,
                    "mensagem": problema,
                }
            )

        return {
            "escopo_agronomico": obj.escopo_agronomico,
            "status_preenchimento": status_preenchimento,
            "mensagem_status": mensagem_status,
            "mostrar_alerta_topo": bool(pendentes_criticos or inconsistencias),
            "bloquear_avanco_diagnostico": not completude["pronto_para_diagnostico"],
            "bloquear_geracao_relatorio": not completude["pronto_para_relatorio"],
            "sugerir_foto": not completude["pronto_para_analise_imagem"],
            "campos_foco_inicial": pendentes_criticos[:3],
            "orientacoes_usuario": orientacoes,
            "destaques_frontend": destaque_frontend,
        }