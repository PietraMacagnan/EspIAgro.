from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.monitoramento.models import Monitoramento
from .models import Alerta
from .serializers import AlertaSerializer


class AlertaViewSet(viewsets.ModelViewSet):
    """
    API completa de Alertas.

    Endpoints principais:
    - GET /api/alertas/
    - POST /api/alertas/
    - GET /api/alertas/{id}/
    - PUT /api/alertas/{id}/
    - PATCH /api/alertas/{id}/
    - DELETE /api/alertas/{id}/

    Filtros:
    - status
    - tipo
    - severidade
    - prioridade
    - monitoramento
    - talhao
    - propriedade
    - lido
    - ativa
    - exige_confirmacao
    - escopo_agronomico
    - busca

    Ações extras:
    - GET /api/alertas/dashboard/
    - POST /api/alertas/gerar-por-monitoramento/
    - POST /api/alertas/{id}/marcar-lido/
    - POST /api/alertas/{id}/marcar-nao-lido/
    - POST /api/alertas/{id}/em-analise/
    - POST /api/alertas/{id}/resolver/
    - POST /api/alertas/{id}/ignorar/
    - POST /api/alertas/{id}/reativar/

    Escopo atual:
    - milho
    """

    serializer_class = AlertaSerializer
    permission_classes = [IsAuthenticated]

    REGRA_ALERTA_RISCO = "monitoramento_risco_operacional"
    REGRA_ALERTA_IMAGEM = "monitoramento_imagem_pendente"
    REGRA_ALERTA_UMIDADE = "monitoramento_umidade_critica"
    REGRA_ALERTA_SANIDADE = "monitoramento_sanidade_preocupante"
    REGRA_ALERTA_ANOMALIA = "anomalia_ativa_monitoramento"
    REGRA_ALERTA_DIVERGENCIA_IMAGEM = "divergencia_estadio_fenologico_ia"

    STATUS_ABERTOS = [
        Alerta.StatusAlerta.ATIVO,
        Alerta.StatusAlerta.EM_ANALISE,
    ]

    def _to_bool(self, value):
        if value is None:
            return None

        value = str(value).strip().lower()

        if value in ["true", "1", "sim", "yes", "s"]:
            return True

        if value in ["false", "0", "nao", "não", "no", "n"]:
            return False

        return None

    def _normalizar_texto(self, value):
        if value is None:
            return ""

        return str(value).strip()

    def _get_monitoramento_queryset_usuario(self):
        user = self.request.user

        queryset = Monitoramento.objects.select_related(
            "usuario",
            "talhao",
            "talhao__propriedade",
        )

        if user.is_superuser:
            return queryset.all()

        return queryset.filter(usuario=user)

    def _validar_monitoramento_usuario(self, monitoramento):
        if not monitoramento:
            return

        user = self.request.user

        if user.is_superuser:
            return

        if monitoramento.usuario_id != user.id:
            raise PermissionDenied(
                "Você não tem permissão para criar ou alterar alerta deste monitoramento."
            )

    def _sincronizar_relacionamentos_alerta(self, alerta: Alerta) -> Alerta:
        """
        Garante consistência entre alerta, monitoramento, talhão,
        propriedade, usuário e escopo.
        """
        campos_update = []

        if alerta.monitoramento:
            self._validar_monitoramento_usuario(alerta.monitoramento)

            if alerta.talhao_id != alerta.monitoramento.talhao_id:
                alerta.talhao = alerta.monitoramento.talhao
                campos_update.append("talhao")

            propriedade = (
                alerta.monitoramento.talhao.propriedade
                if alerta.monitoramento.talhao
                else None
            )

            if alerta.propriedade != propriedade:
                alerta.propriedade = propriedade
                campos_update.append("propriedade")

            usuario_alerta = alerta.monitoramento.usuario or self.request.user
            if alerta.usuario_id != usuario_alerta.id:
                alerta.usuario = usuario_alerta
                campos_update.append("usuario")

        if not alerta.escopo_agronomico:
            alerta.escopo_agronomico = Alerta.CULTURA_PADRAO
            campos_update.append("escopo_agronomico")

        if campos_update:
            campos_update.append("updated_at")
            alerta.save(update_fields=campos_update)

        return alerta

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = Alerta.objects.select_related(
                "usuario",
                "monitoramento",
                "talhao",
                "propriedade",
            ).all()
        else:
            queryset = Alerta.objects.select_related(
                "usuario",
                "monitoramento",
                "talhao",
                "propriedade",
            ).filter(usuario=user)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        severidade = self.request.query_params.get("severidade")
        if severidade:
            queryset = queryset.filter(severidade=severidade)

        prioridade = self.request.query_params.get("prioridade")
        if prioridade:
            queryset = queryset.filter(prioridade=prioridade)

        monitoramento_id = self.request.query_params.get("monitoramento")
        if monitoramento_id:
            queryset = queryset.filter(monitoramento_id=monitoramento_id)

        talhao_id = self.request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(talhao_id=talhao_id)

        propriedade_id = self.request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(propriedade_id=propriedade_id)

        lido = self._to_bool(self.request.query_params.get("lido"))
        if lido is not None:
            queryset = queryset.filter(lido=lido)

        ativa = self._to_bool(self.request.query_params.get("ativa"))
        if ativa is not None:
            queryset = queryset.filter(ativa=ativa)

        exige_confirmacao = self._to_bool(
            self.request.query_params.get("exige_confirmacao")
        )
        if exige_confirmacao is not None:
            queryset = queryset.filter(exige_confirmacao=exige_confirmacao)

        escopo_agronomico = self.request.query_params.get("escopo_agronomico")
        if escopo_agronomico:
            queryset = queryset.filter(escopo_agronomico=escopo_agronomico)

        busca = self.request.query_params.get("busca")
        if busca:
            queryset = queryset.filter(
                Q(titulo__icontains=busca)
                | Q(mensagem__icontains=busca)
                | Q(recomendacao__icontains=busca)
                | Q(regra_origem__icontains=busca)
                | Q(talhao__nome__icontains=busca)
                | Q(propriedade__nome__icontains=busca)
            )

        return queryset.order_by("-gerado_em", "-created_at")

    def perform_create(self, serializer):
        monitoramento = serializer.validated_data.get("monitoramento")
        self._validar_monitoramento_usuario(monitoramento)

        usuario_alerta = (
            monitoramento.usuario
            if monitoramento and monitoramento.usuario_id
            else self.request.user
        )

        alerta = serializer.save(
            usuario=usuario_alerta,
            escopo_agronomico=Alerta.CULTURA_PADRAO,
        )
        self._sincronizar_relacionamentos_alerta(alerta)

    def perform_update(self, serializer):
        monitoramento = serializer.validated_data.get(
            "monitoramento",
            getattr(serializer.instance, "monitoramento", None),
        )
        self._validar_monitoramento_usuario(monitoramento)

        alerta = serializer.save(
            escopo_agronomico=Alerta.CULTURA_PADRAO,
        )
        self._sincronizar_relacionamentos_alerta(alerta)

    def _montar_contexto_monitoramento(self, monitoramento: Monitoramento) -> dict:
        talhao = monitoramento.talhao
        propriedade = talhao.propriedade if talhao else None

        return {
            "escopo_agronomico": Alerta.CULTURA_PADRAO,
            "monitoramento_id": monitoramento.id,
            "talhao_id": monitoramento.talhao_id,
            "talhao_nome": talhao.nome if talhao else None,
            "propriedade_id": propriedade.id if propriedade else None,
            "propriedade_nome": propriedade.nome if propriedade else None,
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
            "exige_acao_imediata": monitoramento.exige_acao_imediata,
            "resumo_diagnostico": monitoramento.resumo_diagnostico,
            "justificativa_risco": monitoramento.justificativa_risco,
            "sanidade": monitoramento.sanidade,
            "observacoes": monitoramento.observacoes,
            "umidade_solo": (
                float(monitoramento.umidade_solo)
                if monitoramento.umidade_solo is not None
                else None
            ),
            "status_imagem_ia": monitoramento.status_imagem_ia,
            "status_imagem_ia_display": monitoramento.get_status_imagem_ia_display(),
            "possui_foto": bool(monitoramento.foto_monitoramento),
        }

    def _obter_alerta_aberto_regra(
        self,
        *,
        monitoramento: Monitoramento,
        regra_origem: str,
        tipo: str | None = None,
    ) -> Alerta | None:
        queryset = Alerta.objects.filter(
            monitoramento=monitoramento,
            regra_origem=regra_origem,
            status__in=self.STATUS_ABERTOS,
            ativa=True,
        )

        if tipo:
            queryset = queryset.filter(tipo=tipo)

        return queryset.order_by("-gerado_em", "-created_at").first()

    def _resolver_alerta_regra(
        self,
        *,
        monitoramento: Monitoramento,
        regra_origem: str,
        tipo: str | None = None,
        motivo: str,
    ) -> Alerta | None:
        alerta = self._obter_alerta_aberto_regra(
            monitoramento=monitoramento,
            regra_origem=regra_origem,
            tipo=tipo,
        )

        if not alerta:
            return None

        dados_contexto = alerta.dados_contexto or {}
        dados_contexto.update(self._montar_contexto_monitoramento(monitoramento))
        dados_contexto["resolucao_automatica"] = {
            "motivo": motivo,
            "resolvido_em": timezone.now().isoformat(),
        }

        alerta.status = Alerta.StatusAlerta.RESOLVIDO
        alerta.lido = True
        alerta.ativa = False
        alerta.resolvido_em = timezone.now()
        alerta.dados_contexto = dados_contexto
        alerta.save(
            update_fields=[
                "status",
                "lido",
                "ativa",
                "resolvido_em",
                "dados_contexto",
                "updated_at",
            ]
        )

        return alerta

    def _criar_ou_atualizar_alerta_regra(
        self,
        *,
        monitoramento: Monitoramento,
        tipo: str,
        severidade: str,
        prioridade: str,
        titulo: str,
        mensagem: str,
        recomendacao: str,
        regra_origem: str,
        dados_contexto: dict | None = None,
        exige_confirmacao: bool = False,
    ) -> tuple[Alerta, bool]:
        """
        Cria alerta por regra de negócio sem gerar duplicidade ativa.

        Se já existir alerta ativo/em análise para o mesmo monitoramento,
        tipo e regra, ele é atualizado.
        """
        alerta_existente = self._obter_alerta_aberto_regra(
            monitoramento=monitoramento,
            regra_origem=regra_origem,
            tipo=tipo,
        )

        talhao = monitoramento.talhao
        propriedade = talhao.propriedade if talhao else None
        usuario_alerta = monitoramento.usuario or self.request.user

        dados_contexto_final = self._montar_contexto_monitoramento(monitoramento)
        dados_contexto_final.update(dados_contexto or {})
        dados_contexto_final["regra_origem"] = regra_origem
        dados_contexto_final["ultima_sincronizacao"] = timezone.now().isoformat()

        if alerta_existente:
            alerta_existente.talhao = talhao
            alerta_existente.propriedade = propriedade
            alerta_existente.usuario = usuario_alerta
            alerta_existente.escopo_agronomico = Alerta.CULTURA_PADRAO
            alerta_existente.severidade = severidade
            alerta_existente.prioridade = prioridade
            alerta_existente.titulo = titulo
            alerta_existente.mensagem = mensagem
            alerta_existente.recomendacao = recomendacao
            alerta_existente.dados_contexto = dados_contexto_final
            alerta_existente.exige_confirmacao = exige_confirmacao
            alerta_existente.ativa = True
            alerta_existente.save(
                update_fields=[
                    "talhao",
                    "propriedade",
                    "usuario",
                    "escopo_agronomico",
                    "severidade",
                    "prioridade",
                    "titulo",
                    "mensagem",
                    "recomendacao",
                    "dados_contexto",
                    "exige_confirmacao",
                    "ativa",
                    "updated_at",
                ]
            )

            return alerta_existente, False

        alerta = Alerta.objects.create(
            usuario=usuario_alerta,
            monitoramento=monitoramento,
            talhao=talhao,
            propriedade=propriedade,
            escopo_agronomico=Alerta.CULTURA_PADRAO,
            tipo=tipo,
            severidade=severidade,
            prioridade=prioridade,
            status=Alerta.StatusAlerta.ATIVO,
            titulo=titulo,
            mensagem=mensagem,
            recomendacao=recomendacao,
            regra_origem=regra_origem,
            dados_contexto=dados_contexto_final,
            lido=False,
            exige_confirmacao=exige_confirmacao,
            ativa=True,
        )

        return alerta, True

    def _registrar_resultado_regra(
        self,
        *,
        condicao: bool,
        monitoramento: Monitoramento,
        tipo: str,
        severidade: str,
        prioridade: str,
        titulo: str,
        mensagem: str,
        recomendacao: str,
        regra_origem: str,
        dados_contexto: dict | None,
        exige_confirmacao: bool,
        motivo_resolucao: str,
        alertas_gerados: list,
        alertas_atualizados: list,
        alertas_resolvidos: list,
    ) -> None:
        if condicao:
            alerta, criado = self._criar_ou_atualizar_alerta_regra(
                monitoramento=monitoramento,
                tipo=tipo,
                severidade=severidade,
                prioridade=prioridade,
                titulo=titulo,
                mensagem=mensagem,
                recomendacao=recomendacao,
                regra_origem=regra_origem,
                dados_contexto=dados_contexto,
                exige_confirmacao=exige_confirmacao,
            )

            if criado:
                alertas_gerados.append(alerta)
            else:
                alertas_atualizados.append(alerta)

            return

        alerta_resolvido = self._resolver_alerta_regra(
            monitoramento=monitoramento,
            regra_origem=regra_origem,
            tipo=tipo,
            motivo=motivo_resolucao,
        )

        if alerta_resolvido:
            alertas_resolvidos.append(alerta_resolvido)

    def _gerar_alertas_do_monitoramento(self, monitoramento: Monitoramento):
        """
        Consolida regras de negócio para geração/atualização/resolução
        de alertas de um monitoramento.

        Esta camada foi alinhada com as regras automáticas do módulo
        de monitoramento para evitar duplicidade por regra_origem.
        """
        alertas_gerados = []
        alertas_atualizados = []
        alertas_resolvidos = []

        score_risco = float(monitoramento.score_risco or 0)
        faixa_risco = (monitoramento.faixa_risco or "").strip().lower()
        prioridade_operacional = (
            monitoramento.prioridade_operacional or ""
        ).strip().lower()
        nivel_atencao = (monitoramento.nivel_atencao or "").strip().lower()
        status_diagnostico = (monitoramento.status_diagnostico or "").strip().lower()
        sanidade = self._normalizar_texto(monitoramento.sanidade).lower()
        observacoes = self._normalizar_texto(monitoramento.observacoes).lower()

        deve_gerar_risco = any(
            [
                monitoramento.exige_acao_imediata,
                status_diagnostico == "alerta",
                nivel_atencao in ["alto", "critico", "crítico"],
                faixa_risco in ["alto", "critico", "crítico"],
                prioridade_operacional in ["alta", "imediata"],
                score_risco >= 50,
            ]
        )

        if (
            monitoramento.exige_acao_imediata
            or faixa_risco in ["critico", "crítico"]
            or prioridade_operacional == "imediata"
            or score_risco >= 75
        ):
            severidade_risco = Alerta.Severidade.CRITICA
            prioridade_risco = Alerta.Prioridade.IMEDIATA
        elif faixa_risco == "alto" or prioridade_operacional == "alta" or score_risco >= 50:
            severidade_risco = Alerta.Severidade.ALTA
            prioridade_risco = Alerta.Prioridade.ALTA
        else:
            severidade_risco = Alerta.Severidade.MEDIA
            prioridade_risco = Alerta.Prioridade.MEDIA

        talhao_nome = monitoramento.talhao.nome if monitoramento.talhao else "talhão"

        if severidade_risco == Alerta.Severidade.CRITICA:
            titulo_risco = f"Risco crítico no talhão {talhao_nome}"
        elif severidade_risco == Alerta.Severidade.ALTA:
            titulo_risco = f"Risco alto no talhão {talhao_nome}"
        else:
            titulo_risco = f"Risco em atenção no talhão {talhao_nome}"

        self._registrar_resultado_regra(
            condicao=deve_gerar_risco,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.RISCO,
            severidade=severidade_risco,
            prioridade=prioridade_risco,
            titulo=titulo_risco,
            mensagem=(
                f"O monitoramento apresenta score de risco {score_risco:.2f}/100, "
                f"faixa '{monitoramento.get_faixa_risco_display()}', "
                f"nível de atenção '{monitoramento.get_nivel_atencao_display()}' "
                f"e prioridade '{monitoramento.get_prioridade_operacional_display()}'."
            ),
            recomendacao=(
                "Revisar o monitoramento, acompanhar a evolução do talhão e priorizar "
                "vistoria em campo conforme a prioridade operacional indicada."
            ),
            regra_origem=self.REGRA_ALERTA_RISCO,
            dados_contexto={
                "categoria_alerta": "risco",
                "score_risco": score_risco,
                "faixa_risco": monitoramento.faixa_risco,
                "faixa_risco_display": monitoramento.get_faixa_risco_display(),
                "prioridade_operacional": monitoramento.prioridade_operacional,
                "prioridade_operacional_display": monitoramento.get_prioridade_operacional_display(),
                "justificativa_risco": monitoramento.justificativa_risco,
            },
            exige_confirmacao=prioridade_risco == Alerta.Prioridade.IMEDIATA,
            motivo_resolucao="Condição de risco deixou de exigir alerta operacional.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        umidade = (
            float(monitoramento.umidade_solo)
            if monitoramento.umidade_solo is not None
            else None
        )

        deve_gerar_umidade = umidade is not None and (umidade < 20 or umidade > 85)

        if umidade is not None and umidade < 15:
            severidade_umidade = Alerta.Severidade.CRITICA
            prioridade_umidade = Alerta.Prioridade.IMEDIATA
            titulo_umidade = "Umidade do solo crítica"
            mensagem_umidade = (
                f"A umidade do solo está em nível crítico ({umidade:.2f}%)."
            )
        elif umidade is not None and umidade < 20:
            severidade_umidade = Alerta.Severidade.ALTA
            prioridade_umidade = Alerta.Prioridade.ALTA
            titulo_umidade = "Umidade do solo muito baixa"
            mensagem_umidade = (
                f"A umidade do solo está muito baixa ({umidade:.2f}%)."
            )
        elif umidade is not None and umidade > 85:
            severidade_umidade = Alerta.Severidade.MEDIA
            prioridade_umidade = Alerta.Prioridade.MEDIA
            titulo_umidade = "Umidade do solo muito elevada"
            mensagem_umidade = (
                f"A umidade do solo está elevada ({umidade:.2f}%)."
            )
        else:
            severidade_umidade = Alerta.Severidade.BAIXA
            prioridade_umidade = Alerta.Prioridade.BAIXA
            titulo_umidade = "Umidade do solo sem alerta"
            mensagem_umidade = "A umidade do solo não exige alerta específico."

        self._registrar_resultado_regra(
            condicao=deve_gerar_umidade,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.UMIDADE_SOLO,
            severidade=severidade_umidade,
            prioridade=prioridade_umidade,
            titulo=titulo_umidade,
            mensagem=mensagem_umidade,
            recomendacao=(
                "Validar a condição hídrica do talhão em campo e acompanhar possíveis "
                "efeitos sobre sanidade, solo e desenvolvimento da lavoura."
            ),
            regra_origem=self.REGRA_ALERTA_UMIDADE,
            dados_contexto={
                "categoria_alerta": "umidade_solo",
                "umidade_solo": umidade,
            },
            exige_confirmacao=prioridade_umidade == Alerta.Prioridade.IMEDIATA,
            motivo_resolucao="Umidade do solo retornou para faixa sem alerta específico.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        palavras_fitossanitarias = [
            "praga",
            "pragas",
            "doença",
            "doenca",
            "doencas",
            "doenças",
            "presença",
            "presenca",
            "mancha",
            "amarelamento",
        ]
        palavras_desfavoraveis = [
            "ruim",
            "péssima",
            "pessima",
            "muito ruim",
            "seca",
            "murcha",
        ]
        palavras_observacao = [
            "regular",
            "média",
            "media",
            "estresse",
            "hídrico",
            "hidrico",
        ]

        texto_sanidade = f"{sanidade} {observacoes}"

        possui_fitossanitario = any(
            palavra in texto_sanidade for palavra in palavras_fitossanitarias
        )
        possui_desfavoravel = any(
            palavra in texto_sanidade for palavra in palavras_desfavoraveis
        )
        possui_observacao = any(
            palavra in texto_sanidade for palavra in palavras_observacao
        )

        deve_gerar_sanidade = (
            possui_fitossanitario or possui_desfavoravel or possui_observacao
        )

        if possui_fitossanitario and (
            possui_desfavoravel or monitoramento.exige_acao_imediata
        ):
            severidade_sanidade = Alerta.Severidade.CRITICA
            prioridade_sanidade = Alerta.Prioridade.IMEDIATA
        elif possui_fitossanitario or possui_desfavoravel:
            severidade_sanidade = Alerta.Severidade.ALTA
            prioridade_sanidade = Alerta.Prioridade.ALTA
        else:
            severidade_sanidade = Alerta.Severidade.MEDIA
            prioridade_sanidade = Alerta.Prioridade.MEDIA

        self._registrar_resultado_regra(
            condicao=deve_gerar_sanidade,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.SANIDADE,
            severidade=severidade_sanidade,
            prioridade=prioridade_sanidade,
            titulo=f"Sanidade em atenção no talhão {talhao_nome}",
            mensagem=(
                f"A condição sanitária/observação registrada foi: "
                f"'{monitoramento.sanidade or monitoramento.observacoes}'."
            ),
            recomendacao=(
                "Validar em campo o estado sanitário observado e registrar novo "
                "monitoramento caso haja evolução dos sintomas."
            ),
            regra_origem=self.REGRA_ALERTA_SANIDADE,
            dados_contexto={
                "categoria_alerta": "sanidade",
                "sanidade": monitoramento.sanidade,
                "observacoes": monitoramento.observacoes,
                "possui_fitossanitario": possui_fitossanitario,
                "possui_desfavoravel": possui_desfavoravel,
                "possui_observacao": possui_observacao,
            },
            exige_confirmacao=prioridade_sanidade == Alerta.Prioridade.IMEDIATA,
            motivo_resolucao="Texto de sanidade/observações não indica condição preocupante.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        status_imagem = getattr(monitoramento, "status_imagem_ia", "")
        possui_foto = bool(monitoramento.foto_monitoramento)

        deve_gerar_imagem = (
            status_imagem == Monitoramento.StatusImagemIA.ERRO
            or (
                possui_foto
                and status_imagem
                in [
                    Monitoramento.StatusImagemIA.PENDENTE,
                    Monitoramento.StatusImagemIA.PROCESSANDO,
                ]
            )
        )

        if status_imagem == Monitoramento.StatusImagemIA.ERRO:
            severidade_imagem = Alerta.Severidade.ALTA
            prioridade_imagem = Alerta.Prioridade.ALTA
            titulo_imagem = "Erro no processamento da imagem"
            mensagem_imagem = "A análise de imagem do monitoramento apresentou erro."
            recomendacao_imagem = (
                "Verifique a imagem enviada, tente reenviar uma nova foto ou execute nova análise."
            )
        else:
            severidade_imagem = Alerta.Severidade.MEDIA
            prioridade_imagem = Alerta.Prioridade.MEDIA
            titulo_imagem = "Imagem pendente de processamento"
            mensagem_imagem = (
                "Há uma imagem vinculada ao monitoramento aguardando conclusão do processamento."
            )
            recomendacao_imagem = (
                "Acompanhar a fila de processamento da imagem antes de depender deste insumo visual."
            )

        self._registrar_resultado_regra(
            condicao=deve_gerar_imagem,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.IMAGEM,
            severidade=severidade_imagem,
            prioridade=prioridade_imagem,
            titulo=titulo_imagem,
            mensagem=mensagem_imagem,
            recomendacao=recomendacao_imagem,
            regra_origem=self.REGRA_ALERTA_IMAGEM,
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
                "ia_erro_imagem": monitoramento.ia_erro_imagem,
            },
            exige_confirmacao=False,
            motivo_resolucao="Não há pendência relevante de imagem para este monitoramento.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        anomalias_ativas = monitoramento.anomalias.filter(ativa=True)
        possui_anomalias = monitoramento.possui_anomalias or anomalias_ativas.exists()

        nomes_anomalias = [
            anomalia.nome
            for anomalia in anomalias_ativas
            if anomalia.nome
        ]

        self._registrar_resultado_regra(
            condicao=possui_anomalias,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.ANOMALIA,
            severidade=Alerta.Severidade.ALTA,
            prioridade=Alerta.Prioridade.ALTA,
            titulo="Anomalia ativa identificada",
            mensagem="Há anomalias ativas vinculadas a este monitoramento.",
            recomendacao=(
                "Revise as anomalias registradas e acompanhe a evolução do talhão."
            ),
            regra_origem=self.REGRA_ALERTA_ANOMALIA,
            dados_contexto={
                "categoria_alerta": "anomalia",
                "anomalias": nomes_anomalias,
                "total_anomalias_ativas": anomalias_ativas.count(),
            },
            exige_confirmacao=True,
            motivo_resolucao="Não há anomalias ativas vinculadas ao monitoramento.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        estadio_informado = self._normalizar_texto(
            monitoramento.estadio_fenologico
        ).upper()
        estadio_ia = self._normalizar_texto(
            getattr(monitoramento, "ia_estadio_fenologico_sugerido", "")
        ).upper()

        existe_divergencia_estadio = (
            bool(estadio_informado)
            and bool(estadio_ia)
            and estadio_informado != estadio_ia
        )

        self._registrar_resultado_regra(
            condicao=existe_divergencia_estadio,
            monitoramento=monitoramento,
            tipo=Alerta.TipoAlerta.IMAGEM,
            severidade=Alerta.Severidade.MEDIA,
            prioridade=Alerta.Prioridade.MEDIA,
            titulo="Divergência na identificação fenológica",
            mensagem=(
                f"O estádio informado foi {estadio_informado or '-'}, "
                f"mas a IA sugeriu {estadio_ia or '-'}."
            ),
            recomendacao=(
                "Revise a imagem e confirme manualmente o estádio fenológico correto."
            ),
            regra_origem=self.REGRA_ALERTA_DIVERGENCIA_IMAGEM,
            dados_contexto={
                "categoria_alerta": "imagem",
                "estadio_informado": estadio_informado,
                "estadio_sugerido_ia": estadio_ia,
                "ia_confianca_imagem": (
                    float(monitoramento.ia_confianca_imagem)
                    if monitoramento.ia_confianca_imagem is not None
                    else None
                ),
            },
            exige_confirmacao=True,
            motivo_resolucao="Não há divergência atual entre estádio informado e sugestão da IA.",
            alertas_gerados=alertas_gerados,
            alertas_atualizados=alertas_atualizados,
            alertas_resolvidos=alertas_resolvidos,
        )

        return {
            "gerados": alertas_gerados,
            "atualizados": alertas_atualizados,
            "resolvidos": alertas_resolvidos,
        }

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        """
        Dashboard operacional de alertas para consumo do frontend.
        """
        queryset = self.get_queryset()

        total_alertas = queryset.count()
        total_ativos = queryset.filter(status=Alerta.StatusAlerta.ATIVO).count()
        total_em_analise = queryset.filter(
            status=Alerta.StatusAlerta.EM_ANALISE
        ).count()
        total_resolvidos = queryset.filter(
            status=Alerta.StatusAlerta.RESOLVIDO
        ).count()
        total_ignorados = queryset.filter(
            status=Alerta.StatusAlerta.IGNORADO
        ).count()
        total_nao_lidos = queryset.filter(lido=False).count()
        total_criticos = queryset.filter(
            severidade=Alerta.Severidade.CRITICA
        ).count()
        total_imediatos = queryset.filter(
            prioridade=Alerta.Prioridade.IMEDIATA
        ).count()
        total_confirmacao = queryset.filter(exige_confirmacao=True).count()
        total_ativos_operacionais = queryset.filter(
            status__in=self.STATUS_ABERTOS,
            ativa=True,
        ).count()

        distribuicao_status = {
            "ativo": 0,
            "em_analise": 0,
            "resolvido": 0,
            "ignorado": 0,
        }
        for item in queryset.values("status").annotate(total=Count("id")):
            status_key = item.get("status")
            if status_key in distribuicao_status:
                distribuicao_status[status_key] = item.get("total", 0)

        distribuicao_severidade = {
            "baixa": 0,
            "media": 0,
            "alta": 0,
            "critica": 0,
        }
        for item in queryset.values("severidade").annotate(total=Count("id")):
            severidade_key = item.get("severidade")
            if severidade_key in distribuicao_severidade:
                distribuicao_severidade[severidade_key] = item.get("total", 0)

        distribuicao_prioridade = {
            "baixa": 0,
            "media": 0,
            "alta": 0,
            "imediata": 0,
        }
        for item in queryset.values("prioridade").annotate(total=Count("id")):
            prioridade_key = item.get("prioridade")
            if prioridade_key in distribuicao_prioridade:
                distribuicao_prioridade[prioridade_key] = item.get("total", 0)

        distribuicao_tipo = {
            "diagnostico": 0,
            "risco": 0,
            "clima": 0,
            "sanidade": 0,
            "umidade_solo": 0,
            "imagem": 0,
            "operacional": 0,
            "anomalia": 0,
        }
        for item in queryset.values("tipo").annotate(total=Count("id")):
            tipo_key = item.get("tipo")
            if tipo_key in distribuicao_tipo:
                distribuicao_tipo[tipo_key] = item.get("total", 0)

        alertas_prioritarios_qs = queryset.filter(
            status__in=self.STATUS_ABERTOS,
            prioridade__in=[
                Alerta.Prioridade.ALTA,
                Alerta.Prioridade.IMEDIATA,
            ],
            ativa=True,
        ).order_by("-gerado_em", "-created_at")[:5]

        alertas_recentes_qs = queryset.order_by("-gerado_em", "-created_at")[:5]

        serializer_prioritarios = self.get_serializer(
            alertas_prioritarios_qs,
            many=True,
            context={"request": request},
        )
        serializer_recentes = self.get_serializer(
            alertas_recentes_qs,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "escopo_agronomico": Alerta.CULTURA_PADRAO,
                "resumo": {
                    "total_alertas": total_alertas,
                    "total_ativos": total_ativos,
                    "total_em_analise": total_em_analise,
                    "total_resolvidos": total_resolvidos,
                    "total_ignorados": total_ignorados,
                    "total_nao_lidos": total_nao_lidos,
                    "total_criticos": total_criticos,
                    "total_imediatos": total_imediatos,
                    "total_exigem_confirmacao": total_confirmacao,
                    "total_ativos_operacionais": total_ativos_operacionais,
                },
                "distribuicao_status": distribuicao_status,
                "distribuicao_severidade": distribuicao_severidade,
                "distribuicao_prioridade": distribuicao_prioridade,
                "distribuicao_tipo": distribuicao_tipo,
                "alertas_prioritarios": serializer_prioritarios.data,
                "alertas_recentes": serializer_recentes.data,
                "gerado_em": timezone.now().isoformat(),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="gerar-por-monitoramento")
    def gerar_por_monitoramento(self, request):
        """
        Gera, atualiza ou resolve alertas automaticamente a partir
        das regras de negócio aplicadas a um monitoramento.
        """
        monitoramento_id = (
            request.data.get("monitoramento")
            or request.data.get("monitoramento_id")
            or request.query_params.get("monitoramento")
            or request.query_params.get("monitoramento_id")
        )

        if not monitoramento_id:
            return Response(
                {
                    "detail": "Informe o campo monitoramento ou monitoramento_id."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        monitoramento = (
            self._get_monitoramento_queryset_usuario()
            .filter(id=monitoramento_id)
            .first()
        )

        if not monitoramento:
            return Response(
                {
                    "detail": "Monitoramento não encontrado ou sem permissão de acesso."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            resultado = self._gerar_alertas_do_monitoramento(monitoramento)

        alertas_gerados = resultado["gerados"]
        alertas_atualizados = resultado["atualizados"]
        alertas_resolvidos = resultado["resolvidos"]
        alertas = alertas_gerados + alertas_atualizados + alertas_resolvidos

        serializer = self.get_serializer(
            alertas,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "detail": "Regras de negócio processadas para o monitoramento.",
                "escopo_agronomico": Alerta.CULTURA_PADRAO,
                "monitoramento": monitoramento.id,
                "total_gerados": len(alertas_gerados),
                "total_atualizados": len(alertas_atualizados),
                "total_resolvidos": len(alertas_resolvidos),
                "total_processados": len(alertas),
                "alertas": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="marcar-lido")
    def marcar_lido(self, request, pk=None):
        alerta = self.get_object()
        alerta.lido = True
        alerta.save(update_fields=["lido", "updated_at"])

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta marcado como lido.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="marcar-nao-lido")
    def marcar_nao_lido(self, request, pk=None):
        alerta = self.get_object()
        alerta.lido = False
        alerta.save(update_fields=["lido", "updated_at"])

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta marcado como não lido.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="em-analise")
    def em_analise(self, request, pk=None):
        alerta = self.get_object()
        alerta.status = Alerta.StatusAlerta.EM_ANALISE
        alerta.lido = True
        alerta.ativa = True
        alerta.save(update_fields=["status", "lido", "ativa", "updated_at"])

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta marcado como em análise.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="resolver")
    def resolver(self, request, pk=None):
        alerta = self.get_object()
        alerta.status = Alerta.StatusAlerta.RESOLVIDO
        alerta.lido = True
        alerta.ativa = False
        alerta.resolvido_em = timezone.now()
        alerta.save(
            update_fields=[
                "status",
                "lido",
                "ativa",
                "resolvido_em",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta resolvido com sucesso.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="ignorar")
    def ignorar(self, request, pk=None):
        alerta = self.get_object()
        alerta.status = Alerta.StatusAlerta.IGNORADO
        alerta.lido = True
        alerta.ativa = False
        alerta.resolvido_em = timezone.now()
        alerta.save(
            update_fields=[
                "status",
                "lido",
                "ativa",
                "resolvido_em",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta ignorado com sucesso.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="reativar")
    def reativar(self, request, pk=None):
        alerta = self.get_object()
        alerta.status = Alerta.StatusAlerta.ATIVO
        alerta.ativa = True
        alerta.resolvido_em = None
        alerta.save(
            update_fields=[
                "status",
                "ativa",
                "resolvido_em",
                "updated_at",
            ]
        )

        serializer = self.get_serializer(alerta, context={"request": request})

        return Response(
            {
                "detail": "Alerta reativado com sucesso.",
                "alerta": serializer.data,
            },
            status=status.HTTP_200_OK,
        )