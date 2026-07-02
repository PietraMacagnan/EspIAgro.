import logging

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import FonteConhecimento
from .serializers import FonteConhecimentoSerializer

logger = logging.getLogger(__name__)


class FonteConhecimentoViewSet(viewsets.ModelViewSet):
    """
    API da Base de Conhecimento Técnica do EspIAgro.

    Endpoints principais:
    - GET /api/base-conhecimento/
    - POST /api/base-conhecimento/
    - GET /api/base-conhecimento/{id}/
    - PUT /api/base-conhecimento/{id}/
    - PATCH /api/base-conhecimento/{id}/
    - DELETE /api/base-conhecimento/{id}/

    Endpoints auxiliares:
    - POST /api/base-conhecimento/{id}/reprocessar/
    - POST /api/base-conhecimento/{id}/aprovar/
    - POST /api/base-conhecimento/{id}/marcar-revisar/
    - POST /api/base-conhecimento/{id}/marcar-erro/
    - POST /api/base-conhecimento/{id}/arquivar/
    - POST /api/base-conhecimento/{id}/reativar/
    - GET /api/base-conhecimento/resumo/
    - GET /api/base-conhecimento/fontes-ia/
    - GET /api/base-conhecimento/fontes-relatorios/

    Escopo atual:
    - o sistema opera tecnicamente com foco em MILHO;
    - fontes gerais de apoio continuam permitidas;
    - a base técnica deve sustentar IA, diagnóstico e relatórios.
    """

    serializer_class = FonteConhecimentoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="tipo",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Filtrar por tipo da fonte. "
                    "Ex.: pdf, link, artigo, manual, boletim, legislacao, base_publica, outro."
                ),
            ),
            OpenApiParameter(
                name="categoria",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Filtrar por categoria técnica. "
                    "Ex.: fenologia, pragas, doencas, nutricao, solo, clima, ndvi, manejo, geoprocessamento, geral."
                ),
            ),
            OpenApiParameter(
                name="escopo_cultura",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por escopo da cultura. Ex.: milho, geral.",
            ),
            OpenApiParameter(
                name="status_indexacao",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por status da indexação. Ex.: pendente, processando, indexado, erro.",
            ),
            OpenApiParameter(
                name="status_curadoria",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filtrar por curadoria. Ex.: em_revisao, aprovado, arquivado, erro.",
            ),
            OpenApiParameter(
                name="ativa",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Filtrar por status ativo/inativo. Ex.: true, false.",
            ),
            OpenApiParameter(
                name="confiabilidade_minima",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filtrar por confiabilidade mínima de 1 a 5.",
            ),
            OpenApiParameter(
                name="disponivel_para_ia",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Filtrar fontes disponíveis para IA. Ex.: true, false.",
            ),
            OpenApiParameter(
                name="disponivel_para_relatorio",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Filtrar fontes disponíveis para relatórios. Ex.: true, false.",
            ),
            OpenApiParameter(
                name="busca",
                type=str,
                location=OpenApiParameter.QUERY,
                description=(
                    "Busca textual em título, descrição, aplicação prática, autor, instituição, "
                    "palavras-chave, conteúdo extraído e observações."
                ),
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def _escopos_operacionais_ativos(self):
        """
        Escopos válidos para o momento atual do projeto.

        - milho: escopo oficial do backend nesta fase;
        - geral: documentos de apoio técnico complementar.
        """
        return [
            FonteConhecimento.EscopoCultura.MILHO,
            FonteConhecimento.EscopoCultura.GERAL,
        ]

    def _normalizar_escopo_cultura(self, escopo_cultura: str | None) -> str:
        if not escopo_cultura:
            return FonteConhecimento.EscopoCultura.MILHO

        escopo_normalizado = str(escopo_cultura).strip().lower()

        if escopo_normalizado not in self._escopos_operacionais_ativos():
            return FonteConhecimento.EscopoCultura.MILHO

        return escopo_normalizado

    def _parse_bool_query(self, valor):
        if valor is None:
            return None

        valor_normalizado = str(valor).strip().lower()

        if valor_normalizado in ("true", "1", "sim", "yes", "s"):
            return True

        if valor_normalizado in ("false", "0", "nao", "não", "no", "n"):
            return False

        return None

    def _normalizar_texto(self, valor):
        if valor is None:
            return ""

        return str(valor).strip()

    def _validar_fonte(self, serializer, instance=None):
        """
        Regras mínimas para operação real da base:

        - título é obrigatório;
        - PDF deve ter arquivo;
        - LINK deve ter URL;
        - outras fontes podem usar arquivo, URL ou conteúdo textual/manual;
        - confiabilidade deve ficar entre 1 e 5.
        """
        validated_data = serializer.validated_data

        tipo = validated_data.get(
            "tipo",
            instance.tipo if instance else None,
        )

        arquivo = validated_data.get(
            "arquivo",
            instance.arquivo if instance else None,
        )

        url = validated_data.get(
            "url",
            instance.url if instance else "",
        )

        conteudo_extraido = validated_data.get(
            "conteudo_extraido",
            instance.conteudo_extraido if instance else "",
        )

        confiabilidade = validated_data.get(
            "confiabilidade",
            instance.confiabilidade if instance else 3,
        )

        titulo = self._normalizar_texto(
            validated_data.get("titulo", instance.titulo if instance else "")
        )

        url = self._normalizar_texto(url)
        conteudo_extraido = self._normalizar_texto(conteudo_extraido)

        erros = {}

        if not titulo:
            erros["titulo"] = "Informe o título da fonte."

        if tipo == FonteConhecimento.TipoFonte.PDF and not arquivo:
            erros["arquivo"] = "Para fontes do tipo PDF, envie um arquivo válido."

        if tipo == FonteConhecimento.TipoFonte.LINK and not url:
            erros["url"] = "Para fontes do tipo link, informe uma URL válida."

        tipos_tecnicos_sem_obrigatoriedade_exclusiva = {
            FonteConhecimento.TipoFonte.ARTIGO,
            FonteConhecimento.TipoFonte.MANUAL,
            FonteConhecimento.TipoFonte.BOLETIM,
            FonteConhecimento.TipoFonte.LEGISLACAO,
            FonteConhecimento.TipoFonte.BASE_PUBLICA,
            FonteConhecimento.TipoFonte.OUTRO,
        }

        if tipo in tipos_tecnicos_sem_obrigatoriedade_exclusiva:
            if not arquivo and not url and not conteudo_extraido:
                erros["fonte"] = (
                    "Informe um arquivo, uma URL ou um conteúdo técnico para esta fonte."
                )

        if confiabilidade is not None and (confiabilidade < 1 or confiabilidade > 5):
            erros["confiabilidade"] = "A confiabilidade deve estar entre 1 e 5."

        if erros:
            return False, erros

        return True, {}

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = FonteConhecimento.objects.select_related(
                "usuario",
                "revisado_por",
            ).all()
        else:
            queryset = FonteConhecimento.objects.select_related(
                "usuario",
                "revisado_por",
            ).filter(usuario=user)

        queryset = queryset.filter(
            escopo_cultura__in=self._escopos_operacionais_ativos()
        )

        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        categoria = self.request.query_params.get("categoria")
        if categoria:
            queryset = queryset.filter(categoria=categoria)

        escopo_cultura = self.request.query_params.get("escopo_cultura")
        if escopo_cultura:
            escopo_normalizado = self._normalizar_escopo_cultura(escopo_cultura)
            queryset = queryset.filter(escopo_cultura=escopo_normalizado)

        status_indexacao = self.request.query_params.get("status_indexacao")
        if status_indexacao:
            queryset = queryset.filter(status_indexacao=status_indexacao)

        status_curadoria = self.request.query_params.get("status_curadoria")
        if status_curadoria:
            queryset = queryset.filter(status_curadoria=status_curadoria)

        ativa = self._parse_bool_query(self.request.query_params.get("ativa"))
        if ativa is not None:
            queryset = queryset.filter(ativa=ativa)

        confiabilidade_minima = self.request.query_params.get("confiabilidade_minima")
        if confiabilidade_minima:
            try:
                queryset = queryset.filter(
                    confiabilidade__gte=int(confiabilidade_minima)
                )
            except (TypeError, ValueError):
                pass

        disponivel_para_ia = self._parse_bool_query(
            self.request.query_params.get("disponivel_para_ia")
        )
        if disponivel_para_ia is not None:
            if disponivel_para_ia:
                queryset = queryset.filter(
                    ativa=True,
                    status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO,
                    status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
                ).filter(
                    Q(conteudo_extraido__isnull=False, conteudo_extraido__gt="")
                    | Q(url__isnull=False, url__gt="")
                )
            else:
                queryset = queryset.exclude(
                    ativa=True,
                    status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO,
                    status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
                )

        disponivel_para_relatorio = self._parse_bool_query(
            self.request.query_params.get("disponivel_para_relatorio")
        )
        if disponivel_para_relatorio is not None:
            if disponivel_para_relatorio:
                queryset = queryset.filter(
                    ativa=True,
                    status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
                    status_indexacao__in=[
                        FonteConhecimento.StatusIndexacao.INDEXADO,
                        FonteConhecimento.StatusIndexacao.PENDENTE,
                    ],
                )
            else:
                queryset = queryset.exclude(
                    ativa=True,
                    status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
                )

        busca = self.request.query_params.get("busca")
        if busca:
            queryset = queryset.filter(
                Q(titulo__icontains=busca)
                | Q(descricao__icontains=busca)
                | Q(aplicacao_pratica__icontains=busca)
                | Q(autor__icontains=busca)
                | Q(instituicao__icontains=busca)
                | Q(palavras_chave__icontains=busca)
                | Q(conteudo_extraido__icontains=busca)
                | Q(observacoes__icontains=busca)
            )

        return queryset.order_by("-created_at")

    def _extrair_texto_pdf(self, fonte: FonteConhecimento) -> str:
        """
        Extração inicial de texto de PDF.

        Nesta fase usamos PyPDF2, suficiente para PDFs textuais.
        Em PDFs escaneados/imagem, depois podemos evoluir para OCR.
        """
        if not fonte.arquivo:
            return ""

        try:
            from PyPDF2 import PdfReader

            fonte.arquivo.open("rb")
            reader = PdfReader(fonte.arquivo)

            paginas = []
            for page in reader.pages:
                texto = page.extract_text()
                if texto:
                    paginas.append(texto.strip())

            texto_final = "\n\n".join([p for p in paginas if p]).strip()
            return texto_final

        except Exception as exc:
            logger.exception(
                "Erro ao extrair texto do PDF da fonte %s: %s",
                fonte.id,
                exc,
            )
            raise

        finally:
            try:
                fonte.arquivo.close()
            except Exception:
                pass

    def _processar_fonte(self, fonte: FonteConhecimento) -> None:
        """
        Processa a fonte e atualiza indexação básica.

        Regras da fase atual:
        - escopo principal: milho;
        - fontes gerais de apoio continuam permitidas;
        - PDF textual tenta extração por PyPDF2;
        - fontes por link ou conteúdo manual mantêm o conteúdo informado.
        """
        try:
            fonte.escopo_cultura = self._normalizar_escopo_cultura(
                fonte.escopo_cultura
            )
            fonte.status_indexacao = FonteConhecimento.StatusIndexacao.PROCESSANDO
            fonte.indexado_em = None
            fonte.save(
                update_fields=[
                    "escopo_cultura",
                    "status_indexacao",
                    "indexado_em",
                    "updated_at",
                ]
            )

            if fonte.tipo == FonteConhecimento.TipoFonte.PDF and fonte.arquivo:
                texto_extraido = self._extrair_texto_pdf(fonte)
                fonte.conteudo_extraido = texto_extraido

                if texto_extraido:
                    fonte.status_indexacao = FonteConhecimento.StatusIndexacao.INDEXADO
                else:
                    fonte.status_indexacao = FonteConhecimento.StatusIndexacao.ERRO

                    if not fonte.observacoes:
                        fonte.observacoes = (
                            "PDF cadastrado, mas não foi possível extrair texto útil. "
                            "Pode ser um PDF escaneado ou com conteúdo em imagem."
                        )

            elif fonte.tipo in {
                FonteConhecimento.TipoFonte.LINK,
                FonteConhecimento.TipoFonte.ARTIGO,
                FonteConhecimento.TipoFonte.MANUAL,
                FonteConhecimento.TipoFonte.BOLETIM,
                FonteConhecimento.TipoFonte.LEGISLACAO,
                FonteConhecimento.TipoFonte.BASE_PUBLICA,
                FonteConhecimento.TipoFonte.OUTRO,
            }:
                if fonte.conteudo_extraido or fonte.url:
                    fonte.status_indexacao = FonteConhecimento.StatusIndexacao.INDEXADO
                else:
                    fonte.status_indexacao = FonteConhecimento.StatusIndexacao.PENDENTE

            fonte.indexado_em = timezone.now()
            fonte.save(
                update_fields=[
                    "conteudo_extraido",
                    "status_indexacao",
                    "observacoes",
                    "indexado_em",
                    "updated_at",
                ]
            )

        except Exception as exc:
            fonte.status_indexacao = FonteConhecimento.StatusIndexacao.ERRO

            observacao_erro = (
                "Erro ao processar a fonte técnica. "
                f"Detalhe interno: {str(exc)[:300]}"
            )

            fonte.observacoes = (
                f"{fonte.observacoes}\n\n{observacao_erro}".strip()
                if fonte.observacoes
                else observacao_erro
            )

            fonte.save(
                update_fields=[
                    "status_indexacao",
                    "observacoes",
                    "updated_at",
                ]
            )
            raise

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        valido, erros = self._validar_fonte(serializer)
        if not valido:
            return Response(erros, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            fonte = serializer.save(
                usuario=request.user,
                escopo_cultura=self._normalizar_escopo_cultura(
                    serializer.validated_data.get("escopo_cultura")
                ),
            )

            try:
                self._processar_fonte(fonte)
            except Exception:
                serializer_saida = self.get_serializer(
                    fonte,
                    context={"request": request},
                )
                return Response(
                    {
                        "detail": (
                            "A fonte foi cadastrada, mas ocorreu erro no processamento."
                        ),
                        "fonte": serializer_saida.data,
                    },
                    status=status.HTTP_201_CREATED,
                )

        serializer_saida = self.get_serializer(
            fonte,
            context={"request": request},
        )
        headers = self.get_success_headers(serializer_saida.data)

        return Response(
            serializer_saida.data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)

        valido, erros = self._validar_fonte(serializer, instance=instance)
        if not valido:
            return Response(erros, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            escopo_atualizado = serializer.validated_data.get(
                "escopo_cultura",
                instance.escopo_cultura,
            )

            fonte = serializer.save(
                escopo_cultura=self._normalizar_escopo_cultura(escopo_atualizado)
            )

            try:
                self._processar_fonte(fonte)
            except Exception:
                serializer_saida = self.get_serializer(
                    fonte,
                    context={"request": request},
                )
                return Response(
                    {
                        "detail": (
                            "A fonte foi atualizada, mas ocorreu erro no reprocessamento."
                        ),
                        "fonte": serializer_saida.data,
                    },
                    status=status.HTTP_200_OK,
                )

        serializer_saida = self.get_serializer(
            fonte,
            context={"request": request},
        )

        return Response(serializer_saida.data, status=status.HTTP_200_OK)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @extend_schema(
        description="Reprocessa manualmente a fonte para extração/indexação."
    )
    @action(detail=True, methods=["post"], url_path="reprocessar")
    def reprocessar(self, request, pk=None):
        fonte = self.get_object()

        try:
            self._processar_fonte(fonte)
        except Exception:
            serializer = self.get_serializer(fonte, context={"request": request})
            return Response(
                {
                    "detail": "A fonte foi enviada para reprocessamento, mas ocorreu erro.",
                    "fonte": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte reprocessada com sucesso.",
                "escopo_agronomico": fonte.escopo_agronomico,
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description=(
            "Marca a fonte como aprovada para uso técnico em diagnósticos, IA e relatórios."
        )
    )
    @action(detail=True, methods=["post"], url_path="aprovar")
    def aprovar(self, request, pk=None):
        fonte = self.get_object()
        fonte.aprovar(usuario=request.user)

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte aprovada para uso técnico.",
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Marca a fonte como necessitando revisão técnica."
    )
    @action(detail=True, methods=["post"], url_path="marcar-revisar")
    def marcar_revisar(self, request, pk=None):
        fonte = self.get_object()
        fonte.marcar_revisao(usuario=request.user)

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte marcada para revisão.",
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Marca a fonte com erro de processamento ou inconsistência técnica."
    )
    @action(detail=True, methods=["post"], url_path="marcar-erro")
    def marcar_erro(self, request, pk=None):
        fonte = self.get_object()

        mensagem = self._normalizar_texto(
            request.data.get(
                "observacoes",
                "Fonte marcada manualmente com erro ou inconsistência técnica.",
            )
        )

        if mensagem:
            fonte.observacoes = (
                f"{fonte.observacoes}\n\n{mensagem}".strip()
                if fonte.observacoes
                else mensagem
            )

        fonte.marcar_erro(usuario=request.user)

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte marcada com erro.",
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Arquiva a fonte sem excluí-la definitivamente."
    )
    @action(detail=True, methods=["post"], url_path="arquivar")
    def arquivar(self, request, pk=None):
        fonte = self.get_object()
        fonte.arquivar(usuario=request.user)

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte arquivada com sucesso.",
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Reativa uma fonte arquivada ou com erro."
    )
    @action(detail=True, methods=["post"], url_path="reativar")
    def reativar(self, request, pk=None):
        fonte = self.get_object()
        fonte.reativar(usuario=request.user)

        serializer = self.get_serializer(fonte, context={"request": request})

        return Response(
            {
                "detail": "Fonte reativada com sucesso e enviada para revisão.",
                "fonte": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Retorna um resumo consolidado da base de conhecimento."
    )
    @action(detail=False, methods=["get"], url_path="resumo")
    def resumo(self, request):
        queryset = self.get_queryset()

        total = queryset.count()
        ativas = queryset.filter(ativa=True).count()
        inativas = queryset.filter(ativa=False).count()

        indexadas = queryset.filter(
            status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO
        ).count()
        pendentes = queryset.filter(
            status_indexacao=FonteConhecimento.StatusIndexacao.PENDENTE
        ).count()
        processando = queryset.filter(
            status_indexacao=FonteConhecimento.StatusIndexacao.PROCESSANDO
        ).count()
        erro_indexacao = queryset.filter(
            status_indexacao=FonteConhecimento.StatusIndexacao.ERRO
        ).count()

        milho = queryset.filter(
            escopo_cultura=FonteConhecimento.EscopoCultura.MILHO
        ).count()
        geral = queryset.filter(
            escopo_cultura=FonteConhecimento.EscopoCultura.GERAL
        ).count()

        aprovadas = queryset.filter(
            status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO
        ).count()
        em_revisao = queryset.filter(
            status_curadoria=FonteConhecimento.StatusCuradoria.EM_REVISAO
        ).count()
        arquivadas = queryset.filter(
            status_curadoria=FonteConhecimento.StatusCuradoria.ARQUIVADO
        ).count()
        erro_curadoria = queryset.filter(
            status_curadoria=FonteConhecimento.StatusCuradoria.ERRO
        ).count()

        disponiveis_ia = [
            fonte.id for fonte in queryset if fonte.disponivel_para_ia
        ]
        disponiveis_relatorio = [
            fonte.id for fonte in queryset if fonte.disponivel_para_relatorio
        ]

        return Response(
            {
                "total_fontes": total,
                "ativas": ativas,
                "inativas": inativas,
                "indexacao": {
                    "indexadas": indexadas,
                    "pendentes": pendentes,
                    "processando": processando,
                    "com_erro": erro_indexacao,
                },
                "escopo": {
                    "milho": milho,
                    "geral": geral,
                },
                "curadoria": {
                    "aprovadas": aprovadas,
                    "em_revisao": em_revisao,
                    "arquivadas": arquivadas,
                    "com_erro": erro_curadoria,
                },
                "disponiveis_para_ia": len(disponiveis_ia),
                "disponiveis_para_relatorio": len(disponiveis_relatorio),
                "ids_disponiveis_para_ia": disponiveis_ia,
                "ids_disponiveis_para_relatorio": disponiveis_relatorio,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description=(
            "Lista fontes tecnicamente aptas para apoiar a camada de IA e diagnóstico."
        )
    )
    @action(detail=False, methods=["get"], url_path="fontes-ia")
    def fontes_ia(self, request):
        queryset_base = self.get_queryset().filter(
            ativa=True,
            status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO,
            status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
        )

        fontes_ids = [
            fonte.id for fonte in queryset_base if fonte.disponivel_para_ia
        ]

        queryset = queryset_base.filter(id__in=fontes_ids).order_by(
            "-confiabilidade",
            "-updated_at",
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "total": queryset.count(),
                "escopo": "milho",
                "detail": "Fontes disponíveis para apoio à IA e diagnóstico técnico.",
                "fontes": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        description="Lista fontes aptas para apoiar relatórios técnicos."
    )
    @action(detail=False, methods=["get"], url_path="fontes-relatorios")
    def fontes_relatorios(self, request):
        queryset_base = self.get_queryset().filter(
            ativa=True,
            status_curadoria=FonteConhecimento.StatusCuradoria.APROVADO,
            status_indexacao__in=[
                FonteConhecimento.StatusIndexacao.INDEXADO,
                FonteConhecimento.StatusIndexacao.PENDENTE,
            ],
        )

        fontes_ids = [
            fonte.id for fonte in queryset_base if fonte.disponivel_para_relatorio
        ]

        queryset = queryset_base.filter(id__in=fontes_ids).order_by(
            "-confiabilidade",
            "-updated_at",
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
            context={"request": request},
        )

        return Response(
            {
                "total": queryset.count(),
                "escopo": "milho",
                "detail": "Fontes disponíveis para apoio em relatórios técnicos.",
                "fontes": serializer.data,
            },
            status=status.HTTP_200_OK,
        )