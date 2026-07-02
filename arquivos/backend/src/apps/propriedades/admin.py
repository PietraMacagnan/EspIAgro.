from django.contrib import admin

from .models import Propriedade


@admin.register(Propriedade)
class PropriedadeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "municipio",
        "uf",
        "area_total_ha",
        "ativa",
        "created_at",
    )
    list_filter = ("ativa", "uf", "created_at")
    search_fields = ("nome", "municipio", "uf")
    ordering = ("nome",)
    readonly_fields = ("created_at", "updated_at")