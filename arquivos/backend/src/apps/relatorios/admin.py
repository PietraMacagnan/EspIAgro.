from django.contrib import admin
from .models import Relatorio


@admin.register(Relatorio)
class RelatorioAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "titulo",
        "tipo",
        "status",
        "monitoramento",
        "talhao",
        "propriedade",
        "ativa",
        "created_at",
    )

    list_filter = (
        "tipo",
        "status",
        "ativa",
        "created_at",
    )

    search_fields = (
        "titulo",
        "resumo",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "created_at",
        "updated_at",
        "gerado_em",
    )

    fieldsets = (
        ("Identificação", {
            "fields": ("usuario", "titulo", "tipo", "status")
        }),
        ("Relacionamentos", {
            "fields": (
                "monitoramento",
                "talhao",
                "propriedade",
            )
        }),
        ("Conteúdo", {
            "fields": (
                "resumo",
                "conteudo_json",
            )
        }),
        ("Arquivos", {
            "fields": (
                "pdf_url",
            )
        }),
        ("Controle", {
            "fields": (
                "ativa",
                "created_at",
                "updated_at",
                "gerado_em",
            )
        }),
    )