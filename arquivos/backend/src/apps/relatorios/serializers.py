from rest_framework import serializers

from apps.base_conhecimento.models import FonteConhecimento
from .models import Relatorio


class RelatorioSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)
    monitoramento_id = serializers.IntegerField(source="monitoramento.id", read_only=True)
    talhao_nome = serializers.CharField(source="talhao.nome", read_only=True)
    propriedade_nome = serializers.CharField(source="propriedade.nome", read_only=True)

    referencias_tecnicas = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=FonteConhecimento.objects.none(),
        required=False,
    )
    referencias_tecnicas_detalhes = serializers.SerializerMethodField()

    clima = serializers.SerializerMethodField()
    clima_dados = serializers.SerializerMethodField()
    apoio_diagnostico = serializers.SerializerMethodField()
    imagem_monitoramento = serializers.SerializerMethodField()
    imagem_monitoramento_url = serializers.SerializerMethodField()
    risco_monitoramento = serializers.SerializerMethodField()

    pdf_url_absoluta = serializers.SerializerMethodField()
    pdf_download_url = serializers.SerializerMethodField()
    pdf_disponivel = serializers.SerializerMethodField()

    class Meta:
        model = Relatorio
        fields = [
            "id",
            "usuario",
            "usuario_username",
            "tipo",
            "status",
            "monitoramento",
            "monitoramento_id",
            "talhao",
            "talhao_nome",
            "propriedade",
            "propriedade_nome",
            "referencias_tecnicas",
            "referencias_tecnicas_detalhes",
            "titulo",
            "resumo",
            "conteudo_json",
            "pdf_url",
            "pdf_url_absoluta",
            "pdf_download_url",
            "pdf_disponivel",

            # blocos derivados para frontend
            "clima",
            "clima_dados",
            "apoio_diagnostico",
            "imagem_monitoramento",
            "imagem_monitoramento_url",
            "risco_monitoramento",

            # -----------------------------
            # CAMPOS ESTRUTURADOS DE IA
            # -----------------------------
            "ia_status",
            "ia_modelo",
            "ia_modo_geracao",
            "ia_resumo_tecnico",
            "ia_interpretacao_agronomica",
            "ia_recomendacoes",
            "ia_pontos_atencao",
            "ia_limitacoes",
            "ia_fontes_utilizadas",
            "ia_resposta_completa",
            "ia_erro",
            "ia_gerado_em",

            # -----------------------------
            # CAMPOS ESTRUTURADOS DE RISCO
            # -----------------------------
            "score_risco",
            "faixa_risco",
            "prioridade_operacional",
            "justificativa_risco",
            "risco_gerado_em",

            "observacoes",
            "ativa",
            "created_at",
            "updated_at",
            "gerado_em",
        ]
        read_only_fields = [
            "id",
            "usuario",
            "usuario_username",
            "monitoramento_id",
            "talhao_nome",
            "propriedade_nome",
            "referencias_tecnicas_detalhes",
            "pdf_url",
            "pdf_url_absoluta",
            "pdf_download_url",
            "pdf_disponivel",

            # derivados
            "clima",
            "clima_dados",
            "apoio_diagnostico",
            "imagem_monitoramento",
            "imagem_monitoramento_url",
            "risco_monitoramento",

            # IA
            "ia_status",
            "ia_modelo",
            "ia_modo_geracao",
            "ia_resumo_tecnico",
            "ia_interpretacao_agronomica",
            "ia_recomendacoes",
            "ia_pontos_atencao",
            "ia_limitacoes",
            "ia_fontes_utilizadas",
            "ia_resposta_completa",
            "ia_erro",
            "ia_gerado_em",

            # risco estruturado
            "score_risco",
            "faixa_risco",
            "prioridade_operacional",
            "justificativa_risco",
            "risco_gerado_em",

            "created_at",
            "updated_at",
            "gerado_em",
        ]
        extra_kwargs = {
            "titulo": {"required": False, "allow_blank": True},
            "resumo": {"required": False, "allow_blank": True},
            "conteudo_json": {"required": False, "allow_null": True},
            "status": {"required": False},
            "talhao": {"required": False, "allow_null": True},
            "propriedade": {"required": False, "allow_null": True},
            "monitoramento": {"required": False, "allow_null": True},
            "observacoes": {"required": False, "allow_blank": True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")

        if not request or not hasattr(request, "user") or not request.user.is_authenticated:
            self.fields["referencias_tecnicas"].queryset = FonteConhecimento.objects.none()
            return

        queryset = FonteConhecimento.objects.filter(
            ativa=True,
            escopo_cultura__in=[
                FonteConhecimento.EscopoCultura.MILHO,
                FonteConhecimento.EscopoCultura.GERAL,
            ],
        )

        campos_fonte = {field.name for field in FonteConhecimento._meta.fields}

        if "status_indexacao" in campos_fonte:
            queryset = queryset.filter(
                status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO
            )

        if "status_curadoria" in campos_fonte and hasattr(
            FonteConhecimento,
            "StatusCuradoria",
        ):
            status_aprovado = getattr(
                FonteConhecimento.StatusCuradoria,
                "APROVADO",
                None,
            )
            if status_aprovado:
                queryset = queryset.filter(status_curadoria=status_aprovado)

        if "disponivel_para_relatorio" in campos_fonte:
            queryset = queryset.filter(disponivel_para_relatorio=True)

        if not request.user.is_superuser:
            queryset = queryset.filter(usuario=request.user)

        self.fields["referencias_tecnicas"].queryset = queryset

    def _get_display(self, obj, metodo, fallback=""):
        display = getattr(obj, metodo, None)
        if callable(display):
            return display()
        return fallback

    def _absolute_url(self, url):
        if not url:
            return None

        url = str(url)

        if url.startswith("http://") or url.startswith("https://"):
            return url

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)

        return url

    def get_pdf_url_absoluta(self, obj):
        return self._absolute_url(obj.pdf_url)

    def get_pdf_download_url(self, obj):
        if not obj.id:
            return None

        download_url = f"/api/relatorios/{obj.id}/baixar-pdf/"
        return self._absolute_url(download_url)

    def get_pdf_disponivel(self, obj):
        return bool(obj.pdf_url)

    def get_referencias_tecnicas_detalhes(self, obj):
        referencias = []

        for fonte in obj.referencias_tecnicas.all():
            indexado_em = getattr(fonte, "indexado_em", None)
            revisado_em = getattr(fonte, "revisado_em", None)

            referencias.append(
                {
                    "id": fonte.id,
                    "titulo": getattr(fonte, "titulo", ""),
                    "descricao": getattr(fonte, "descricao", ""),
                    "tipo": getattr(fonte, "tipo", ""),
                    "tipo_display": self._get_display(
                        fonte,
                        "get_tipo_display",
                        getattr(fonte, "tipo", ""),
                    ),
                    "categoria": getattr(fonte, "categoria", ""),
                    "categoria_display": self._get_display(
                        fonte,
                        "get_categoria_display",
                        getattr(fonte, "categoria", ""),
                    ),
                    "escopo_cultura": getattr(fonte, "escopo_cultura", ""),
                    "escopo_cultura_display": self._get_display(
                        fonte,
                        "get_escopo_cultura_display",
                        getattr(fonte, "escopo_cultura", ""),
                    ),
                    "escopo_agronomico": getattr(
                        fonte,
                        "escopo_agronomico",
                        getattr(fonte, "escopo_cultura", ""),
                    ),
                    "instituicao": getattr(fonte, "instituicao", ""),
                    "autor": getattr(fonte, "autor", ""),
                    "ano_publicacao": getattr(fonte, "ano_publicacao", None),
                    "url": getattr(fonte, "url", ""),
                    "palavras_chave": getattr(fonte, "palavras_chave", ""),
                    "aplicacao_pratica": getattr(fonte, "aplicacao_pratica", ""),
                    "confiabilidade": getattr(fonte, "confiabilidade", None),
                    "status_indexacao": getattr(fonte, "status_indexacao", ""),
                    "status_indexacao_display": self._get_display(
                        fonte,
                        "get_status_indexacao_display",
                        getattr(fonte, "status_indexacao", ""),
                    ),
                    "status_curadoria": getattr(fonte, "status_curadoria", ""),
                    "status_curadoria_display": self._get_display(
                        fonte,
                        "get_status_curadoria_display",
                        getattr(fonte, "status_curadoria", ""),
                    ),
                    "ativa": getattr(fonte, "ativa", True),
                    "is_milho": getattr(fonte, "is_milho", False),
                    "is_geral_apoio": getattr(fonte, "is_geral_apoio", False),
                    "is_indexada": getattr(fonte, "is_indexada", False),
                    "is_aprovada": getattr(fonte, "is_aprovada", False),
                    "disponivel_para_ia": getattr(fonte, "disponivel_para_ia", False),
                    "disponivel_para_relatorio": getattr(
                        fonte,
                        "disponivel_para_relatorio",
                        False,
                    ),
                    "indexado_em": indexado_em.isoformat() if indexado_em else None,
                    "revisado_em": revisado_em.isoformat() if revisado_em else None,
                }
            )

        return referencias

    def get_clima(self, obj):
        conteudo = obj.conteudo_json or {}

        if not isinstance(conteudo, dict):
            return None

        return conteudo.get("clima")

    def get_clima_dados(self, obj):
        conteudo = obj.conteudo_json or {}

        if not isinstance(conteudo, dict):
            return None

        clima = conteudo.get("clima", {}) or {}

        if isinstance(clima, dict):
            return clima.get("dados")

        return None

    def get_apoio_diagnostico(self, obj):
        conteudo = obj.conteudo_json or {}

        if not isinstance(conteudo, dict):
            return None

        return conteudo.get("apoio_diagnostico")

    def get_imagem_monitoramento(self, obj):
        conteudo = obj.conteudo_json or {}

        if not isinstance(conteudo, dict):
            return None

        return conteudo.get("imagem_monitoramento")

    def get_imagem_monitoramento_url(self, obj):
        conteudo = obj.conteudo_json or {}

        if not isinstance(conteudo, dict):
            return None

        imagem = conteudo.get("imagem_monitoramento", {}) or {}

        if isinstance(imagem, dict):
            return imagem.get("foto_url")

        return None

    def get_risco_monitoramento(self, obj):
        conteudo = obj.conteudo_json or {}

        if isinstance(conteudo, dict):
            risco = conteudo.get("risco_monitoramento", {}) or {}
            if risco:
                return risco

        return {
            "score_risco": (
                float(obj.score_risco)
                if obj.score_risco is not None
                else None
            ),
            "faixa_risco": obj.faixa_risco,
            "faixa_risco_display": (
                obj.get_faixa_risco_display()
                if obj.faixa_risco
                else ""
            ),
            "prioridade_operacional": obj.prioridade_operacional,
            "prioridade_operacional_display": (
                obj.get_prioridade_operacional_display()
                if obj.prioridade_operacional
                else ""
            ),
            "justificativa_risco": obj.justificativa_risco,
            "risco_gerado_em": (
                obj.risco_gerado_em.isoformat()
                if obj.risco_gerado_em
                else None
            ),
        }