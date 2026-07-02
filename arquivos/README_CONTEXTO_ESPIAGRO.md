# EspIAgro — Contexto Oficial do Projeto

> Arquivo de contexto contínuo do projeto EspIAgro.  
> Deve ser atualizado ao final de cada fase concluída para evitar perda de contexto, desvios e retrabalho.

---

## 1. Identificação do Projeto

**Nome:** EspIAgro  
**Tipo:** Aplicativo web/PWA de monitoramento inteligente de lavouras  
**Contexto:** Projeto Integrador — Curso de Agrocomputação — UniSenai Rondonópolis/MT  
**Escopo agrícola atual:** Cultura do milho  
**Arquitetura:** Backend Django/DRF + Frontend React/Vite + PostgreSQL/PostGIS + IA local via Ollama em consolidação

O EspIAgro é uma plataforma digital desenvolvida para apoiar o monitoramento técnico de lavouras, com foco inicial na cultura do milho, integrando propriedades, talhões, monitoramentos, anomalias, alertas, clima, base técnica, diagnóstico por IA, relatórios técnicos, PDF e futura consolidação geoespacial/QGIS.

---

## 2. Regra de Ouro do Desenvolvimento

A partir deste ponto, o desenvolvimento deve seguir estas regras:

1. Não refazer módulos já existentes sem necessidade.
2. Sempre analisar o estado real dos arquivos antes de propor alteração.
3. Trabalhar por fase, sem desviar da ordem definida.
4. Antes de alterar código, pedir o arquivo atual quando necessário.
5. Devolver arquivo completo, sem trechos desconectados.
6. Ao mexer em um arquivo, prever tudo que aquela fase exige naquele arquivo para evitar múltiplas alterações desnecessárias.
7. Ao final de cada fase, atualizar este README.
8. Fazer testes reais antes de avançar para a próxima fase.
9. Criar branch nova para cada fase importante.
10. Fazer commit/push ao final de cada fase validada.

---

## 3. Estado Atual Confirmado pela Análise dos ZIPs

Foram recebidos e analisados dois pacotes:

- `backend_src.zip`
- `frontend.zip`

A análise confirmou que o projeto já possui uma base funcional considerável. Portanto, **não devemos reiniciar a Base Técnica, IA, alertas ou relatórios do zero**. O trabalho correto agora é consolidar, integrar, corrigir lacunas e finalizar.

---

## 4. Stack Confirmada

### Backend

- Python
- Django
- Django REST Framework
- Django GIS
- PostgreSQL/PostGIS preparado
- SQLite presente no pacote analisado para ambiente local/dev
- JWT com SimpleJWT
- drf-spectacular / Swagger
- CORS configurado para frontend local
- Upload de arquivos via `MEDIA_ROOT`
- OpenWeather configurado via `OPENWEATHER_API_KEY`
- Extração inicial de PDF via `PyPDF2`

### Frontend

- React 19
- TypeScript
- Vite
- React Router 7
- TanStack Query
- Axios
- React Hook Form
- Zod
- Leaflet / React Leaflet
- MUI instalado, mas a interface atual usa majoritariamente CSS inline em componentes
- Imagens e logos em `public/`

---

## 5. Estrutura Confirmada do Backend

Caminho principal analisado:

```txt
backend_src/src/
```

Apps encontrados:

```txt
apps/auth_api
apps/propriedades
apps/talhoes
apps/monitoramento
apps/anomalias
apps/relatorios
apps/base_conhecimento
apps/alertas
```

Arquivo principal de rotas:

```txt
config/urls.py
```

Rotas principais confirmadas:

```txt
/api/auth/login/
/api/auth/refresh/
/api/auth/verify/
/api/auth/register/
/api/auth/password-reset/
/api/auth/password-reset-confirm/
/api/auth/delete-account/
/api/propriedades/
/api/talhoes/
/api/monitoramentos/
/api/anomalias/
/api/relatorios/
/api/base-conhecimento/
/api/alertas/
/api/docs/
/api/schema/
/api/redoc/
```

---

## 6. Estrutura Confirmada do Frontend

Caminho principal analisado:

```txt
frontend/src/
```

Arquivos principais encontrados:

```txt
src/layouts/AppShell.tsx
src/pages/LoginPage.tsx
src/pages/DashboardPage.tsx
src/pages/PropriedadesPage.tsx
src/pages/TalhoesPage.tsx
src/pages/MonitoramentosPage.tsx
src/pages/AlertasPage.tsx
src/pages/RelatoriosPage.tsx
src/pages/BaseTecnicaPage.tsx
src/pages/SobrePage.tsx
src/routes/AppRouter.tsx
src/services/auth.ts
src/services/http.ts
src/lib/auth-storage.ts
```

Imagens confirmadas em `public/`:

```txt
alertas.jpeg
BaseConhecimento.jpeg
dashboard.jpeg
espiagro.png
favicon.svg
icon.png
icone-espiagro.jpeg
icons.svg
logo-espiagro.png
logo.png
logo_oficial.png
monitoramento.jpeg
propriedades.jpeg
relatorios.jpeg
sobre.jpeg
talhoes.jpeg
```

Observação: no histórico foi citado `logo_oficial.jpeg`, mas no ZIP analisado existe `logo_oficial.png`. Antes de usar no código, confirmar o nome real no projeto atual.

---

## 7. Autenticação e Exclusão de Conta

### Status

Implementado e testado.

### Backend confirmado

App:

```txt
apps/auth_api
```

Endpoints:

```txt
/api/auth/register/
/api/auth/password-reset/
/api/auth/password-reset-confirm/
/api/auth/delete-account/
```

A exclusão de conta exige:

- usuário autenticado;
- senha atual;
- texto de confirmação `EXCLUIR`.

### Frontend confirmado

Arquivo:

```txt
src/services/auth.ts
```

Contém:

- `login`
- `refreshAccessToken`
- `refreshCurrentSession`
- `deleteAccount`
- `getStoredSession`
- `isAuthenticated`
- `logout`

### Validação já realizada

O usuário confirmou que a exclusão funcionou: a conta foi excluída e o sistema voltou para a tela de login.

---

## 8. Propriedades

### Status

Implementado e funcional.

### Backend

Arquivos:

```txt
apps/propriedades/models.py
apps/propriedades/serializers.py
apps/propriedades/views.py
apps/propriedades/urls.py
```

Modelo principal:

```txt
Propriedade
```

Campos/recursos confirmados:

- usuário;
- nome;
- município;
- UF;
- área total;
- polígono com `PolygonField`;
- descrição;
- ativa;
- centroide;
- bbox;
- endpoints de dashboard, geojson e mapa.

### Observação

O módulo já tem base geoespacial importante para a futura fase QGIS.

---

## 9. Talhões

### Status

Implementado e funcional.

### Backend

Arquivos:

```txt
apps/talhoes/models.py
apps/talhoes/serializers.py
apps/talhoes/views.py
apps/talhoes/urls.py
```

Modelo principal:

```txt
Talhao
```

Campos/recursos confirmados:

- usuário;
- propriedade;
- nome;
- cultivar;
- sistema de cultivo;
- data de plantio;
- área em hectares;
- polígono com `PolygonField`;
- observações;
- ativa;
- centroide;
- bbox;
- endpoint geojson.

### Observação

Também já está preparado para uso geográfico/QGIS.

---

## 10. Monitoramentos

### Status

Implementado e robusto. Não deve ser refeito do zero.

### Backend

Arquivos:

```txt
apps/monitoramento/models.py
apps/monitoramento/serializers.py
apps/monitoramento/views.py
apps/monitoramento/urls.py
```

Modelo principal:

```txt
Monitoramento
```

Recursos confirmados:

- usuário;
- talhão;
- data de observação;
- estádio fenológico;
- cultura;
- altura de planta;
- população de plantas;
- sanidade;
- umidade do solo;
- observações;
- foto de monitoramento;
- status de imagem por IA;
- sugestão de estádio fenológico por IA;
- confiança da imagem;
- resultado JSON da imagem;
- observações/erro de IA de imagem;
- nível de atenção;
- status de diagnóstico;
- resumo de diagnóstico;
- possui anomalias;
- exige ação imediata;
- score de risco;
- faixa de risco;
- prioridade operacional;
- justificativa de risco;
- latitude;
- longitude;
- ativa.

### Ações/serviços confirmados em `views.py`

O ViewSet de monitoramentos possui muitas rotinas já existentes:

- dashboard;
- listar anomalias;
- recalcular diagnóstico;
- gerar relatório;
- apoio diagnóstico;
- analisar imagem;
- clima;
- feedback de coleta;
- cálculo de risco;
- alertas automáticos;
- fontes relevantes da base técnica;
- resposta híbrida de apoio diagnóstico;
- relatório base.

### Observação importante

O módulo de monitoramento já contém lógica ligada a:

- diagnóstico básico;
- risco;
- alertas automáticos;
- base técnica;
- imagem;
- clima;
- relatório.

Portanto, a etapa futura deve ser **consolidação e testes**, não reconstrução.

---

## 11. Anomalias

### Status

Implementado.

### Backend

Arquivos:

```txt
apps/anomalias/models.py
apps/anomalias/serializers.py
apps/anomalias/views.py
apps/anomalias/urls.py
```

Modelo principal:

```txt
Anomalia
```

A ViewSet atualiza o diagnóstico do monitoramento quando anomalias são criadas, atualizadas ou removidas.

### Comportamento confirmado

- Se não há anomalias, o monitoramento fica sem anomalias ativas.
- Se há anomalia crítica ou severidade alta, o monitoramento pode exigir ação imediata.
- Anomalias afetam `status_diagnostico`, `exige_acao_imediata` e `resumo_diagnostico`.

---

## 12. Alertas

### Status

Implementado e integrado parcialmente a monitoramentos.

### Backend

Arquivos:

```txt
apps/alertas/models.py
apps/alertas/serializers.py
apps/alertas/views.py
apps/alertas/urls.py
```

Modelo principal:

```txt
Alerta
```

Campos/recursos confirmados:

- usuário;
- monitoramento;
- talhão;
- propriedade;
- escopo agronômico;
- tipo;
- severidade;
- prioridade;
- status;
- título;
- mensagem;
- recomendação;
- regra de origem;
- dados de contexto JSON;
- lido;
- exige confirmação;
- ativa;
- gerado em;
- resolvido em.

### Ações confirmadas

- dashboard;
- marcar como lido;
- resolver;
- reativar;
- filtros por status, tipo, severidade, prioridade etc.

### Observação

O módulo de alertas já existe e também há lógica automática no `MonitoramentoViewSet`. A próxima etapa de alertas deve revisar regras e consolidar coerência, evitando duplicidade.

---

## 13. Base Técnica / Base de Conhecimento

### Status

Já implementada. Não refazer do zero.

### Backend

Arquivos:

```txt
apps/base_conhecimento/models.py
apps/base_conhecimento/serializers.py
apps/base_conhecimento/views.py
apps/base_conhecimento/urls.py
```

Modelo principal:

```txt
FonteConhecimento
```

Recursos confirmados:

- usuário;
- título;
- descrição;
- tipo de fonte;
- categoria;
- escopo de cultura;
- autor;
- instituição;
- ano de publicação;
- arquivo PDF;
- URL;
- conteúdo extraído;
- palavras-chave;
- status de indexação;
- observações;
- ativa;
- indexado em;
- escopo agronômico;
- identificação se é milho ou geral de apoio.

### Tipos de fonte

- PDF;
- link;
- artigo;
- manual;
- boletim;
- legislação;
- base pública;
- outro.

### Categorias

- fenologia;
- pragas;
- doenças;
- nutrição;
- solo;
- clima;
- NDVI;
- manejo;
- geoprocessamento;
- geral.

### Status de indexação

- pendente;
- processando;
- indexado;
- erro.

### Funcionalidades confirmadas

- upload de PDF;
- cadastro de link;
- validação de PDF/link;
- extração de texto com PyPDF2;
- reprocessamento;
- resumo consolidado;
- filtros;
- busca textual.

### Arquivos PDF já encontrados no pacote

```txt
base_conhecimento/pdfs/Circ22.pdf
base_conhecimento/pdfs/Circ22_jr5fWbW.pdf
base_conhecimento/pdfs/Estudo_do_Milho_para_App.pdf
```

### Observação crítica

A Base Técnica já está pronta em nível inicial/funcional. A Fase 1 agora deve ser de **auditoria, consolidação e integração**, não reconstrução.

---

## 14. IA e Diagnóstico

### Status

Parcialmente implementado no backend, especialmente em monitoramentos e relatórios.

### Evidências encontradas

Em `apps/monitoramento/views.py` há métodos relacionados a:

- busca de fontes relevantes;
- serialização de fontes para IA;
- montagem de pontos de atenção;
- resumo técnico base;
- apoio diagnóstico híbrido;
- análise de imagem;
- geração de relatório base.

Em `apps/relatorios/views.py` há métodos relacionados a:

- referências técnicas;
- clima;
- imagem;
- risco;
- identificação fenológica;
- pontos de atenção;
- fontes para IA;
- apoio diagnóstico;
- preenchimento de campos de IA;
- geração de conteúdo base;
- geração de PDF.

### Ponto ainda não confirmado no ZIP

Não foi encontrado, nesta análise inicial, um arquivo dedicado explícito de serviço Ollama, como:

```txt
ollama_service.py
ia_service.py
rag_service.py
```

Isso não significa que não exista integração parcial; significa que a lógica parece estar concentrada dentro das views de monitoramento/relatórios. A próxima análise deve verificar se a chamada real ao Ollama está implementada ou se atualmente a IA é híbrida/fallback local.

---

## 15. Relatórios

### Status

Implementado e avançado.

### Backend

Arquivos:

```txt
apps/relatorios/models.py
apps/relatorios/serializers.py
apps/relatorios/views.py
apps/relatorios/urls.py
```

Modelo principal:

```txt
Relatorio
```

Recursos confirmados:

- usuário;
- tipo;
- status;
- monitoramento;
- talhão;
- propriedade;
- referências técnicas `ManyToMany` com Base Conhecimento;
- título;
- resumo;
- conteúdo JSON;
- status IA;
- modelo IA;
- modo de geração IA;
- resumo técnico IA;
- interpretação agronômica;
- recomendações IA;
- pontos de atenção IA;
- limitações IA;
- fontes utilizadas IA;
- resposta completa IA;
- erro IA;
- score de risco;
- faixa de risco;
- prioridade operacional;
- justificativa de risco;
- PDF URL;
- observações;
- ativa;
- gerado em.

### Ações confirmadas

- gerar conteúdo;
- gerar PDF;
- baixar PDF;
- montar story PDF;
- rodapé PDF;
- apoio diagnóstico híbrido;
- referências técnicas;
- clima;
- imagem;
- risco.

### Arquivos PDF já encontrados

```txt
media/relatorios/relatorio_7.pdf
media/relatorios/relatorio_8.pdf
media/relatorios/relatorio_13.pdf
```

---

## 16. QGIS / Geoprocessamento

### Status

Ainda não consolidado como fase final, mas a base técnica já existe.

### Evidências existentes

- `django.contrib.gis` instalado;
- `PolygonField` em Propriedade;
- `PolygonField` em Talhão;
- centroide e bbox em serializers;
- endpoints `geojson` em propriedades e talhões;
- endpoint `mapa` em propriedades;
- frontend com Leaflet/React Leaflet instalado;
- Dashboard consome `/propriedades/mapa/`.

### Pendência real

A fase QGIS não deve começar do zero. Ela deve consolidar:

- conexão QGIS com banco PostGIS;
- exportação/visualização GeoJSON;
- documentação de uso;
- validação das geometrias;
- demonstração acadêmica do uso geoespacial.

---

## 17. Frontend — Estado Atual

### Telas existentes

- Login;
- Dashboard;
- Propriedades;
- Talhões;
- Monitoramentos;
- Alertas;
- Relatórios;
- Base Técnica;
- Sobre;
- NotFound.

### AppShell

Arquivo:

```txt
src/layouts/AppShell.tsx
```

Contém:

- sidebar desktop;
- navegação principal;
- cabeçalho com banner por página;
- clima no cabeçalho;
- footer institucional;
- modal de exclusão de conta;
- menu mobile inferior atual;
- imagens por página;
- integração com clima via monitoramento mais recente.

### Pontos visuais pendentes

- footer final;
- uso correto das logos;
- menu mobile superior/horizontal sem cobrir conteúdo;
- responsividade fina;
- banners e posicionamento das imagens;
- polimento final dos cards.

Por decisão do projeto, a parte visual final fica para depois das fases técnicas.

---

## 18. Cronograma Operacional Oficial

A ordem oficial para finalizar o app é:

1. Integração sólida da Base Técnica;
2. IA e Diagnóstico;
3. Alertas e Regras de Negócio;
4. QGIS / Geoprocessamento;
5. Relatórios Finais;
6. Ajustes finais visuais, responsividade e navegação mobile.

---

## 19. Fase 1 — Integração Sólida da Base Técnica

### Objetivo

Consolidar a base técnica já existente e garantir que ela esteja pronta para alimentar IA, diagnóstico e relatórios.

### O que NÃO fazer

- Não refazer o app `base_conhecimento` do zero.
- Não recriar models sem necessidade.
- Não remover endpoints existentes.
- Não quebrar a tela `BaseTecnicaPage.tsx`.

### O que fazer

1. Auditar o fluxo completo da Base Técnica.
2. Validar upload de PDF.
3. Validar cadastro de link.
4. Validar extração de texto com PyPDF2.
5. Validar status de indexação.
6. Validar filtros e busca.
7. Confirmar endpoint resumo.
8. Verificar se endpoints adicionais vistos no Swagger estão no código atual ou eram de versão anterior.
9. Garantir que fontes de milho e gerais estejam disponíveis para IA/relatórios.
10. Preparar retorno de fontes relevantes para diagnóstico.
11. Documentar os testes.

### Arquivos prioritários da Fase 1

Backend:

```txt
apps/base_conhecimento/models.py
apps/base_conhecimento/serializers.py
apps/base_conhecimento/views.py
apps/base_conhecimento/urls.py
apps/monitoramento/views.py
apps/relatorios/views.py
```

Frontend:

```txt
src/pages/BaseTecnicaPage.tsx
```

---

## 20. Fase 2 — IA e Diagnóstico

### Objetivo

Consolidar o diagnóstico técnico por IA/híbrido usando dados reais de monitoramento, clima, anomalias e base técnica.

### Tarefas

1. Verificar se existe chamada real ao Ollama.
2. Se não existir, criar serviço dedicado para IA.
3. Definir prompt técnico para milho.
4. Usar fontes da Base Técnica como contexto.
5. Retornar diagnóstico estruturado.
6. Salvar diagnóstico no monitoramento/relatório.
7. Criar fallback quando IA estiver indisponível.
8. Evitar resposta fantasiosa sem fonte.

---

## 21. Fase 3 — Alertas e Regras de Negócio

### Objetivo

Consolidar geração automática e gestão de alertas a partir de critérios técnicos.

### Tarefas

1. Revisar regras já existentes no `MonitoramentoViewSet`.
2. Validar alertas de risco.
3. Validar alertas de coleta incompleta.
4. Validar alertas de imagem.
5. Validar alertas de umidade.
6. Validar alertas de sanidade.
7. Evitar duplicidade.
8. Garantir mensagem, recomendação e regra de origem claras.
9. Garantir coerência com tela de Alertas.

---

## 22. Fase 4 — QGIS / Geoprocessamento

### Objetivo

Consolidar o uso geoespacial do projeto e preparar demonstração com QGIS/PostGIS/GeoJSON.

### Tarefas

1. Validar `PolygonField` em Propriedades e Talhões.
2. Validar endpoints GeoJSON.
3. Validar endpoint mapa.
4. Documentar conexão do QGIS ao banco.
5. Criar roteiro de demonstração.
6. Avaliar exportação GeoJSON se necessário.
7. Garantir que o mapa do frontend esteja coerente com os dados.

---

## 23. Fase 5 — Relatórios Finais

### Objetivo

Finalizar relatórios técnicos profissionais, com conteúdo rastreável, PDF e apoio diagnóstico.

### Tarefas

1. Consolidar geração de conteúdo.
2. Consolidar referências técnicas.
3. Consolidar IA/diagnóstico.
4. Consolidar clima.
5. Consolidar risco.
6. Consolidar alertas/anomalias.
7. Melhorar PDF final.
8. Garantir download.
9. Preparar relatório para apresentação acadêmica.

---

## 24. Fase 6 — Ajustes Finais Visuais e Mobile

### Objetivo

Finalizar a experiência do usuário.

### Tarefas

1. Ajustar footer final.
2. Inserir logos corretamente.
3. Ajustar AppShell.
4. Ajustar menu mobile.
5. Melhorar responsividade.
6. Ajustar banners.
7. Padronizar cards.
8. Remover textos técnicos desnecessários.
9. Validar no smartphone.

---

## 25. Comandos Importantes

### Backend

```bash
cd backend_src/src
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Testes básicos recomendados

```bash
npm run lint
npm run build
python manage.py check
python manage.py makemigrations --check
```

Observação: os comandos devem ser ajustados conforme a estrutura local real do usuário.

---

## 26. Branch Recomendada para a Próxima Fase

Para iniciar a consolidação da Base Técnica:

```bash
git status
git checkout main
git pull
git checkout -b fase-1-base-tecnica
```

Ao final da fase validada:

```bash
git status
git add .
git commit -m "Conclui fase 1 - integracao solida da base tecnica"
git push -u origin fase-1-base-tecnica
```

---

## 27. Próximo Passo Imediato

Iniciar a Fase 1 sem retrabalho.

Antes de alterar código, revisar com mais detalhe os arquivos:

```txt
apps/base_conhecimento/views.py
apps/monitoramento/views.py
apps/relatorios/views.py
src/pages/BaseTecnicaPage.tsx
```

O primeiro objetivo prático é responder:

1. A Base Técnica está cadastrando PDF e link corretamente?
2. A extração de texto está funcionando?
3. As fontes indexadas estão sendo usadas por monitoramentos e relatórios?
4. Existe chamada real ao Ollama ou apenas diagnóstico híbrido local?
5. O que precisa ser ajustado para que a Base Técnica alimente a IA de forma sólida?

---

## 28. Última Atualização

Criado após análise inicial dos ZIPs enviados:

- `backend_src.zip`
- `frontend.zip`

Data da atualização: 2026-04-22
