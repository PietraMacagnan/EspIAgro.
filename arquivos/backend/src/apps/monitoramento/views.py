from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.alertas.models import Alerta
from apps.anomalias.serializers import AnomaliaSerializer
from apps.base_conhecimento.models import FonteConhecimento
from apps.propriedades.models import Propriedade
from apps.relatorios.models import Relatorio
from apps.relatorios.serializers import RelatorioSerializer
from apps.talhoes.models import Talhao
from .models import Monitoramento
from .serializers import MonitoramentoSerializer
from .services.clima_service import ClimaService
from .services.ia_service import OllamaIAService


class MonitoramentoViewSet(viewsets.ModelViewSet):
    """
    API completa de Monitoramentos (CRUD).

    Endpoints:
    - GET /api/monitoramentos/
    - POST /api/monitoramentos/
    - GET /api/monitoramentos/{id}/
    - PUT /api/monitoramentos/{id}/
    - PATCH /api/monitoramentos/{id}/
    - DELETE /api/monitoramentos/{id}/

    Filtros suportados:
    - GET /api/monitoramentos/?talhao={id}
    - GET /api/monitoramentos/?estadio_fenologico=V4
    - GET /api/monitoramentos/?data_observacao=2026-04-06
    - GET /api/monitoramentos/?status_imagem_ia=pendente
    - GET /api/monitoramentos/?faixa_risco=alto
    - GET /api/monitoramentos/?prioridade_operacional=imediata

    Endpoints relacionais:
    - GET /api/monitoramentos/dashboard/
    - GET /api/monitoramentos/{id}/anomalias/
    - POST /api/monitoramentos/{id}/recalcular-diagnostico/
    - POST /api/monitoramentos/{id}/gerar-relatorio/
    - POST /api/monitoramentos/{id}/apoio-diagnostico/
    - POST /api/monitoramentos/{id}/analisar-imagem/
    - GET /api/monitoramentos/{id}/clima/
    - GET /api/monitoramentos/{id}/feedback-coleta/
    """

    serializer_class = MonitoramentoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    REGRA_ALERTA_RISCO = "monitoramento_risco_operacional"
    REGRA_ALERTA_COLETA = "monitoramento_coleta_incompleta"
    REGRA_ALERTA_IMAGEM = "monitoramento_imagem_pendente"
    REGRA_ALERTA_UMIDADE = "monitoramento_umidade_critica"
    REGRA_ALERTA_SANIDADE = "monitoramento_sanidade_preocupante"

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = (
                Monitoramento.objects.select_related("talhao__propriedade", "usuario")
                .all()
                .order_by("-data_observacao", "-created_at")
            )
        else:
            queryset = (
                Monitoramento.objects.select_related("talhao__propriedade", "usuario")
                .filter(usuario=user)
                .order_by("-data_observacao", "-created_at")
            )

        talhao_id = self.request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(talhao_id=talhao_id)

        estadio_fenologico = self.request.query_params.get("estadio_fenologico")
        if estadio_fenologico:
            queryset = queryset.filter(estadio_fenologico__iexact=estadio_fenologico)

        data_observacao = self.request.query_params.get("data_observacao")
        if data_observacao:
            queryset = queryset.filter(data_observacao=data_observacao)

        status_imagem_ia = self.request.query_params.get("status_imagem_ia")
        if status_imagem_ia:
            queryset = queryset.filter(status_imagem_ia=status_imagem_ia)

        faixa_risco = self.request.query_params.get("faixa_risco")
        if faixa_risco:
            queryset = queryset.filter(faixa_risco=faixa_risco)

        prioridade_operacional = self.request.query_params.get(
            "prioridade_operacional"
        )
        if prioridade_operacional:
            queryset = queryset.filter(
                prioridade_operacional=prioridade_operacional
            )

        return queryset

    def _obter_cultura_contexto(
        self, monitoramento: Monitoramento | None = None
    ) -> str:
        """
        Nesta fase do projeto, o escopo agronômico oficial é MILHO.
        Mantemos a arquitetura preparada para futuras culturas, mas a
        inteligência atual deve operar somente em milho.
        """
        return "milho"

    def _escopos_fontes_ativos(self):
        """
        Escopos válidos da base de conhecimento para a fase atual.
        """
        return [
            FonteConhecimento.EscopoCultura.MILHO,
            FonteConhecimento.EscopoCultura.GERAL,
        ]

    def _buscar_clima_monitoramento(self, monitoramento: Monitoramento) -> dict:
        """
        Busca clima em tempo real com base nas coordenadas do monitoramento.
        Retorna estrutura padronizada para persistência no relatório.
        """
        if monitoramento.latitude is None or monitoramento.longitude is None:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Monitoramento sem coordenadas para consulta climática.",
            }

        api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        if not api_key:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "API key de clima não configurada.",
            }

        service = ClimaService(api_key)
        return service.obter_clima(
            float(monitoramento.latitude),
            float(monitoramento.longitude),
        )

    def _serializar_imagem_monitoramento(
        self, monitoramento: Monitoramento
    ) -> dict:
        """
        Serializa a imagem do monitoramento para persistência no relatório,
        no mesmo padrão esperado pelo módulo de relatórios/frontend.
        """
        foto = getattr(monitoramento, "foto_monitoramento", None)
        possui_foto = bool(foto)

        imagem_processada_em = getattr(monitoramento, "imagem_processada_em", None)

        return {
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
            "possui_foto": possui_foto,
            "foto_url": foto.url if possui_foto else None,
            "foto_nome_arquivo": foto.name.split("/")[-1] if possui_foto else None,
            "status_imagem_ia": monitoramento.status_imagem_ia,
            "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
            "ia_estadio_fenologico_sugerido": monitoramento.ia_estadio_fenologico_sugerido,
            "ia_confianca_imagem": (
                float(monitoramento.ia_confianca_imagem)
                if monitoramento.ia_confianca_imagem is not None
                else None
            ),
            "ia_resultado_imagem": monitoramento.ia_resultado_imagem,
            "ia_observacoes_imagem": monitoramento.ia_observacoes_imagem,
            "ia_erro_imagem": monitoramento.ia_erro_imagem,
            "imagem_processada_em": (
                imagem_processada_em.isoformat()
                if imagem_processada_em
                else None
            ),
        }

    def _serializar_risco_monitoramento(
        self, monitoramento: Monitoramento
    ) -> dict:
        return {
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
            "score_risco": (
                float(monitoramento.score_risco)
                if monitoramento.score_risco is not None
                else 0
            ),
            "faixa_risco": monitoramento.faixa_risco,
            "faixa_risco_display": monitoramento.get_faixa_risco_display(),
            "prioridade_operacional": monitoramento.prioridade_operacional,
            "prioridade_operacional_display": monitoramento.get_prioridade_operacional_display(),
            "justificativa_risco": monitoramento.justificativa_risco,
        }

    def _limpar_estado_analise_imagem(
        self, monitoramento: Monitoramento
    ) -> None:
        """
        Limpa o estado anterior da análise de imagem.
        Importante quando uma nova foto é enviada para não manter
        resultado antigo associado à imagem nova.
        """
        monitoramento.status_imagem_ia = Monitoramento.StatusImagemIA.PENDENTE
        monitoramento.ia_estadio_fenologico_sugerido = ""
        monitoramento.ia_confianca_imagem = None
        monitoramento.ia_resultado_imagem = None
        monitoramento.ia_observacoes_imagem = ""
        monitoramento.ia_erro_imagem = ""
        monitoramento.imagem_processada_em = None
        monitoramento.save(
            update_fields=[
                "status_imagem_ia",
                "ia_estadio_fenologico_sugerido",
                "ia_confianca_imagem",
                "ia_resultado_imagem",
                "ia_observacoes_imagem",
                "ia_erro_imagem",
                "imagem_processada_em",
                "updated_at",
            ]
        )

    def _atualizar_diagnostico_basico(
        self, monitoramento: Monitoramento
    ) -> None:
        anomalias = monitoramento.anomalias.filter(ativa=True)

        if not anomalias.exists():
            monitoramento.possui_anomalias = False
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.BAIXO
            monitoramento.status_diagnostico = (
                Monitoramento.StatusDiagnostico.CONCLUIDO
            )
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
            monitoramento.status_diagnostico = (
                Monitoramento.StatusDiagnostico.ALERTA
            )
            monitoramento.exige_acao_imediata = True
            monitoramento.resumo_diagnostico = (
                "Foram identificadas anomalias de alta criticidade. "
                "Recomenda-se atenção imediata ao monitoramento."
            )
        elif severidade_maxima == 3:
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.ALTO
            monitoramento.status_diagnostico = (
                Monitoramento.StatusDiagnostico.EM_ANALISE
            )
            monitoramento.exige_acao_imediata = False
            monitoramento.resumo_diagnostico = (
                "Foram registradas anomalias de severidade moderada. "
                "Recomenda-se acompanhamento próximo do talhão."
            )
        else:
            monitoramento.nivel_atencao = Monitoramento.NivelAtencao.MEDIO
            monitoramento.status_diagnostico = (
                Monitoramento.StatusDiagnostico.EM_ANALISE
            )
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

    def _atualizar_score_risco(self, monitoramento: Monitoramento) -> None:
        """
        Calcula score de risco agronômico, faixa de risco,
        prioridade operacional e justificativa.
        """
        anomalias = monitoramento.anomalias.filter(ativa=True)

        score = 0.0
        justificativas = []

        quantidade_anomalias = anomalias.count()
        if quantidade_anomalias > 0:
            incremento = min(quantidade_anomalias * 8, 24)
            score += incremento
            justificativas.append(
                f"Foram identificadas {quantidade_anomalias} anomalia(s) ativa(s), aumentando o risco operacional."
            )

        severidade_maxima = 0
        if anomalias.exists():
            severidade_maxima = max(anomalias.values_list("severidade", flat=True))

        if severidade_maxima == 1:
            score += 4
            justificativas.append("Há anomalia(s) de severidade leve.")
        elif severidade_maxima == 2:
            score += 10
            justificativas.append("Há anomalia(s) de severidade baixa a moderada.")
        elif severidade_maxima == 3:
            score += 20
            justificativas.append("Há anomalia(s) de severidade moderada.")
        elif severidade_maxima >= 4:
            score += 32
            justificativas.append("Há anomalia(s) de alta severidade.")

        if monitoramento.exige_acao_imediata:
            score += 20
            justificativas.append(
                "O monitoramento exige ação imediata em campo."
            )

        if (
            monitoramento.status_diagnostico
            == Monitoramento.StatusDiagnostico.ALERTA
        ):
            score += 12
            justificativas.append("O status diagnóstico está em alerta.")
        elif (
            monitoramento.status_diagnostico
            == Monitoramento.StatusDiagnostico.EM_ANALISE
        ):
            score += 6
            justificativas.append("O monitoramento segue em análise técnica.")

        if monitoramento.nivel_atencao == Monitoramento.NivelAtencao.MEDIO:
            score += 6
            justificativas.append(
                "O nível de atenção está classificado como médio."
            )
        elif monitoramento.nivel_atencao == Monitoramento.NivelAtencao.ALTO:
            score += 12
            justificativas.append(
                "O nível de atenção está classificado como alto."
            )
        elif monitoramento.nivel_atencao == Monitoramento.NivelAtencao.CRITICO:
            score += 20
            justificativas.append(
                "O nível de atenção está classificado como crítico."
            )

        if monitoramento.umidade_solo is not None:
            umidade = float(monitoramento.umidade_solo)
            if umidade < 20:
                score += 12
                justificativas.append(
                    f"A umidade do solo está muito baixa ({umidade}%)."
                )
            elif umidade < 30:
                score += 8
                justificativas.append(
                    f"A umidade do solo está baixa ({umidade}%)."
                )
            elif umidade > 85:
                score += 6
                justificativas.append(
                    f"A umidade do solo está muito elevada ({umidade}%)."
                )

        sanidade = (monitoramento.sanidade or "").strip().lower()
        if sanidade:
            if any(
                palavra in sanidade
                for palavra in ["ruim", "péssima", "pessima", "muito ruim"]
            ):
                score += 16
                justificativas.append(
                    f"A sanidade informada foi '{monitoramento.sanidade}', indicando condição desfavorável."
                )
            elif any(
                palavra in sanidade
                for palavra in ["média", "media", "regular"]
            ):
                score += 8
                justificativas.append(
                    f"A sanidade informada foi '{monitoramento.sanidade}', exigindo observação."
                )
            elif any(
                palavra in sanidade
                for palavra in [
                    "praga",
                    "pragas",
                    "doença",
                    "doencas",
                    "doenças",
                    "presença",
                    "presenca",
                ]
            ):
                score += 10
                justificativas.append(
                    f"A sanidade informada sugere ocorrência fitossanitária: '{monitoramento.sanidade}'."
                )

        if monitoramento.status_imagem_ia == Monitoramento.StatusImagemIA.ERRO:
            score += 4
            justificativas.append(
                "Houve erro no processamento da imagem do monitoramento."
            )
        elif (
            monitoramento.foto_monitoramento
            and monitoramento.status_imagem_ia
            in [
                Monitoramento.StatusImagemIA.PENDENTE,
                Monitoramento.StatusImagemIA.PROCESSANDO,
            ]
        ):
            score += 2
            justificativas.append(
                "A imagem do monitoramento ainda está pendente de processamento completo."
            )

        score = min(round(score, 2), 100)

        if score >= 75:
            faixa_risco = Monitoramento.FaixaRisco.CRITICO
            prioridade_operacional = (
                Monitoramento.PrioridadeOperacional.IMEDIATA
            )
        elif score >= 50:
            faixa_risco = Monitoramento.FaixaRisco.ALTO
            prioridade_operacional = Monitoramento.PrioridadeOperacional.ALTA
        elif score >= 25:
            faixa_risco = Monitoramento.FaixaRisco.MODERADO
            prioridade_operacional = Monitoramento.PrioridadeOperacional.MEDIA
        else:
            faixa_risco = Monitoramento.FaixaRisco.BAIXO
            prioridade_operacional = Monitoramento.PrioridadeOperacional.BAIXA

        justificativa_final = (
            "Sem fatores relevantes de risco identificados no momento."
            if not justificativas
            else " ".join(justificativas)
        )

        monitoramento.score_risco = score
        monitoramento.faixa_risco = faixa_risco
        monitoramento.prioridade_operacional = prioridade_operacional
        monitoramento.justificativa_risco = justificativa_final
        monitoramento.save(
            update_fields=[
                "score_risco",
                "faixa_risco",
                "prioridade_operacional",
                "justificativa_risco",
                "updated_at",
            ]
        )

    def _normalizar_texto(self, valor: str | None) -> str:
        return (valor or "").strip().lower()

    def _montar_dados_contexto_alerta(
        self, monitoramento: Monitoramento
    ) -> dict:
        return {
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
            "monitoramento_id": monitoramento.id,
            "talhao_id": monitoramento.talhao_id,
            "propriedade_id": (
                monitoramento.talhao.propriedade_id
                if monitoramento.talhao and monitoramento.talhao.propriedade_id
                else None
            ),
            "data_observacao": str(monitoramento.data_observacao),
            "estadio_fenologico": monitoramento.estadio_fenologico,
            "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
            "nivel_atencao": monitoramento.nivel_atencao,
            "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
            "status_diagnostico": monitoramento.status_diagnostico,
            "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
            "score_risco": (
                float(monitoramento.score_risco)
                if monitoramento.score_risco is not None
                else 0
            ),
            "faixa_risco": monitoramento.faixa_risco,
            "faixa_risco_display": monitoramento.get_faixa_risco_display(),
            "prioridade_operacional": monitoramento.prioridade_operacional,
            "prioridade_operacional_display": monitoramento.get_prioridade_operacional_display(),
            "exige_acao_imediata": monitoramento.exige_acao_imediata,
            "resumo_diagnostico": monitoramento.resumo_diagnostico,
            "justificativa_risco": monitoramento.justificativa_risco,
            "sanidade": monitoramento.sanidade,
            "umidade_solo": (
                float(monitoramento.umidade_solo)
                if monitoramento.umidade_solo is not None
                else None
            ),
            "status_imagem_ia": monitoramento.status_imagem_ia,
            "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
            "possui_foto": bool(monitoramento.foto_monitoramento),
        }

    def _obter_alerta_automatico_existente(
        self,
        monitoramento: Monitoramento,
        regra_origem: str,
    ) -> Alerta | None:
        usuario_alerta = monitoramento.usuario or self.request.user

        return (
            Alerta.objects.filter(
                usuario=usuario_alerta,
                monitoramento=monitoramento,
                regra_origem=regra_origem,
            )
            .order_by("-created_at")
            .first()
        )

    def _resolver_alerta_automatico(
        self,
        alerta_existente: Alerta | None,
        monitoramento: Monitoramento,
        motivo_resolucao: str,
    ) -> None:
        if not alerta_existente:
            return

        if (
            alerta_existente.status == Alerta.StatusAlerta.RESOLVIDO
            and alerta_existente.ativa is False
        ):
            return

        dados_contexto = alerta_existente.dados_contexto or {}
        dados_contexto.update(self._montar_dados_contexto_alerta(monitoramento))
        dados_contexto["resolucao_automatica"] = {
            "motivo": motivo_resolucao,
            "resolvido_em": timezone.now().isoformat(),
        }

        alerta_existente.status = Alerta.StatusAlerta.RESOLVIDO
        alerta_existente.ativa = False
        alerta_existente.resolvido_em = timezone.now()
        alerta_existente.dados_contexto = dados_contexto
        alerta_existente.save(
            update_fields=[
                "status",
                "ativa",
                "resolvido_em",
                "dados_contexto",
                "updated_at",
            ]
        )

    def _upsert_alerta_automatico(
        self,
        monitoramento: Monitoramento,
        regra_origem: str,
        tipo: str,
        severidade: str,
        prioridade: str,
        titulo: str,
        mensagem: str,
        recomendacao: str,
        dados_contexto: dict,
        exige_confirmacao: bool = False,
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=regra_origem,
        )

        usuario_alerta = monitoramento.usuario or self.request.user
        talhao = monitoramento.talhao
        propriedade = talhao.propriedade if talhao else None

        dados_contexto_final = self._montar_dados_contexto_alerta(monitoramento)
        dados_contexto_final.update(dados_contexto or {})
        dados_contexto_final["regra_origem"] = regra_origem

        if alerta_existente:
            alerta_existente.usuario = usuario_alerta
            alerta_existente.monitoramento = monitoramento
            alerta_existente.talhao = talhao
            alerta_existente.propriedade = propriedade
            alerta_existente.escopo_agronomico = self._obter_cultura_contexto(
                monitoramento
            )
            alerta_existente.tipo = tipo
            alerta_existente.severidade = severidade
            alerta_existente.prioridade = prioridade
            alerta_existente.status = Alerta.StatusAlerta.ATIVO
            alerta_existente.titulo = titulo
            alerta_existente.mensagem = mensagem
            alerta_existente.recomendacao = recomendacao
            alerta_existente.regra_origem = regra_origem
            alerta_existente.dados_contexto = dados_contexto_final
            alerta_existente.exige_confirmacao = exige_confirmacao
            alerta_existente.ativa = True
            alerta_existente.resolvido_em = None
            alerta_existente.save(
                update_fields=[
                    "usuario",
                    "monitoramento",
                    "talhao",
                    "propriedade",
                    "escopo_agronomico",
                    "tipo",
                    "severidade",
                    "prioridade",
                    "status",
                    "titulo",
                    "mensagem",
                    "recomendacao",
                    "regra_origem",
                    "dados_contexto",
                    "exige_confirmacao",
                    "ativa",
                    "resolvido_em",
                    "updated_at",
                ]
            )
            return

        Alerta.objects.create(
            usuario=usuario_alerta,
            monitoramento=monitoramento,
            talhao=talhao,
            propriedade=propriedade,
            escopo_agronomico=self._obter_cultura_contexto(monitoramento),
            tipo=tipo,
            severidade=severidade,
            prioridade=prioridade,
            status=Alerta.StatusAlerta.ATIVO,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            regra_origem=regra_origem,
            dados_contexto=dados_contexto_final,
            exige_confirmacao=exige_confirmacao,
            ativa=True,
        )

    def _avaliar_completude_coleta_alerta(
        self,
        monitoramento: Monitoramento,
    ) -> dict:
        pendentes_criticos = []
        pendentes_recomendados = []
        inconsistencias = []

        if not monitoramento.talhao_id:
            pendentes_criticos.append("talhao")

        if not monitoramento.data_observacao:
            pendentes_criticos.append("data_observacao")

        if not monitoramento.estadio_fenologico:
            pendentes_criticos.append("estadio_fenologico")

        if monitoramento.altura_planta_cm is None:
            pendentes_recomendados.append("altura_planta_cm")
        elif float(monitoramento.altura_planta_cm) < 0:
            inconsistencias.append("altura_planta_cm_negativa")

        if monitoramento.populacao_plantas is None:
            pendentes_recomendados.append("populacao_plantas")
        elif int(monitoramento.populacao_plantas) <= 0:
            inconsistencias.append("populacao_plantas_invalida")

        if not self._normalizar_texto(monitoramento.sanidade):
            pendentes_recomendados.append("sanidade")

        if monitoramento.umidade_solo is None:
            pendentes_recomendados.append("umidade_solo")
        else:
            umidade = float(monitoramento.umidade_solo)
            if umidade < 0 or umidade > 100:
                inconsistencias.append("umidade_solo_fora_da_faixa")

        if monitoramento.latitude is None or monitoramento.longitude is None:
            pendentes_recomendados.append("localizacao")

        if bool(monitoramento.foto_monitoramento) is False:
            pendentes_recomendados.append("foto_monitoramento")

        total_campos_base = 8
        preenchidos = 0

        if monitoramento.talhao_id:
            preenchidos += 1
        if monitoramento.data_observacao:
            preenchidos += 1
        if monitoramento.estadio_fenologico:
            preenchidos += 1
        if monitoramento.altura_planta_cm is not None:
            preenchidos += 1
        if monitoramento.populacao_plantas is not None:
            preenchidos += 1
        if self._normalizar_texto(monitoramento.sanidade):
            preenchidos += 1
        if monitoramento.umidade_solo is not None:
            preenchidos += 1
        if monitoramento.latitude is not None and monitoramento.longitude is not None:
            preenchidos += 1

        percentual = round((preenchidos / total_campos_base) * 100, 2)

        return {
            "percentual_completude": percentual,
            "pendentes_criticos": pendentes_criticos,
            "pendentes_recomendados": pendentes_recomendados,
            "inconsistencias": inconsistencias,
            "pronto_para_diagnostico": not pendentes_criticos and not inconsistencias,
            "pronto_para_relatorio": (
                not pendentes_criticos
                and not inconsistencias
                and len(pendentes_recomendados) <= 2
            ),
            "pronto_para_analise_imagem": bool(monitoramento.foto_monitoramento),
        }

    def _deve_gerar_alerta_risco(self, monitoramento: Monitoramento) -> bool:
        return any(
            [
                monitoramento.exige_acao_imediata,
                monitoramento.status_diagnostico == Monitoramento.StatusDiagnostico.ALERTA,
                monitoramento.nivel_atencao in [
                    Monitoramento.NivelAtencao.ALTO,
                    Monitoramento.NivelAtencao.CRITICO,
                ],
                monitoramento.faixa_risco in [
                    Monitoramento.FaixaRisco.ALTO,
                    Monitoramento.FaixaRisco.CRITICO,
                ],
                monitoramento.prioridade_operacional in [
                    Monitoramento.PrioridadeOperacional.ALTA,
                    Monitoramento.PrioridadeOperacional.IMEDIATA,
                ],
            ]
        )

    def _mapear_severidade_alerta(self, monitoramento: Monitoramento) -> str:
        if (
            monitoramento.exige_acao_imediata
            or monitoramento.status_diagnostico == Monitoramento.StatusDiagnostico.ALERTA
            or monitoramento.faixa_risco == Monitoramento.FaixaRisco.CRITICO
            or monitoramento.nivel_atencao == Monitoramento.NivelAtencao.CRITICO
        ):
            return Alerta.Severidade.CRITICA

        if (
            monitoramento.faixa_risco == Monitoramento.FaixaRisco.ALTO
            or monitoramento.nivel_atencao == Monitoramento.NivelAtencao.ALTO
        ):
            return Alerta.Severidade.ALTA

        if (
            monitoramento.faixa_risco == Monitoramento.FaixaRisco.MODERADO
            or monitoramento.nivel_atencao == Monitoramento.NivelAtencao.MEDIO
        ):
            return Alerta.Severidade.MEDIA

        return Alerta.Severidade.BAIXA

    def _mapear_prioridade_alerta(self, monitoramento: Monitoramento) -> str:
        mapa = {
            Monitoramento.PrioridadeOperacional.BAIXA: Alerta.Prioridade.BAIXA,
            Monitoramento.PrioridadeOperacional.MEDIA: Alerta.Prioridade.MEDIA,
            Monitoramento.PrioridadeOperacional.ALTA: Alerta.Prioridade.ALTA,
            Monitoramento.PrioridadeOperacional.IMEDIATA: Alerta.Prioridade.IMEDIATA,
        }
        return mapa.get(
            monitoramento.prioridade_operacional,
            Alerta.Prioridade.BAIXA,
        )

    def _montar_titulo_alerta_risco(self, monitoramento: Monitoramento) -> str:
        talhao_nome = monitoramento.talhao.nome if monitoramento.talhao else "Talhão"

        if monitoramento.exige_acao_imediata:
            return f"Alerta crítico no talhão {talhao_nome}"

        if monitoramento.faixa_risco == Monitoramento.FaixaRisco.CRITICO:
            return f"Risco crítico identificado no talhão {talhao_nome}"

        if monitoramento.faixa_risco == Monitoramento.FaixaRisco.ALTO:
            return f"Risco alto identificado no talhão {talhao_nome}"

        return f"Alerta operacional no talhão {talhao_nome}"

    def _montar_mensagem_alerta_risco(self, monitoramento: Monitoramento) -> str:
        partes = [
            (
                f"Monitoramento em {monitoramento.data_observacao} com score de risco "
                f"{float(monitoramento.score_risco) if monitoramento.score_risco is not None else 0:.2f}/100"
            ),
            f"faixa {monitoramento.get_faixa_risco_display().lower()}",
            f"nível de atenção {monitoramento.get_nivel_atencao_display().lower()}",
            f"e prioridade {monitoramento.get_prioridade_operacional_display().lower()}",
        ]

        mensagem = ", ".join(partes) + "."

        if monitoramento.exige_acao_imediata:
            mensagem += " O cenário atual exige ação imediata em campo."

        if monitoramento.resumo_diagnostico:
            mensagem += f" {monitoramento.resumo_diagnostico}"

        return mensagem

    def _montar_recomendacao_alerta_risco(
        self, monitoramento: Monitoramento
    ) -> str:
        recomendacoes = []

        if monitoramento.exige_acao_imediata:
            recomendacoes.append(
                "Realizar inspeção imediata no talhão e priorizar a tomada de decisão operacional."
            )
        elif monitoramento.prioridade_operacional in [
            Monitoramento.PrioridadeOperacional.ALTA,
            Monitoramento.PrioridadeOperacional.IMEDIATA,
        ]:
            recomendacoes.append(
                "Programar vistoria prioritária em campo no menor prazo possível."
            )
        else:
            recomendacoes.append(
                "Acompanhar o talhão com nova avaliação técnica programada."
            )

        if monitoramento.umidade_solo is not None and float(monitoramento.umidade_solo) < 30:
            recomendacoes.append(
                "Validar condição hídrica do solo e revisar necessidade de manejo relacionado à umidade."
            )

        if monitoramento.sanidade:
            recomendacoes.append(
                f"Conferir em campo a condição sanitária registrada: {monitoramento.sanidade}."
            )

        if monitoramento.justificativa_risco:
            recomendacoes.append(
                f"Base técnica do alerta: {monitoramento.justificativa_risco}"
            )

        return " ".join(recomendacoes)

    def _sincronizar_alerta_risco_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_RISCO,
        )

        if not self._deve_gerar_alerta_risco(monitoramento):
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Condição de risco deixou de exigir alerta automático.",
            )
            return

        severidade = self._mapear_severidade_alerta(monitoramento)
        prioridade = self._mapear_prioridade_alerta(monitoramento)
        titulo = self._montar_titulo_alerta_risco(monitoramento)
        mensagem = self._montar_mensagem_alerta_risco(monitoramento)
        recomendacao = self._montar_recomendacao_alerta_risco(monitoramento)

        dados_contexto = {
            "categoria_alerta": "risco",
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
        }

        self._upsert_alerta_automatico(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_RISCO,
            tipo=Alerta.TipoAlerta.RISCO,
            severidade=severidade,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            dados_contexto=dados_contexto,
            exige_confirmacao=(prioridade == Alerta.Prioridade.IMEDIATA),
        )

    def _sincronizar_alerta_coleta_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_COLETA,
        )

        avaliacao = self._avaliar_completude_coleta_alerta(monitoramento)
        pendentes_criticos = avaliacao.get("pendentes_criticos", [])
        pendentes_recomendados = avaliacao.get("pendentes_recomendados", [])
        inconsistencias = avaliacao.get("inconsistencias", [])

        deve_gerar = bool(
            pendentes_criticos
            or inconsistencias
            or len(pendentes_recomendados) >= 3
        )

        if not deve_gerar:
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Coleta voltou para faixa aceitável de completude.",
            )
            return

        if pendentes_criticos or inconsistencias:
            severidade = Alerta.Severidade.ALTA
            prioridade = Alerta.Prioridade.ALTA
        else:
            severidade = Alerta.Severidade.MEDIA
            prioridade = Alerta.Prioridade.MEDIA

        talhao_nome = monitoramento.talhao.nome if monitoramento.talhao else "Talhão"
        titulo = f"Coleta incompleta no talhão {talhao_nome}"

        partes = []
        if pendentes_criticos:
            partes.append(
                "Há pendências críticas: " + ", ".join(pendentes_criticos) + "."
            )
        if pendentes_recomendados:
            partes.append(
                "Campos recomendados ausentes: "
                + ", ".join(pendentes_recomendados)
                + "."
            )
        if inconsistencias:
            partes.append(
                "Foram encontradas inconsistências: "
                + ", ".join(inconsistencias)
                + "."
            )

        mensagem = " ".join(partes).strip()
        recomendacao = (
            "Revisar e completar a coleta do monitoramento antes de avançar com as próximas ações operacionais."
        )

        self._upsert_alerta_automatico(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_COLETA,
            tipo=Alerta.TipoAlerta.OPERACIONAL,
            severidade=severidade,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            dados_contexto={
                "categoria_alerta": "coleta",
                "completude": avaliacao,
            },
            exige_confirmacao=False,
        )

    def _sincronizar_alerta_imagem_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_IMAGEM,
        )

        status_imagem = monitoramento.status_imagem_ia
        possui_foto = bool(monitoramento.foto_monitoramento)

        if status_imagem == Monitoramento.StatusImagemIA.ERRO:
            severidade = Alerta.Severidade.ALTA
            prioridade = Alerta.Prioridade.ALTA
            titulo = "Erro no processamento da imagem do monitoramento"
            mensagem = (
                "O backend registrou falha no pipeline de imagem vinculado a este monitoramento."
            )
            recomendacao = (
                "Revisar a imagem enviada, reenviar o arquivo se necessário e executar nova análise."
            )
        elif possui_foto and status_imagem in [
            Monitoramento.StatusImagemIA.PENDENTE,
            Monitoramento.StatusImagemIA.PROCESSANDO,
        ]:
            severidade = Alerta.Severidade.MEDIA
            prioridade = (
                Alerta.Prioridade.ALTA
                if monitoramento.prioridade_operacional
                in [
                    Monitoramento.PrioridadeOperacional.ALTA,
                    Monitoramento.PrioridadeOperacional.IMEDIATA,
                ]
                else Alerta.Prioridade.MEDIA
            )
            titulo = "Imagem pendente de processamento"
            mensagem = (
                "Há uma imagem vinculada ao monitoramento aguardando conclusão do processamento."
            )
            recomendacao = (
                "Acompanhar a fila de processamento da imagem antes de depender deste insumo visual."
            )
        else:
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Não há pendência relevante de imagem para este monitoramento.",
            )
            return

        self._upsert_alerta_automatico(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_IMAGEM,
            tipo=Alerta.TipoAlerta.IMAGEM,
            severidade=severidade,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            dados_contexto={
                "categoria_alerta": "imagem",
                "possui_foto": possui_foto,
                "status_imagem_ia": status_imagem,
                "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
                "foto_nome_arquivo": (
                    monitoramento.foto_monitoramento.name.split("/")[-1]
                    if monitoramento.foto_monitoramento
                    else None
                ),
            },
            exige_confirmacao=False,
        )

    def _sincronizar_alerta_umidade_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_UMIDADE,
        )

        if monitoramento.umidade_solo is None:
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Monitoramento sem gatilho atual para alerta específico de umidade.",
            )
            return

        umidade = float(monitoramento.umidade_solo)

        if umidade < 15:
            severidade = Alerta.Severidade.CRITICA
            prioridade = Alerta.Prioridade.IMEDIATA
            titulo = "Umidade do solo crítica"
            mensagem = (
                f"A umidade do solo está em nível crítico ({umidade}%), exigindo ação imediata."
            )
            recomendacao = (
                "Validar rapidamente a condição hídrica do talhão e priorizar decisão operacional em campo."
            )
        elif umidade < 20:
            severidade = Alerta.Severidade.ALTA
            prioridade = Alerta.Prioridade.ALTA
            titulo = "Umidade do solo muito baixa"
            mensagem = (
                f"A umidade do solo está muito baixa ({umidade}%), podendo comprometer o desempenho da lavoura."
            )
            recomendacao = (
                "Revisar condição hídrica do solo e acompanhar o talhão com prioridade."
            )
        elif umidade > 85:
            severidade = Alerta.Severidade.MEDIA
            prioridade = Alerta.Prioridade.MEDIA
            titulo = "Umidade do solo muito elevada"
            mensagem = (
                f"A umidade do solo está elevada ({umidade}%), exigindo observação operacional."
            )
            recomendacao = (
                "Avaliar possíveis impactos no solo, sanidade e trafegabilidade da área."
            )
        else:
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Umidade do solo retornou para faixa sem alerta específico.",
            )
            return

        self._upsert_alerta_automatico(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_UMIDADE,
            tipo=Alerta.TipoAlerta.UMIDADE_SOLO,
            severidade=severidade,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            dados_contexto={
                "categoria_alerta": "umidade_solo",
                "umidade_solo": umidade,
            },
            exige_confirmacao=(prioridade == Alerta.Prioridade.IMEDIATA),
        )

    def _sincronizar_alerta_sanidade_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        alerta_existente = self._obter_alerta_automatico_existente(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_SANIDADE,
        )

        sanidade = self._normalizar_texto(monitoramento.sanidade)

        if not sanidade:
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Sem condição sanitária textual que gere alerta automático.",
            )
            return

        palavras_fitossanitarias = [
            "praga",
            "pragas",
            "doença",
            "doencas",
            "doenças",
            "presença",
            "presenca",
        ]
        palavras_desfavoraveis = [
            "ruim",
            "péssima",
            "pessima",
            "muito ruim",
        ]
        palavras_observacao = [
            "regular",
            "média",
            "media",
        ]

        possui_fitossanitario = any(palavra in sanidade for palavra in palavras_fitossanitarias)
        possui_desfavoravel = any(palavra in sanidade for palavra in palavras_desfavoraveis)
        possui_observacao = any(palavra in sanidade for palavra in palavras_observacao)

        if not (possui_fitossanitario or possui_desfavoravel or possui_observacao):
            self._resolver_alerta_automatico(
                alerta_existente=alerta_existente,
                monitoramento=monitoramento,
                motivo_resolucao="Texto de sanidade não indica condição preocupante.",
            )
            return

        if possui_fitossanitario and (
            possui_desfavoravel or monitoramento.exige_acao_imediata
        ):
            severidade = Alerta.Severidade.CRITICA
            prioridade = Alerta.Prioridade.IMEDIATA
        elif possui_fitossanitario or possui_desfavoravel:
            severidade = Alerta.Severidade.ALTA
            prioridade = Alerta.Prioridade.ALTA
        else:
            severidade = Alerta.Severidade.MEDIA
            prioridade = Alerta.Prioridade.MEDIA

        talhao_nome = monitoramento.talhao.nome if monitoramento.talhao else "Talhão"
        titulo = f"Sanidade preocupante no talhão {talhao_nome}"
        mensagem = (
            f"A condição sanitária informada foi: '{monitoramento.sanidade}'. "
            "O registro sugere necessidade de acompanhamento técnico."
        )
        recomendacao = (
            "Validar em campo o estado sanitário observado e revisar necessidade de intervenção técnica."
        )

        self._upsert_alerta_automatico(
            monitoramento=monitoramento,
            regra_origem=self.REGRA_ALERTA_SANIDADE,
            tipo=Alerta.TipoAlerta.SANIDADE,
            severidade=severidade,
            prioridade=prioridade,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            dados_contexto={
                "categoria_alerta": "sanidade",
                "sanidade_texto": monitoramento.sanidade,
                "possui_fitossanitario": possui_fitossanitario,
                "possui_desfavoravel": possui_desfavoravel,
                "possui_observacao": possui_observacao,
            },
            exige_confirmacao=(prioridade == Alerta.Prioridade.IMEDIATA),
        )

    def _sincronizar_alertas_monitoramento(
        self, monitoramento: Monitoramento
    ) -> None:
        self._sincronizar_alerta_risco_monitoramento(monitoramento)
        self._sincronizar_alerta_coleta_monitoramento(monitoramento)
        self._sincronizar_alerta_imagem_monitoramento(monitoramento)
        self._sincronizar_alerta_umidade_monitoramento(monitoramento)
        self._sincronizar_alerta_sanidade_monitoramento(monitoramento)

    def _buscar_fontes_relevantes(self, monitoramento: Monitoramento):
        """
        Nesta fase, a recuperação de fontes deve operar no escopo técnico
        do milho. Mantemos a estrutura extensível, mas o contexto atual é milho.
        Também aceitamos fontes gerais de apoio.
        """
        anomalias = monitoramento.anomalias.filter(ativa=True)
        termos_busca = set()

        cultura_contexto = self._obter_cultura_contexto(monitoramento)
        termos_busca.add(cultura_contexto)

        if monitoramento.cultura:
            termos_busca.update(monitoramento.cultura.lower().split())

        if monitoramento.estadio_fenologico:
            termos_busca.add(monitoramento.estadio_fenologico.lower())

        estadio_display = monitoramento.get_estadio_fenologico_display()
        if estadio_display:
            termos_busca.update(
                estadio_display.lower().replace("-", " ").split()
            )

        if monitoramento.sanidade:
            termos_busca.update(monitoramento.sanidade.lower().split())

        if monitoramento.observacoes:
            termos_busca.update(monitoramento.observacoes.lower().split())

        for anomalia in anomalias:
            if anomalia.nome:
                termos_busca.update(anomalia.nome.lower().split())
            if anomalia.tipo:
                termos_busca.add(anomalia.tipo.lower())
            if anomalia.observacao:
                termos_busca.update(anomalia.observacao.lower().split())

        termos_busca = {
            termo.strip(".,;:()[]{}")
            for termo in termos_busca
            if len(termo.strip(".,;:()[]{}")) >= 3
        }

        categorias = [FonteConhecimento.CategoriaFonte.GERAL]

        if monitoramento.estadio_fenologico:
            categorias.append(FonteConhecimento.CategoriaFonte.FENOLOGIA)

        if monitoramento.umidade_solo is not None:
            categorias.extend(
                [
                    FonteConhecimento.CategoriaFonte.SOLO,
                    FonteConhecimento.CategoriaFonte.CLIMA,
                ]
            )

        if anomalias.exists():
            categorias.extend(
                [
                    FonteConhecimento.CategoriaFonte.PRAGAS,
                    FonteConhecimento.CategoriaFonte.DOENCAS,
                    FonteConhecimento.CategoriaFonte.MANEJO,
                ]
            )

        queryset = FonteConhecimento.objects.filter(
            ativa=True,
            status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO,
            categoria__in=categorias,
            escopo_cultura__in=self._escopos_fontes_ativos(),
        ).distinct()

        if not self.request.user.is_superuser:
            queryset = queryset.filter(usuario=self.request.user)

        if termos_busca:
            filtro = Q()
            for termo in termos_busca:
                filtro |= Q(titulo__icontains=termo)
                filtro |= Q(descricao__icontains=termo)
                filtro |= Q(palavras_chave__icontains=termo)
                filtro |= Q(conteudo_extraido__icontains=termo)

            queryset = queryset.filter(filtro).distinct()

        return queryset.order_by("-created_at")[:10]

    def _montar_pontos_atencao(
        self, monitoramento: Monitoramento, anomalias
    ):
        pontos_atencao = []

        if monitoramento.exige_acao_imediata:
            pontos_atencao.append(
                "O monitoramento indica necessidade de ação imediata em campo."
            )
        elif monitoramento.possui_anomalias:
            pontos_atencao.append(
                "Há anomalias ativas registradas, exigindo acompanhamento técnico."
            )
        else:
            pontos_atencao.append(
                "Não há anomalias ativas registradas no momento."
            )

        if (
            monitoramento.umidade_solo is not None
            and float(monitoramento.umidade_solo) < 30
        ):
            pontos_atencao.append(
                "A umidade do solo está em faixa baixa e merece observação."
            )

        if monitoramento.sanidade:
            pontos_atencao.append(
                f"Estado sanitário informado: {monitoramento.sanidade}."
            )

        nomes_anomalias = [anomalia.nome for anomalia in anomalias if anomalia.nome]
        if nomes_anomalias:
            pontos_atencao.append(
                "Anomalias registradas: " + ", ".join(nomes_anomalias) + "."
            )

        return pontos_atencao

    def _montar_resumo_tecnico_base(
        self, monitoramento: Monitoramento
    ) -> str:
        resumo_tecnico = (
            f"O monitoramento da lavoura de milho no talhão "
            f"{monitoramento.talhao.nome} foi realizado em "
            f"{monitoramento.data_observacao}, no estádio "
            f"{monitoramento.get_estadio_fenologico_display()}, com nível de atenção "
            f"{monitoramento.get_nivel_atencao_display().lower()}."
        )

        if monitoramento.possui_anomalias:
            resumo_tecnico += (
                " Há registros de anomalias ativas e recomenda-se acompanhamento técnico "
                "com base nas referências disponíveis para milho."
            )
        else:
            resumo_tecnico += (
                " Não há anomalias ativas, mantendo-se recomendação de monitoramento contínuo."
            )

        return resumo_tecnico

    def _serializar_fontes_para_ia(self, fontes):
        referencias = []

        for fonte in fontes:
            referencias.append(
                {
                    "id": fonte.id,
                    "titulo": fonte.titulo,
                    "tipo": fonte.tipo,
                    "categoria": fonte.categoria,
                    "escopo_cultura": fonte.escopo_cultura,
                    "escopo_agronomico": fonte.escopo_agronomico,
                    "instituicao": fonte.instituicao,
                    "status_indexacao": fonte.status_indexacao,
                    "conteudo_extraido": fonte.conteudo_extraido or "",
                }
            )

        return referencias

    def _montar_resposta_frontend_apoio(
        self,
        apoio_base: dict,
        resultado_ia: dict | None = None,
        erro_ia: str | None = None,
    ) -> dict:
        """
        Estrutura o apoio diagnóstico em formato pronto para frontend.
        """
        ia_estruturada = {}
        if resultado_ia:
            ia_estruturada = resultado_ia.get("resposta_estruturada") or {}

        resumo_principal = (
            ia_estruturada.get("resumo_tecnico")
            or apoio_base.get("resumo_tecnico")
            or ""
        )

        pontos_principais = (
            ia_estruturada.get("pontos_atencao")
            or apoio_base.get("pontos_atencao")
            or []
        )

        return {
            "resumo_tecnico": apoio_base.get("resumo_tecnico"),
            "pontos_atencao": apoio_base.get("pontos_atencao", []),
            "gerado_em": apoio_base.get("gerado_em"),
            "modo_geracao": apoio_base.get("modo_geracao"),
            "modelo_ia": apoio_base.get("modelo_ia"),
            "erro_ia": erro_ia,
            "resposta_ia": apoio_base.get("resposta_ia"),
            "escopo_agronomico": apoio_base.get("escopo_agronomico", "milho"),
            "ui": {
                "status_ia": "sucesso" if resultado_ia else "fallback",
                "usar_resposta_ia": bool(resultado_ia),
                "resumo_principal": resumo_principal,
                "pontos_principais": pontos_principais,
                "interpretacao_agronomica": ia_estruturada.get(
                    "interpretacao_agronomica", ""
                ),
                "recomendacoes_iniciais": ia_estruturada.get(
                    "recomendacoes_iniciais", []
                ),
                "limitacoes": ia_estruturada.get("limitacoes", ""),
                "fontes_utilizadas": ia_estruturada.get("fontes_utilizadas", []),
                "texto_completo_ia": ia_estruturada.get("texto_completo", ""),
                "mensagem_status": (
                    "Resposta enriquecida por IA local no escopo de milho."
                    if resultado_ia
                    else "Resposta gerada com fallback seguro por regras no escopo de milho."
                ),
            },
        }

    def _gerar_apoio_diagnostico_hibrido(
        self, monitoramento: Monitoramento
    ) -> dict:
        """
        Gera apoio diagnóstico híbrido:
        1. monta base rastreável local
        2. tenta usar IA local via Ollama
        3. se falhar, mantém fallback determinístico

        Escopo atual: MILHO.
        """
        anomalias = monitoramento.anomalias.filter(ativa=True)
        fontes = self._buscar_fontes_relevantes(monitoramento)

        pontos_atencao = self._montar_pontos_atencao(monitoramento, anomalias)
        resumo_tecnico_base = self._montar_resumo_tecnico_base(monitoramento)

        monitoramento_payload = {
            "id": monitoramento.id,
            "talhao_nome": monitoramento.talhao.nome if monitoramento.talhao else "",
            "data_observacao": str(monitoramento.data_observacao),
            "estadio_fenologico": monitoramento.estadio_fenologico,
            "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
            "cultura": self._obter_cultura_contexto(monitoramento),
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
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
            "resumo_diagnostico": monitoramento.resumo_diagnostico,
            "observacoes": monitoramento.observacoes,
            "score_risco": (
                float(monitoramento.score_risco)
                if monitoramento.score_risco is not None
                else 0
            ),
            "faixa_risco": monitoramento.faixa_risco,
            "prioridade_operacional": monitoramento.prioridade_operacional,
            "justificativa_risco": monitoramento.justificativa_risco,
        }

        anomalias_payload = [
            {
                "id": anomalia.id,
                "tipo": anomalia.tipo,
                "tipo_display": anomalia.get_tipo_display(),
                "nome": anomalia.nome,
                "severidade": anomalia.severidade,
                "severidade_display": anomalia.get_severidade_display(),
                "percentual_plantas_afetadas": (
                    float(anomalia.percentual_plantas_afetadas)
                    if anomalia.percentual_plantas_afetadas is not None
                    else None
                ),
                "exige_atencao": anomalia.exige_atencao,
                "observacao": anomalia.observacao,
            }
            for anomalia in anomalias
        ]

        referencias_payload = self._serializar_fontes_para_ia(fontes)

        apoio_base = {
            "resumo_tecnico": resumo_tecnico_base,
            "pontos_atencao": pontos_atencao,
            "gerado_em": timezone.now().isoformat(),
            "modo_geracao": "regras",
            "modelo_ia": None,
            "resposta_ia": None,
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
        }

        resultado_ia = None
        erro_ia = None

        try:
            ia_service = OllamaIAService(model="gemma3n:e2b")
            resultado_ia = ia_service.gerar_apoio_diagnostico(
                monitoramento=monitoramento_payload,
                anomalias=anomalias_payload,
                referencias_tecnicas=referencias_payload,
            )

            apoio_base["modo_geracao"] = "ia_local + regras"
            apoio_base["modelo_ia"] = resultado_ia.get("model")
            apoio_base["resposta_ia"] = resultado_ia.get("resposta")

        except Exception as exc:
            erro_ia = str(exc)

        return self._montar_resposta_frontend_apoio(
            apoio_base=apoio_base,
            resultado_ia=resultado_ia,
            erro_ia=erro_ia,
        )

    def _analisar_imagem_monitoramento(
        self, monitoramento: Monitoramento
    ) -> dict:
        """
        Análise inicial da imagem do monitoramento.

        Nesta fase:
        - não fazemos visão computacional real ainda
        - geramos estrutura profissional de processamento
        - usamos fallback seguro para preparar o pipeline futuro
        - escopo agronômico atual: milho
        """
        if not monitoramento.foto_monitoramento:
            raise RuntimeError("Este monitoramento não possui foto enviada.")

        monitoramento.status_imagem_ia = Monitoramento.StatusImagemIA.PROCESSANDO
        monitoramento.ia_erro_imagem = ""
        monitoramento.save(
            update_fields=[
                "status_imagem_ia",
                "ia_erro_imagem",
                "updated_at",
            ]
        )

        try:
            nome_arquivo = (
                monitoramento.foto_monitoramento.name.split("/")[-1]
                if monitoramento.foto_monitoramento
                else ""
            )

            resultado = {
                "modo": "fallback_estruturado",
                "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
                "mensagem": (
                    "A imagem da lavoura de milho foi recebida com sucesso e o pipeline "
                    "está preparado para futura análise visual por IA."
                ),
                "arquivo": nome_arquivo,
                "observacoes": [
                    "Análise visual automática real ainda não foi ativada nesta fase.",
                    "A imagem já está vinculada ao monitoramento e pronta para processamento futuro.",
                    "Os dados agronômicos atuais do monitoramento continuam sendo a fonte principal do diagnóstico.",
                ],
                "monitoramento": {
                    "id": monitoramento.id,
                    "talhao_nome": monitoramento.talhao.nome if monitoramento.talhao else "",
                    "estadio_informado_usuario": monitoramento.estadio_fenologico,
                    "estadio_informado_usuario_display": monitoramento.get_estadio_fenologico_display(),
                    "cultura_referencia": self._obter_cultura_contexto(monitoramento),
                },
            }

            monitoramento.status_imagem_ia = Monitoramento.StatusImagemIA.CONCLUIDA
            monitoramento.ia_estadio_fenologico_sugerido = (
                monitoramento.estadio_fenologico
            )
            monitoramento.ia_confianca_imagem = None
            monitoramento.ia_resultado_imagem = resultado
            monitoramento.ia_observacoes_imagem = (
                "Pipeline de imagem preparado para milho. "
                "Análise visual automática completa será conectada em próxima fase."
            )
            monitoramento.ia_erro_imagem = ""
            monitoramento.imagem_processada_em = timezone.now()
            monitoramento.save(
                update_fields=[
                    "status_imagem_ia",
                    "ia_estadio_fenologico_sugerido",
                    "ia_confianca_imagem",
                    "ia_resultado_imagem",
                    "ia_observacoes_imagem",
                    "ia_erro_imagem",
                    "imagem_processada_em",
                    "updated_at",
                ]
            )

            self._atualizar_score_risco(monitoramento)
            self._sincronizar_alertas_monitoramento(monitoramento)
            return resultado

        except Exception as exc:
            monitoramento.status_imagem_ia = Monitoramento.StatusImagemIA.ERRO
            monitoramento.ia_erro_imagem = str(exc)
            monitoramento.imagem_processada_em = timezone.now()
            monitoramento.save(
                update_fields=[
                    "status_imagem_ia",
                    "ia_erro_imagem",
                    "imagem_processada_em",
                    "updated_at",
                ]
            )
            self._atualizar_score_risco(monitoramento)
            self._sincronizar_alertas_monitoramento(monitoramento)
            raise

    def _gerar_relatorio_base(self, monitoramento: Monitoramento) -> Relatorio:
        talhao = monitoramento.talhao
        propriedade = talhao.propriedade if talhao else None
        anomalias = monitoramento.anomalias.filter(ativa=True)
        referencias = self._buscar_fontes_relevantes(monitoramento)
        apoio_diagnostico = self._gerar_apoio_diagnostico_hibrido(monitoramento)
        clima = self._buscar_clima_monitoramento(monitoramento)
        imagem_monitoramento = self._serializar_imagem_monitoramento(monitoramento)
        risco_monitoramento = self._serializar_risco_monitoramento(monitoramento)

        resumo = (
            f"Monitoramento da lavoura de milho no talhão {talhao.nome} realizado em "
            f"{monitoramento.data_observacao}, no estádio "
            f"{monitoramento.get_estadio_fenologico_display()}."
        )

        if monitoramento.possui_anomalias:
            resumo += (
                f" Foram identificadas anomalias ativas, com nível de atenção "
                f"{monitoramento.get_nivel_atencao_display().lower()}."
            )
        else:
            resumo += " Não foram identificadas anomalias ativas no momento."

        if imagem_monitoramento.get("possui_foto"):
            resumo += " Há imagem vinculada ao monitoramento para rastreabilidade visual."

        conteudo_json = {
            "monitoramento": {
                "id": monitoramento.id,
                "data_observacao": str(monitoramento.data_observacao),
                "estadio_fenologico": monitoramento.estadio_fenologico,
                "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
                "cultura": self._obter_cultura_contexto(monitoramento),
                "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
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
                "foto_monitoramento_url": (
                    monitoramento.foto_monitoramento.url
                    if monitoramento.foto_monitoramento
                    else None
                ),
                "status_imagem_ia": monitoramento.status_imagem_ia,
                "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
                "ia_estadio_fenologico_sugerido": monitoramento.ia_estadio_fenologico_sugerido,
                "ia_confianca_imagem": (
                    float(monitoramento.ia_confianca_imagem)
                    if monitoramento.ia_confianca_imagem is not None
                    else None
                ),
                "ia_resultado_imagem": monitoramento.ia_resultado_imagem,
                "ia_observacoes_imagem": monitoramento.ia_observacoes_imagem,
                "ia_erro_imagem": monitoramento.ia_erro_imagem,
                "imagem_processada_em": (
                    monitoramento.imagem_processada_em.isoformat()
                    if monitoramento.imagem_processada_em
                    else None
                ),
                "observacoes": monitoramento.observacoes,
                "nivel_atencao": monitoramento.nivel_atencao,
                "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                "status_diagnostico": monitoramento.status_diagnostico,
                "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                "possui_anomalias": monitoramento.possui_anomalias,
                "exige_acao_imediata": monitoramento.exige_acao_imediata,
                "resumo_diagnostico": monitoramento.resumo_diagnostico,
                "score_risco": risco_monitoramento["score_risco"],
                "faixa_risco": risco_monitoramento["faixa_risco"],
                "faixa_risco_display": risco_monitoramento["faixa_risco_display"],
                "prioridade_operacional": risco_monitoramento["prioridade_operacional"],
                "prioridade_operacional_display": risco_monitoramento["prioridade_operacional_display"],
                "justificativa_risco": risco_monitoramento["justificativa_risco"],
                "latitude": (
                    float(monitoramento.latitude)
                    if monitoramento.latitude is not None
                    else None
                ),
                "longitude": (
                    float(monitoramento.longitude)
                    if monitoramento.longitude is not None
                    else None
                ),
            },
            "imagem_monitoramento": imagem_monitoramento,
            "risco_monitoramento": risco_monitoramento,
            "clima": clima,
            "talhao": {
                "id": talhao.id if talhao else None,
                "nome": talhao.nome if talhao else None,
                "cultivar": talhao.cultivar if talhao else None,
                "sistema_cultivo": talhao.sistema_cultivo if talhao else None,
                "data_plantio": (
                    str(talhao.data_plantio)
                    if talhao and talhao.data_plantio
                    else None
                ),
                "area_ha": (
                    float(talhao.area_ha)
                    if talhao and talhao.area_ha is not None
                    else None
                ),
            },
            "propriedade": {
                "id": propriedade.id if propriedade else None,
                "nome": propriedade.nome if propriedade else None,
                "municipio": propriedade.municipio if propriedade else None,
                "uf": propriedade.uf if propriedade else None,
                "area_total_ha": (
                    float(propriedade.area_total_ha)
                    if propriedade and propriedade.area_total_ha is not None
                    else None
                ),
            },
            "anomalias": [
                {
                    "id": anomalia.id,
                    "tipo": anomalia.tipo,
                    "tipo_display": anomalia.get_tipo_display(),
                    "nome": anomalia.nome,
                    "severidade": anomalia.severidade,
                    "severidade_display": anomalia.get_severidade_display(),
                    "percentual_plantas_afetadas": (
                        float(anomalia.percentual_plantas_afetadas)
                        if anomalia.percentual_plantas_afetadas is not None
                        else None
                    ),
                    "observacao": anomalia.observacao,
                    "exige_atencao": anomalia.exige_atencao,
                }
                for anomalia in anomalias
            ],
            "referencias_tecnicas": [
                {
                    "id": fonte.id,
                    "titulo": fonte.titulo,
                    "tipo": fonte.tipo,
                    "escopo_cultura": fonte.escopo_cultura,
                    "escopo_agronomico": fonte.escopo_agronomico,
                    "categoria": fonte.categoria,
                    "instituicao": fonte.instituicao,
                    "status_indexacao": fonte.status_indexacao,
                }
                for fonte in referencias
            ],
            "apoio_diagnostico": apoio_diagnostico,
        }

        relatorio = Relatorio.objects.create(
            usuario=self.request.user,
            tipo=Relatorio.TipoRelatorio.MONITORAMENTO,
            status=Relatorio.StatusRelatorio.CONCLUIDO,
            monitoramento=monitoramento,
            talhao=talhao,
            propriedade=propriedade,
            titulo=(
                f"Relatório de Monitoramento - {talhao.nome} - "
                f"{monitoramento.data_observacao}"
            ),
            resumo=resumo,
            conteudo_json=conteudo_json,
            observacoes=(
                "Relatório técnico base gerado automaticamente no escopo da cultura do milho."
            ),
            ativa=True,
            gerado_em=timezone.now(),
        )

        if referencias:
            relatorio.referencias_tecnicas.set(referencias)

        return relatorio

    def _montar_resposta_feedback_coleta(
        self, monitoramento: Monitoramento, request
    ) -> dict:
        serializer = self.get_serializer(
            monitoramento,
            context={"request": request},
        )
        data = serializer.data

        completude = data.get("completude_coleta", {}) or {}
        feedback_ui = data.get("feedback_ui", {}) or {}

        pendentes_criticos = completude.get("pendentes_criticos", []) or []
        pendentes_recomendados = completude.get("pendentes_recomendados", []) or []
        inconsistencias = completude.get("inconsistencias", []) or []

        if feedback_ui.get("bloquear_avanco_diagnostico"):
            proximo_passo = "preencher_campos_criticos"
        elif inconsistencias:
            proximo_passo = "corrigir_inconsistencias"
        elif feedback_ui.get("bloquear_geracao_relatorio"):
            proximo_passo = "enriquecer_coleta"
        elif feedback_ui.get("sugerir_foto"):
            proximo_passo = "adicionar_foto_monitoramento"
        else:
            proximo_passo = "seguir_para_diagnostico"

        return {
            "monitoramento_id": monitoramento.id,
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
            "talhao": {
                "id": monitoramento.talhao_id,
                "nome": monitoramento.talhao.nome if monitoramento.talhao else None,
            },
            "resumo_operacional": {
                "data_observacao": str(monitoramento.data_observacao),
                "estadio_fenologico": monitoramento.estadio_fenologico,
                "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
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
            },
            "completude_coleta": completude,
            "feedback_ui": feedback_ui,
            "insumos_frontend": {
                "proximo_passo_sugerido": proximo_passo,
                "mostrar_card_pendencias": bool(
                    pendentes_criticos or pendentes_recomendados
                ),
                "mostrar_card_inconsistencias": bool(inconsistencias),
                "quantidade_pendentes_criticos": len(pendentes_criticos),
                "quantidade_pendentes_recomendados": len(pendentes_recomendados),
                "quantidade_inconsistencias": len(inconsistencias),
                "campos_em_foco": feedback_ui.get("campos_foco_inicial", []),
            },
        }

    def perform_create(self, serializer):
        monitoramento = serializer.save(usuario=self.request.user)

        if monitoramento.foto_monitoramento:
            self._limpar_estado_analise_imagem(monitoramento)

        self._atualizar_diagnostico_basico(monitoramento)
        self._atualizar_score_risco(monitoramento)
        self._sincronizar_alertas_monitoramento(monitoramento)

    def perform_update(self, serializer):
        foto_foi_enviada = "foto_monitoramento" in self.request.FILES

        monitoramento = serializer.save()

        if foto_foi_enviada and monitoramento.foto_monitoramento:
            self._limpar_estado_analise_imagem(monitoramento)
        elif (
            monitoramento.foto_monitoramento
            and monitoramento.status_imagem_ia
            == Monitoramento.StatusImagemIA.NAO_ENVIADA
        ):
            self._limpar_estado_analise_imagem(monitoramento)

        self._atualizar_diagnostico_basico(monitoramento)
        self._atualizar_score_risco(monitoramento)
        self._sincronizar_alertas_monitoramento(monitoramento)

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        Dashboard consolidado do backend para visão geral operacional.
        """
        user = request.user

        if user.is_superuser:
            monitoramentos_qs = Monitoramento.objects.select_related(
                "talhao__propriedade", "usuario"
            ).all()
            propriedades_qs = Propriedade.objects.all()
            talhoes_qs = Talhao.objects.select_related("propriedade").all()
            relatorios_qs = Relatorio.objects.select_related(
                "monitoramento",
                "talhao",
                "propriedade",
                "usuario",
            ).all()
        else:
            monitoramentos_qs = Monitoramento.objects.select_related(
                "talhao__propriedade", "usuario"
            ).filter(usuario=user)
            propriedades_qs = Propriedade.objects.filter(usuario=user)
            talhoes_qs = Talhao.objects.select_related("propriedade").filter(
                usuario=user
            )
            relatorios_qs = Relatorio.objects.select_related(
                "monitoramento",
                "talhao",
                "propriedade",
                "usuario",
            ).filter(usuario=user)

        total_propriedades = propriedades_qs.count()
        total_talhoes = talhoes_qs.count()
        total_monitoramentos = monitoramentos_qs.count()
        total_relatorios = relatorios_qs.count()

        alertas_criticos_qs = monitoramentos_qs.filter(
            Q(nivel_atencao=Monitoramento.NivelAtencao.CRITICO)
            | Q(exige_acao_imediata=True)
            | Q(status_diagnostico=Monitoramento.StatusDiagnostico.ALERTA)
            | Q(faixa_risco=Monitoramento.FaixaRisco.CRITICO)
            | Q(
                prioridade_operacional=
                Monitoramento.PrioridadeOperacional.IMEDIATA
            )
        ).order_by("-score_risco", "-data_observacao", "-created_at")

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

        distribuicao_risco_raw = (
            monitoramentos_qs.values("faixa_risco")
            .annotate(total=Count("id"))
            .order_by("faixa_risco")
        )

        distribuicao_risco = {
            "baixo": 0,
            "moderado": 0,
            "alto": 0,
            "critico": 0,
        }
        for item in distribuicao_risco_raw:
            faixa = item.get("faixa_risco")
            total = item.get("total", 0)
            if faixa in distribuicao_risco:
                distribuicao_risco[faixa] = total

        fila_imagem_ia = {
            "nao_enviada": monitoramentos_qs.filter(
                status_imagem_ia=Monitoramento.StatusImagemIA.NAO_ENVIADA
            ).count(),
            "pendente": monitoramentos_qs.filter(
                status_imagem_ia=Monitoramento.StatusImagemIA.PENDENTE
            ).count(),
            "processando": monitoramentos_qs.filter(
                status_imagem_ia=Monitoramento.StatusImagemIA.PROCESSANDO
            ).count(),
            "concluida": monitoramentos_qs.filter(
                status_imagem_ia=Monitoramento.StatusImagemIA.CONCLUIDA
            ).count(),
            "erro": monitoramentos_qs.filter(
                status_imagem_ia=Monitoramento.StatusImagemIA.ERRO
            ).count(),
        }

        monitoramentos_recentes = monitoramentos_qs.order_by(
            "-data_observacao",
            "-created_at",
        )[:5]
        relatorios_recentes = relatorios_qs.order_by("-created_at")[:5]

        serializer_monitoramentos = self.get_serializer(
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
            risco_monitoramento = self._serializar_risco_monitoramento(monitoramento)
            alertas_criticos.append(
                {
                    "id": monitoramento.id,
                    "talhao_id": monitoramento.talhao_id,
                    "talhao_nome": (
                        monitoramento.talhao.nome if monitoramento.talhao else None
                    ),
                    "data_observacao": str(monitoramento.data_observacao),
                    "nivel_atencao": monitoramento.nivel_atencao,
                    "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                    "status_diagnostico": monitoramento.status_diagnostico,
                    "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                    "score_risco": risco_monitoramento["score_risco"],
                    "faixa_risco": risco_monitoramento["faixa_risco"],
                    "faixa_risco_display": risco_monitoramento["faixa_risco_display"],
                    "prioridade_operacional": risco_monitoramento["prioridade_operacional"],
                    "prioridade_operacional_display": risco_monitoramento["prioridade_operacional_display"],
                    "exige_acao_imediata": monitoramento.exige_acao_imediata,
                    "resumo_diagnostico": monitoramento.resumo_diagnostico,
                    "justificativa_risco": risco_monitoramento["justificativa_risco"],
                }
            )

        resposta = {
            "escopo_agronomico": "milho",
            "resumo": {
                "total_propriedades": total_propriedades,
                "total_talhoes": total_talhoes,
                "total_monitoramentos": total_monitoramentos,
                "total_relatorios": total_relatorios,
                "total_alertas_criticos": alertas_criticos_qs.count(),
            },
            "distribuicao_nivel_atencao": distribuicao_nivel,
            "distribuicao_risco": distribuicao_risco,
            "fila_imagem_ia": fila_imagem_ia,
            "monitoramentos_recentes": serializer_monitoramentos.data,
            "relatorios_recentes": serializer_relatorios.data,
            "alertas_criticos": alertas_criticos,
            "gerado_em": timezone.now().isoformat(),
        }

        return Response(resposta, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="anomalias")
    def listar_anomalias(self, request, pk=None):
        """
        Lista todas as anomalias vinculadas a um monitoramento específico.
        """
        monitoramento = self.get_object()
        anomalias = monitoramento.anomalias.all().order_by("-created_at")
        serializer = AnomaliaSerializer(anomalias, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="recalcular-diagnostico")
    def recalcular_diagnostico(self, request, pk=None):
        """
        Recalcula o diagnóstico básico do monitoramento com base nas anomalias ativas.
        """
        monitoramento = self.get_object()
        self._atualizar_diagnostico_basico(monitoramento)
        self._atualizar_score_risco(monitoramento)
        self._sincronizar_alertas_monitoramento(monitoramento)

        serializer = self.get_serializer(
            monitoramento,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="gerar-relatorio")
    def gerar_relatorio(self, request, pk=None):
        """
        Gera automaticamente um relatório técnico base a partir do monitoramento.
        """
        monitoramento = self.get_object()
        self._atualizar_diagnostico_basico(monitoramento)
        self._atualizar_score_risco(monitoramento)
        self._sincronizar_alertas_monitoramento(monitoramento)

        relatorio = self._gerar_relatorio_base(monitoramento)
        serializer = RelatorioSerializer(
            relatorio,
            context={"request": request},
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="apoio-diagnostico")
    def apoio_diagnostico(self, request, pk=None):
        """
        Gera apoio diagnóstico técnico com base no monitoramento,
        anomalias, referências e IA local quando disponível.
        """
        monitoramento = self.get_object()
        self._atualizar_diagnostico_basico(monitoramento)
        self._atualizar_score_risco(monitoramento)
        self._sincronizar_alertas_monitoramento(monitoramento)

        anomalias = monitoramento.anomalias.filter(ativa=True)
        fontes = self._buscar_fontes_relevantes(monitoramento)
        apoio_diagnostico = self._gerar_apoio_diagnostico_hibrido(monitoramento)
        risco_monitoramento = self._serializar_risco_monitoramento(monitoramento)

        resposta = {
            "monitoramento_id": monitoramento.id,
            "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
            "talhao": {
                "id": monitoramento.talhao.id,
                "nome": monitoramento.talhao.nome,
            },
            "nivel_atencao": monitoramento.nivel_atencao,
            "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
            "status_diagnostico": monitoramento.status_diagnostico,
            "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
            "score_risco": risco_monitoramento["score_risco"],
            "faixa_risco": risco_monitoramento["faixa_risco"],
            "faixa_risco_display": risco_monitoramento["faixa_risco_display"],
            "prioridade_operacional": risco_monitoramento["prioridade_operacional"],
            "prioridade_operacional_display": risco_monitoramento["prioridade_operacional_display"],
            "justificativa_risco": risco_monitoramento["justificativa_risco"],
            "exige_acao_imediata": monitoramento.exige_acao_imediata,
            "apoio_diagnostico": apoio_diagnostico,
            "anomalias": [
                {
                    "id": anomalia.id,
                    "tipo": anomalia.tipo,
                    "tipo_display": anomalia.get_tipo_display(),
                    "nome": anomalia.nome,
                    "severidade": anomalia.severidade,
                    "severidade_display": anomalia.get_severidade_display(),
                    "percentual_plantas_afetadas": (
                        float(anomalia.percentual_plantas_afetadas)
                        if anomalia.percentual_plantas_afetadas is not None
                        else None
                    ),
                    "exige_atencao": anomalia.exige_atencao,
                    "observacao": anomalia.observacao,
                }
                for anomalia in anomalias
            ],
            "referencias_tecnicas": [
                {
                    "id": fonte.id,
                    "titulo": fonte.titulo,
                    "tipo": fonte.tipo,
                    "categoria": fonte.categoria,
                    "escopo_cultura": fonte.escopo_cultura,
                    "escopo_agronomico": fonte.escopo_agronomico,
                    "instituicao": fonte.instituicao,
                    "status_indexacao": fonte.status_indexacao,
                }
                for fonte in fontes
            ],
        }

        return Response(resposta)

    @action(detail=True, methods=["post"], url_path="analisar-imagem")
    def analisar_imagem(self, request, pk=None):
        """
        Processa a imagem vinculada ao monitoramento.

        Nesta fase:
        - valida se há foto
        - executa pipeline inicial estruturado
        - prepara o backend para futura IA visual real
        """
        monitoramento = self.get_object()

        if not monitoramento.foto_monitoramento:
            return Response(
                {"detail": "Este monitoramento não possui foto para análise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = self._analisar_imagem_monitoramento(monitoramento)
        except RuntimeError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Erro ao processar imagem: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        serializer = self.get_serializer(
            monitoramento,
            context={"request": request},
        )
        return Response(
            {
                "detail": "Imagem processada com sucesso.",
                "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
                "resultado_imagem": resultado,
                "monitoramento": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="clima")
    def clima(self, request, pk=None):
        """
        Retorna dados climáticos em tempo real do local do monitoramento.
        """
        monitoramento = self.get_object()

        if monitoramento.latitude is None or monitoramento.longitude is None:
            return Response(
                {"detail": "Monitoramento não possui coordenadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "OPENWEATHER_API_KEY", "")

        if not api_key:
            return Response(
                {"detail": "API key de clima não configurada."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        service = ClimaService(api_key)

        clima = service.obter_clima(
            float(monitoramento.latitude),
            float(monitoramento.longitude),
        )

        if clima.get("erro"):
            return Response(
                {"detail": clima["erro"]},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "monitoramento_id": monitoramento.id,
                "escopo_agronomico": self._obter_cultura_contexto(monitoramento),
                "talhao": monitoramento.talhao.nome,
                "clima": clima.get("dados"),
                "clima_status": clima.get("sucesso"),
                "clima_erro": clima.get("erro"),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="feedback-coleta")
    def feedback_coleta(self, request, pk=None):
        """
        Retorna um resumo guiado de completude e orientação operacional
        para o frontend conduzir a coleta em campo.
        """
        monitoramento = self.get_object()
        resposta = self._montar_resposta_feedback_coleta(
            monitoramento=monitoramento,
            request=request,
        )
        return Response(resposta, status=status.HTTP_200_OK)