import re
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.base_conhecimento.models import FonteConhecimento
from apps.monitoramento.services.clima_service import ClimaService
from apps.monitoramento.services.ia_service import OllamaIAService
from .models import Relatorio
from .serializers import RelatorioSerializer


class RelatorioViewSet(viewsets.ModelViewSet):
    """
    API completa de Relatórios (CRUD).

    Endpoints:
    - GET /api/relatorios/
    - POST /api/relatorios/
    - GET /api/relatorios/{id}/
    - PUT /api/relatorios/{id}/
    - PATCH /api/relatorios/{id}/
    - DELETE /api/relatorios/{id}/

    Filtros suportados:
    - GET /api/relatorios/?tipo=monitoramento
    - GET /api/relatorios/?status=pendente
    - GET /api/relatorios/?monitoramento=1
    - GET /api/relatorios/?talhao=1
    - GET /api/relatorios/?propriedade=1

    Endpoints extras:
    - POST /api/relatorios/{id}/gerar-conteudo/
    - POST /api/relatorios/{id}/gerar-pdf/
    - POST /api/relatorios/{id}/gerar-completo/
    - GET /api/relatorios/{id}/baixar-pdf/
    """

    serializer_class = RelatorioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            queryset = (
                Relatorio.objects.select_related(
                    "usuario",
                    "monitoramento",
                    "talhao",
                    "propriedade",
                )
                .prefetch_related("referencias_tecnicas")
                .all()
            )
        else:
            queryset = (
                Relatorio.objects.select_related(
                    "usuario",
                    "monitoramento",
                    "talhao",
                    "propriedade",
                )
                .prefetch_related("referencias_tecnicas")
                .filter(usuario=user)
            )

        tipo = self.request.query_params.get("tipo")
        if tipo:
            queryset = queryset.filter(tipo=tipo)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        monitoramento_id = self.request.query_params.get("monitoramento")
        if monitoramento_id:
            queryset = queryset.filter(monitoramento_id=monitoramento_id)

        talhao_id = self.request.query_params.get("talhao")
        if talhao_id:
            queryset = queryset.filter(talhao_id=talhao_id)

        propriedade_id = self.request.query_params.get("propriedade")
        if propriedade_id:
            queryset = queryset.filter(propriedade_id=propriedade_id)

        return queryset.order_by("-created_at")

    def _obter_cultura_contexto(self, monitoramento) -> str:
        """
        Escopo agronômico oficial desta fase.
        Mesmo com arquitetura preparada para expansão futura,
        o backend deve operar tecnicamente em milho.
        """
        return "milho"

    def _escopos_fontes_ativos(self):
        """
        Escopos válidos da base técnica nesta fase:
        - milho: escopo oficial
        - geral: apoio complementar
        """
        return [
            FonteConhecimento.EscopoCultura.MILHO,
            FonteConhecimento.EscopoCultura.GERAL,
        ]

    def _buscar_referencias_tecnicas(self, relatorio: Relatorio):
        """
        Busca referências técnicas consolidadas para apoiar IA, diagnóstico e relatório.

        Estratégia consolidada:
        - usa apenas fontes ativas;
        - usa apenas fontes indexadas;
        - respeita escopo milho/geral;
        - prioriza fontes aprovadas/disponíveis para IA e relatório quando esses campos existem;
        - busca por relevância textual quando possível;
        - se a busca textual não encontrar nada, usa fallback seguro com fontes aprovadas;
        - evita retornar vazio quando já existe fonte técnica válida cadastrada.
        """
        monitoramento = relatorio.monitoramento
        if not monitoramento:
            return []

        campos_fonte = {field.name for field in FonteConhecimento._meta.fields}

        base_queryset = FonteConhecimento.objects.select_related("usuario").filter(
            ativa=True,
            status_indexacao=FonteConhecimento.StatusIndexacao.INDEXADO,
            escopo_cultura__in=self._escopos_fontes_ativos(),
        )

        if not self.request.user.is_superuser:
            base_queryset = base_queryset.filter(usuario=self.request.user)

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
                fontes_aprovadas = base_queryset.filter(status_curadoria=status_aprovado)
                if fontes_aprovadas.exists():
                    base_queryset = fontes_aprovadas

        if "disponivel_para_ia" in campos_fonte:
            fontes_ia = base_queryset.filter(disponivel_para_ia=True)
            if fontes_ia.exists():
                base_queryset = fontes_ia

        if "disponivel_para_relatorio" in campos_fonte:
            fontes_relatorio = base_queryset.filter(disponivel_para_relatorio=True)
            if fontes_relatorio.exists():
                base_queryset = fontes_relatorio

        termos_busca = set()
        anomalias = monitoramento.anomalias.filter(ativa=True)

        termos_busca.add("milho")
        termos_busca.add("manejo")
        termos_busca.add("monitoramento")

        if monitoramento.cultura:
            termos_busca.update(str(monitoramento.cultura).lower().split())

        if monitoramento.estadio_fenologico:
            termos_busca.add(str(monitoramento.estadio_fenologico).lower())

        estadio_display = monitoramento.get_estadio_fenologico_display()
        if estadio_display:
            termos_busca.update(
                estadio_display.lower().replace("-", " ").replace("/", " ").split()
            )

        if monitoramento.sanidade:
            termos_busca.update(str(monitoramento.sanidade).lower().split())

        if monitoramento.observacoes:
            termos_busca.update(str(monitoramento.observacoes).lower().split())

        if monitoramento.resumo_diagnostico:
            termos_busca.update(str(monitoramento.resumo_diagnostico).lower().split())

        ia_estadio = getattr(monitoramento, "ia_estadio_fenologico_sugerido", "")
        if ia_estadio:
            termos_busca.update(str(ia_estadio).lower().replace("-", " ").split())

        if monitoramento.umidade_solo is not None:
            termos_busca.update(["solo", "umidade", "clima", "estresse", "hídrico", "hidrico"])

        for anomalia in anomalias:
            if anomalia.nome:
                termos_busca.update(str(anomalia.nome).lower().split())

            if anomalia.tipo:
                termos_busca.add(str(anomalia.tipo).lower())

            tipo_display = anomalia.get_tipo_display()
            if tipo_display:
                termos_busca.update(str(tipo_display).lower().split())

            if anomalia.observacao:
                termos_busca.update(str(anomalia.observacao).lower().split())

        termos_busca = {
            termo.strip(".,;:()[]{}_-")
            for termo in termos_busca
            if len(termo.strip(".,;:()[]{}_-")) >= 3
        }

        categorias_prioritarias = {
            FonteConhecimento.CategoriaFonte.GERAL,
            FonteConhecimento.CategoriaFonte.MANEJO,
        }

        if monitoramento.estadio_fenologico or ia_estadio:
            categorias_prioritarias.add(FonteConhecimento.CategoriaFonte.FENOLOGIA)

        if monitoramento.umidade_solo is not None:
            categorias_prioritarias.add(FonteConhecimento.CategoriaFonte.SOLO)
            categorias_prioritarias.add(FonteConhecimento.CategoriaFonte.CLIMA)

        if anomalias.exists():
            categorias_prioritarias.add(FonteConhecimento.CategoriaFonte.PRAGAS)
            categorias_prioritarias.add(FonteConhecimento.CategoriaFonte.DOENCAS)

        fontes_candidatas = list(base_queryset)

        def texto_fonte(fonte: FonteConhecimento) -> str:
            partes = [
                getattr(fonte, "titulo", ""),
                getattr(fonte, "descricao", ""),
                getattr(fonte, "autor", ""),
                getattr(fonte, "instituicao", ""),
                getattr(fonte, "palavras_chave", ""),
                getattr(fonte, "conteudo_extraido", ""),
                getattr(fonte, "aplicacao_pratica", ""),
                getattr(fonte, "observacoes", ""),
                getattr(fonte, "categoria", ""),
                getattr(fonte, "escopo_cultura", ""),
            ]
            return " ".join(str(parte or "").lower() for parte in partes)

        def pontuar_fonte(fonte: FonteConhecimento) -> int:
            texto = texto_fonte(fonte)
            pontos = 0

            if getattr(fonte, "categoria", None) in categorias_prioritarias:
                pontos += 20

            if getattr(fonte, "escopo_cultura", "") == FonteConhecimento.EscopoCultura.MILHO:
                pontos += 18

            if getattr(fonte, "escopo_cultura", "") == FonteConhecimento.EscopoCultura.GERAL:
                pontos += 8

            if getattr(fonte, "status_indexacao", "") == FonteConhecimento.StatusIndexacao.INDEXADO:
                pontos += 12

            if getattr(fonte, "ativa", False):
                pontos += 8

            if getattr(fonte, "disponivel_para_ia", False):
                pontos += 15

            if getattr(fonte, "disponivel_para_relatorio", False):
                pontos += 15

            if getattr(fonte, "is_aprovada", False):
                pontos += 15

            if getattr(fonte, "status_curadoria", "") == getattr(
                getattr(FonteConhecimento, "StatusCuradoria", object),
                "APROVADO",
                "aprovado",
            ):
                pontos += 15

            confiabilidade = getattr(fonte, "confiabilidade", None)
            if confiabilidade is not None:
                try:
                    pontos += int(confiabilidade) * 3
                except Exception:
                    pass

            for termo in termos_busca:
                if termo in texto:
                    pontos += 4

            return pontos

        fontes_pontuadas = [
            (fonte, pontuar_fonte(fonte))
            for fonte in fontes_candidatas
        ]

        fontes_relevantes = [
            fonte
            for fonte, pontos in sorted(
                fontes_pontuadas,
                key=lambda item: (
                    item[1],
                    getattr(item[0], "updated_at", None) or getattr(item[0], "created_at", None),
                ),
                reverse=True,
            )
            if pontos > 0
        ]

        if fontes_relevantes:
            return fontes_relevantes[:10]

        fallback_queryset = base_queryset

        if "confiabilidade" in campos_fonte:
            fallback_queryset = fallback_queryset.order_by(
                "-confiabilidade",
                "-updated_at",
                "-created_at",
            )
        else:
            fallback_queryset = fallback_queryset.order_by(
                "-updated_at",
                "-created_at",
            )

        return list(fallback_queryset[:10])

    def _buscar_clima_monitoramento(self, relatorio: Relatorio) -> dict:
        """
        Busca clima em tempo real com base nas coordenadas do monitoramento.
        Retorna estrutura padronizada para persistência no relatório.
        """
        monitoramento = relatorio.monitoramento
        if not monitoramento:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Relatório sem monitoramento vinculado.",
            }

        if monitoramento.latitude is None or monitoramento.longitude is None:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Monitoramento sem coordenadas para consulta climática.",
            }

        api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        if not api_key:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "API key de clima não configurada.",
            }

        service = ClimaService(api_key)
        return service.obter_clima(
            float(monitoramento.latitude),
            float(monitoramento.longitude),
        )

    def _serializar_imagem_monitoramento(self, monitoramento) -> dict:
        """
        Serializa a foto e o status de análise de imagem do monitoramento
        para persistência dentro do relatório.
        """
        foto = getattr(monitoramento, "foto_monitoramento", None)
        possui_foto = bool(foto)

        status_imagem_ia = getattr(monitoramento, "status_imagem_ia", None)
        get_status_display = getattr(
            monitoramento,
            "get_status_imagem_ia_display",
            None,
        )

        status_imagem_ia_display = (
            get_status_display() if callable(get_status_display) else None
        )

        imagem_processada_em = getattr(monitoramento, "imagem_processada_em", None)

        foto_url = None
        if possui_foto:
            try:
                foto_url = foto.url
                request = getattr(self, "request", None)
                if request:
                    foto_url = request.build_absolute_uri(foto_url)
            except Exception:
                foto_url = None

        return {
            "possui_foto": possui_foto,
            "foto_url": foto_url,
            "foto_nome_arquivo": foto.name.split("/")[-1] if possui_foto else None,
            "status_imagem_ia": status_imagem_ia,
            "status_imagem_ia_display": status_imagem_ia_display,
            "ia_estadio_fenologico_sugerido": getattr(
                monitoramento,
                "ia_estadio_fenologico_sugerido",
                None,
            ),
            "ia_confianca_imagem": (
                float(getattr(monitoramento, "ia_confianca_imagem"))
                if getattr(monitoramento, "ia_confianca_imagem", None) is not None
                else None
            ),
            "ia_resultado_imagem": getattr(monitoramento, "ia_resultado_imagem", None),
            "ia_observacoes_imagem": getattr(
                monitoramento,
                "ia_observacoes_imagem",
                "",
            ),
            "ia_erro_imagem": getattr(monitoramento, "ia_erro_imagem", ""),
            "imagem_processada_em": (
                imagem_processada_em.isoformat() if imagem_processada_em else None
            ),
        }

    def _serializar_risco_monitoramento(self, monitoramento) -> dict:
        """
        Serializa os dados de risco do monitoramento
        para persistência dentro do relatório.
        """
        get_faixa_risco_display = getattr(
            monitoramento,
            "get_faixa_risco_display",
            None,
        )
        get_prioridade_operacional_display = getattr(
            monitoramento,
            "get_prioridade_operacional_display",
            None,
        )

        return {
            "score_risco": (
                float(getattr(monitoramento, "score_risco"))
                if getattr(monitoramento, "score_risco", None) is not None
                else None
            ),
            "faixa_risco": getattr(monitoramento, "faixa_risco", ""),
            "faixa_risco_display": (
                get_faixa_risco_display() if callable(get_faixa_risco_display) else ""
            ),
            "prioridade_operacional": getattr(
                monitoramento,
                "prioridade_operacional",
                "",
            ),
            "prioridade_operacional_display": (
                get_prioridade_operacional_display()
                if callable(get_prioridade_operacional_display)
                else ""
            ),
            "justificativa_risco": getattr(monitoramento, "justificativa_risco", ""),
        }

    def _montar_identificacao_fenologica(self, monitoramento) -> dict:
        """
        Consolida a leitura fenológica oficial do monitoramento
        com a sugestão de IA da imagem quando disponível.
        """
        estadio_informado = getattr(monitoramento, "estadio_fenologico", "") or ""
        estadio_informado_display = (
            monitoramento.get_estadio_fenologico_display()
            if hasattr(monitoramento, "get_estadio_fenologico_display")
            else estadio_informado
        )

        estadio_ia = getattr(monitoramento, "ia_estadio_fenologico_sugerido", "") or ""
        confianca_ia = getattr(monitoramento, "ia_confianca_imagem", None)

        confianca_ia_float = (
            float(confianca_ia) if confianca_ia is not None else None
        )

        houve_sugestao_ia = bool(estadio_ia)
        houve_convergencia = (
            bool(estadio_informado)
            and bool(estadio_ia)
            and estadio_informado.strip().upper() == estadio_ia.strip().upper()
        )

        divergencia_detectada = (
            bool(estadio_informado)
            and bool(estadio_ia)
            and estadio_informado.strip().upper() != estadio_ia.strip().upper()
        )

        status_identificacao = "sem_ia"
        mensagem = (
            "Identificação fenológica baseada apenas no registro informado pelo usuário."
        )

        if houve_sugestao_ia and houve_convergencia:
            status_identificacao = "confirmada_por_ia"
            mensagem = (
                "A identificação fenológica informada no monitoramento foi confirmada pela análise de imagem."
            )
        elif houve_sugestao_ia and divergencia_detectada:
            status_identificacao = "divergencia"
            mensagem = (
                "Há divergência entre o estádio informado e a sugestão da IA para a imagem. Recomenda-se revisão técnica."
            )
        elif houve_sugestao_ia:
            status_identificacao = "sugerida_por_ia"
            mensagem = (
                "A identificação fenológica conta com sugestão da IA a partir da imagem do monitoramento."
            )

        return {
            "escopo_agronomico": "milho",
            "estadio_informado": estadio_informado,
            "estadio_informado_display": estadio_informado_display,
            "estadio_sugerido_ia": estadio_ia or None,
            "confianca_ia": confianca_ia_float,
            "houve_sugestao_ia": houve_sugestao_ia,
            "houve_convergencia": houve_convergencia,
            "divergencia_detectada": divergencia_detectada,
            "status_identificacao": status_identificacao,
            "mensagem_status": mensagem,
            "estadio_considerado_relatorio": (
                estadio_informado_display or estadio_ia or "-"
            ),
        }

    def _montar_pontos_atencao(self, monitoramento, anomalias, clima_dados=None):
        pontos_atencao = []

        if monitoramento.exige_acao_imediata:
            pontos_atencao.append(
                "O monitoramento indica necessidade de ação imediata em campo."
            )
        elif monitoramento.possui_anomalias:
            pontos_atencao.append(
                "Há anomalias ativas registradas, exigindo acompanhamento técnico."
            )
        else:
            pontos_atencao.append("Não há anomalias ativas registradas no momento.")

        if (
            monitoramento.umidade_solo is not None
            and float(monitoramento.umidade_solo) < 30
        ):
            pontos_atencao.append(
                "A umidade do solo está em faixa baixa e merece observação."
            )

        if monitoramento.sanidade:
            pontos_atencao.append(
                f"Estado sanitário informado: {monitoramento.sanidade}."
            )

        ia_estadio = getattr(monitoramento, "ia_estadio_fenologico_sugerido", "")
        if ia_estadio:
            pontos_atencao.append(
                f"A IA de imagem sugeriu o estádio fenológico {ia_estadio}."
            )

        nomes_anomalias = [anomalia.nome for anomalia in anomalias if anomalia.nome]
        if nomes_anomalias:
            pontos_atencao.append(
                "Anomalias registradas: " + ", ".join(nomes_anomalias) + "."
            )

        if clima_dados:
            chuva_mm = clima_dados.get("chuva_mm")
            umidade_ar = clima_dados.get("umidade")
            temperatura = clima_dados.get("temperatura")

            if chuva_mm not in [None, ""] and float(chuva_mm or 0) > 0:
                pontos_atencao.append(
                    f"Houve registro de precipitação recente ({chuva_mm} mm), o que pode influenciar sanidade e solo."
                )

            if umidade_ar not in [None, ""] and float(umidade_ar or 0) >= 80:
                pontos_atencao.append(
                    f"A umidade relativa do ar está elevada ({umidade_ar}%), exigindo observação fitossanitária."
                )

            if temperatura not in [None, ""] and float(temperatura or 0) >= 34:
                pontos_atencao.append(
                    f"A temperatura atual está elevada ({temperatura}°C), podendo aumentar estresse nas plantas."
                )

        return pontos_atencao

    def _montar_resumo_tecnico_base(self, monitoramento, clima_dados=None) -> str:
        """
        Monta um resumo técnico base, seguro mesmo quando algum relacionamento
        estiver incompleto. A IA pode enriquecer esse conteúdo, mas o fallback
        por regras precisa continuar funcionando sem quebrar o relatório.
        """
        talhao = getattr(monitoramento, "talhao", None)
        talhao_nome = talhao.nome if talhao else "não informado"
        data_observacao = getattr(monitoramento, "data_observacao", "não informada")

        get_estadio_display = getattr(
            monitoramento,
            "get_estadio_fenologico_display",
            None,
        )
        estadio_display = (
            get_estadio_display()
            if callable(get_estadio_display)
            else getattr(monitoramento, "estadio_fenologico", "não informado")
        )

        get_nivel_display = getattr(
            monitoramento,
            "get_nivel_atencao_display",
            None,
        )
        nivel_display = (
            get_nivel_display()
            if callable(get_nivel_display)
            else getattr(monitoramento, "nivel_atencao", "não informado")
        )

        resumo_tecnico = (
            f"O monitoramento da lavoura de milho no talhão {talhao_nome} "
            f"foi realizado em {data_observacao}, no estádio "
            f"{estadio_display}, com nível de atenção "
            f"{str(nivel_display).lower()}."
        )

        if getattr(monitoramento, "possui_anomalias", False):
            resumo_tecnico += (
                " Há registros de anomalias ativas e recomenda-se acompanhamento técnico "
                "com base nas referências disponíveis para milho."
            )
        else:
            resumo_tecnico += (
                " Não há anomalias ativas, mantendo-se recomendação de monitoramento contínuo."
            )

        score_risco = getattr(monitoramento, "score_risco", None)
        faixa_risco_display_fn = getattr(
            monitoramento,
            "get_faixa_risco_display",
            None,
        )
        prioridade_display_fn = getattr(
            monitoramento,
            "get_prioridade_operacional_display",
            None,
        )

        if score_risco is not None:
            resumo_tecnico += f" O score de risco atual é {float(score_risco):.2f}/100"
            if callable(faixa_risco_display_fn):
                resumo_tecnico += (
                    f", classificado como {faixa_risco_display_fn().lower()}"
                )
            if callable(prioridade_display_fn):
                resumo_tecnico += (
                    f", com prioridade operacional {prioridade_display_fn().lower()}"
                )
            resumo_tecnico += "."

        ia_estadio = getattr(monitoramento, "ia_estadio_fenologico_sugerido", "")
        ia_confianca = getattr(monitoramento, "ia_confianca_imagem", None)
        if ia_estadio:
            resumo_tecnico += (
                f" A análise de imagem sugeriu o estádio {ia_estadio}"
            )
            if ia_confianca is not None:
                resumo_tecnico += f" com confiança de {float(ia_confianca):.2f}%"
            resumo_tecnico += "."

        if clima_dados:
            descricao = clima_dados.get("descricao")
            temperatura = clima_dados.get("temperatura")
            umidade = clima_dados.get("umidade")
            vento = clima_dados.get("vento_velocidade")
            chuva = clima_dados.get("chuva_mm")

            resumo_tecnico += " Condições climáticas no momento da consulta:"
            if descricao:
                resumo_tecnico += f" {descricao}"
            if temperatura is not None:
                resumo_tecnico += f", temperatura de {temperatura}°C"
            if umidade is not None:
                resumo_tecnico += f" e umidade relativa do ar de {umidade}%"
            if vento not in [None, ""]:
                resumo_tecnico += f", vento de {vento} m/s"
            if chuva not in [None, ""]:
                resumo_tecnico += f", chuva registrada de {chuva} mm"
            resumo_tecnico += "."

        return resumo_tecnico

    def _serializar_fontes_para_ia(self, fontes):
        """
        Serializa fontes técnicas para envio ao serviço de IA.

        Mantém compatibilidade com a base antiga e inclui os campos consolidados
        da Fase 1 quando existirem no model.
        """
        referencias = []

        for fonte in fontes:
            referencias.append(
                {
                    "id": fonte.id,
                    "titulo": fonte.titulo,
                    "descricao": getattr(fonte, "descricao", ""),
                    "tipo": fonte.tipo,
                    "tipo_display": (
                        fonte.get_tipo_display()
                        if hasattr(fonte, "get_tipo_display")
                        else fonte.tipo
                    ),
                    "categoria": fonte.categoria,
                    "categoria_display": (
                        fonte.get_categoria_display()
                        if hasattr(fonte, "get_categoria_display")
                        else fonte.categoria
                    ),
                    "instituicao": fonte.instituicao,
                    "autor": getattr(fonte, "autor", ""),
                    "ano_publicacao": getattr(fonte, "ano_publicacao", None),
                    "url": getattr(fonte, "url", ""),
                    "palavras_chave": getattr(fonte, "palavras_chave", ""),
                    "status_indexacao": fonte.status_indexacao,
                    "status_indexacao_display": (
                        fonte.get_status_indexacao_display()
                        if hasattr(fonte, "get_status_indexacao_display")
                        else fonte.status_indexacao
                    ),
                    "status_curadoria": getattr(fonte, "status_curadoria", ""),
                    "status_curadoria_display": (
                        fonte.get_status_curadoria_display()
                        if hasattr(fonte, "get_status_curadoria_display")
                        else getattr(fonte, "status_curadoria", "")
                    ),
                    "conteudo_extraido": fonte.conteudo_extraido or "",
                    "aplicacao_pratica": getattr(fonte, "aplicacao_pratica", ""),
                    "confiabilidade": getattr(fonte, "confiabilidade", 3),
                    "ativa": getattr(fonte, "ativa", True),
                    "escopo_cultura": getattr(fonte, "escopo_cultura", ""),
                    "escopo_cultura_display": (
                        fonte.get_escopo_cultura_display()
                        if hasattr(fonte, "get_escopo_cultura_display")
                        else getattr(fonte, "escopo_cultura", "")
                    ),
                    "escopo_agronomico": getattr(
                        fonte,
                        "escopo_agronomico",
                        getattr(fonte, "escopo_cultura", ""),
                    ),
                    "is_milho": getattr(fonte, "is_milho", False),
                    "is_geral_apoio": getattr(fonte, "is_geral_apoio", False),
                    "is_indexada": getattr(fonte, "is_indexada", False),
                    "is_aprovada": getattr(fonte, "is_aprovada", False),
                    "disponivel_para_ia": getattr(
                        fonte,
                        "disponivel_para_ia",
                        False,
                    ),
                    "disponivel_para_relatorio": getattr(
                        fonte,
                        "disponivel_para_relatorio",
                        False,
                    ),
                    "indexado_em": (
                        fonte.indexado_em.isoformat()
                        if getattr(fonte, "indexado_em", None)
                        else None
                    ),
                    "revisado_em": (
                        fonte.revisado_em.isoformat()
                        if getattr(fonte, "revisado_em", None)
                        else None
                    ),
                }
            )

        return referencias

    def _montar_resposta_frontend_apoio(
        self,
        apoio_base: dict,
        resultado_ia: dict | None = None,
        erro_ia: str | None = None,
        referencias_tecnicas_ia: list[dict] | None = None,
    ) -> dict:
        ia_estruturada = {}
        if resultado_ia:
            ia_estruturada = resultado_ia.get("resposta_estruturada") or {}

        resumo_principal = (
            ia_estruturada.get("resumo_tecnico")
            or apoio_base.get("resumo_tecnico")
            or ""
        )

        pontos_principais = (
            ia_estruturada.get("pontos_atencao")
            or apoio_base.get("pontos_atencao")
            or []
        )

        fontes_utilizadas = self._limpar_fontes_utilizadas_ia(
            fontes_utilizadas=ia_estruturada.get("fontes_utilizadas", []) or [],
            referencias_tecnicas_ia=referencias_tecnicas_ia or [],
        )

        return {
            "resumo_tecnico": apoio_base.get("resumo_tecnico"),
            "pontos_atencao": apoio_base.get("pontos_atencao", []),
            "gerado_em": apoio_base.get("gerado_em"),
            "modo_geracao": apoio_base.get("modo_geracao"),
            "modelo_ia": apoio_base.get("modelo_ia"),
            "erro_ia": erro_ia,
            "resposta_ia": apoio_base.get("resposta_ia"),
            "escopo_agronomico": "milho",
            "ui": {
                "status_ia": "sucesso" if resultado_ia else "fallback",
                "usar_resposta_ia": bool(resultado_ia),
                "resumo_principal": resumo_principal,
                "pontos_principais": pontos_principais,
                "interpretacao_agronomica": ia_estruturada.get(
                    "interpretacao_agronomica",
                    "",
                ),
                "recomendacoes_iniciais": ia_estruturada.get(
                    "recomendacoes_iniciais",
                    [],
                ),
                "limitacoes": ia_estruturada.get("limitacoes", ""),
                "fontes_utilizadas": fontes_utilizadas,
                "texto_completo_ia": ia_estruturada.get("texto_completo", ""),
                "mensagem_status": (
                    "Resposta enriquecida por IA local no escopo de milho."
                    if resultado_ia
                    else "Resposta gerada com fallback seguro por regras no escopo de milho."
                ),
            },
        }

    def _preencher_campos_ia_relatorio(
        self,
        relatorio: Relatorio,
        apoio_diagnostico: dict,
    ) -> None:
        ui = apoio_diagnostico.get("ui", {}) or {}
        status_ia = ui.get("status_ia", "fallback")
        erro_ia = apoio_diagnostico.get("erro_ia") or ""
        gerado_em = apoio_diagnostico.get("gerado_em")

        if status_ia == "sucesso":
            relatorio.ia_status = Relatorio.StatusIA.SUCESSO
        elif erro_ia:
            relatorio.ia_status = Relatorio.StatusIA.ERRO
        else:
            relatorio.ia_status = Relatorio.StatusIA.FALLBACK

        relatorio.ia_modelo = apoio_diagnostico.get("modelo_ia") or ""
        relatorio.ia_modo_geracao = apoio_diagnostico.get("modo_geracao") or ""
        relatorio.ia_resumo_tecnico = (
            ui.get("resumo_principal")
            or apoio_diagnostico.get("resumo_tecnico")
            or ""
        )
        relatorio.ia_interpretacao_agronomica = (
            ui.get("interpretacao_agronomica", "") or ""
        )
        relatorio.ia_recomendacoes = ui.get("recomendacoes_iniciais", []) or []
        relatorio.ia_pontos_atencao = (
            ui.get("pontos_principais")
            or apoio_diagnostico.get("pontos_atencao", [])
            or []
        )
        relatorio.ia_limitacoes = ui.get("limitacoes", "") or ""
        relatorio.ia_fontes_utilizadas = ui.get("fontes_utilizadas", []) or []
        relatorio.ia_resposta_completa = (
            ui.get("texto_completo_ia")
            or apoio_diagnostico.get("resposta_ia")
            or ""
        )
        relatorio.ia_erro = erro_ia

        if gerado_em:
            try:
                relatorio.ia_gerado_em = timezone.datetime.fromisoformat(
                    gerado_em.replace("Z", "+00:00")
                )
            except Exception:
                relatorio.ia_gerado_em = timezone.now()
        else:
            relatorio.ia_gerado_em = timezone.now()

    def _preencher_campos_risco_relatorio(
        self,
        relatorio: Relatorio,
        monitoramento,
        risco_monitoramento: dict,
    ) -> None:
        """
        Persiste os campos estruturados de risco no model Relatorio
        apenas se esses campos existirem fisicamente no model.
        """
        campos_para_atualizar = []

        if hasattr(relatorio, "score_risco"):
            relatorio.score_risco = risco_monitoramento.get("score_risco")
            campos_para_atualizar.append("score_risco")

        if hasattr(relatorio, "faixa_risco"):
            relatorio.faixa_risco = risco_monitoramento.get("faixa_risco") or ""
            campos_para_atualizar.append("faixa_risco")

        if hasattr(relatorio, "prioridade_operacional"):
            relatorio.prioridade_operacional = (
                risco_monitoramento.get("prioridade_operacional") or ""
            )
            campos_para_atualizar.append("prioridade_operacional")

        if hasattr(relatorio, "justificativa_risco"):
            relatorio.justificativa_risco = (
                risco_monitoramento.get("justificativa_risco") or ""
            )
            campos_para_atualizar.append("justificativa_risco")

        if hasattr(relatorio, "risco_gerado_em") and monitoramento:
            relatorio.risco_gerado_em = timezone.now()
            campos_para_atualizar.append("risco_gerado_em")

        if campos_para_atualizar:
            if hasattr(relatorio, "updated_at"):
                campos_para_atualizar.append("updated_at")
            relatorio.save(update_fields=campos_para_atualizar)

    def _gerar_apoio_diagnostico_hibrido(
        self,
        relatorio: Relatorio,
        clima: dict | None = None,
    ) -> dict:
        monitoramento = relatorio.monitoramento
        if not monitoramento:
            return {
                "resumo_tecnico": "",
                "pontos_atencao": [],
                "gerado_em": timezone.now().isoformat(),
                "modo_geracao": "regras",
                "modelo_ia": None,
                "erro_ia": "Relatório sem monitoramento vinculado.",
                "resposta_ia": None,
                "escopo_agronomico": "milho",
                "ui": {
                    "status_ia": "fallback",
                    "usar_resposta_ia": False,
                    "resumo_principal": "",
                    "pontos_principais": [],
                    "interpretacao_agronomica": "",
                    "recomendacoes_iniciais": [],
                    "limitacoes": "",
                    "fontes_utilizadas": [],
                    "texto_completo_ia": "",
                    "mensagem_status": "Relatório sem monitoramento vinculado.",
                },
            }

        anomalias = monitoramento.anomalias.filter(ativa=True)
        fontes = self._buscar_referencias_tecnicas(relatorio)

        clima_resposta = clima or self._buscar_clima_monitoramento(relatorio)
        clima_dados = (
            clima_resposta.get("dados")
            if isinstance(clima_resposta, dict) and clima_resposta.get("sucesso")
            else None
        )

        pontos_atencao = self._montar_pontos_atencao(
            monitoramento,
            anomalias,
            clima_dados=clima_dados,
        )
        resumo_tecnico_base = self._montar_resumo_tecnico_base(
            monitoramento,
            clima_dados=clima_dados,
        )

        talhao = getattr(monitoramento, "talhao", None)
        propriedade = (
            talhao.propriedade
            if talhao and getattr(talhao, "propriedade", None)
            else None
        )

        monitoramento_payload = {
            "id": monitoramento.id,
            "talhao_id": talhao.id if talhao else None,
            "talhao_nome": talhao.nome if talhao else "",
            "propriedade_id": propriedade.id if propriedade else None,
            "propriedade_nome": propriedade.nome if propriedade else "",
            "propriedade_municipio": propriedade.municipio if propriedade else "",
            "propriedade_uf": propriedade.uf if propriedade else "",
            "data_observacao": str(monitoramento.data_observacao),
            "estadio_fenologico": monitoramento.estadio_fenologico,
            "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
            "cultura": self._obter_cultura_contexto(monitoramento),
            "escopo_agronomico": "milho",
            "altura_planta_cm": (
                float(monitoramento.altura_planta_cm)
                if monitoramento.altura_planta_cm is not None
                else None
            ),
            "populacao_plantas": monitoramento.populacao_plantas,
            "sanidade": monitoramento.sanidade,
            "umidade_solo": (
                float(monitoramento.umidade_solo)
                if monitoramento.umidade_solo is not None
                else None
            ),
            "nivel_atencao": monitoramento.nivel_atencao,
            "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
            "status_diagnostico": monitoramento.status_diagnostico,
            "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
            "resumo_diagnostico": monitoramento.resumo_diagnostico,
            "observacoes": monitoramento.observacoes,
            "clima": clima_dados,
            "score_risco": (
                float(monitoramento.score_risco)
                if getattr(monitoramento, "score_risco", None) is not None
                else None
            ),
            "faixa_risco": getattr(monitoramento, "faixa_risco", ""),
            "faixa_risco_display": (
                monitoramento.get_faixa_risco_display()
                if hasattr(monitoramento, "get_faixa_risco_display")
                else ""
            ),
            "prioridade_operacional": getattr(
                monitoramento,
                "prioridade_operacional",
                "",
            ),
            "prioridade_operacional_display": (
                monitoramento.get_prioridade_operacional_display()
                if hasattr(monitoramento, "get_prioridade_operacional_display")
                else ""
            ),
            "justificativa_risco": getattr(monitoramento, "justificativa_risco", ""),
            "latitude": (
                float(monitoramento.latitude)
                if monitoramento.latitude is not None
                else None
            ),
            "longitude": (
                float(monitoramento.longitude)
                if monitoramento.longitude is not None
                else None
            ),
            "ia_estadio_fenologico_sugerido": getattr(
                monitoramento,
                "ia_estadio_fenologico_sugerido",
                None,
            ),
            "ia_confianca_imagem": (
                float(getattr(monitoramento, "ia_confianca_imagem"))
                if getattr(monitoramento, "ia_confianca_imagem", None) is not None
                else None
            ),
        }

        anomalias_payload = [
            {
                "id": anomalia.id,
                "tipo": anomalia.tipo,
                "tipo_display": anomalia.get_tipo_display(),
                "nome": anomalia.nome,
                "severidade": anomalia.severidade,
                "severidade_display": anomalia.get_severidade_display(),
                "percentual_plantas_afetadas": (
                    float(anomalia.percentual_plantas_afetadas)
                    if anomalia.percentual_plantas_afetadas is not None
                    else None
                ),
                "exige_atencao": anomalia.exige_atencao,
                "observacao": anomalia.observacao,
            }
            for anomalia in anomalias
        ]

        referencias_payload = self._serializar_fontes_para_ia(fontes)

        apoio_base = {
            "resumo_tecnico": resumo_tecnico_base,
            "pontos_atencao": pontos_atencao,
            "gerado_em": timezone.now().isoformat(),
            "modo_geracao": "regras + clima" if clima_dados else "regras",
            "modelo_ia": None,
            "resposta_ia": None,
            "clima": clima_resposta,
            "escopo_agronomico": "milho",
        }

        resultado_ia = None
        erro_ia = None

        try:
            ia_service = OllamaIAService(model="gemma3n:e2b")
            resultado_ia = ia_service.gerar_apoio_diagnostico(
                monitoramento=monitoramento_payload,
                anomalias=anomalias_payload,
                referencias_tecnicas=referencias_payload,
            )

            apoio_base["modo_geracao"] = (
                "ia_local + regras + clima" if clima_dados else "ia_local + regras"
            )
            apoio_base["modelo_ia"] = resultado_ia.get("model")
            apoio_base["resposta_ia"] = resultado_ia.get("resposta")

        except Exception as exc:
            erro_ia = str(exc)

        return self._montar_resposta_frontend_apoio(
            apoio_base=apoio_base,
            resultado_ia=resultado_ia,
            erro_ia=erro_ia,
            referencias_tecnicas_ia=referencias_payload,
        )
        
    def _normalizar_texto_fonte(self, texto: str) -> str:
        """
        Normaliza texto para comparação simples de títulos de fontes.
        """
        texto = str(texto or "").strip().lower()
        texto = re.sub(r"\s+", " ", texto)
        texto = re.sub(r"[^\w\sáéíóúãõâêîôûàç-]", "", texto)
        return texto.strip()

    def _limpar_fontes_utilizadas_ia(
        self,
        fontes_utilizadas: list,
        referencias_tecnicas_ia: list[dict],
    ) -> list[str]:
        """
        Mantém em fontes_utilizadas somente títulos reais da base técnica.

        Exemplo:
        IA retorna: "Teste BAse Técnica Milha - Embrapa"
        Sistema salva: "Teste BAse Técnica Milha"

        Isso evita salvar instituição como se fosse fonte separada.
        """
        if not fontes_utilizadas:
            return []

        titulos_reais = []
        for fonte in referencias_tecnicas_ia or []:
            titulo = str(fonte.get("titulo", "") or "").strip()
            if titulo:
                titulos_reais.append(titulo)

        if not titulos_reais:
            return [
                str(fonte).strip()
                for fonte in fontes_utilizadas
                if str(fonte or "").strip()
            ]

        fontes_limpas: list[str] = []

        for fonte_citada in fontes_utilizadas:
            fonte_citada_texto = str(fonte_citada or "").strip()
            fonte_citada_normalizada = self._normalizar_texto_fonte(fonte_citada_texto)

            if not fonte_citada_normalizada:
                continue

            if "nenhuma fonte" in fonte_citada_normalizada:
                fontes_limpas.append(fonte_citada_texto)
                continue

            for titulo_real in titulos_reais:
                titulo_normalizado = self._normalizar_texto_fonte(titulo_real)

                if (
                    titulo_normalizado == fonte_citada_normalizada
                    or titulo_normalizado in fonte_citada_normalizada
                    or fonte_citada_normalizada in titulo_normalizado
                ):
                    fontes_limpas.append(titulo_real)
                    break

        fontes_unicas = []
        for fonte in fontes_limpas:
            if fonte not in fontes_unicas:
                fontes_unicas.append(fonte)

        return fontes_unicas

    def _gerar_nome_pdf(self, relatorio: Relatorio) -> str:
        return f"relatorio_{relatorio.id}.pdf"

    def _gerar_caminho_pdf(self, relatorio: Relatorio) -> Path:
        media_root = Path(getattr(settings, "MEDIA_ROOT", "media"))
        pasta = media_root / "relatorios"
        pasta.mkdir(parents=True, exist_ok=True)
        return pasta / self._gerar_nome_pdf(relatorio)

    def _atualizar_pdf_url(self, relatorio: Relatorio, nome_arquivo: str) -> None:
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        if not media_url.endswith("/"):
            media_url += "/"
        relatorio.pdf_url = f"{media_url}relatorios/{nome_arquivo}"

    def _url_absoluta(self, request, url: str | None) -> str | None:
        """
        Converte URL relativa em URL absoluta quando houver request disponível.
        Útil para frontend, download direto e testes no Swagger.
        """
        if not url:
            return None

        url = str(url)

        if url.startswith("http://") or url.startswith("https://"):
            return url

        if request:
            return request.build_absolute_uri(url)

        return url

    def _pdf_download_url(self, request, relatorio: Relatorio) -> str | None:
        if not relatorio or not relatorio.id:
            return None

        return self._url_absoluta(
            request,
            f"/api/relatorios/{relatorio.id}/baixar-pdf/",
        )

    def _cor_nivel_atencao(self, nivel: str):
        from reportlab.lib import colors

        mapa = {
            "baixo": colors.HexColor("#2E7D32"),
            "medio": colors.HexColor("#F9A825"),
            "alto": colors.HexColor("#EF6C00"),
            "crítico": colors.HexColor("#C62828"),
            "critico": colors.HexColor("#C62828"),
        }
        return mapa.get((nivel or "").strip().lower(), colors.HexColor("#546E7A"))

    def _cor_faixa_risco(self, faixa: str):
        from reportlab.lib import colors

        mapa = {
            "baixo": colors.HexColor("#2E7D32"),
            "moderado": colors.HexColor("#F9A825"),
            "alto": colors.HexColor("#EF6C00"),
            "crítico": colors.HexColor("#C62828"),
            "critico": colors.HexColor("#C62828"),
        }
        return mapa.get((faixa or "").strip().lower(), colors.HexColor("#546E7A"))

    def _rodape_pdf(self, canvas, doc):
        from reportlab.lib import colors

        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#D7E3DB"))
        canvas.setLineWidth(0.6)
        canvas.line(doc.leftMargin, 24, doc.pagesize[0] - doc.rightMargin, 24)

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#5F6B66"))
        canvas.drawString(doc.leftMargin, 12, "EspIAgro • Relatório Técnico")
        canvas.drawRightString(
            doc.pagesize[0] - doc.rightMargin,
            12,
            f"Página {canvas.getPageNumber()}",
        )
        canvas.restoreState()

    def _montar_story_pdf(self, relatorio: Relatorio):
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            HRFlowable,
            KeepTogether,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
        )

        conteudo = relatorio.conteudo_json or {}
        monitoramento = conteudo.get("monitoramento", {}) or {}
        imagem_monitoramento = conteudo.get("imagem_monitoramento", {}) or {}
        risco_monitoramento = conteudo.get("risco_monitoramento", {}) or {}
        identificacao_fenologica = conteudo.get("identificacao_fenologica", {}) or {}
        talhao = conteudo.get("talhao", {}) or {}
        propriedade = conteudo.get("propriedade", {}) or {}
        anomalias = conteudo.get("anomalias", []) or []
        referencias = conteudo.get("referencias_tecnicas", []) or []
        apoio = conteudo.get("apoio_diagnostico", {}) or {}
        ui = apoio.get("ui", {}) or {}
        clima = conteudo.get("clima", {}) or {}
        clima_dados = clima.get("dados", {}) if isinstance(clima, dict) else {}

        styles = getSampleStyleSheet()

        titulo_style = ParagraphStyle(
            "TituloEspIAgro",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=24,
            textColor=colors.white,
            alignment=TA_LEFT,
            spaceAfter=0,
        )

        subtitulo_style = ParagraphStyle(
            "SubtituloEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.white,
            alignment=TA_LEFT,
        )

        secao_style = ParagraphStyle(
            "SecaoEspIAgro",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=14,
            textColor=colors.HexColor("#1B4332"),
            spaceBefore=4,
            spaceAfter=8,
        )

        label_style = ParagraphStyle(
            "LabelEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#2D3A35"),
        )

        valor_style = ParagraphStyle(
            "ValorEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#33413C"),
        )

        texto_style = ParagraphStyle(
            "TextoEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13,
            textColor=colors.HexColor("#26332E"),
        )

        texto_claro_style = ParagraphStyle(
            "TextoClaroEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor("#5F6B66"),
        )

        badge_style = ParagraphStyle(
            "BadgeEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=11,
            alignment=TA_CENTER,
            textColor=colors.white,
        )

        lista_style = ParagraphStyle(
            "ListaEspIAgro",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13,
            leftIndent=12,
            bulletIndent=0,
            textColor=colors.HexColor("#26332E"),
        )

        def p(texto, style):
            texto = str(texto if texto not in [None, ""] else "-")
            texto = (
                texto.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\n", "<br/>")
            )
            return Paragraph(texto, style)

        def card_tabela(titulo, linhas):
            data = [[p(titulo, secao_style)]]
            for label, valor in linhas:
                data.append(
                    [
                        Table(
                            [[p(f"{label}", label_style), p(valor, valor_style)]],
                            colWidths=[42 * mm, 118 * mm],
                            style=TableStyle(
                                [
                                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                                    ("TOPPADDING", (0, 0), (-1, -1), 1),
                                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                                ]
                            ),
                        )
                    ]
                )

            table = Table(
                data,
                colWidths=[170 * mm],
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF5F0")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#D7E3DB")),
                        ("INNERGRID", (0, 1), (-1, -1), 0.4, colors.HexColor("#E4ECE7")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ]
                ),
            )
            return table

        def lista_blocos(titulo, itens):
            blocos = [p(titulo, secao_style)]
            if itens:
                for item in itens:
                    blocos.append(p(f"• {item}", lista_style))
                    blocos.append(Spacer(1, 2))
            else:
                blocos.append(p("-", texto_style))
            return KeepTogether(blocos)

        story = []

        header = Table(
            [
                [
                    p("EspIAgro", titulo_style),
                    p(
                        "Monitoramento inteligente de lavouras<br/>Relatório técnico automatizado",
                        subtitulo_style,
                    ),
                ]
            ],
            colWidths=[78 * mm, 92 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1B4332")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 14),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                    ("TOPPADDING", (0, 0), (-1, -1), 14),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            ),
        )
        story.append(header)
        story.append(Spacer(1, 10))

        nivel_atencao = monitoramento.get("nivel_atencao_display", "-")
        badge_cor = self._cor_nivel_atencao(nivel_atencao)
        badge = Table(
            [[p(nivel_atencao, badge_style)]],
            colWidths=[30 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), badge_cor),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            ),
        )

        faixa_risco_display = risco_monitoramento.get("faixa_risco_display", "-")
        badge_risco_cor = self._cor_faixa_risco(
            risco_monitoramento.get("faixa_risco") or faixa_risco_display
        )
        badge_risco = Table(
            [[p(faixa_risco_display, badge_style)]],
            colWidths=[38 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), badge_risco_cor),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            ),
        )

        resumo_header = Table(
            [
                [p(relatorio.titulo, secao_style), badge, badge_risco],
                [
                    p(
                        f"Tipo: {relatorio.get_tipo_display()}<br/>"
                        f"Status: {relatorio.get_status_display()}<br/>"
                        f"Gerado em: {relatorio.gerado_em.strftime('%d/%m/%Y %H:%M') if relatorio.gerado_em else '-'}",
                        texto_claro_style,
                    ),
                    "",
                    "",
                ],
                [p(relatorio.resumo or "-", texto_style), "", ""],
            ],
            colWidths=[102 * mm, 30 * mm, 38 * mm],
            style=TableStyle(
                [
                    ("SPAN", (0, 1), (2, 1)),
                    ("SPAN", (0, 2), (2, 2)),
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FBF9")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#D7E3DB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 8),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            ),
        )
        story.append(resumo_header)
        story.append(Spacer(1, 12))

        story.append(
            card_tabela(
                "Monitoramento",
                [
                    ("Data da observação", monitoramento.get("data_observacao", "-")),
                    ("Estádio fenológico", monitoramento.get("estadio_fenologico_display", "-")),
                    ("Cultura", monitoramento.get("cultura", "-")),
                    ("Altura da planta (cm)", monitoramento.get("altura_planta_cm", "-")),
                    ("População de plantas", monitoramento.get("populacao_plantas", "-")),
                    ("Sanidade", monitoramento.get("sanidade", "-")),
                    ("Nível de atenção", monitoramento.get("nivel_atencao_display", "-")),
                    ("Status diagnóstico", monitoramento.get("status_diagnostico_display", "-")),
                    ("Resumo diagnóstico", monitoramento.get("resumo_diagnostico", "-")),
                ],
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            card_tabela(
                "Identificação Fenológica",
                [
                    (
                        "Estádio informado",
                        identificacao_fenologica.get("estadio_informado_display", "-"),
                    ),
                    (
                        "Estádio sugerido pela IA",
                        identificacao_fenologica.get("estadio_sugerido_ia", "-"),
                    ),
                    (
                        "Confiança da IA (%)",
                        identificacao_fenologica.get("confianca_ia", "-"),
                    ),
                    (
                        "Status da identificação",
                        identificacao_fenologica.get("status_identificacao", "-"),
                    ),
                    (
                        "Mensagem",
                        identificacao_fenologica.get("mensagem_status", "-"),
                    ),
                    (
                        "Estádio considerado no relatório",
                        identificacao_fenologica.get("estadio_considerado_relatorio", "-"),
                    ),
                ],
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            card_tabela(
                "Risco do Monitoramento",
                [
                    ("Score de risco", risco_monitoramento.get("score_risco", "-")),
                    ("Faixa de risco", risco_monitoramento.get("faixa_risco_display", "-")),
                    (
                        "Prioridade operacional",
                        risco_monitoramento.get("prioridade_operacional_display", "-"),
                    ),
                    (
                        "Justificativa do risco",
                        risco_monitoramento.get("justificativa_risco", "-"),
                    ),
                ],
            )
        )
        story.append(Spacer(1, 10))

        if imagem_monitoramento.get("possui_foto"):
            story.append(
                card_tabela(
                    "Imagem do Monitoramento",
                    [
                        ("Arquivo", imagem_monitoramento.get("foto_nome_arquivo", "-")),
                        ("URL da foto", imagem_monitoramento.get("foto_url", "-")),
                        ("Status IA da imagem", imagem_monitoramento.get("status_imagem_ia_display", "-")),
                        (
                            "Estádio sugerido por IA",
                            imagem_monitoramento.get("ia_estadio_fenologico_sugerido", "-"),
                        ),
                        (
                            "Confiança da IA",
                            imagem_monitoramento.get("ia_confianca_imagem", "-"),
                        ),
                        (
                            "Processada em",
                            imagem_monitoramento.get("imagem_processada_em", "-"),
                        ),
                        (
                            "Observações da IA",
                            imagem_monitoramento.get("ia_observacoes_imagem", "-"),
                        ),
                        (
                            "Erro da IA da imagem",
                            imagem_monitoramento.get("ia_erro_imagem", "-"),
                        ),
                    ],
                )
            )
            story.append(Spacer(1, 10))

        if clima_dados:
            story.append(
                card_tabela(
                    "Clima no Momento da Consulta",
                    [
                        ("Cidade", clima_dados.get("cidade", "-")),
                        ("País", clima_dados.get("pais", "-")),
                        ("Descrição", clima_dados.get("descricao", "-")),
                        ("Temperatura (°C)", clima_dados.get("temperatura", "-")),
                        ("Sensação térmica (°C)", clima_dados.get("sensacao_termica", "-")),
                        ("Temperatura mínima (°C)", clima_dados.get("temperatura_min", "-")),
                        ("Temperatura máxima (°C)", clima_dados.get("temperatura_max", "-")),
                        ("Umidade (%)", clima_dados.get("umidade", "-")),
                        ("Pressão", clima_dados.get("pressao", "-")),
                        ("Vento", clima_dados.get("vento_velocidade", "-")),
                        ("Chuva (mm)", clima_dados.get("chuva_mm", "-")),
                    ],
                )
            )
            story.append(Spacer(1, 10))

        story.append(
            card_tabela(
                "Talhão",
                [
                    ("Nome", talhao.get("nome", "-")),
                    ("Cultivar", talhao.get("cultivar", "-")),
                    ("Sistema de cultivo", talhao.get("sistema_cultivo", "-")),
                    ("Data de plantio", talhao.get("data_plantio", "-")),
                    ("Área (ha)", talhao.get("area_ha", "-")),
                ],
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            card_tabela(
                "Propriedade",
                [
                    ("Nome", propriedade.get("nome", "-")),
                    ("Município", propriedade.get("municipio", "-")),
                    ("UF", propriedade.get("uf", "-")),
                    ("Área total (ha)", propriedade.get("area_total_ha", "-")),
                ],
            )
        )
        story.append(Spacer(1, 12))

        apoio_card = Table(
            [
                [p("Apoio Diagnóstico", secao_style)],
                [p(f"Modo de geração: {apoio.get('modo_geracao', '-')}", texto_claro_style)],
                [p(f"Modelo IA: {apoio.get('modelo_ia', '-') or '-'}", texto_claro_style)],
                [p(ui.get("mensagem_status", "-"), texto_claro_style)],
                [p(ui.get("resumo_principal") or apoio.get("resumo_tecnico", "-"), texto_style)],
            ],
            colWidths=[170 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF4EC")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.white),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#D7E3DB")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
        story.append(apoio_card)
        story.append(Spacer(1, 12))

        story.append(
            lista_blocos(
                "Pontos de Atenção",
                ui.get("pontos_principais") or apoio.get("pontos_atencao") or [],
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            KeepTogether(
                [
                    p("Interpretação Agronômica", secao_style),
                    p(ui.get("interpretacao_agronomica", "") or "-", texto_style),
                ]
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            lista_blocos(
                "Recomendações Iniciais",
                ui.get("recomendacoes_iniciais", []) or [],
            )
        )
        story.append(Spacer(1, 10))

        story.append(
            KeepTogether(
                [
                    p("Limitações", secao_style),
                    p(ui.get("limitacoes", "") or "-", texto_style),
                ]
            )
        )
        story.append(Spacer(1, 12))

        story.append(p("Anomalias", secao_style))
        if anomalias:
            linhas_anomalias = [
                [
                    p("Nome", label_style),
                    p("Tipo", label_style),
                    p("Severidade", label_style),
                    p("Exige atenção", label_style),
                ]
            ]
            for anomalia in anomalias:
                linhas_anomalias.append(
                    [
                        p(anomalia.get("nome", "-"), valor_style),
                        p(anomalia.get("tipo_display", anomalia.get("tipo", "-")), valor_style),
                        p(anomalia.get("severidade_display", anomalia.get("severidade", "-")), valor_style),
                        p("Sim" if anomalia.get("exige_atencao") else "Não", valor_style),
                    ]
                )

            tabela_anomalias = Table(
                linhas_anomalias,
                colWidths=[58 * mm, 42 * mm, 35 * mm, 35 * mm],
                repeatRows=1,
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF5F0")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1B4332")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#D7E3DB")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E4ECE7")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ]
                ),
            )
            story.append(tabela_anomalias)
        else:
            story.append(p("Não há anomalias registradas.", texto_style))

        story.append(Spacer(1, 12))

        story.append(p("Referências Técnicas", secao_style))
        if referencias:
            linhas_ref = [
                [
                    p("Título", label_style),
                    p("Instituição", label_style),
                    p("Categoria", label_style),
                ]
            ]
            for fonte in referencias:
                linhas_ref.append(
                    [
                        p(fonte.get("titulo", "-"), valor_style),
                        p(fonte.get("instituicao", "-"), valor_style),
                        p(fonte.get("categoria", "-"), valor_style),
                    ]
                )

            tabela_ref = Table(
                linhas_ref,
                colWidths=[90 * mm, 45 * mm, 35 * mm],
                repeatRows=1,
                style=TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF5F0")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1B4332")),
                        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#D7E3DB")),
                        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E4ECE7")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ]
                ),
            )
            story.append(tabela_ref)
        else:
            story.append(p("Nenhuma referência técnica vinculada.", texto_style))

        story.append(Spacer(1, 8))
        story.append(
            HRFlowable(
                width="100%",
                thickness=0.6,
                color=colors.HexColor("#D7E3DB"),
            )
        )
        story.append(Spacer(1, 6))
        story.append(
            p(
                "Documento gerado automaticamente pelo backend do EspIAgro.",
                texto_claro_style,
            )
        )

        return story

    def _gerar_pdf_relatorio(self, relatorio: Relatorio) -> Path:
        """
        Gera o PDF físico do relatório em MEDIA/relatorios/.
        """
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.platypus import SimpleDocTemplate
        except ImportError as exc:
            raise RuntimeError(
                "A biblioteca reportlab não está instalada. "
                "Instale com: pip install reportlab"
            ) from exc

        caminho_pdf = self._gerar_caminho_pdf(relatorio)
        story = self._montar_story_pdf(relatorio)

        doc = SimpleDocTemplate(
            str(caminho_pdf),
            pagesize=A4,
            leftMargin=12,
            rightMargin=12,
            topMargin=16,
            bottomMargin=28,
            title=relatorio.titulo,
            author="EspIAgro",
        )
        doc.build(
            story,
            onFirstPage=self._rodape_pdf,
            onLaterPages=self._rodape_pdf,
        )

        self._atualizar_pdf_url(relatorio, caminho_pdf.name)
        relatorio.save(update_fields=["pdf_url", "updated_at"])

        return caminho_pdf

    def _gerar_conteudo_base(self, relatorio: Relatorio) -> None:
        monitoramento = relatorio.monitoramento

        if not monitoramento:
            relatorio.status = Relatorio.StatusRelatorio.PENDENTE
            relatorio.save(update_fields=["status", "updated_at"])
            return

        talhao = monitoramento.talhao
        propriedade = talhao.propriedade if talhao else None
        imagem_monitoramento = self._serializar_imagem_monitoramento(monitoramento)
        risco_monitoramento = self._serializar_risco_monitoramento(monitoramento)
        identificacao_fenologica = self._montar_identificacao_fenologica(
            monitoramento
        )

        relatorio.talhao = talhao
        relatorio.propriedade = propriedade
        relatorio.titulo = (
            f"Relatório de Monitoramento - {talhao.nome} - {monitoramento.data_observacao}"
            if talhao
            else f"Relatório de Monitoramento - {monitoramento.data_observacao}"
        )

        resumo = (
            f"Monitoramento da lavoura de milho no talhão {talhao.nome} realizado em "
            f"{monitoramento.data_observacao}, no estádio "
            f"{monitoramento.get_estadio_fenologico_display()}."
            if talhao
            else (
                f"Monitoramento da lavoura de milho realizado em "
                f"{monitoramento.data_observacao}, no estádio "
                f"{monitoramento.get_estadio_fenologico_display()}."
            )
        )

        if monitoramento.possui_anomalias:
            resumo += (
                f" Foram identificadas anomalias ativas, com nível de atenção "
                f"{monitoramento.get_nivel_atencao_display().lower()}."
            )
        else:
            resumo += " Não foram identificadas anomalias ativas no momento."

        if risco_monitoramento.get("score_risco") is not None:
            resumo += (
                f" Score de risco: {risco_monitoramento.get('score_risco')} / 100, "
                f"classificado como {str(risco_monitoramento.get('faixa_risco_display', '-')).lower()}."
            )

        if imagem_monitoramento.get("possui_foto"):
            resumo += " Há imagem vinculada ao monitoramento para rastreabilidade visual."

        if identificacao_fenologica.get("houve_sugestao_ia"):
            resumo += (
                f" A IA sugeriu o estádio {identificacao_fenologica.get('estadio_sugerido_ia', '-')}"
            )
            if identificacao_fenologica.get("confianca_ia") is not None:
                resumo += (
                    f" com confiança de {identificacao_fenologica.get('confianca_ia')}%."
                )
            else:
                resumo += "."

        relatorio.resumo = resumo

        anomalias = monitoramento.anomalias.filter(ativa=True)
        referencias = self._buscar_referencias_tecnicas(relatorio)
        clima = self._buscar_clima_monitoramento(relatorio)
        apoio_diagnostico = self._gerar_apoio_diagnostico_hibrido(
            relatorio=relatorio,
            clima=clima,
        )

        relatorio.conteudo_json = {
            "escopo_agronomico": "milho",
            "monitoramento": {
                "id": monitoramento.id,
                "data_observacao": str(monitoramento.data_observacao),
                "estadio_fenologico": monitoramento.estadio_fenologico,
                "estadio_fenologico_display": monitoramento.get_estadio_fenologico_display(),
                "cultura": self._obter_cultura_contexto(monitoramento),
                "altura_planta_cm": (
                    float(monitoramento.altura_planta_cm)
                    if monitoramento.altura_planta_cm is not None
                    else None
                ),
                "populacao_plantas": monitoramento.populacao_plantas,
                "sanidade": monitoramento.sanidade,
                "umidade_solo": (
                    float(monitoramento.umidade_solo)
                    if monitoramento.umidade_solo is not None
                    else None
                ),
                "observacoes": monitoramento.observacoes,
                "nivel_atencao": monitoramento.nivel_atencao,
                "nivel_atencao_display": monitoramento.get_nivel_atencao_display(),
                "status_diagnostico": monitoramento.status_diagnostico,
                "status_diagnostico_display": monitoramento.get_status_diagnostico_display(),
                "possui_anomalias": monitoramento.possui_anomalias,
                "exige_acao_imediata": monitoramento.exige_acao_imediata,
                "resumo_diagnostico": monitoramento.resumo_diagnostico,
                "score_risco": risco_monitoramento.get("score_risco"),
                "faixa_risco": risco_monitoramento.get("faixa_risco"),
                "faixa_risco_display": risco_monitoramento.get("faixa_risco_display"),
                "prioridade_operacional": risco_monitoramento.get(
                    "prioridade_operacional"
                ),
                "prioridade_operacional_display": risco_monitoramento.get(
                    "prioridade_operacional_display"
                ),
                "justificativa_risco": risco_monitoramento.get("justificativa_risco"),
                "latitude": (
                    float(monitoramento.latitude)
                    if monitoramento.latitude is not None
                    else None
                ),
                "longitude": (
                    float(monitoramento.longitude)
                    if monitoramento.longitude is not None
                    else None
                ),
            },
            "imagem_monitoramento": imagem_monitoramento,
            "identificacao_fenologica": identificacao_fenologica,
            "risco_monitoramento": risco_monitoramento,
            "clima": clima,
            "talhao": {
                "id": talhao.id if talhao else None,
                "nome": talhao.nome if talhao else None,
                "cultivar": talhao.cultivar if talhao else None,
                "sistema_cultivo": talhao.sistema_cultivo if talhao else None,
                "data_plantio": (
                    str(talhao.data_plantio)
                    if talhao and talhao.data_plantio
                    else None
                ),
                "area_ha": (
                    float(talhao.area_ha)
                    if talhao and talhao.area_ha is not None
                    else None
                ),
            },
            "propriedade": {
                "id": propriedade.id if propriedade else None,
                "nome": propriedade.nome if propriedade else None,
                "municipio": propriedade.municipio if propriedade else None,
                "uf": propriedade.uf if propriedade else None,
                "area_total_ha": (
                    float(propriedade.area_total_ha)
                    if propriedade and propriedade.area_total_ha is not None
                    else None
                ),
            },
            "anomalias": [
                {
                    "id": anomalia.id,
                    "tipo": anomalia.tipo,
                    "tipo_display": anomalia.get_tipo_display(),
                    "nome": anomalia.nome,
                    "severidade": anomalia.severidade,
                    "severidade_display": anomalia.get_severidade_display(),
                    "percentual_plantas_afetadas": (
                        float(anomalia.percentual_plantas_afetadas)
                        if anomalia.percentual_plantas_afetadas is not None
                        else None
                    ),
                    "observacao": anomalia.observacao,
                    "exige_atencao": anomalia.exige_atencao,
                }
                for anomalia in anomalias
            ],
            "referencias_tecnicas": [
                {
                    "id": fonte.id,
                    "titulo": fonte.titulo,
                    "descricao": getattr(fonte, "descricao", ""),
                    "tipo": fonte.tipo,
                    "tipo_display": (
                        fonte.get_tipo_display()
                        if hasattr(fonte, "get_tipo_display")
                        else fonte.tipo
                    ),
                    "categoria": fonte.categoria,
                    "categoria_display": (
                        fonte.get_categoria_display()
                        if hasattr(fonte, "get_categoria_display")
                        else fonte.categoria
                    ),
                    "instituicao": fonte.instituicao,
                    "autor": getattr(fonte, "autor", ""),
                    "ano_publicacao": getattr(fonte, "ano_publicacao", None),
                    "url": getattr(fonte, "url", ""),
                    "palavras_chave": getattr(fonte, "palavras_chave", ""),
                    "aplicacao_pratica": getattr(fonte, "aplicacao_pratica", ""),
                    "confiabilidade": getattr(fonte, "confiabilidade", 3),
                    "status_indexacao": fonte.status_indexacao,
                    "status_indexacao_display": (
                        fonte.get_status_indexacao_display()
                        if hasattr(fonte, "get_status_indexacao_display")
                        else fonte.status_indexacao
                    ),
                    "status_curadoria": getattr(fonte, "status_curadoria", ""),
                    "status_curadoria_display": (
                        fonte.get_status_curadoria_display()
                        if hasattr(fonte, "get_status_curadoria_display")
                        else getattr(fonte, "status_curadoria", "")
                    ),
                    "escopo_cultura": getattr(fonte, "escopo_cultura", ""),
                    "escopo_cultura_display": (
                        fonte.get_escopo_cultura_display()
                        if hasattr(fonte, "get_escopo_cultura_display")
                        else getattr(fonte, "escopo_cultura", "")
                    ),
                    "escopo_agronomico": getattr(
                        fonte,
                        "escopo_agronomico",
                        getattr(fonte, "escopo_cultura", ""),
                    ),
                    "is_milho": getattr(fonte, "is_milho", False),
                    "is_geral_apoio": getattr(fonte, "is_geral_apoio", False),
                    "is_indexada": getattr(fonte, "is_indexada", False),
                    "is_aprovada": getattr(fonte, "is_aprovada", False),
                    "disponivel_para_ia": getattr(
                        fonte,
                        "disponivel_para_ia",
                        False,
                    ),
                    "disponivel_para_relatorio": getattr(
                        fonte,
                        "disponivel_para_relatorio",
                        False,
                    ),
                }
                for fonte in referencias
            ],
            "apoio_diagnostico": apoio_diagnostico,
        }

        self._preencher_campos_ia_relatorio(relatorio, apoio_diagnostico)

        relatorio.status = Relatorio.StatusRelatorio.CONCLUIDO
        relatorio.gerado_em = timezone.now()
        relatorio.observacoes = (
            "Relatório técnico base gerado automaticamente no escopo da cultura do milho."
        )
        relatorio.save()

        self._preencher_campos_risco_relatorio(
            relatorio=relatorio,
            monitoramento=monitoramento,
            risco_monitoramento=risco_monitoramento,
        )

        relatorio.referencias_tecnicas.set(referencias)

    def perform_create(self, serializer):
        relatorio = serializer.save(usuario=self.request.user)

        if (
            relatorio.tipo == Relatorio.TipoRelatorio.MONITORAMENTO
            and relatorio.monitoramento
        ):
            self._gerar_conteudo_base(relatorio)

    def perform_update(self, serializer):
        relatorio = serializer.save()

        if (
            relatorio.tipo == Relatorio.TipoRelatorio.MONITORAMENTO
            and relatorio.monitoramento
        ):
            self._gerar_conteudo_base(relatorio)

    @action(detail=True, methods=["post"], url_path="gerar-conteudo")
    def gerar_conteudo(self, request, pk=None):
        """
        Regenera o conteúdo técnico/IA do relatório sem gerar PDF.
        """
        relatorio = self.get_object()

        if (
            relatorio.tipo != Relatorio.TipoRelatorio.MONITORAMENTO
            or not relatorio.monitoramento
        ):
            return Response(
                {
                    "detail": "A geração de conteúdo automático exige um relatório de monitoramento com monitoramento vinculado."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        self._gerar_conteudo_base(relatorio)
        serializer = self.get_serializer(relatorio, context={"request": request})

        return Response(
            {
                "detail": "Conteúdo técnico do relatório gerado com sucesso.",
                "relatorio": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="gerar-pdf")
    def gerar_pdf(self, request, pk=None):
        """
        Gera o PDF do relatório e atualiza o pdf_url.
        """
        relatorio = self.get_object()

        if relatorio.tipo == Relatorio.TipoRelatorio.MONITORAMENTO and (
            not relatorio.conteudo_json or not relatorio.gerado_em
        ):
            self._gerar_conteudo_base(relatorio)

        try:
            relatorio.status = Relatorio.StatusRelatorio.PROCESSANDO
            relatorio.save(update_fields=["status", "updated_at"])

            caminho_pdf = self._gerar_pdf_relatorio(relatorio)

            relatorio.status = Relatorio.StatusRelatorio.CONCLUIDO
            relatorio.save(update_fields=["status", "updated_at"])
        except RuntimeError as exc:
            relatorio.status = Relatorio.StatusRelatorio.ERRO
            relatorio.observacoes = str(exc)
            relatorio.save(update_fields=["status", "observacoes", "updated_at"])

            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            relatorio.status = Relatorio.StatusRelatorio.ERRO
            relatorio.observacoes = f"Erro ao gerar PDF: {exc}"
            relatorio.save(update_fields=["status", "observacoes", "updated_at"])

            return Response(
                {"detail": f"Erro ao gerar PDF: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(relatorio, context={"request": request})
        return Response(
            {
                "detail": "PDF gerado com sucesso.",
                "pdf_url": relatorio.pdf_url,
                "pdf_url_absoluta": self._url_absoluta(request, relatorio.pdf_url),
                "pdf_download_url": self._pdf_download_url(request, relatorio),
                "arquivo": caminho_pdf.name,
                "relatorio": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="gerar-completo")
    def gerar_completo(self, request, pk=None):
        """
        Gera conteúdo técnico e PDF em uma única ação.

        Uso recomendado para a Fase 5:
        - frontend chama este endpoint quando o usuário quiser finalizar o relatório;
        - backend regenera conteúdo técnico/IA/regras/clima;
        - backend gera o PDF final;
        - resposta já retorna URLs úteis para abrir ou baixar.
        """
        relatorio = self.get_object()

        if (
            relatorio.tipo != Relatorio.TipoRelatorio.MONITORAMENTO
            or not relatorio.monitoramento
        ):
            return Response(
                {
                    "detail": (
                        "A geração completa exige um relatório de monitoramento "
                        "com monitoramento vinculado."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            relatorio.status = Relatorio.StatusRelatorio.PROCESSANDO
            relatorio.save(update_fields=["status", "updated_at"])

            self._gerar_conteudo_base(relatorio)
            caminho_pdf = self._gerar_pdf_relatorio(relatorio)

            relatorio.status = Relatorio.StatusRelatorio.CONCLUIDO
            relatorio.save(update_fields=["status", "updated_at"])
        except RuntimeError as exc:
            relatorio.status = Relatorio.StatusRelatorio.ERRO
            relatorio.observacoes = str(exc)
            relatorio.save(update_fields=["status", "observacoes", "updated_at"])

            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            relatorio.status = Relatorio.StatusRelatorio.ERRO
            relatorio.observacoes = f"Erro ao gerar relatório completo: {exc}"
            relatorio.save(update_fields=["status", "observacoes", "updated_at"])

            return Response(
                {"detail": f"Erro ao gerar relatório completo: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(relatorio, context={"request": request})

        return Response(
            {
                "detail": "Relatório completo gerado com sucesso.",
                "pdf_url": relatorio.pdf_url,
                "pdf_url_absoluta": self._url_absoluta(request, relatorio.pdf_url),
                "pdf_download_url": self._pdf_download_url(request, relatorio),
                "arquivo": caminho_pdf.name,
                "relatorio": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="baixar-pdf")
    def baixar_pdf(self, request, pk=None):
        """
        Faz download do PDF já gerado.
        """
        relatorio = self.get_object()

        caminho_pdf = self._gerar_caminho_pdf(relatorio)
        if not caminho_pdf.exists():
            raise Http404("PDF ainda não foi gerado para este relatório.")

        return FileResponse(
            open(caminho_pdf, "rb"),
            as_attachment=True,
            filename=caminho_pdf.name,
            content_type="application/pdf",
        )