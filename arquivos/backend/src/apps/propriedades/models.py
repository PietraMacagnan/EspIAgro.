from django.conf import settings
from django.contrib.gis.db import models
from django.core.validators import MinValueValidator
from django.db.models import Q


class Propriedade(models.Model):
    """
    Entidade base do domínio agrícola.

    Fase atual:
    - domínio preparado para produção
    - suporte geográfico com PostGIS
    - propriedade pronta para mapa, demarcação e visualização espacial
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="propriedades",
        null=True,
        blank=True,
    )

    nome = models.CharField(max_length=150)
    municipio = models.CharField(max_length=120, blank=True)
    uf = models.CharField(max_length=2, blank=True)

    area_total_ha = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Área total informada manualmente pelo usuário em hectares.",
    )

    # --------------------------------------------------
    # GEO
    # --------------------------------------------------
    poligono = models.PolygonField(
        srid=4326,
        null=True,
        blank=True,
        geography=True,
        help_text="Geometria geográfica da propriedade em WGS84 (GeoJSON/Polygon).",
    )

    descricao = models.TextField(blank=True)
    ativa = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "propriedades"
        verbose_name = "Propriedade"
        verbose_name_plural = "Propriedades"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["nome"], name="idx_prop_nome"),
            models.Index(fields=["municipio"], name="idx_prop_municipio"),
            models.Index(fields=["uf"], name="idx_prop_uf"),
            models.Index(fields=["ativa"], name="idx_prop_ativa"),
            models.Index(fields=["created_at"], name="idx_prop_created_at"),
            models.Index(fields=["usuario", "ativa"], name="idx_prop_usuario_ativa"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(area_total_ha__gte=0) | Q(area_total_ha__isnull=True),
                name="chk_prop_area_total_ha_gte_0",
            ),
        ]

    def __str__(self) -> str:
        return self.nome

    @property
    def centroide(self):
        """
        Retorna o centroide do polígono, se existir.
        Útil para centralizar o mapa da propriedade no frontend.
        """
        if self.poligono:
            return self.poligono.centroid
        return None