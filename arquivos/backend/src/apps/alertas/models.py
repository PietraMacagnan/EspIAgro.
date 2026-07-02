from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.monitoramento.models import Monitoramento
from apps.propriedades.models import Propriedade
from apps.talhoes.models import Talhao


class Alerta(models.Model):
    """
    Alerta operacional/técnico gerado a partir do monitoramento.

    Objetivo nesta fase:
    - transformar diagnóstico e risco em ação prática;
    - registrar alertas rastreáveis por monitoramento/talhão/propriedade;
    - evitar alertas duplicados para a mesma regra ativa;
    - preparar backend para orientar o frontend com feedback operacional.

    Escopo agronômico atual:
    - milho.
    """

    CULTURA_PADRAO = "milho"

    class TipoAlerta(models.TextChoices):
        DIAGNOSTICO = "diagnostico", "Diagnóstico"
        RISCO = "risco", "Risco"
        CLIMA = "clima", "Clima"
        SANIDADE = "sanidade", "Sanidade"
        UMIDADE_SOLO = "umidade_solo", "Umidade do solo"
        IMAGEM = "imagem", "Imagem"
        OPERACIONAL = "operacional", "Operacional"
        ANOMALIA = "anomalia", "Anomalia"

    class Severidade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"
        CRITICA = "critica", "Crítica"

    class Prioridade(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"
        IMEDIATA = "imediata", "Imediata"

    class StatusAlerta(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        EM_ANALISE = "em_analise", "Em análise"
        RESOLVIDO = "resolvido", "Resolvido"
        IGNORADO = "ignorado", "Ignorado"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="alertas",
        null=True,
        blank=True,
    )

    monitoramento = models.ForeignKey(
        Monitoramento,
        on_delete=models.CASCADE,
        related_name="alertas",
    )

    talhao = models.ForeignKey(
        Talhao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas",
    )

    propriedade = models.ForeignKey(
        Propriedade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alertas",
    )

    escopo_agronomico = models.CharField(
        max_length=20,
        default=CULTURA_PADRAO,
        help_text="Escopo agronômico oficial do alerta nesta fase: milho.",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TipoAlerta.choices,
        default=TipoAlerta.OPERACIONAL,
    )

    severidade = models.CharField(
        max_length=10,
        choices=Severidade.choices,
        default=Severidade.BAIXA,
    )

    prioridade = models.CharField(
        max_length=10,
        choices=Prioridade.choices,
        default=Prioridade.BAIXA,
    )

    status = models.CharField(
        max_length=15,
        choices=StatusAlerta.choices,
        default=StatusAlerta.ATIVO,
    )

    titulo = models.CharField(max_length=200)

    mensagem = models.TextField(
        help_text="Mensagem principal do alerta para exibição ao usuário.",
    )

    recomendacao = models.TextField(
        blank=True,
        help_text="Orientação operacional inicial associada ao alerta.",
    )

    regra_origem = models.CharField(
        max_length=100,
        blank=True,
        help_text="Identificador da regra que originou o alerta.",
    )

    dados_contexto = models.JSONField(
        null=True,
        blank=True,
        help_text="Dados estruturados usados para rastreabilidade do alerta.",
    )

    lido = models.BooleanField(default=False)
    exige_confirmacao = models.BooleanField(default=False)
    ativa = models.BooleanField(default=True)

    gerado_em = models.DateTimeField(
        auto_now_add=True,
        help_text="Data/hora em que o alerta foi gerado.",
    )

    resolvido_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data/hora em que o alerta foi resolvido, ignorado ou encerrado.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "alertas"
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        ordering = ["-gerado_em", "-created_at"]
        indexes = [
            models.Index(fields=["tipo"], name="idx_alerta_tipo"),
            models.Index(fields=["severidade"], name="idx_alerta_severidade"),
            models.Index(fields=["prioridade"], name="idx_alerta_prioridade"),
            models.Index(fields=["status"], name="idx_alerta_status"),
            models.Index(fields=["ativa"], name="idx_alerta_ativa"),
            models.Index(fields=["lido"], name="idx_alerta_lido"),
            models.Index(fields=["gerado_em"], name="idx_alerta_gerado_em"),
            models.Index(
                fields=["escopo_agronomico"],
                name="idx_alerta_escopo_agronomico",
            ),
            models.Index(
                fields=["usuario", "status", "ativa"],
                name="idx_alerta_user_status",
            ),
            models.Index(
                fields=["monitoramento", "tipo", "regra_origem"],
                name="idx_alerta_monitor_regra",
            ),
            models.Index(
                fields=["talhao", "status", "ativa"],
                name="idx_alerta_talhao_status",
            ),
            models.Index(
                fields=["propriedade", "status", "ativa"],
                name="idx_alerta_prop_status",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["monitoramento", "tipo", "regra_origem"],
                condition=(
                    Q(ativa=True)
                    & Q(status__in=["ativo", "em_analise"])
                    & ~Q(regra_origem="")
                ),
                name="uq_alerta_ativo_monitor_tipo_regra",
            ),
        ]

    @property
    def is_ativo(self) -> bool:
        return self.ativa and self.status in [
            self.StatusAlerta.ATIVO,
            self.StatusAlerta.EM_ANALISE,
        ]

    @property
    def is_resolvido(self) -> bool:
        return self.status == self.StatusAlerta.RESOLVIDO

    @property
    def is_ignorado(self) -> bool:
        return self.status == self.StatusAlerta.IGNORADO

    @property
    def is_critico(self) -> bool:
        return (
            self.severidade == self.Severidade.CRITICA
            or self.prioridade == self.Prioridade.IMEDIATA
        )

    @property
    def exige_acao_operacional(self) -> bool:
        return self.is_ativo and (
            self.prioridade in [
                self.Prioridade.ALTA,
                self.Prioridade.IMEDIATA,
            ]
            or self.severidade in [
                self.Severidade.ALTA,
                self.Severidade.CRITICA,
            ]
            or self.exige_confirmacao
        )

    def _normalizar_textos(self) -> None:
        self.titulo = (self.titulo or "").strip()
        self.mensagem = (self.mensagem or "").strip()
        self.recomendacao = (self.recomendacao or "").strip()
        self.regra_origem = (self.regra_origem or "").strip()

        if not self.escopo_agronomico:
            self.escopo_agronomico = self.CULTURA_PADRAO

        self.escopo_agronomico = str(self.escopo_agronomico).strip().lower()

        if self.escopo_agronomico != self.CULTURA_PADRAO:
            self.escopo_agronomico = self.CULTURA_PADRAO

    def _obter_monitoramento(self):
        if not self.monitoramento_id:
            return None

        try:
            return self.monitoramento
        except Exception:
            return None

    def _obter_talhao(self):
        if self.talhao_id:
            try:
                return self.talhao
            except Exception:
                return None

        monitoramento = self._obter_monitoramento()
        if monitoramento:
            try:
                return monitoramento.talhao
            except Exception:
                return None

        return None

    def _normalizar_relacionamentos(self) -> None:
        monitoramento = self._obter_monitoramento()

        if monitoramento:
            if not self.talhao_id and getattr(monitoramento, "talhao_id", None):
                self.talhao = monitoramento.talhao

            if not self.usuario_id and getattr(monitoramento, "usuario_id", None):
                self.usuario = monitoramento.usuario

        talhao = self._obter_talhao()

        if talhao and not self.propriedade_id and getattr(talhao, "propriedade_id", None):
            self.propriedade = talhao.propriedade

    def _normalizar_estado(self) -> None:
        if self.status in [
            self.StatusAlerta.RESOLVIDO,
            self.StatusAlerta.IGNORADO,
        ]:
            self.ativa = False
            self.lido = True

            if not self.resolvido_em:
                self.resolvido_em = timezone.now()

    def _expandir_update_fields(self, kwargs):
        update_fields = kwargs.get("update_fields")

        if update_fields is None:
            return kwargs

        campos_automaticos = {
            "escopo_agronomico",
            "titulo",
            "mensagem",
            "recomendacao",
            "regra_origem",
            "talhao",
            "propriedade",
            "usuario",
            "lido",
            "ativa",
            "resolvido_em",
            "updated_at",
        }

        kwargs["update_fields"] = list(set(update_fields) | campos_automaticos)
        return kwargs

    def clean(self):
        erros = {}

        self._normalizar_textos()
        self._normalizar_relacionamentos()

        if not self.titulo:
            erros["titulo"] = "Informe o título do alerta."

        if not self.mensagem:
            erros["mensagem"] = "Informe a mensagem principal do alerta."

        monitoramento = self._obter_monitoramento()
        talhao = self._obter_talhao()

        if monitoramento and self.talhao_id and getattr(monitoramento, "talhao_id", None):
            if self.talhao_id != monitoramento.talhao_id:
                erros["talhao"] = (
                    "O talhão do alerta deve ser o mesmo talhão do monitoramento."
                )

        if monitoramento and self.usuario_id and getattr(monitoramento, "usuario_id", None):
            if self.usuario_id != monitoramento.usuario_id:
                erros["usuario"] = (
                    "O usuário do alerta deve ser o mesmo usuário do monitoramento."
                )

        if talhao and self.propriedade_id and getattr(talhao, "propriedade_id", None):
            if self.propriedade_id != talhao.propriedade_id:
                erros["propriedade"] = (
                    "A propriedade do alerta deve ser a mesma propriedade do talhão."
                )

        if erros:
            raise ValidationError(erros)

    def save(self, *args, **kwargs):
        self._normalizar_textos()
        self._normalizar_relacionamentos()
        self._normalizar_estado()

        kwargs = self._expandir_update_fields(kwargs)

        super().save(*args, **kwargs)

    def marcar_como_lido(self):
        self.lido = True
        self.save(update_fields=["lido", "updated_at"])

    def marcar_em_analise(self):
        self.status = self.StatusAlerta.EM_ANALISE
        self.save(update_fields=["status", "updated_at"])

    def resolver(self):
        self.status = self.StatusAlerta.RESOLVIDO
        self.save(update_fields=["status", "lido", "ativa", "resolvido_em", "updated_at"])

    def ignorar(self):
        self.status = self.StatusAlerta.IGNORADO
        self.save(update_fields=["status", "lido", "ativa", "resolvido_em", "updated_at"])

    def __str__(self) -> str:
        return f"{self.titulo} - {self.get_prioridade_display()}"