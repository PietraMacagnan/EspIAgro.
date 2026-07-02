from django.conf import settings
from django.db import models
from django.utils import timezone


class FonteConhecimento(models.Model):
    """
    Base de conhecimento técnica do EspIAgro.

    Esta entidade serve de base para:
    - documentos PDF técnicos
    - links de fontes confiáveis
    - materiais oficiais do agro
    - indexação para IA / RAG
    - rastreabilidade técnica de relatórios
    - apoio diagnóstico com base em fontes técnicas

    Escopo atual do projeto:
    - a arquitetura permanece preparada para evolução futura
    - porém, nesta fase oficial do sistema, a base técnica ativa
      deve operar com foco na cultura do MILHO
    """

    CULTURA_PADRAO = "milho"

    class TipoFonte(models.TextChoices):
        PDF = "pdf", "PDF"
        LINK = "link", "Link"
        ARTIGO = "artigo", "Artigo"
        MANUAL = "manual", "Manual"
        BOLETIM = "boletim", "Boletim"
        LEGISLACAO = "legislacao", "Legislação"
        BASE_PUBLICA = "base_publica", "Base Pública"
        OUTRO = "outro", "Outro"

    class CategoriaFonte(models.TextChoices):
        FENOLOGIA = "fenologia", "Fenologia"
        PRAGAS = "pragas", "Pragas"
        DOENCAS = "doencas", "Doenças"
        NUTRICAO = "nutricao", "Nutrição"
        SOLO = "solo", "Solo"
        CLIMA = "clima", "Clima"
        NDVI = "ndvi", "NDVI"
        MANEJO = "manejo", "Manejo"
        GEOPROCESSAMENTO = "geoprocessamento", "Geoprocessamento"
        GERAL = "geral", "Geral"

    class StatusIndexacao(models.TextChoices):
        PENDENTE = "pendente", "Pendente"
        PROCESSANDO = "processando", "Processando"
        INDEXADO = "indexado", "Indexado"
        ERRO = "erro", "Erro"

    class EscopoCultura(models.TextChoices):
        MILHO = "milho", "Milho"
        GERAL = "geral", "Geral de apoio"

    class StatusCuradoria(models.TextChoices):
        EM_REVISAO = "em_revisao", "Em revisão"
        APROVADO = "aprovado", "Aprovado"
        ARQUIVADO = "arquivado", "Arquivado"
        ERRO = "erro", "Com erro"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="fontes_conhecimento",
        null=True,
        blank=True,
    )

    titulo = models.CharField(max_length=255)
    descricao = models.TextField(blank=True)

    tipo = models.CharField(
        max_length=20,
        choices=TipoFonte.choices,
        default=TipoFonte.PDF,
    )

    categoria = models.CharField(
        max_length=30,
        choices=CategoriaFonte.choices,
        default=CategoriaFonte.GERAL,
    )

    escopo_cultura = models.CharField(
        max_length=20,
        choices=EscopoCultura.choices,
        default=EscopoCultura.MILHO,
        help_text=(
            "Escopo agronômico da fonte. "
            "Nesta fase oficial do projeto, a base técnica ativa opera com foco em milho."
        ),
    )

    autor = models.CharField(max_length=255, blank=True)
    instituicao = models.CharField(max_length=255, blank=True)
    ano_publicacao = models.PositiveIntegerField(null=True, blank=True)

    arquivo = models.FileField(
        upload_to="base_conhecimento/pdfs/",
        null=True,
        blank=True,
        help_text="Arquivo técnico enviado para compor a base de conhecimento.",
    )

    url = models.URLField(blank=True)

    conteudo_extraido = models.TextField(
        blank=True,
        help_text="Texto extraído do documento para indexação e busca técnica.",
    )

    palavras_chave = models.CharField(
        max_length=500,
        blank=True,
        help_text="Lista simples de palavras-chave separadas por vírgula.",
    )

    aplicacao_pratica = models.TextField(
        blank=True,
        help_text=(
            "Descrição objetiva de como esta fonte pode apoiar diagnósticos, "
            "relatórios, recomendações ou análise técnica no EspIAgro."
        ),
    )

    confiabilidade = models.PositiveSmallIntegerField(
        default=3,
        help_text=(
            "Nível simples de confiabilidade da fonte, de 1 a 5. "
            "Use 5 para fontes técnicas oficiais, instituições reconhecidas ou materiais validados."
        ),
    )

    status_indexacao = models.CharField(
        max_length=20,
        choices=StatusIndexacao.choices,
        default=StatusIndexacao.PENDENTE,
    )

    status_curadoria = models.CharField(
        max_length=20,
        choices=StatusCuradoria.choices,
        default=StatusCuradoria.EM_REVISAO,
        help_text=(
            "Status de curadoria da fonte para uso em IA, diagnósticos e relatórios."
        ),
    )

    observacoes = models.TextField(blank=True)
    ativa = models.BooleanField(default=True)

    revisado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="fontes_conhecimento_revisadas",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    indexado_em = models.DateTimeField(null=True, blank=True)
    revisado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "fontes_conhecimento"
        verbose_name = "Fonte de Conhecimento"
        verbose_name_plural = "Base de Conhecimento"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tipo"], name="idx_fonte_tipo"),
            models.Index(fields=["categoria"], name="idx_fonte_categoria"),
            models.Index(fields=["escopo_cultura"], name="idx_fonte_escopo_cultura"),
            models.Index(fields=["status_indexacao"], name="idx_fonte_indexacao"),
            models.Index(fields=["status_curadoria"], name="idx_fonte_curadoria"),
            models.Index(fields=["ativa"], name="idx_fonte_ativa"),
            models.Index(fields=["confiabilidade"], name="idx_fonte_confiabilidade"),
            models.Index(fields=["created_at"], name="idx_fonte_created"),
        ]

    @property
    def escopo_agronomico(self) -> str:
        """
        Mantém explícito para a aplicação o escopo agronômico principal da fonte.
        """
        return self.escopo_cultura or self.CULTURA_PADRAO

    @property
    def is_milho(self) -> bool:
        """
        Indica se a fonte está no escopo específico de milho.
        """
        return self.escopo_cultura == self.EscopoCultura.MILHO

    @property
    def is_geral_apoio(self) -> bool:
        """
        Indica se a fonte é geral de apoio técnico.
        """
        return self.escopo_cultura == self.EscopoCultura.GERAL

    @property
    def is_indexada(self) -> bool:
        """
        Indica se a fonte já foi processada e possui indexação concluída.
        """
        return self.status_indexacao == self.StatusIndexacao.INDEXADO

    @property
    def is_aprovada(self) -> bool:
        """
        Indica se a fonte foi aprovada para uso técnico em IA, diagnósticos e relatórios.
        """
        return self.status_curadoria == self.StatusCuradoria.APROVADO

    @property
    def disponivel_para_ia(self) -> bool:
        """
        Define se a fonte está pronta para apoiar respostas da IA.

        Critérios:
        - ativa
        - indexada
        - aprovada
        - com conteúdo extraído ou URL útil
        - dentro do escopo operacional atual
        """
        possui_conteudo = bool((self.conteudo_extraido or "").strip() or (self.url or "").strip())

        return (
            self.ativa
            and self.is_indexada
            and self.is_aprovada
            and possui_conteudo
            and self.escopo_cultura in {
                self.EscopoCultura.MILHO,
                self.EscopoCultura.GERAL,
            }
        )

    @property
    def disponivel_para_relatorio(self) -> bool:
        """
        Define se a fonte pode aparecer como referência de apoio em relatórios.
        """
        return (
            self.ativa
            and self.is_aprovada
            and self.status_indexacao in {
                self.StatusIndexacao.INDEXADO,
                self.StatusIndexacao.PENDENTE,
            }
            and self.escopo_cultura in {
                self.EscopoCultura.MILHO,
                self.EscopoCultura.GERAL,
            }
        )

    def aprovar(self, usuario=None):
        """
        Aprova a fonte para uso técnico.
        """
        self.status_curadoria = self.StatusCuradoria.APROVADO
        self.ativa = True
        self.revisado_por = usuario
        self.revisado_em = timezone.now()
        self.save(
            update_fields=[
                "status_curadoria",
                "ativa",
                "revisado_por",
                "revisado_em",
                "updated_at",
            ]
        )

    def arquivar(self, usuario=None):
        """
        Arquiva a fonte sem excluir o registro.
        """
        self.status_curadoria = self.StatusCuradoria.ARQUIVADO
        self.ativa = False
        self.revisado_por = usuario
        self.revisado_em = timezone.now()
        self.save(
            update_fields=[
                "status_curadoria",
                "ativa",
                "revisado_por",
                "revisado_em",
                "updated_at",
            ]
        )

    def marcar_erro(self, usuario=None):
        """
        Marca a fonte como fonte com erro de curadoria/indexação.
        """
        self.status_curadoria = self.StatusCuradoria.ERRO
        self.status_indexacao = self.StatusIndexacao.ERRO
        self.revisado_por = usuario
        self.revisado_em = timezone.now()
        self.save(
            update_fields=[
                "status_curadoria",
                "status_indexacao",
                "revisado_por",
                "revisado_em",
                "updated_at",
            ]
        )

    def marcar_revisao(self, usuario=None):
        """
        Retorna a fonte para revisão.
        """
        self.status_curadoria = self.StatusCuradoria.EM_REVISAO
        self.revisado_por = usuario
        self.revisado_em = timezone.now()
        self.save(
            update_fields=[
                "status_curadoria",
                "revisado_por",
                "revisado_em",
                "updated_at",
            ]
        )

    def reativar(self, usuario=None):
        """
        Reativa a fonte e retorna para revisão, preservando dados e histórico.
        """
        self.ativa = True
        self.status_curadoria = self.StatusCuradoria.EM_REVISAO
        self.revisado_por = usuario
        self.revisado_em = timezone.now()
        self.save(
            update_fields=[
                "ativa",
                "status_curadoria",
                "revisado_por",
                "revisado_em",
                "updated_at",
            ]
        )

    def save(self, *args, **kwargs):
        """
        Normaliza dados essenciais da fonte.

        Nesta fase do projeto:
        - documentos específicos devem operar em milho
        - documentos gerais de apoio podem permanecer como 'geral'
        - confiabilidade deve permanecer entre 1 e 5
        """
        if not self.escopo_cultura:
            self.escopo_cultura = self.EscopoCultura.MILHO

        if self.escopo_cultura not in {
            self.EscopoCultura.MILHO,
            self.EscopoCultura.GERAL,
        }:
            self.escopo_cultura = self.EscopoCultura.MILHO

        if not self.status_curadoria:
            self.status_curadoria = self.StatusCuradoria.EM_REVISAO

        if self.confiabilidade is None:
            self.confiabilidade = 3

        if self.confiabilidade < 1:
            self.confiabilidade = 1

        if self.confiabilidade > 5:
            self.confiabilidade = 5

        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.titulo