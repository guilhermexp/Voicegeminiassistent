# 📋 PLANO DE REFATORAÇÃO - Live Audio AI Assistant

**Data de Início**: 06/08/2025  
**Status**: 🟡 Em Progresso  
**Última Atualização**: 06/08/2025 12:30

---

## 📊 SITUAÇÃO ATUAL

### Estado da Aplicação
- ✅ **Funcional**: Aplicação rodando em http://localhost:5173
- ✅ **API Configurada**: Gemini API conectada e operacional
- ⚠️ **Estrutura Frágil**: Monólito de 1.578 linhas que quebra facilmente
- ❌ **Vulnerabilidades**: 3 vulnerabilidades de segurança detectadas
- ❌ **Sem Testes**: Zero cobertura de testes

### Problemas Críticos
1. **index.tsx monolítico** - 1.578 linhas fazendo tudo
2. **API Keys hardcoded** - Firecrawl API exposta no código
3. **Dependências CDN** - 100% via esm.sh sem controle local
4. **Estado complexo** - 13+ @state properties entrelaçadas
5. **Vulnerabilidades NPM** - xlsx (HIGH), dompurify (MODERATE)

---

## 🎯 OBJETIVOS DA REFATORAÇÃO

### Metas Principais
- [ ] Reduzir index.tsx para < 300 linhas
- [ ] Remover todas API keys do código
- [ ] Adicionar cobertura de testes > 60%
- [ ] Resolver vulnerabilidades de segurança
- [ ] Criar arquitetura modular e escalável

---

## 📅 FASES DE IMPLEMENTAÇÃO

### ✅ FASE 0: Preparação (CONCLUÍDA)
- [x] Análise completa da aplicação
- [x] Configurar ambiente de desenvolvimento
- [x] Criar plano de refatoração
- [x] Inicializar controle de versão

**Commits**:
- `initial: Estado inicial da aplicação antes da refatoração`

---

### 🔄 FASE 1: Estabilização e Backup
**Status**: 🟡 Em Progresso  
**Prioridade**: 🔴 CRÍTICA

#### Tarefas:
- [ ] Criar backup completo do código atual
- [ ] Documentar fluxos críticos da aplicação
- [ ] Adicionar .gitignore apropriado
- [ ] Configurar ESLint e Prettier
- [ ] Criar README técnico

#### Arquivos a Criar:
- `.gitignore`
- `.eslintrc.json`
- `.prettierrc`
- `docs/ARCHITECTURE.md`
- `docs/API_FLOWS.md`

---

### 📝 FASE 2: Segurança
**Status**: ⏳ Pendente  
**Prioridade**: 🔴 CRÍTICA

#### Tarefas:
- [ ] Mover Firecrawl API key para variáveis de ambiente
- [ ] Remover todas keys hardcoded
- [ ] Adicionar validação de entrada
- [ ] Implementar sanitização de dados
- [ ] Atualizar dependências vulneráveis

#### Modificações:
- `firecrawl-utils.ts` - Usar process.env
- `.env.local` - Adicionar FIRECRAWL_API_KEY
- `package.json` - Atualizar xlsx e jspdf

---

### ✅ FASE 3: Testes Básicos
**Status**: ✅ CONCLUÍDA  
**Prioridade**: 🟡 ALTA

#### Tarefas:
- [x] Configurar Vitest
- [x] Criar estrutura de testes
- [x] Adicionar scripts de teste ao package.json
- [x] Criar testes de exemplo
- [ ] Criar testes reais após refatoração (pendente exportações corretas)

#### Arquivos a Criar:
- `vitest.config.ts`
- `tests/utils.test.ts`
- `tests/youtube-utils.test.ts`
- `tests/firecrawl-utils.test.ts`

---

### 🔨 FASE 4: Refatoração do Monólito
**Status**: ⏳ Pendente  
**Prioridade**: 🟡 ALTA

#### Tarefas:
- [ ] Extrair AudioRecorder component
- [ ] Extrair ContentAnalyzer component
- [ ] Extrair ModalManager component
- [ ] Criar StateManager para gerenciamento de estado
- [ ] Implementar Service Layer

#### Novos Componentes:
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
└── state/
    └── AppStateManager.ts
```

---

### 🚀 FASE 5: Modernização
**Status**: ⏳ Pendente  
**Prioridade**: 🟢 MÉDIA

#### Tarefas:
- [ ] Migrar de CDN para bundling local
- [ ] Implementar Context API para estado
- [ ] Adicionar error boundaries
- [ ] Implementar loading states
- [ ] Adicionar cache e offline support

---

## 📈 PROGRESSO

### Métricas Atuais
| Métrica | Antes | Atual | Meta |
|---------|-------|-------|------|
| Linhas index.tsx | 1.578 | 1.578 | < 300 |
| Cobertura Testes | 0% | 0% | > 60% |
| Vulnerabilidades | 3 | 3 | 0 |
| Componentes | 1 | 1 | 8+ |
| API Keys Expostas | 1 | 1 | 0 |

### Timeline
```
Agosto 2025:
06 [x] Análise e Planejamento
07 [ ] Fase 1 - Estabilização
08 [ ] Fase 2 - Segurança
09-10 [ ] Fase 3 - Testes
11-15 [ ] Fase 4 - Refatoração
16-20 [ ] Fase 5 - Modernização
```

---

## 🚧 REGRAS DE DESENVOLVIMENTO

### Antes de Cada Modificação:
1. ✅ Fazer backup do arquivo original
2. ✅ Criar branch específica para a mudança
3. ✅ Testar extensivamente antes do merge
4. ✅ Documentar mudanças neste arquivo

### Padrão de Commits:
```
feat: Nova funcionalidade
fix: Correção de bug
refactor: Refatoração de código
test: Adição ou modificação de testes
docs: Documentação
style: Formatação
perf: Performance
security: Segurança
```

---

## 📝 LOG DE MUDANÇAS

### 06/08/2025
- ✅ Análise completa da aplicação
- ✅ Identificação de vulnerabilidades
- ✅ Criação do plano de refatoração
- ✅ Setup inicial do ambiente

### Próximos Passos Imediatos:
1. Criar .gitignore
2. Fazer commit inicial
3. Criar branch development
4. Começar Fase 1

---

## ⚠️ AVISOS IMPORTANTES

> **NUNCA** modifique index.tsx diretamente sem backup
> **SEMPRE** teste em branch separada primeiro  
> **JAMAIS** faça múltiplas mudanças simultâneas
> **DOCUMENTE** cada alteração neste arquivo

---

## 📞 CONTATO

Projeto: Live Audio AI Assistant  
Repositório: copy-of-live-audio-assistent2  
Status: Refatoração em andamento