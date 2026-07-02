from django.contrib import admin

from .models import FonteConhecimento


@admin.register(FonteConhecimento)
class FonteConhecimentoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "titulo",
        "tipo",
        "categoria",
        "instituicao",
        "status_indexacao",
        "ativa",
        "created_at",
    )

    list_filter = (
        "tipo",
        "categoria",
        "status_indexacao",
        "ativa",
        "created_at",
    )

    search_fields = (
        "titulo",
        "descricao",
        "autor",
        "instituicao",
        "palavras_chave",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "created_at",
        "updated_at",
        "indexado_em",
    )

    fieldsets = (
        ("Identificação", {
            "fields": (
                "usuario",
                "titulo",
                "descricao",
            )
        }),
        ("Classificação", {
            "fields": (
                "tipo",
                "categoria",
                "autor",
                "instituicao",
                "ano_publicacao",
            )
        }),
        ("Origem do Conteúdo", {
            "fields": (
                "arquivo",
                "url",
            )
        }),
        ("Conteúdo Técnico", {
            "fields": (
                "conteudo_extraido",
                "palavras_chave",
            )
        }),
        ("Indexação", {
            "fields": (
                "status_indexacao",
                "indexado_em",
            )
        }),
        ("Controle", {
            "fields": (
                "observacoes",
                "ativa",
                "created_at",
                "updated_at",
            )
        }),
    )