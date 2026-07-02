from django.contrib import admin

from .models import Talhao


@admin.register(Talhao)
class TalhaoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "propriedade",
        "cultivar",
        "sistema_cultivo",
        "area_ha",
        "ativa",
        "created_at",
    )

    list_filter = (
        "propriedade",
        "sistema_cultivo",
        "ativa",
    )

    search_fields = (
        "nome",
        "propriedade__nome",
        "cultivar",
    )

    ordering = ("nome",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )