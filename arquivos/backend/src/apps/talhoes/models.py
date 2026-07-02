from django.conf import settings
from django.contrib.gis.db import models
from django.core.validators import MinValueValidator
from django.db.models import Q

from apps.propriedades.models import Propriedade


class Talhao(models.Model):
    """
    Subdivisão da propriedade rural.

    Fase atual:
    - relacionamento com propriedade
    - dados agronômicos principais
    - validações e índices para produção
    - suporte geográfico com PostGIS para mapa e demarcação do talhão
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="talhoes",
        null=True,
        blank=True,
    )

    propriedade = models.ForeignKey(
        Propriedade,
        on_delete=models.CASCADE,
        related_name="talhoes",
    )

    nome = models.CharField(max_length=150)
    cultivar = models.CharField(max_length=150, blank=True)
    sistema_cultivo = models.CharField(max_length=100, blank=True)
    data_plantio = models.DateField(null=True, blank=True)

    area_ha = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Área informada manualmente pelo usuário em hectares.",
    )

    # --------------------------------------------------
    # GEO
    # --------------------------------------------------
    poligono = models.PolygonField(
        srid=4326,
        null=True,
        blank=True,
        geography=True,
        help_text="Geometria geográfica do talhão em WGS84 (GeoJSON/Polygon).",
    )

    observacoes = models.TextField(blank=True)
    ativa = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "talhoes"
        verbose_name = "Talhão"
        verbose_name_plural = "Talhões"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"], name="idx_talhao_nome"),
            models.Index(fields=["propriedade"], name="idx_talhao_propriedade"),
            models.Index(fields=["cultivar"], name="idx_talhao_cultivar"),
            models.Index(fields=["sistema_cultivo"], name="idx_talhao_sist_cult"),
            models.Index(fields=["ativa"], name="idx_talhao_ativa"),
            models.Index(fields=["created_at"], name="idx_talhao_created_at"),
            models.Index(fields=["propriedade", "ativa"], name="idx_talhao_prop_ativa"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(area_ha__gte=0) | Q(area_ha__isnull=True),
                name="chk_talhao_area_ha_gte_0",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.nome} - {self.propriedade.nome}"

    @property
    def centroide(self):
        """
        Retorna o centroide do polígono, se existir.
        Útil para centralizar o mapa no frontend.
        """
        if self.poligono:
            return self.poligono.centroid
        return None