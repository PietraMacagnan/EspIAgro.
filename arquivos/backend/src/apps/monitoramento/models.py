from django.conf import settings
from django.core.validators import (
    FileExtensionValidator,
    MaxValueValidator,
    MinValueValidator,
)
from django.db import models

from apps.talhoes.models import Talhao


class Monitoramento(models.Model):
    """
    Registro de monitoramento fenológico de um talhão.

    Este é o núcleo do EspIAgro:
    - coleta de dados de campo
    - base para diagnósticos
    - base para IA futura
    - suporte a imagem de campo para análise futura
    - suporte a score de risco agronômico

    Escopo atual do projeto:
    - o backend permanece preparado para futuras outras culturas
    - porém, nesta fase oficial da faculdade, toda a lógica funcional
      do sistema é específica para MILHO
    """

    CULTURA_PADRAO = "milho"

    class EstadioFenologico(models.TextChoices):
        VE = "VE", "VE - Emergência"
        V1 = "V1", "V1 - 1 folha expandida"
        V2 = "V2", "V2 - 2 folhas expandidas"
        V3 = "V3", "V3 - 3 folhas expandidas"
        V4 = "V4", "V4 - 4 folhas expandidas"
        V5 = "V5", "V5 - 5 folhas expandidas"
        V6 = "V6", "V6 - 6 folhas expandidas"
        V7 = "V7", "V7 - 7 folhas expandidas"
        V8 = "V8", "V8 - 8 folhas expandidas"
        V9 = "V9", "V9 - 9 folhas expandidas"
        V10 = "V10", "V10 - 10 folhas expandidas"
        V11 = "V11", "V11 - 11 folhas expandidas"
        V12 = "V12", "V12 - 12 folhas expandidas"
        V13 = "V13", "V13 - 13 folhas expandidas"
        V14 = "V14", "V14 - 14 folhas expandidas"
        V15 = "V15", "V15 - 15 folhas expandidas"
        V16 = "V16", "V16 - 16 folhas expandidas"
        V17 = "V17", "V17 - 17 folhas expandidas"
        V18 = "V18", "V18 - 18 folhas expandidas"
        R1 = "R1", "R1 - Florescimento"
        R2 = "R2", "R2 - Grão bolha"
        R3 = "R3", "R3 - Grão leitoso"
        R4 = "R4", "R4 - Grão pastoso"
        R5 = "R5", "R5 - Grão dentado"
        R6 = "R6", "R6 - Maturidade fisiológica"

    class NivelAtencao(models.TextChoices):
        BAIXO = "baixo", "Baixo"
        MEDIO = "medio", "Médio"
        ALTO = "alto", "Alto"
        CRITICO = "critico", "Crítico"

    class StatusDiagnostico(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        EM_ANALISE = "em_analise", "Em análise"
        CONCLUIDO = "concluido", "Concluído"
        ALERTA = "alerta", "Alerta"

    class StatusImagemIA(models.TextChoices):
        NAO_ENVIADA = "nao_enviada", "Não enviada"
        PENDENTE = "pendente", "Pendente"
        PROCESSANDO = "processando", "Processando"
        CONCLUIDA = "concluida", "Concluída"
        ERRO = "erro", "Erro"

    class FaixaRisco(models.TextChoices):
        BAIXO = "baixo", "Baixo"
        MODERADO = "moderado", "Moderado"
        ALTO = "alto", "Alto"
        CRITICO = "critico", "Crítico"

    class PrioridadeOperacional(models.TextChoices):
        BAIXA = "baixa", "Baixa"
        MEDIA = "media", "Média"
        ALTA = "alta", "Alta"
        IMEDIATA = "imediata", "Imediata"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="monitoramentos",
        null=True,
        blank=True,
    )

    talhao = models.ForeignKey(
        Talhao,
        on_delete=models.CASCADE,
        related_name="monitoramentos",
    )

    # -----------------------------------
    # DADOS AGRONÔMICOS
    # -----------------------------------
    data_observacao = models.DateField()

    estadio_fenologico = models.CharField(
        max_length=3,
        choices=EstadioFenologico.choices,
        help_text="Estádio fenológico observado no milho no momento da coleta.",
    )

    cultura = models.CharField(
        max_length=100,
        blank=True,
        default=CULTURA_PADRAO,
        help_text=(
            "Cultura de referência do monitoramento. "
            "Nesta fase oficial do projeto, o sistema opera exclusivamente com milho."
        ),
    )

    altura_planta_cm = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Altura estimada da planta de milho em centímetros.",
    )

    populacao_plantas = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Estimativa de população de plantas na área observada.",
    )

    sanidade = models.CharField(
        max_length=100,
        blank=True,
        help_text=(
            "Condição sanitária observada no milho. "
            "Ex.: boa, média, ruim, presença de pragas/doenças."
        ),
    )

    umidade_solo = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentual estimado de umidade do solo no ponto monitorado.",
    )

    observacoes = models.TextField(
        blank=True,
        help_text=(
            "Observações livres do monitoramento de campo. "
            "Use para registrar a situação visível da lavoura de milho."
        ),
    )

    # -----------------------------------
    # IMAGEM DE CAMPO / IA VISUAL
    # -----------------------------------
    foto_monitoramento = models.ImageField(
        upload_to="monitoramentos/fotos/",
        null=True,
        blank=True,
        validators=[
            FileExtensionValidator(
                allowed_extensions=["jpg", "jpeg", "png", "webp"]
            )
        ],
        help_text=(
            "Foto principal do monitoramento para futura análise visual por IA, "
            "no contexto atual da cultura do milho."
        ),
    )

    status_imagem_ia = models.CharField(
        max_length=15,
        choices=StatusImagemIA.choices,
        default=StatusImagemIA.NAO_ENVIADA,
        help_text="Status do processamento da imagem do monitoramento.",
    )

    ia_estadio_fenologico_sugerido = models.CharField(
        max_length=20,
        blank=True,
        help_text=(
            "Estádio fenológico do milho sugerido pela IA a partir da imagem."
        ),
    )

    ia_confianca_imagem = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Confiança percentual da IA na análise da imagem.",
    )

    ia_resultado_imagem = models.JSONField(
        null=True,
        blank=True,
        help_text="Resultado estruturado da análise visual da imagem.",
    )

    ia_observacoes_imagem = models.TextField(
        blank=True,
        help_text="Observações complementares da análise de imagem.",
    )

    ia_erro_imagem = models.TextField(
        blank=True,
        help_text="Mensagem de erro do processamento da imagem, se houver.",
    )

    imagem_processada_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data/hora do último processamento da imagem.",
    )

    # -----------------------------------
    # DIAGNÓSTICO E ALERTA
    # -----------------------------------
    nivel_atencao = models.CharField(
        max_length=10,
        choices=NivelAtencao.choices,
        default=NivelAtencao.BAIXO,
    )

    status_diagnostico = models.CharField(
        max_length=15,
        choices=StatusDiagnostico.choices,
        default=StatusDiagnostico.PENDENTE,
    )

    resumo_diagnostico = models.TextField(
        blank=True,
        help_text="Resumo automático ou técnico do diagnóstico do monitoramento.",
    )

    possui_anomalias = models.BooleanField(default=False)
    exige_acao_imediata = models.BooleanField(default=False)

    # -----------------------------------
    # SCORE DE RISCO AGRONÔMICO
    # -----------------------------------
    score_risco = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score consolidado de risco agronômico de 0 a 100.",
    )

    faixa_risco = models.CharField(
        max_length=10,
        choices=FaixaRisco.choices,
        default=FaixaRisco.BAIXO,
        help_text="Faixa qualitativa derivada do score de risco.",
    )

    prioridade_operacional = models.CharField(
        max_length=10,
        choices=PrioridadeOperacional.choices,
        default=PrioridadeOperacional.BAIXA,
        help_text="Prioridade operacional para tratamento do monitoramento.",
    )

    justificativa_risco = models.TextField(
        blank=True,
        help_text="Justificativa textual do score e da prioridade atribuída.",
    )

    # -----------------------------------
    # GEO
    # -----------------------------------
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    # -----------------------------------
    # CONTROLE
    # -----------------------------------
    ativa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "monitoramentos"
        verbose_name = "Monitoramento"
        verbose_name_plural = "Monitoramentos"
        ordering = ["-data_observacao", "-created_at"]
        indexes = [
            models.Index(fields=["data_observacao"], name="idx_monitor_data_obs"),
            models.Index(fields=["estadio_fenologico"], name="idx_monitor_estadio"),
            models.Index(fields=["nivel_atencao"], name="idx_monitor_nivel_at"),
            models.Index(fields=["status_diagnostico"], name="idx_monitor_status_diag"),
            models.Index(fields=["status_imagem_ia"], name="idx_monitor_status_img_ia"),
            models.Index(fields=["score_risco"], name="idx_monitor_score_risco"),
            models.Index(fields=["faixa_risco"], name="idx_monitor_faixa_risco"),
            models.Index(
                fields=["prioridade_operacional"],
                name="idx_monitor_prioridade_op",
            ),
            models.Index(fields=["ativa"], name="idx_monitor_ativa"),
        ]

    @property
    def escopo_agronomico(self) -> str:
        """
        Mantém explícito no domínio do modelo que o escopo agronômico atual
        do projeto é milho.
        """
        return self.CULTURA_PADRAO

    def save(self, *args, **kwargs):
        """
        Nesta fase do projeto, toda a inteligência e geração de relatório
        operam exclusivamente para milho.

        Mantemos a arquitetura pronta para futuras outras culturas,
        mas o dado persistido no contexto atual é normalizado para milho.
        """
        self.cultura = self.CULTURA_PADRAO
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.talhao.nome} - {self.estadio_fenologico} "
            f"({self.data_observacao})"
        )