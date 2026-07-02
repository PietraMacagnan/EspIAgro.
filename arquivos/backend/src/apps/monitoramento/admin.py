from django.contrib import admin
from .models import Monitoramento


@admin.register(Monitoramento)
class MonitoramentoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "talhao",
        "get_estadio_display",
        "data_observacao",
        "nivel_atencao",
        "status_diagnostico",
        "possui_anomalias",
        "exige_acao_imediata",
        "ativa",
    )

    list_filter = (
        "ativa",
        "estadio_fenologico",
        "nivel_atencao",
        "status_diagnostico",
        "possui_anomalias",
        "exige_acao_imediata",
        "data_observacao",
    )

    search_fields = (
        "talhao__nome",
        "cultura",
        "resumo_diagnostico",
        "observacoes",
    )

    ordering = ("-data_observacao", "-created_at")

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        ("Identificação", {
            "fields": ("usuario", "talhao")
        }),
        ("Fenologia", {
            "fields": (
                "data_observacao",
                "estadio_fenologico",
                "cultura",
            )
        }),
        ("Dados Agronômicos", {
            "fields": (
                "altura_planta_cm",
                "populacao_plantas",
                "sanidade",
                "umidade_solo",
            )
        }),
        ("Diagnóstico e Alertas", {
            "fields": (
                "nivel_atencao",
                "status_diagnostico",
                "possui_anomalias",
                "exige_acao_imediata",
                "resumo_diagnostico",
            )
        }),
        ("Localização", {
            "fields": (
                "latitude",
                "longitude",
            )
        }),
        ("Observações", {
            "fields": ("observacoes",)
        }),
        ("Controle", {
            "fields": (
                "ativa",
                "created_at",
                "updated_at",
            )
        }),
    )

    def get_estadio_display(self, obj):
        return obj.get_estadio_fenologico_display()

    get_estadio_display.short_description = "Estádio Fenológico"