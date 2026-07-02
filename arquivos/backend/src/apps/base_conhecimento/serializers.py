from pathlib import Path

from rest_framework import serializers

from .models import FonteConhecimento


class FonteConhecimentoSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(source="usuario.username", read_only=True)

    revisado_por_username = serializers.CharField(
        source="revisado_por.username",
        read_only=True,
    )

    escopo_cultura_display = serializers.CharField(
        source="get_escopo_cultura_display",
        read_only=True,
    )

    tipo_display = serializers.CharField(
        source="get_tipo_display",
        read_only=True,
    )

    categoria_display = serializers.CharField(
        source="get_categoria_display",
        read_only=True,
    )

    status_indexacao_display = serializers.CharField(
        source="get_status_indexacao_display",
        read_only=True,
    )

    status_curadoria_display = serializers.CharField(
        source="get_status_curadoria_display",
        read_only=True,
    )

    escopo_agronomico = serializers.CharField(read_only=True)

    arquivo_url = serializers.SerializerMethodField()
    arquivo_nome = serializers.SerializerMethodField()
    arquivo_extensao = serializers.SerializerMethodField()
    arquivo_tamanho_bytes = serializers.SerializerMethodField()

    is_milho = serializers.BooleanField(read_only=True)
    is_geral_apoio = serializers.BooleanField(read_only=True)
    is_indexada = serializers.BooleanField(read_only=True)
    is_aprovada = serializers.BooleanField(read_only=True)
    disponivel_para_ia = serializers.BooleanField(read_only=True)
    disponivel_para_relatorio = serializers.BooleanField(read_only=True)

    class Meta:
        model = FonteConhecimento
        fields = [
            "id",
            "usuario",
            "usuario_username",
            "titulo",
            "descricao",
            "tipo",
            "tipo_display",
            "categoria",
            "categoria_display",
            "escopo_cultura",
            "escopo_cultura_display",
            "escopo_agronomico",
            "is_milho",
            "is_geral_apoio",
            "autor",
            "instituicao",
            "ano_publicacao",
            "arquivo",
            "arquivo_url",
            "arquivo_nome",
            "arquivo_extensao",
            "arquivo_tamanho_bytes",
            "url",
            "conteudo_extraido",
            "palavras_chave",
            "aplicacao_pratica",
            "confiabilidade",
            "status_indexacao",
            "status_indexacao_display",
            "status_curadoria",
            "status_curadoria_display",
            "is_indexada",
            "is_aprovada",
            "disponivel_para_ia",
            "disponivel_para_relatorio",
            "observacoes",
            "ativa",
            "revisado_por",
            "revisado_por_username",
            "created_at",
            "updated_at",
            "indexado_em",
            "revisado_em",
        ]

        read_only_fields = [
            "id",
            "usuario",
            "usuario_username",
            "tipo_display",
            "categoria_display",
            "escopo_cultura_display",
            "escopo_agronomico",
            "arquivo_url",
            "arquivo_nome",
            "arquivo_extensao",
            "arquivo_tamanho_bytes",
            "status_indexacao_display",
            "status_curadoria_display",
            "is_milho",
            "is_geral_apoio",
            "is_indexada",
            "is_aprovada",
            "disponivel_para_ia",
            "disponivel_para_relatorio",
            "revisado_por",
            "revisado_por_username",
            "created_at",
            "updated_at",
            "indexado_em",
            "revisado_em",
        ]

    def validate_titulo(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError("Informe o título da fonte.")

        return value

    def validate_descricao(self, value):
        return (value or "").strip()

    def validate_autor(self, value):
        return (value or "").strip()

    def validate_instituicao(self, value):
        return (value or "").strip()

    def validate_url(self, value):
        return (value or "").strip()

    def validate_palavras_chave(self, value):
        return (value or "").strip()

    def validate_aplicacao_pratica(self, value):
        return (value or "").strip()

    def validate_observacoes(self, value):
        return (value or "").strip()

    def validate_conteudo_extraido(self, value):
        return (value or "").strip()

    def validate_ano_publicacao(self, value):
        if value is None:
            return value

        if value < 1900 or value > 2100:
            raise serializers.ValidationError(
                "Informe um ano de publicação válido."
            )

        return value

    def validate_confiabilidade(self, value):
        if value is None:
            return 3

        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "A confiabilidade deve estar entre 1 e 5."
            )

        return value

    def validate_escopo_cultura(self, value):
        value = (value or FonteConhecimento.EscopoCultura.MILHO).strip().lower()

        escopos_validos = {
            FonteConhecimento.EscopoCultura.MILHO,
            FonteConhecimento.EscopoCultura.GERAL,
        }

        if value not in escopos_validos:
            return FonteConhecimento.EscopoCultura.MILHO

        return value

    def validate_arquivo(self, value):
        if not value:
            return value

        nome_arquivo = getattr(value, "name", "") or ""
        extensao = Path(nome_arquivo).suffix.lower()

        extensoes_permitidas = {
            ".pdf",
            ".txt",
            ".doc",
            ".docx",
        }

        if extensao and extensao not in extensoes_permitidas:
            raise serializers.ValidationError(
                "Envie um arquivo técnico válido. Formatos aceitos: PDF, TXT, DOC ou DOCX."
            )

        return value

    def validate(self, attrs):
        tipo = attrs.get(
            "tipo",
            getattr(self.instance, "tipo", None),
        )

        arquivo = attrs.get(
            "arquivo",
            getattr(self.instance, "arquivo", None),
        )

        url = attrs.get(
            "url",
            getattr(self.instance, "url", ""),
        )

        conteudo_extraido = attrs.get(
            "conteudo_extraido",
            getattr(self.instance, "conteudo_extraido", ""),
        )

        erros = {}

        if tipo == FonteConhecimento.TipoFonte.PDF and not arquivo:
            erros["arquivo"] = "Fontes do tipo PDF exigem um arquivo enviado."

        if tipo == FonteConhecimento.TipoFonte.LINK and not (url or "").strip():
            erros["url"] = "Fontes do tipo link exigem uma URL válida."

        if tipo not in {
            FonteConhecimento.TipoFonte.PDF,
            FonteConhecimento.TipoFonte.LINK,
        }:
            possui_algum_conteudo = bool(
                arquivo
                or (url or "").strip()
                or (conteudo_extraido or "").strip()
            )

            if not possui_algum_conteudo:
                erros["conteudo_extraido"] = (
                    "Informe um arquivo, uma URL ou um conteúdo técnico para esta fonte."
                )

        if erros:
            raise serializers.ValidationError(erros)

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)

        data["escopo_cultura"] = instance.escopo_cultura or instance.escopo_agronomico
        data["escopo_cultura_display"] = instance.get_escopo_cultura_display()
        data["escopo_agronomico"] = instance.escopo_agronomico

        data["is_milho"] = instance.is_milho
        data["is_geral_apoio"] = instance.is_geral_apoio
        data["is_indexada"] = instance.is_indexada
        data["is_aprovada"] = instance.is_aprovada
        data["disponivel_para_ia"] = instance.disponivel_para_ia
        data["disponivel_para_relatorio"] = instance.disponivel_para_relatorio

        return data

    def get_arquivo_url(self, obj):
        if not obj.arquivo:
            return None

        request = self.context.get("request")
        url = obj.arquivo.url

        if request:
            return request.build_absolute_uri(url)

        return url

    def get_arquivo_nome(self, obj):
        if not obj.arquivo:
            return None

        try:
            return Path(obj.arquivo.name).name
        except Exception:
            return None

    def get_arquivo_extensao(self, obj):
        if not obj.arquivo:
            return None

        try:
            suffix = Path(obj.arquivo.name).suffix.lower()
            return suffix[1:] if suffix.startswith(".") else suffix
        except Exception:
            return None

    def get_arquivo_tamanho_bytes(self, obj):
        if not obj.arquivo:
            return None

        try:
            return obj.arquivo.size
        except Exception:
            return None