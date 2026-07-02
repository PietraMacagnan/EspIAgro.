from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.monitoramento.models import Monitoramento


class Anomalia(models.Model):
    """
    Registro de anomalias observadas em um monitoramento.

    Base para:
    - diagnóstico agronômico
    - alertas
    - recomendações futuras por IA
    """

    class TipoAnomalia(models.TextChoices):
        PRAGA = "praga", "Praga"
        DOENCA = "doenca", "Doença"
        DEFICIENCIA_NUTRICIONAL = "deficiencia_nutricional", "Deficiência Nutricional"
        PLANTA_NANICA = "planta_nanica", "Planta Nanica"
        DANO_CLIMATICO = "dano_climatico", "Dano Climático"
        PLANTA_DANINHA = "planta_daninha", "Planta Daninha"
        OUTRA = "outra", "Outra"

    class Severidade(models.IntegerChoices):
        MUITO_BAIXA = 1, "1 - Muito Baixa"
        BAIXA = 2, "2 - Baixa"
        MEDIA = 3, "3 - Média"
        ALTA = 4, "4 - Alta"
        MUITO_ALTA = 5, "5 - Muito Alta"

    monitoramento = models.ForeignKey(
        Monitoramento,
        on_delete=models.CASCADE,
        related_name="anomalias",
    )
    tipo = models.CharField(
        max_length=50,
        choices=TipoAnomalia.choices,
    )
    nome = models.CharField(
        max_length=150,
        help_text="Ex.: Lagarta-do-cartucho, deficiência de zinco, ferrugem etc.",
    )
    severidade = models.PositiveSmallIntegerField(
        choices=Severidade.choices,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    percentual_plantas_afetadas = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentual de plantas afetadas no ponto monitorado.",
    )
    observacao = models.TextField(blank=True)
    exige_atencao = models.BooleanField(default=False)
    ativa = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "anomalias"
        verbose_name = "Anomalia"
        verbose_name_plural = "Anomalias"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tipo"], name="idx_anomalia_tipo"),
            models.Index(fields=["nome"], name="idx_anomalia_nome"),
            models.Index(fields=["severidade"], name="idx_anomalia_severidade"),
            models.Index(fields=["exige_atencao"], name="idx_anomalia_atencao"),
        ]

    def __str__(self) -> str:
        return f"{self.nome} ({self.get_tipo_display()})"