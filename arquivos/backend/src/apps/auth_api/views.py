import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.db import transaction
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

User = get_user_model()
token_generator = PasswordResetTokenGenerator()


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=6)

    def validate_username(self, value):
        username = value.strip()

        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Já existe um usuário com esse nome.")

        return username

    def validate_email(self, value):
        email = value.strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Já existe um usuário com esse e-mail.")

        return email

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"].strip(),
            email=validated_data["email"].strip().lower(),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", "").strip(),
            last_name=validated_data.get("last_name", "").strip(),
        )
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.strip().lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=6)

    def validate_password(self, value):
        validate_password(value)
        return value


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)
    confirmation_text = serializers.CharField(required=True)

    def validate_confirmation_text(self, value):
        normalized_value = value.strip().upper()

        if normalized_value != "EXCLUIR":
            raise serializers.ValidationError(
                'Digite exatamente "EXCLUIR" para confirmar.'
            )

        return normalized_value

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Usuário não autenticado.")

        password = attrs.get("password", "")

        if not user.check_password(password):
            raise serializers.ValidationError(
                {"password": "Senha incorreta. Confirme sua senha atual."}
            )

        return attrs


class RegisterResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    user = serializers.DictField()


class MessageResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(
                response=RegisterResponseSerializer,
                description="Usuário cadastrado com sucesso.",
            ),
            400: OpenApiResponse(description="Dados inválidos para cadastro."),
        },
        examples=[
            OpenApiExample(
                "Exemplo de cadastro",
                request_only=True,
                value={
                    "first_name": "Decleones",
                    "last_name": "Andrade",
                    "username": "decleones",
                    "email": "decleones@email.com",
                    "password": "Senha@12345",
                },
            )
        ],
        description="Cria um novo usuário no sistema.",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "detail": "Usuário cadastrado com sucesso.",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        request=PasswordResetRequestSerializer,
        responses={
            200: OpenApiResponse(
                response=MessageResponseSerializer,
                description="Solicitação de recuperação processada.",
            ),
            500: OpenApiResponse(
                response=MessageResponseSerializer,
                description="Falha ao enviar e-mail.",
            ),
        },
        examples=[
            OpenApiExample(
                "Exemplo de solicitação de recuperação",
                request_only=True,
                value={
                    "email": "decleones@email.com",
                },
            )
        ],
        description="Solicita recuperação de senha por e-mail.",
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        response_message = (
            "Se existir um usuário ativo com esse e-mail, a instrução de recuperação foi enviada."
        )

        if not user:
            return Response(
                {"detail": response_message},
                status=status.HTTP_200_OK,
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = token_generator.make_token(user)

        reset_url = (
            f"{settings.FRONTEND_BASE_URL.rstrip('/')}"
            f"{settings.FRONTEND_RESET_PASSWORD_PATH}"
            f"?uid={uid}&token={token}"
        )

        subject = "Recuperação de senha - EspIAgro"
        message = (
            f"Olá, {user.username}.\n\n"
            f"Recebemos uma solicitação para redefinir sua senha no EspIAgro.\n\n"
            f"Acesse o link abaixo para criar uma nova senha:\n"
            f"{reset_url}\n\n"
            f"Se você não solicitou esta alteração, ignore esta mensagem.\n"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as exc:
            logger.exception(
                "Erro ao enviar e-mail de recuperação para o usuário %s: %s",
                user.id,
                exc,
            )
            return Response(
                {
                    "detail": (
                        "Não foi possível enviar o e-mail de recuperação no momento."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": response_message},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["auth"],
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiResponse(
                response=MessageResponseSerializer,
                description="Senha redefinida com sucesso.",
            ),
            400: OpenApiResponse(
                response=MessageResponseSerializer,
                description="UID ou token inválido/expirado.",
            ),
        },
        examples=[
            OpenApiExample(
                "Exemplo de redefinição",
                request_only=True,
                value={
                    "uid": "Mg",
                    "token": "cstx5m-3d9f2c5f0a1b2c3d4e5f6a7b8c9d",
                    "password": "NovaSenha@12345",
                },
            )
        ],
        description="Redefine a senha do usuário a partir do uid e token de recuperação.",
    )
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Link de recuperação inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_generator.check_token(user, token):
            return Response(
                {"detail": "Token de recuperação inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response(
            {"detail": "Senha redefinida com sucesso."},
            status=status.HTTP_200_OK,
        )


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        request=DeleteAccountSerializer,
        responses={
            200: OpenApiResponse(
                response=MessageResponseSerializer,
                description="Conta excluída com sucesso.",
            ),
            400: OpenApiResponse(
                description="Dados de confirmação inválidos.",
            ),
            401: OpenApiResponse(
                description="Usuário não autenticado.",
            ),
        },
        examples=[
            OpenApiExample(
                "Exemplo de exclusão de conta",
                request_only=True,
                value={
                    "password": "Senha@12345",
                    "confirmation_text": "EXCLUIR",
                },
            )
        ],
        description=(
            "Exclui a conta do usuário autenticado após confirmação por senha "
            'e pelo texto "EXCLUIR".'
        ),
    )
    def delete(self, request):
        serializer = DeleteAccountSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        username = user.username
        user_id = user.id

        try:
            with transaction.atomic():
                user.delete()
        except Exception as exc:
            logger.exception(
                "Erro ao excluir conta do usuário %s (%s): %s",
                user_id,
                username,
                exc,
            )
            return Response(
                {"detail": "Não foi possível excluir a conta no momento."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Conta excluída com sucesso."},
            status=status.HTTP_200_OK,
        )