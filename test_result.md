# Test Record

## User Problem Statement
- Inicializar app e, depois, criar um backend FastAPI (rotas /api) para proteger chaves e mover integrações para o servidor.

## Work Done So Far
- Migrei o projeto Vite + Lit encontrado para /app/frontend, instalei dependências e publiquei via supervisor na porta 3000.
- Configurei .env do frontend com VITE_GOOGLE_API_KEY, VITE_TAVILY_API_KEY e VITE_FIRECRAWL_API_KEY (temporariamente antes de mover para backend).
- App está carregando e conectando no front (voz em tempo real com Gemini via SDK do browser).

## Current Change
- Adicionando backend FastAPI com rotas /api:
  - GET /api/health
  - POST /api/search/tavily (proxy Tavily)
  - POST /api/scrape (proxy Firecrawl)
  - POST /api/genai/generate (proxy Google Generative Language generateContent)

## Testing Protocol (Backend First)
- 1) Verificar saúde: curl GET /api/health => {"status":"ok"}
- 2) Tavily: curl POST /api/search/tavily com {query:"teste"} => 200 e JSON válido (requer TAVILY_API_KEY no backend)
- 3) Firecrawl: curl POST /api/scrape com {url:"https://example.com"} => 200 e JSON com success/data
- 4) GenAI: curl POST /api/genai/generate com {model:"gemini-2.5-flash", contents:{parts:[{text:"Diga oi em PT"}]}} => 200 e JSON com candidates

Observação: Voz em tempo real (WebSocket) continua direto no front por enquanto. Próxima fase poderá adicionar um proxy seguro.

## Incorporate User Feedback
- Solicitação explícita: mover integrações e chaves para backend. Feito para Tavily, Firecrawl e generateContent (análise). Streaming de voz será tratado em etapa posterior.