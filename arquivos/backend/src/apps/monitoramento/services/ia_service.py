import json
import re
from typing import Any
from urllib import error, request


class OllamaIAService:
    """
    Serviço de IA local usando Ollama.

    Objetivo:
    - montar contexto técnico rastreável
    - enviar para modelo local
    - receber apoio diagnóstico em texto estruturado
    - bloquear respostas fora do domínio agrícola
    - priorizar fontes técnicas aprovadas da Base Técnica do EspIAgro

    Uso esperado:
    - modelo principal: gemma3n:e2b ou outro modelo local
    - Ollama rodando localmente em http://localhost:11434
    """

    SECOES_OBRIGATORIAS = [
        "RESUMO TÉCNICO:",
        "PONTOS DE ATENÇÃO:",
        "INTERPRETAÇÃO AGRONÔMICA:",
        "RECOMENDAÇÕES INICIAIS:",
        "LIMITAÇÕES:",
        "FONTES UTILIZADAS:",
    ]

    def __init__(
        self,
        model: str = "gemma3n:e2b",
        base_url: str = "http://127.0.0.1:11434",
        timeout: int = 900,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _post_json(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        data = json.dumps(payload).encode("utf-8")

        req = request.Request(
            url=url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw)
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(
                f"Erro HTTP ao comunicar com Ollama ({exc.code}): {body}"
            ) from exc
        except error.URLError as exc:
            raise RuntimeError(
                "Não foi possível conectar ao Ollama. "
                "Verifique se ele está instalado e rodando em http://127.0.0.1:11434."
            ) from exc

    def healthcheck(self) -> bool:
        """
        Verifica se o Ollama está acessível.
        """
        try:
            payload = {
                "model": self.model,
                "prompt": "Responda apenas: OK",
                "stream": False,
            }
            data = self._post_json("/api/generate", payload)
            return "response" in data
        except Exception:
            return False

    def _normalizar_texto(self, texto: str) -> str:
        """
        Normaliza texto simples em uma linha.

        Usado para comparações, validações e trechos curtos.
        Não deve ser usado antes do parser principal da resposta da IA,
        pois remove quebras de linha importantes.
        """
        texto = texto or ""
        return " ".join(texto.split()).strip()

    def _normalizar_texto_preservando_linhas(self, texto: str) -> str:
        """
        Normaliza texto preservando quebras de linha.

        Importante para parsear a resposta da IA em seções.
        """
        texto = texto or ""
        texto = texto.replace("\r\n", "\n").replace("\r", "\n")
        texto = re.sub(r"[ \t]+", " ", texto)
        texto = re.sub(r"\n{3,}", "\n\n", texto)
        return texto.strip()

    def _normalizar_para_comparacao(self, texto: str) -> str:
        texto = self._normalizar_texto(texto).lower()
        texto = re.sub(r"[^\w\sáéíóúãõâêîôûàç-]", "", texto)
        return texto.strip()

    def _limitar_texto(self, texto: str, limite: int = 900) -> str:
        texto = self._normalizar_texto(texto)
        if len(texto) <= limite:
            return texto
        return texto[:limite].rstrip() + "..."

    def _campo_foi_informado(self, valor: Any) -> bool:
        """
        Verifica se um campo veio realmente informado.

        Importante:
        - 0 é considerado informado;
        - False é considerado informado;
        - strings vazias, 'None', 'null' e variações de 'não informado'
          são consideradas não informadas.
        """
        if valor is None:
            return False

        if isinstance(valor, str):
            texto = self._normalizar_texto(valor).lower()
            return texto not in (
                "",
                "-",
                "none",
                "null",
                "não informado",
                "nao informado",
                "não informada",
                "nao informada",
                "não informado.",
                "nao informado.",
                "não informada.",
                "nao informada.",
            )

        return True

    def _status_campo_contexto(
        self,
        monitoramento: dict[str, Any],
        campo: str,
        label: str,
    ) -> str:
        valor = monitoramento.get(campo)

        if self._campo_foi_informado(valor):
            return f"- {label}: INFORMADO ({valor})"

        return f"- {label}: NÃO INFORMADO"

    def _campos_informados_monitoramento(
        self,
        monitoramento: dict[str, Any],
    ) -> dict[str, bool]:
        """
        Mapa usado para validar a resposta da IA contra os dados enviados.
        """
        return {
            "talhao_nome": self._campo_foi_informado(monitoramento.get("talhao_nome")),
            "data_observacao": self._campo_foi_informado(
                monitoramento.get("data_observacao")
            ),
            "estadio_fenologico": self._campo_foi_informado(
                monitoramento.get("estadio_fenologico")
            )
            or self._campo_foi_informado(
                monitoramento.get("estadio_fenologico_display")
            ),
            "altura_planta_cm": self._campo_foi_informado(
                monitoramento.get("altura_planta_cm")
            ),
            "populacao_plantas": self._campo_foi_informado(
                monitoramento.get("populacao_plantas")
            ),
            "sanidade": self._campo_foi_informado(monitoramento.get("sanidade")),
            "umidade_solo": self._campo_foi_informado(
                monitoramento.get("umidade_solo")
            ),
            "observacoes": self._campo_foi_informado(
                monitoramento.get("observacoes")
            ),
            "score_risco": self._campo_foi_informado(
                monitoramento.get("score_risco")
            ),
            "faixa_risco": self._campo_foi_informado(
                monitoramento.get("faixa_risco")
            )
            or self._campo_foi_informado(
                monitoramento.get("faixa_risco_display")
            ),
            "prioridade_operacional": self._campo_foi_informado(
                monitoramento.get("prioridade_operacional")
            )
            or self._campo_foi_informado(
                monitoramento.get("prioridade_operacional_display")
            ),
        }

    def _bool_fonte(self, fonte: dict[str, Any], campo: str) -> bool | None:
        if campo not in fonte:
            return None

        valor = fonte.get(campo)

        if isinstance(valor, bool):
            return valor

        if valor is None:
            return None

        return str(valor).strip().lower() in ("true", "1", "sim", "yes", "s")

    def _fonte_apta_para_contexto(self, fonte: dict[str, Any]) -> bool:
        """
        Filtra defensivamente fontes para o contexto da IA.

        Se os campos novos da Base Técnica estiverem presentes, usa critérios fortes.
        Se não estiverem presentes, mantém compatibilidade com versões anteriores.
        """
        ativa = self._bool_fonte(fonte, "ativa")
        disponivel_para_ia = self._bool_fonte(fonte, "disponivel_para_ia")
        is_aprovada = self._bool_fonte(fonte, "is_aprovada")
        is_indexada = self._bool_fonte(fonte, "is_indexada")

        status_curadoria = str(fonte.get("status_curadoria", "") or "").strip()
        status_indexacao = str(fonte.get("status_indexacao", "") or "").strip()

        if ativa is False:
            return False

        if disponivel_para_ia is False:
            return False

        if is_aprovada is False:
            return False

        if is_indexada is False:
            return False

        if status_curadoria and status_curadoria != "aprovado":
            return False

        if status_indexacao and status_indexacao != "indexado":
            return False

        possui_conteudo = bool(
            self._normalizar_texto(str(fonte.get("conteudo_extraido", "") or ""))
            or self._normalizar_texto(str(fonte.get("url", "") or ""))
            or self._normalizar_texto(str(fonte.get("aplicacao_pratica", "") or ""))
        )

        return possui_conteudo

    def _ordenar_referencias_tecnicas(
        self,
        referencias_tecnicas: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        fontes_filtradas = [
            fonte
            for fonte in referencias_tecnicas
            if self._fonte_apta_para_contexto(fonte)
        ]

        if not fontes_filtradas and referencias_tecnicas:
            fontes_filtradas = referencias_tecnicas

        def chave_ordenacao(fonte: dict[str, Any]) -> tuple[int, str]:
            try:
                confiabilidade = int(fonte.get("confiabilidade") or 3)
            except (TypeError, ValueError):
                confiabilidade = 3

            titulo = self._normalizar_texto(str(fonte.get("titulo", "")))
            return (-confiabilidade, titulo)

        return sorted(fontes_filtradas, key=chave_ordenacao)

    def _extrair_palavras_chave_monitoramento(
        self,
        monitoramento: dict[str, Any],
        anomalias: list[dict[str, Any]],
    ) -> list[str]:
        termos: set[str] = set()

        campos_monitoramento = [
            monitoramento.get("talhao_nome", ""),
            monitoramento.get("cultura", ""),
            monitoramento.get("sanidade", ""),
            monitoramento.get("estadio_fenologico", ""),
            monitoramento.get("estadio_fenologico_display", ""),
            monitoramento.get("resumo_diagnostico", ""),
            monitoramento.get("observacoes", ""),
            monitoramento.get("faixa_risco", ""),
            monitoramento.get("prioridade_operacional", ""),
            monitoramento.get("justificativa_risco", ""),
        ]

        for campo in campos_monitoramento:
            for termo in self._normalizar_texto(str(campo)).lower().split():
                termo = termo.strip(".,;:()[]{}")
                if len(termo) >= 3:
                    termos.add(termo)

        for anomalia in anomalias:
            for campo in [
                anomalia.get("nome", ""),
                anomalia.get("tipo", ""),
                anomalia.get("tipo_display", ""),
                anomalia.get("severidade", ""),
                anomalia.get("severidade_display", ""),
                anomalia.get("observacao", ""),
            ]:
                for termo in self._normalizar_texto(str(campo)).lower().split():
                    termo = termo.strip(".,;:()[]{}")
                    if len(termo) >= 3:
                        termos.add(termo)

        return sorted(termos)

    def montar_contexto_tecnico(
        self,
        monitoramento: dict[str, Any],
        anomalias: list[dict[str, Any]],
        referencias_tecnicas: list[dict[str, Any]],
    ) -> str:
        """
        Monta o contexto técnico que será enviado ao modelo.

        Estratégia:
        - resumir monitoramento
        - resumir anomalias
        - adicionar fontes técnicas aprovadas/indexadas quando disponíveis
        - incluir rastreabilidade da base técnica
        - informar claramente quais campos foram preenchidos
        """
        linhas: list[str] = []

        referencias_ordenadas = self._ordenar_referencias_tecnicas(
            referencias_tecnicas=referencias_tecnicas,
        )
        referencias_contexto = referencias_ordenadas[:6]

        linhas.append(
            "DOMÍNIO: AGRICULTURA / MONITORAMENTO FENOLÓGICO / DIAGNÓSTICO AGRONÔMICO"
        )
        linhas.append(
            "IMPORTANTE: 'V4', 'V5', 'R1', 'VE' etc. referem-se a ESTÁDIOS FENOLÓGICOS AGRÍCOLAS, não a locais, estádios esportivos ou entidades urbanas."
        )
        linhas.append(
            "ESCOPO DO SISTEMA: cultura do milho, com apoio de fontes técnicas cadastradas na Base Técnica do EspIAgro."
        )
        linhas.append("")

        linhas.append("CONTEXTO DO MONITORAMENTO")
        linhas.append(f"- Talhão: {monitoramento.get('talhao_nome', 'Não informado')}")
        linhas.append(
            f"- Propriedade: {monitoramento.get('propriedade_nome', 'Não informada')}"
        )
        linhas.append(
            f"- Data da observação: {monitoramento.get('data_observacao', 'Não informada')}"
        )
        linhas.append(
            f"- Estádio fenológico: {monitoramento.get('estadio_fenologico_display', monitoramento.get('estadio_fenologico', 'Não informado'))}"
        )
        linhas.append(f"- Cultura: {monitoramento.get('cultura', 'milho')}")
        linhas.append(
            f"- Altura da planta: {monitoramento.get('altura_planta_cm', 'Não informada')}"
        )
        linhas.append(
            f"- População de plantas: {monitoramento.get('populacao_plantas', 'Não informada')}"
        )
        linhas.append(f"- Sanidade: {monitoramento.get('sanidade', 'Não informada')}")
        linhas.append(
            f"- Umidade do solo: {monitoramento.get('umidade_solo', 'Não informada')}"
        )
        linhas.append(
            f"- Nível de atenção: {monitoramento.get('nivel_atencao_display', monitoramento.get('nivel_atencao', 'Não informado'))}"
        )
        linhas.append(
            f"- Status diagnóstico: {monitoramento.get('status_diagnostico_display', monitoramento.get('status_diagnostico', 'Não informado'))}"
        )
        linhas.append(
            f"- Score de risco: {monitoramento.get('score_risco', 'Não informado')}"
        )
        linhas.append(
            f"- Faixa de risco: {monitoramento.get('faixa_risco_display', monitoramento.get('faixa_risco', 'Não informada'))}"
        )
        linhas.append(
            f"- Prioridade operacional: {monitoramento.get('prioridade_operacional_display', monitoramento.get('prioridade_operacional', 'Não informada'))}"
        )
        linhas.append(
            f"- Justificativa de risco: {monitoramento.get('justificativa_risco', 'Não informada')}"
        )
        linhas.append(
            f"- Resumo diagnóstico atual: {monitoramento.get('resumo_diagnostico', 'Não informado')}"
        )
        linhas.append(
            f"- Observações de campo: {monitoramento.get('observacoes', 'Não informado')}"
        )
        linhas.append("")

        linhas.append("QUALIDADE DOS DADOS INFORMADOS")
        linhas.append(
            self._status_campo_contexto(
                monitoramento,
                "altura_planta_cm",
                "Altura da planta",
            )
        )
        linhas.append(
            self._status_campo_contexto(
                monitoramento,
                "populacao_plantas",
                "População de plantas",
            )
        )
        linhas.append(
            self._status_campo_contexto(
                monitoramento,
                "sanidade",
                "Sanidade",
            )
        )
        linhas.append(
            self._status_campo_contexto(
                monitoramento,
                "umidade_solo",
                "Umidade do solo",
            )
        )
        linhas.append(
            self._status_campo_contexto(
                monitoramento,
                "observacoes",
                "Observações de campo",
            )
        )
        linhas.append(
            "- Regra: NÃO declare como ausente, não informado ou inexistente qualquer campo marcado como INFORMADO nesta seção."
        )
        linhas.append("")

        linhas.append("ANOMALIAS REGISTRADAS")
        if anomalias:
            for idx, anomalia in enumerate(anomalias, start=1):
                linhas.append(f"{idx}. Nome: {anomalia.get('nome', 'Não informado')}")
                linhas.append(
                    f"   - Tipo: {anomalia.get('tipo_display', anomalia.get('tipo', 'Não informado'))}"
                )
                linhas.append(
                    f"   - Severidade: {anomalia.get('severidade_display', anomalia.get('severidade', 'Não informado'))}"
                )
                linhas.append(
                    f"   - Percentual afetado: {anomalia.get('percentual_plantas_afetadas', 'Não informado')}"
                )
                linhas.append(f"   - Exige atenção: {anomalia.get('exige_atencao', False)}")
                linhas.append(
                    f"   - Observação: {anomalia.get('observacao', 'Sem observação')}"
                )
        else:
            linhas.append("- Não há anomalias registradas.")
        linhas.append("")

        linhas.append("REFERÊNCIAS TÉCNICAS DISPONÍVEIS E APROVADAS")
        if referencias_contexto:
            for idx, fonte in enumerate(referencias_contexto, start=1):
                titulo = fonte.get("titulo", "Sem título")
                categoria = fonte.get("categoria_display") or fonte.get(
                    "categoria", "Não informada"
                )
                instituicao = fonte.get("instituicao", "Não informada")
                tipo = fonte.get("tipo_display") or fonte.get("tipo", "Não informado")
                escopo = fonte.get("escopo_cultura_display") or fonte.get(
                    "escopo_cultura", "Não informado"
                )
                aplicacao_pratica = self._limitar_texto(
                    str(fonte.get("aplicacao_pratica", "") or ""),
                    limite=450,
                )
                palavras_chave = self._limitar_texto(
                    str(fonte.get("palavras_chave", "") or ""),
                    limite=250,
                )

                try:
                    confiabilidade = int(fonte.get("confiabilidade") or 3)
                except (TypeError, ValueError):
                    confiabilidade = 3

                linhas.append(f"{idx}. Título: {titulo}")
                linhas.append(f"   - Categoria: {categoria}")
                linhas.append(f"   - Instituição: {instituicao}")
                linhas.append(f"   - Tipo: {tipo}")
                linhas.append(f"   - Escopo: {escopo}")
                linhas.append(f"   - Confiabilidade: {confiabilidade}/5")

                if palavras_chave:
                    linhas.append(f"   - Palavras-chave: {palavras_chave}")

                if aplicacao_pratica:
                    linhas.append(f"   - Aplicação prática: {aplicacao_pratica}")

                trecho = self._limitar_texto(
                    str(fonte.get("conteudo_extraido", "") or ""),
                    limite=900,
                )

                if trecho:
                    linhas.append(f"   - Trecho técnico: {trecho}")
                elif fonte.get("url"):
                    linhas.append(
                        "   - Trecho técnico: fonte por URL cadastrada. "
                        f"Use apenas como referência de apoio: {fonte.get('url')}"
                    )
                else:
                    linhas.append("   - Trecho técnico: sem texto extraído disponível.")
        else:
            linhas.append(
                "- Nenhuma referência técnica aprovada/indexada foi encontrada para este caso."
            )
        linhas.append("")

        palavras_chave = self._extrair_palavras_chave_monitoramento(
            monitoramento=monitoramento,
            anomalias=anomalias,
        )
        if palavras_chave:
            linhas.append("PALAVRAS-CHAVE DO CASO")
            linhas.append("- " + ", ".join(palavras_chave[:30]))
            linhas.append("")

        linhas.append("REGRAS DE RASTREABILIDADE")
        linhas.append(
            "- A IA só pode citar em FONTES UTILIZADAS os títulos listados em REFERÊNCIAS TÉCNICAS DISPONÍVEIS E APROVADAS."
        )
        linhas.append(
            "- Se não houver referência técnica suficiente, informe a limitação claramente."
        )
        linhas.append(
            "- Em LIMITAÇÕES, não declare como ausente nenhum campo que esteja informado no CONTEXTO DO MONITORAMENTO ou em QUALIDADE DOS DADOS INFORMADOS."
        )

        return "\n".join(linhas)

    def montar_prompt_diagnostico(
        self,
        monitoramento: dict[str, Any],
        anomalias: list[dict[str, Any]],
        referencias_tecnicas: list[dict[str, Any]],
    ) -> str:
        """
        Monta o prompt principal da IA.

        A IA deve:
        - responder tecnicamente
        - ser objetiva
        - usar apenas o contexto fornecido
        - evitar inventar
        - permanecer estritamente no domínio agronômico
        """
        contexto = self.montar_contexto_tecnico(
            monitoramento=monitoramento,
            anomalias=anomalias,
            referencias_tecnicas=referencias_tecnicas,
        )

        prompt = f"""
Você é um assistente TÉCNICO AGRÍCOLA do sistema EspIAgro.

CONTEXTO DE DOMÍNIO:
- Este caso é EXCLUSIVAMENTE sobre agricultura.
- A cultura principal deste projeto é MILHO.
- "V4", "V5", "R1", "VE" e semelhantes referem-se a ESTÁDIOS FENOLÓGICOS AGRÍCOLAS.
- NÃO interprete essas siglas como estádio esportivo, cidade, prédio, local, time, evento ou qualquer outro contexto não agrícola.

SUA FUNÇÃO:
Analisar o monitoramento com base EXCLUSIVAMENTE:
1. nos dados do monitoramento,
2. nas anomalias registradas,
3. nas referências técnicas fornecidas.

REGRAS OBRIGATÓRIAS:
- Não invente informações.
- Não use conhecimento externo se ele não estiver no contexto.
- Não cite nenhuma fonte que não esteja no contexto.
- Se faltarem evidências suficientes, diga isso claramente.
- Seja técnico, objetivo e rastreável.
- Foque em apoio diagnóstico agrícola inicial.
- Não recomende dose, produto comercial, marca, receita agronômica ou aplicação química específica.
- Se houver ambiguidade, escolha SEMPRE a interpretação agrícola.
- Se a resposta fugir do contexto agrícola, isso será considerado erro.
- Em FONTES UTILIZADAS, cite somente títulos de fontes listadas no contexto.
- Se nenhuma fonte estiver disponível, escreva: "Nenhuma fonte técnica aprovada disponível no contexto."
- Antes de escrever LIMITAÇÕES, confira os campos informados no contexto.
- Não diga que altura da planta, população de plantas, sanidade, umidade do solo ou observações não foram informadas se esses campos aparecem com valor no contexto.
- Em LIMITAÇÕES, cite somente ausências reais, incertezas reais ou pontos que não podem ser concluídos com segurança.

FORMATAÇÃO OBRIGATÓRIA:
- Escreva cada seção em linha separada.
- Não misture uma seção dentro da outra.
- Cada item de lista deve começar com "- ".
- Não escreva texto após uma seção se ele pertencer à próxima seção.

RESPOSTA OBRIGATÓRIA:
Responda EXATAMENTE no formato abaixo, em português:

RESUMO TÉCNICO:
<texto curto e técnico>

PONTOS DE ATENÇÃO:
- item 1
- item 2
- item 3

INTERPRETAÇÃO AGRONÔMICA:
<texto explicando o cenário com base nos dados e fontes>

RECOMENDAÇÕES INICIAIS:
- item 1
- item 2
- item 3

LIMITAÇÕES:
<o que não pode ser concluído com segurança>

FONTES UTILIZADAS:
- título da fonte 1
- título da fonte 2

CONTEXTO:
{contexto}
""".strip()

        return prompt

    def _resposta_fora_do_dominio(self, texto: str) -> bool:
        """
        Detecta sinais fortes de resposta fora do domínio agrícola.
        """
        texto_normalizado = self._normalizar_texto(texto).lower()

        if not texto_normalizado:
            return True

        termos_proibidos = [
            "estádio de futebol",
            "torcedores",
            "time de futebol",
            "arena esportiva",
            "clube de futebol",
            "jogo de futebol",
            "partida",
            "campeonato",
            "arquibancada",
        ]

        return any(termo in texto_normalizado for termo in termos_proibidos)

    def _normalizar_rotulos_secao(self, texto: str) -> str:
        """
        Garante quebra de linha antes dos rótulos principais.

        Isso corrige quando o modelo responde tudo em uma linha:
        'RESUMO TÉCNICO: ... PONTOS DE ATENÇÃO: ...'
        """
        texto = self._normalizar_texto_preservando_linhas(texto)

        for secao in self.SECOES_OBRIGATORIAS:
            texto = re.sub(
                rf"\s*({re.escape(secao)})",
                rf"\n\1",
                texto,
                flags=re.IGNORECASE,
            )

        texto = re.sub(r"\n{3,}", "\n\n", texto)
        return texto.strip()

    def _resposta_estruturada_minima(self, texto: str) -> bool:
        """
        Verifica se a resposta veio no formato mínimo esperado.
        """
        texto_normalizado = self._normalizar_rotulos_secao(texto).upper()

        return all(
            secao.upper() in texto_normalizado
            for secao in self.SECOES_OBRIGATORIAS
        )

    def _extrair_secao(self, texto: str, nome_secao: str) -> str:
        """
        Extrai uma seção do texto gerado pela IA.

        A extração é robusta para:
        - resposta com quebras de linha;
        - resposta em uma única linha;
        - rótulos colados no texto anterior;
        - pequenas variações de espaçamento.
        """
        texto_normalizado = self._normalizar_rotulos_secao(texto)

        secoes_regex = "|".join(re.escape(secao) for secao in self.SECOES_OBRIGATORIAS)

        padrao = (
            rf"{re.escape(nome_secao)}\s*"
            rf"(.*?)"
            rf"(?=\n(?:{secoes_regex})|\Z)"
        )

        match = re.search(padrao, texto_normalizado, flags=re.DOTALL | re.IGNORECASE)
        if not match:
            return ""

        conteudo = match.group(1).strip()
        return self._normalizar_texto_preservando_linhas(conteudo)

    def _limpar_item_lista(self, item: str) -> str:
        item = self._normalizar_texto(item)
        item = re.sub(r"^[-•\d\.\)\s]+", "", item).strip()
        return item

    def _parse_lista(self, bloco: str) -> list[str]:
        """
        Converte um bloco em lista.

        Corrige respostas em que a IA devolve:
        '- item 1 - item 2 - item 3'
        em uma única linha.
        """
        bloco = self._normalizar_texto_preservando_linhas(bloco)
        if not bloco:
            return []

        itens: list[str] = []

        for linha in bloco.splitlines():
            linha = linha.strip()
            if not linha:
                continue

            if re.match(r"^[-•]\s+", linha) or re.match(r"^\d+[\.\)]\s+", linha):
                item = self._limpar_item_lista(linha)
                if item:
                    itens.append(item)
            else:
                partes = re.split(r"\s+(?=-\s+|•\s+|\d+[\.\)]\s+)", linha)
                if len(partes) > 1:
                    for parte in partes:
                        item = self._limpar_item_lista(parte)
                        if item:
                            itens.append(item)
                elif not itens:
                    item = self._limpar_item_lista(linha)
                    if item:
                        itens.append(item)

        if len(itens) == 1 and " - " in itens[0]:
            partes = re.split(r"\s+-\s+", itens[0])
            itens = [self._limpar_item_lista(parte) for parte in partes if parte.strip()]

        return itens

    def _dividir_limitacoes(self, texto: str) -> list[str]:
        texto = self._normalizar_texto_preservando_linhas(texto)
        if not texto:
            return []

        texto = re.sub(r"\s+-\s+", "\n- ", texto)
        texto = re.sub(r"\s+•\s+", "\n• ", texto)

        sentencas: list[str] = []

        for linha in texto.splitlines():
            linha = self._limpar_item_lista(linha)
            if not linha:
                continue

            partes = re.split(r"(?<=[.!?])\s+", linha)
            for parte in partes:
                parte = self._normalizar_texto(parte)
                if parte:
                    sentencas.append(parte)

        return sentencas

    def _corrigir_limitacoes_inconsistentes(
        self,
        resposta_estruturada: dict[str, Any],
        monitoramento: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Remove limitações contraditórias quando a IA afirma que um campo
        não foi informado, mas o campo veio com valor no contexto.

        Exemplo corrigido:
        - IA: "A altura da planta e a população de plantas não foram informadas."
        - Contexto: altura_planta_cm=28.5 e populacao_plantas=58000.
        """
        limitacoes = resposta_estruturada.get("limitacoes", "") or ""
        if not limitacoes:
            return resposta_estruturada

        campos_informados = self._campos_informados_monitoramento(monitoramento)

        campos_monitorados = {
            "altura_planta_cm": [
                "altura da planta",
                "altura",
            ],
            "populacao_plantas": [
                "população de plantas",
                "populacao de plantas",
                "população",
                "populacao",
            ],
            "sanidade": [
                "sanidade",
                "estado sanitário",
                "estado sanitario",
            ],
            "umidade_solo": [
                "umidade do solo",
                "umidade",
            ],
            "observacoes": [
                "observações de campo",
                "observacoes de campo",
                "observações",
                "observacoes",
            ],
            "score_risco": [
                "score de risco",
                "risco",
            ],
            "faixa_risco": [
                "faixa de risco",
            ],
            "prioridade_operacional": [
                "prioridade operacional",
            ],
        }

        termos_ausencia = [
            "não foi informado",
            "nao foi informado",
            "não foi informada",
            "nao foi informada",
            "não foram informados",
            "nao foram informados",
            "não foram informadas",
            "nao foram informadas",
            "não informado",
            "nao informado",
            "não informada",
            "nao informada",
            "não há informação",
            "nao ha informacao",
            "não há informações",
            "nao ha informacoes",
            "sem informação",
            "sem informacao",
            "sem informações",
            "sem informacoes",
        ]

        sentencas = self._dividir_limitacoes(limitacoes)
        sentencas_corrigidas: list[str] = []
        houve_correcao = False

        for sentenca in sentencas:
            sentenca_normalizada = self._normalizar_para_comparacao(sentenca)
            indica_ausencia = any(
                termo in sentenca_normalizada
                for termo in termos_ausencia
            )

            remover_sentenca = False

            if indica_ausencia:
                for campo, sinonimos in campos_monitorados.items():
                    if not campos_informados.get(campo):
                        continue

                    menciona_campo = any(
                        self._normalizar_para_comparacao(sinonimo)
                        in sentenca_normalizada
                        for sinonimo in sinonimos
                    )

                    if menciona_campo:
                        remover_sentenca = True
                        houve_correcao = True
                        break

            if not remover_sentenca:
                sentencas_corrigidas.append(sentenca)

        if houve_correcao:
            if sentencas_corrigidas:
                resposta_estruturada["limitacoes"] = " ".join(sentencas_corrigidas)
            else:
                resposta_estruturada["limitacoes"] = (
                    "Não foram identificadas limitações específicas adicionais "
                    "a partir dos dados informados e do contexto técnico disponível."
                )

            resposta_estruturada["limitacoes_corrigidas_por_contexto"] = True
        else:
            resposta_estruturada["limitacoes_corrigidas_por_contexto"] = False

        return resposta_estruturada

    def _normalizar_resposta_ia(self, texto: str) -> dict[str, Any]:
        """
        Converte a resposta da IA em estrutura útil.

        Esta versão corrige:
        - seções mesmo quando a IA responde em uma linha;
        - listas mesmo quando a IA não respeita cada item em linha própria.
        """
        texto_normalizado = self._normalizar_rotulos_secao(texto)

        resumo_tecnico = self._extrair_secao(texto_normalizado, "RESUMO TÉCNICO:")
        pontos_atencao_bruto = self._extrair_secao(
            texto_normalizado,
            "PONTOS DE ATENÇÃO:",
        )
        interpretacao = self._extrair_secao(
            texto_normalizado,
            "INTERPRETAÇÃO AGRONÔMICA:",
        )
        recomendacoes_bruto = self._extrair_secao(
            texto_normalizado,
            "RECOMENDAÇÕES INICIAIS:",
        )
        limitacoes = self._extrair_secao(texto_normalizado, "LIMITAÇÕES:")
        fontes_utilizadas_bruto = self._extrair_secao(
            texto_normalizado,
            "FONTES UTILIZADAS:",
        )

        fontes_utilizadas = self._parse_lista(fontes_utilizadas_bruto)

        if not fontes_utilizadas:
            match_fontes = re.search(
                r"FONTES UTILIZADAS:\s*(.*)$",
                texto_normalizado,
                flags=re.DOTALL | re.IGNORECASE,
            )

            if match_fontes:
                fontes_utilizadas = self._parse_lista(match_fontes.group(1))

        return {
            "resumo_tecnico": self._normalizar_texto(resumo_tecnico),
            "pontos_atencao": self._parse_lista(pontos_atencao_bruto),
            "interpretacao_agronomica": self._normalizar_texto(interpretacao),
            "recomendacoes_iniciais": self._parse_lista(recomendacoes_bruto),
            "limitacoes": self._normalizar_texto(limitacoes),
            "fontes_utilizadas": fontes_utilizadas,
            "texto_completo": texto_normalizado,
        }

    def _validar_fontes_citadas(
        self,
        fontes_utilizadas: list[str],
        referencias_tecnicas: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Valida de forma leve se as fontes citadas pela IA existem no contexto.

        Também normaliza fontes citadas para o título oficial cadastrado,
        evitando variações como:
        - "Título - Instituição"
        - "Instituição"
        - "Título / Instituição"
        """
        referencias_ordenadas = self._ordenar_referencias_tecnicas(
            referencias_tecnicas=referencias_tecnicas,
        )
        referencias_contexto = referencias_ordenadas[:6]

        titulos_contexto = []
        for fonte in referencias_contexto:
            titulo_original = self._normalizar_texto(str(fonte.get("titulo", "")))
            titulo_normalizado = self._normalizar_para_comparacao(titulo_original)

            if titulo_original and titulo_normalizado:
                titulos_contexto.append(
                    {
                        "original": titulo_original,
                        "normalizado": titulo_normalizado,
                    }
                )

        if not titulos_contexto:
            return {
                "fontes_validas": [],
                "fontes_nao_reconhecidas": fontes_utilizadas,
                "validacao_fontes": (
                    "Nenhuma fonte técnica aprovada estava disponível no contexto."
                ),
            }

        fontes_validas: list[str] = []
        fontes_nao_reconhecidas: list[str] = []

        for fonte_citada in fontes_utilizadas:
            fonte_normalizada = self._normalizar_para_comparacao(fonte_citada)

            if not fonte_normalizada:
                continue

            if "nenhuma fonte" in fonte_normalizada:
                if fonte_citada not in fontes_validas:
                    fontes_validas.append(fonte_citada)
                continue

            fonte_reconhecida = None

            for titulo in titulos_contexto:
                titulo_normalizado = titulo["normalizado"]

                if (
                    fonte_normalizada == titulo_normalizado
                    or fonte_normalizada in titulo_normalizado
                    or titulo_normalizado in fonte_normalizada
                ):
                    fonte_reconhecida = titulo["original"]
                    break

            if fonte_reconhecida:
                if fonte_reconhecida not in fontes_validas:
                    fontes_validas.append(fonte_reconhecida)
            else:
                fontes_nao_reconhecidas.append(fonte_citada)

        if fontes_nao_reconhecidas:
            validacao = (
                "A IA citou uma ou mais fontes que não foram reconhecidas exatamente "
                "entre as referências técnicas enviadas no contexto."
            )
        else:
            validacao = "Fontes citadas compatíveis com o contexto enviado."

        return {
            "fontes_validas": fontes_validas,
            "fontes_nao_reconhecidas": fontes_nao_reconhecidas,
            "validacao_fontes": validacao,
        }

    def _fontes_padrao_contexto(
        self,
        referencias_tecnicas: list[dict[str, Any]],
    ) -> list[str]:
        """
        Retorna uma lista segura de fontes técnicas do contexto.

        Usado como fallback quando a IA não devolve a seção FONTES UTILIZADAS
        ou quando o parser não consegue extrair as fontes corretamente.
        """
        referencias_ordenadas = self._ordenar_referencias_tecnicas(
            referencias_tecnicas=referencias_tecnicas,
        )

        fontes: list[str] = []

        for fonte in referencias_ordenadas[:6]:
            titulo = self._normalizar_texto(str(fonte.get("titulo", "") or ""))

            if titulo and titulo not in fontes:
                fontes.append(titulo)

        if fontes:
            return fontes

        return ["Nenhuma fonte técnica aprovada disponível no contexto."]

    def gerar_apoio_diagnostico(
        self,
        monitoramento: dict[str, Any],
        anomalias: list[dict[str, Any]],
        referencias_tecnicas: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Gera o apoio diagnóstico via modelo local no Ollama.

        Regras de segurança:
        - rejeita resposta fora do domínio agrícola
        - rejeita resposta sem estrutura mínima
        - registra validação das fontes citadas
        - corrige limitações contraditórias contra os dados informados
        """
        prompt = self.montar_prompt_diagnostico(
            monitoramento=monitoramento,
            anomalias=anomalias,
            referencias_tecnicas=referencias_tecnicas,
        )

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.0,
                "num_predict": 850,
            },
        }

        response = self._post_json("/api/generate", payload)

        resposta_bruta = str(response.get("response", "") or "")
        resposta_texto = self._normalizar_rotulos_secao(resposta_bruta)

        if self._resposta_fora_do_dominio(resposta_texto):
            raise RuntimeError(
                "A IA retornou conteúdo fora do domínio agrícola e a resposta foi rejeitada."
            )

        if not self._resposta_estruturada_minima(resposta_texto):
            raise RuntimeError(
                "A IA retornou resposta sem a estrutura mínima esperada."
            )

        resposta_estruturada = self._normalizar_resposta_ia(resposta_texto)

        fontes_extraidas = resposta_estruturada.get("fontes_utilizadas") or []

        if not fontes_extraidas:
            fontes_extraidas = self._fontes_padrao_contexto(
                referencias_tecnicas=referencias_tecnicas,
            )
            resposta_estruturada["fontes_utilizadas"] = fontes_extraidas

        validacao_fontes = self._validar_fontes_citadas(
            fontes_utilizadas=fontes_extraidas,
            referencias_tecnicas=referencias_tecnicas,
        )

        if not validacao_fontes.get("fontes_validas"):
            validacao_fontes["fontes_validas"] = self._fontes_padrao_contexto(
                referencias_tecnicas=referencias_tecnicas,
            )
            validacao_fontes["validacao_fontes"] = (
                "Fontes preenchidas automaticamente a partir das referências técnicas "
                "vinculadas ao relatório, pois a IA não devolveu fontes reconhecidas."
            )

        resposta_estruturada.update(validacao_fontes)

        if not resposta_estruturada.get("fontes_utilizadas"):
            resposta_estruturada["fontes_utilizadas"] = validacao_fontes.get(
                "fontes_validas",
                [],
            )

        if validacao_fontes.get("fontes_validas"):
            resposta_estruturada["fontes_utilizadas"] = validacao_fontes[
                "fontes_validas"
            ]

        return {
            "model": self.model,
            "prompt": prompt,
            "resposta": resposta_texto,
            "resposta_estruturada": resposta_estruturada,
            "raw": response,
        }