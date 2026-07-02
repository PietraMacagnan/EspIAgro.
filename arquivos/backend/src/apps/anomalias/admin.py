from django.contrib import admin

from .models import Anomalia


@admin.register(Anomalia)
class AnomaliaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "tipo",
        "monitoramento",
        "severidade",
        "percentual_plantas_afetadas",
        "exige_atencao",
        "ativa",
        "created_at",
    )

    list_filter = (
        "tipo",
        "severidade",
        "exige_atencao",
        "ativa",
    )

    search_fields = (
        "nome",
        "monitoramento__talhao__nome",
        "monitoramento__estadio_fenologico",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        ("Vínculo", {
            "fields": ("monitoramento",)
        }),
        ("Classificação", {
            "fields": (
                "tipo",
                "nome",
                "severidade",
                "percentual_plantas_afetadas",
            )
        }),
        ("Diagnóstico", {
            "fields": (
                "observacao",
                "exige_atencao",
                "ativa",
            )
        }),
        ("Controle", {
            "fields": (
                "created_at",
                "updated_at",
            )
        }),
    )