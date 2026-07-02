from rest_framework import serializers

from apps.monitoramento.models import Monitoramento
from .models import Alerta


class AlertaSerializer(serializers.ModelSerializer):
    usuario_username = serializers.CharField(
        source="usuario.username",
        read_only=True,
    )

    monitoramento_id = serializers.IntegerField(
        source="monitoramento.id",
        read_only=True,
    )

    talhao_nome = serializers.CharField(
        source="talhao.nome",
        read_only=True,
    )

    propriedade_nome = serializers.CharField(
        source="propriedade.nome",
        read_only=True,
    )

    tipo_display = serializers.CharField(
        source="get_tipo_display",
        read_only=True,
    )

    severidade_display = serializers.CharField(
        source="get_severidade_display",
        read_only=True,
    )

    prioridade_display = serializers.CharField(
        source="get_prioridade_display",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    is_ativo = serializers.BooleanField(read_only=True)
    is_resolvido = serializers.BooleanField(read_only=True)
    is_ignorado = serializers.BooleanField(read_only=True)
    is_critico = serializers.BooleanField(read_only=True)
    exige_acao_operacional = serializers.BooleanField(read_only=True)

    resumo_operacional = serializers.SerializerMethodField()

    class Meta:
        model = Alerta
        fields = [
            "id",
            "usuario",
            "usuario_username",
            "monitoramento",
            "monitoramento_id",
            "talhao",
            "talhao_nome",
            "propriedade",
            "propriedade_nome",
            "escopo_agronomico",
            "tipo",
            "tipo_display",
            "severidade",
            "severidade_display",
            "prioridade",
            "prioridade_display",
            "status",
            "status_display",
            "titulo",
            "mensagem",
            "recomendacao",
            "regra_origem",
            "dados_contexto",
            "lido",
            "exige_confirmacao",
            "ativa",
            "is_ativo",
            "is_resolvido",
            "is_ignorado",
            "is_critico",
            "exige_acao_operacional",
            "resumo_operacional",
            "gerado_em",
            "resolvido_em",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "usuario",
            "usuario_username",
            "monitoramento_id",
            "talhao_nome",
            "propriedade_nome",
            "escopo_agronomico",
            "tipo_display",
            "severidade_display",
            "prioridade_display",
            "status_display",
            "is_ativo",
            "is_resolvido",
            "is_ignorado",
            "is_critico",
            "exige_acao_operacional",
            "resumo_operacional",
            "gerado_em",
            "resolvido_em",
            "created_at",
            "updated_at",
        ]

        extra_kwargs = {
            "monitoramento": {"required": True, "allow_null": False},
            "talhao": {"required": False, "allow_null": True},
            "propriedade": {"required": False, "allow_null": True},
            "titulo": {"required": True, "allow_blank": False},
            "mensagem": {"required": True, "allow_blank": False},
            "recomendacao": {"required": False, "allow_blank": True},
            "regra_origem": {"required": False, "allow_blank": True},
            "dados_contexto": {"required": False, "allow_null": True},
            "lido": {"required": False},
            "exige_confirmacao": {"required": False},
            "ativa": {"required": False},
            "status": {"required": False},
            "tipo": {"required": False},
            "severidade": {"required": False},
            "prioridade": {"required": False},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        request = self.context.get("request")

        if (
            not request
            or not hasattr(request, "user")
            or not request.user.is_authenticated
        ):
            self.fields["monitoramento"].queryset = Monitoramento.objects.none()
            return

        if request.user.is_superuser:
            self.fields["monitoramento"].queryset = Monitoramento.objects.all()
            return

        self.fields["monitoramento"].queryset = Monitoramento.objects.filter(
            usuario=request.user
        )

    def validate_titulo(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError("Informe o título do alerta.")

        return value

    def validate_mensagem(self, value):
        value = (value or "").strip()

        if not value:
            raise serializers.ValidationError("Informe a mensagem principal do alerta.")

        return value

    def validate_recomendacao(self, value):
        return (value or "").strip()

    def validate_regra_origem(self, value):
        return (value or "").strip()

    def validate_escopo_agronomico(self, value):
        return "milho"

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        monitoramento = attrs.get(
            "monitoramento",
            getattr(self.instance, "monitoramento", None),
        )

        talhao = attrs.get(
            "talhao",
            getattr(self.instance, "talhao", None),
        )

        propriedade = attrs.get(
            "propriedade",
            getattr(self.instance, "propriedade", None),
        )

        tipo = attrs.get(
            "tipo",
            getattr(self.instance, "tipo", Alerta.TipoAlerta.OPERACIONAL),
        )

        regra_origem = attrs.get(
            "regra_origem",
            getattr(self.instance, "regra_origem", ""),
        )

        status_alerta = attrs.get(
            "status",
            getattr(self.instance, "status", Alerta.StatusAlerta.ATIVO),
        )

        erros = {}

        if not monitoramento:
            erros["monitoramento"] = "Informe o monitoramento vinculado ao alerta."

        if (
            user
            and user.is_authenticated
            and not user.is_superuser
            and monitoramento
            and monitoramento.usuario_id != user.id
        ):
            erros["monitoramento"] = (
                "Este monitoramento não pertence ao usuário autenticado."
            )

        if monitoramento and talhao and monitoramento.talhao_id != talhao.id:
            erros["talhao"] = (
                "O talhão informado deve ser o mesmo talhão do monitoramento."
            )

        if monitoramento and propriedade:
            monitoramento_propriedade_id = None

            try:
                monitoramento_propriedade_id = monitoramento.talhao.propriedade_id
            except Exception:
                monitoramento_propriedade_id = None

            if (
                monitoramento_propriedade_id
                and propriedade.id != monitoramento_propriedade_id
            ):
                erros["propriedade"] = (
                    "A propriedade informada deve ser a mesma propriedade do talhão."
                )

        if (
            monitoramento
            and regra_origem
            and status_alerta in [
                Alerta.StatusAlerta.ATIVO,
                Alerta.StatusAlerta.EM_ANALISE,
            ]
        ):
            duplicado = Alerta.objects.filter(
                monitoramento=monitoramento,
                tipo=tipo,
                regra_origem=regra_origem,
                ativa=True,
                status__in=[
                    Alerta.StatusAlerta.ATIVO,
                    Alerta.StatusAlerta.EM_ANALISE,
                ],
            )

            if self.instance:
                duplicado = duplicado.exclude(id=self.instance.id)

            if duplicado.exists():
                erros["regra_origem"] = (
                    "Já existe um alerta ativo para este monitoramento, tipo e regra."
                )

        if erros:
            raise serializers.ValidationError(erros)

        return attrs

    def get_resumo_operacional(self, obj):
        return {
            "id": obj.id,
            "titulo": obj.titulo,
            "mensagem": obj.mensagem,
            "recomendacao": obj.recomendacao,
            "tipo": obj.tipo,
            "tipo_display": obj.get_tipo_display(),
            "severidade": obj.severidade,
            "severidade_display": obj.get_severidade_display(),
            "prioridade": obj.prioridade,
            "prioridade_display": obj.get_prioridade_display(),
            "status": obj.status,
            "status_display": obj.get_status_display(),
            "lido": obj.lido,
            "ativa": obj.ativa,
            "exige_confirmacao": obj.exige_confirmacao,
            "is_ativo": obj.is_ativo,
            "is_resolvido": obj.is_resolvido,
            "is_ignorado": obj.is_ignorado,
            "is_critico": obj.is_critico,
            "exige_acao_operacional": obj.exige_acao_operacional,
            "escopo_agronomico": obj.escopo_agronomico,
            "regra_origem": obj.regra_origem,
            "gerado_em": obj.gerado_em.isoformat() if obj.gerado_em else None,
            "resolvido_em": (
                obj.resolvido_em.isoformat() if obj.resolvido_em else None
            ),
        }