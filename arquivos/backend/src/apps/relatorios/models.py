from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.base_conhecimento.models import FonteConhecimento
from apps.monitoramento.models import Monitoramento
from apps.propriedades.models import Propriedade
from apps.talhoes.models import Talhao


class Relatorio(models.Model):
    """
    Relatório técnico gerado a partir dos dados do sistema.

    Esta é a base para:
    - relatório por monitoramento
    - relatório por talhão
    - relatório por propriedade
    - geração automatizada por IA/RAG
    - exportação futura em PDF
    - rastreabilidade técnica por referências da base de conhecimento
    - persistência estruturada do diagnóstico gerado por IA
    - persistência estruturada do risco operacional/agronômico
    """

    class TipoRelatorio(models.TextChoices):
        MONITORAMENTO = "monitoramento", "Monitoramento"
        TALHAO = "talhao", "Talhão"
        PROPRIEDADE = "propriedade", "Propriedade"
        GERAL = "geral", "Geral"

    class StatusRelatorio(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        PROCESSANDO = "processando", "Processando"
        CONCLUIDO = "concluido", "Concluído"
        ERRO = "erro", "Erro"

    class StatusIA(models.TextChoices):
        NAO_UTILIZADA = "nao_utilizada", "Não utilizada"
        FALLBACK = "fallback", "Fallback"
        SUCESSO = "sucesso", "Sucesso"
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
        related_name="relatorios",
        null=True,
        blank=True,
    )

    tipo = models.CharField(
        max_length=20,
        choices=TipoRelatorio.choices,
        default=TipoRelatorio.MONITORAMENTO,
    )

    status = models.CharField(
        max_length=20,
        choices=StatusRelatorio.choices,
        default=StatusRelatorio.PENDENTE,
    )

    monitoramento = models.ForeignKey(
        Monitoramento,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="relatorios",
    )

    talhao = models.ForeignKey(
        Talhao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="relatorios",
    )

    propriedade = models.ForeignKey(
        Propriedade,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="relatorios",
    )

    referencias_tecnicas = models.ManyToManyField(
        FonteConhecimento,
        blank=True,
        related_name="relatorios",
        help_text="Fontes técnicas vinculadas ao relatório para rastreabilidade.",
    )

    titulo = models.CharField(max_length=200)
    resumo = models.TextField(blank=True)
    conteudo_json = models.JSONField(
        null=True,
        blank=True,
        help_text="Estrutura consolidada do relatório para renderização futura.",
    )

    # --------------------------------------------------
    # CAMPOS ESTRUTURADOS DE IA
    # --------------------------------------------------
    ia_status = models.CharField(
        max_length=20,
        choices=StatusIA.choices,
        default=StatusIA.NAO_UTILIZADA,
        help_text="Status do uso de IA na geração do relatório.",
    )

    ia_modelo = models.CharField(
        max_length=100,
        blank=True,
        help_text="Modelo de IA utilizado na geração do diagnóstico.",
    )

    ia_modo_geracao = models.CharField(
        max_length=50,
        blank=True,
        help_text="Modo de geração do apoio diagnóstico, ex: regras, ia_local + regras.",
    )

    ia_resumo_tecnico = models.TextField(
        blank=True,
        help_text="Resumo técnico principal do diagnóstico.",
    )

    ia_interpretacao_agronomica = models.TextField(
        blank=True,
        help_text="Interpretação agronômica estruturada gerada pela IA.",
    )

    ia_recomendacoes = models.JSONField(
        null=True,
        blank=True,
        help_text="Lista estruturada de recomendações iniciais geradas pela IA.",
    )

    ia_pontos_atencao = models.JSONField(
        null=True,
        blank=True,
        help_text="Lista estruturada de pontos de atenção do diagnóstico.",
    )

    ia_limitacoes = models.TextField(
        blank=True,
        help_text="Limitações declaradas pela IA para o diagnóstico.",
    )

    ia_fontes_utilizadas = models.JSONField(
        null=True,
        blank=True,
        help_text="Lista de fontes técnicas efetivamente citadas pela IA.",
    )

    ia_resposta_completa = models.TextField(
        blank=True,
        help_text="Texto completo retornado pela IA.",
    )

    ia_erro = models.TextField(
        blank=True,
        help_text="Mensagem de erro da IA, se houver.",
    )

    ia_gerado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data/hora em que o diagnóstico por IA foi processado.",
    )

    # --------------------------------------------------
    # CAMPOS ESTRUTURADOS DE RISCO
    # --------------------------------------------------
    score_risco = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score de risco consolidado do relatório.",
    )

    faixa_risco = models.CharField(
        max_length=20,
        choices=FaixaRisco.choices,
        blank=True,
        help_text="Faixa de risco consolidada do relatório.",
    )

    prioridade_operacional = models.CharField(
        max_length=20,
        choices=PrioridadeOperacional.choices,
        blank=True,
        help_text="Prioridade operacional consolidada do relatório.",
    )

    justificativa_risco = models.TextField(
        blank=True,
        help_text="Justificativa consolidada do risco do relatório.",
    )

    risco_gerado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data/hora em que os campos estruturados de risco foram consolidados no relatório.",
    )

    pdf_url = models.URLField(
        blank=True,
        help_text="URL do PDF gerado futuramente.",
    )

    observacoes = models.TextField(blank=True)
    ativa = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    gerado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data/hora em que o relatório foi efetivamente gerado.",
    )

    class Meta:
        db_table = "relatorios"
        verbose_name = "Relatório"
        verbose_name_plural = "Relatórios"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tipo"], name="idx_relatorio_tipo"),
            models.Index(fields=["status"], name="idx_relatorio_status"),
            models.Index(fields=["ativa"], name="idx_relatorio_ativa"),
            models.Index(fields=["created_at"], name="idx_relatorio_created"),
            models.Index(fields=["ia_status"], name="idx_relatorio_ia_status"),
            models.Index(fields=["ia_gerado_em"], name="idx_relatorio_ia_gerado_em"),
            models.Index(fields=["score_risco"], name="idx_relatorio_score_risco"),
            models.Index(fields=["faixa_risco"], name="idx_relatorio_faixa_risco"),
            models.Index(
                fields=["prioridade_operacional"],
                name="idx_relatorio_prioridade_op",
            ),
            models.Index(fields=["risco_gerado_em"], name="idx_relatorio_risco_gerado"),
        ]

    def __str__(self) -> str:
        return self.titulo