# 🏗️ Arquitetura - Live Audio AI Assistant

## 📊 Visão Geral

Aplicação web de assistente de áudio em tempo real utilizando a API Gemini 2.0 Flash com suporte nativo a áudio.

### Stack Tecnológico
- **Framework**: Lit 3.0 (Web Components)
- **Build Tool**: Vite 6.2
- **Linguagem**: TypeScript
- **AI**: Google Gemini 2.0 Flash (native audio)
- **Visualização**: Three.js
- **Testes**: Vitest

## 🗂️ Estrutura Atual (Monolítica)

```
index.tsx (1.578 linhas)
├── Componente Principal (AudioAgent)
├── Gerenciamento de Estado (@state)
├── UI Components (inline)
├── Lógica de Negócio
├── Integração com APIs
└── Visualizações 3D
```

## 🎯 Arquitetura Alvo (Modular)

```
src/
├── components/
│   ├── AudioRecorder.tsx
│   ├── ContentAnalyzer.tsx
│   ├── ModalManager.tsx
│   └── TimelineViewer.tsx
├── services/
│   ├── GeminiService.ts
│   ├── FirecrawlService.ts
│   └── AudioService.ts
├── state/
│   └── AppStateManager.ts
├── utils/
│   ├── audio-utils.ts
│   ├── youtube-utils.ts
│   └── firecrawl-utils.ts
└── visualizations/
    ├── Visual3D.ts
    └── AudioVisualizer.ts
```

## 🔄 Fluxo de Dados

### 1. Captura de Áudio
```
Microfone → MediaRecorder → AudioWorklet → PCM16 → Gemini API
```

### 2. Processamento
```
Gemini Response → Text/Audio → State Update → UI Render
```

### 3. Análise de Conteúdo
```
URL/YouTube → Firecrawl API → Markdown → Context → Gemini
```

## 🔌 Integrações

### APIs Externas
1. **Google Gemini 2.0**: Processamento de áudio e texto
2. **Firecrawl**: Web scraping e análise
3. **YouTube**: Extração de transcrições

### Dependências CDN
- Three.js (visualização 3D)
- Marked (renderização Markdown)
- DOMPurify (sanitização HTML)

## 🛡️ Segurança

### Configuração de Variáveis de Ambiente
```env
GEMINI_API_KEY=xxx
FIRECRAWL_API_KEY=xxx
```

### Validações
- Sanitização de entrada HTML
- Validação de URLs
- Rate limiting nas APIs

## 📈 Métricas de Performance

- **Bundle Size**: ~500KB (sem deps)
- **Tempo de Inicialização**: <2s
- **Latência de Áudio**: <100ms
- **Memory Usage**: ~50MB idle, ~150MB ativo

## 🚀 Roadmap de Migração

### Fase 1: Estabilização ✅
- Backup e documentação
- Configuração de ambiente
- Setup de testes

### Fase 2: Segurança ✅
- Remover API keys hardcoded
- Configurar variáveis de ambiente
- Atualizar dependências

### Fase 3: Testes ✅
- Configurar Vitest
- Testes unitários básicos
- Coverage inicial

### Fase 4: Componentização 🔄
- Extrair componentes
- Implementar serviços
- Gerenciamento de estado

### Fase 5: Otimização
- Code splitting
- Lazy loading
- Cache e PWA