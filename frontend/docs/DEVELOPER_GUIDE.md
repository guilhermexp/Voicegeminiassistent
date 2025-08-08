# Live Gemini Assistant - Developer Guide

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Guide](#testing-guide)
7. [Debugging](#debugging)
8. [Performance Optimization](#performance-optimization)
9. [Deployment](#deployment)
10. [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**: Latest version
- **VS Code** (recommended) or your preferred IDE

### Initial Setup

1. **Clone the Repository**
```bash
git clone https://github.com/your-org/live-gemini-assistant.git
cd live-gemini-assistant
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Configuration**

Create a `.env` file in the root directory:
```env
# Required API Keys
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key_here
VITE_TAVILY_API_KEY=your_tavily_api_key_here

# Optional
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Development Settings
VITE_ENV=development
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

4. **VS Code Extensions** (Recommended)

Install these extensions for better development experience:
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Lit Plugin
- Better Comments
- GitLens

5. **Start Development Server**
```bash
npm run dev
```

The application will open at `http://localhost:[random-port]`

## Project Structure

```
live-gemini-assistant/
├── src/                        # Source code (future)
│   ├── components/            # UI components
│   ├── services/             # Business logic services
│   ├── utils/                # Utility functions
│   └── types/                # TypeScript definitions
├── public/                     # Static assets
│   ├── favicon.svg           # App icon
│   ├── favicon.ico          # Fallback icon
│   └── audio-processor.js   # Audio worklet
├── docs/                       # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── USER_GUIDE.md
│   └── COMPONENT_INTERFACES.md
├── tests/                      # Test files (future)
├── index.tsx                   # Main application (to be refactored)
├── index.html                  # HTML entry point
├── index.css                   # Global styles
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Project dependencies
└── .env                       # Environment variables
```

### Key Files

| File | Purpose |
|------|---------|
| `index.tsx` | Main application component (monolithic, to be refactored) |
| `visual-3d.ts` | 3D audio visualization component |
| `utils.ts` | Audio processing utilities |
| `firecrawl-utils.ts` | Web scraping utilities |
| `youtube-utils.ts` | YouTube integration utilities |
| `tavily-utils.ts` | Search integration utilities |

## Architecture Overview

### Current Architecture (Monolithic)

```
┌─────────────────────────────────┐
│       index.tsx (2474 lines)    │
│  ┌──────────────────────────┐   │
│  │    GdmLiveAudio Component│   │
│  │  - State Management       │   │
│  │  - WebSocket Handling     │   │
│  │  - Audio Processing       │   │
│  │  - Content Analysis       │   │
│  │  - UI Rendering          │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
           ↓
    ┌──────────────┐
    │  visual-3d   │
    │  component   │
    └──────────────┘
```

### Planned Architecture (Modular)

```
┌─────────────────────────────────────────┐
│           Presentation Layer            │
├─────────────────────────────────────────┤
│             Service Layer               │
├─────────────────────────────────────────┤
│              Core Layer                 │
└─────────────────────────────────────────┘
```

See [ARCHITECTURE_DESIGN.md](../ARCHITECTURE_DESIGN.md) for detailed architecture plans.

## Development Workflow

### 1. Branch Strategy

```bash
main
├── develop
│   ├── feature/feature-name
│   ├── bugfix/bug-description
│   └── refactor/component-name
└── release/v1.0.0
```

### 2. Development Process

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
- Write code following coding standards
- Add tests for new functionality
- Update documentation

3. **Test Locally**
```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
```

4. **Commit Changes**
```bash
git add .
git commit -m "feat: add new feature description"
```

5. **Push and Create PR**
```bash
git push origin feature/your-feature-name
```

### 3. Commit Message Convention

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process/auxiliary tool changes

## Coding Standards

### TypeScript Guidelines

```typescript
// ✅ Good - Use interfaces for object shapes
interface UserConfig {
  name: string;
  apiKey: string;
  options?: ConfigOptions;
}

// ❌ Bad - Avoid 'any' type
let data: any = fetchData();

// ✅ Good - Use proper typing
let data: UserData = fetchData();

// ✅ Good - Use async/await
async function processContent(url: string): Promise<AnalysisResult> {
  try {
    const content = await fetchContent(url);
    return analyzeContent(content);
  } catch (error) {
    handleError(error);
    throw error;
  }
}

// ✅ Good - Use optional chaining
const title = content?.metadata?.title ?? 'Untitled';
```

### LitElement Guidelines

```typescript
// ✅ Good - Use decorators
@customElement('my-component')
export class MyComponent extends LitElement {
  @property({ type: String }) name = '';
  @state() private isLoading = false;
  
  // ✅ Good - Lifecycle methods
  connectedCallback() {
    super.connectedCallback();
    this.initialize();
  }
  
  // ✅ Good - Event handling
  private handleClick(e: Event) {
    e.preventDefault();
    this.dispatchEvent(new CustomEvent('action', {
      detail: { value: this.name },
      bubbles: true,
      composed: true
    }));
  }
  
  render() {
    return html`
      <div class="container">
        ${this.isLoading 
          ? html`<loading-spinner></loading-spinner>`
          : html`<button @click=${this.handleClick}>${this.name}</button>`
        }
      </div>
    `;
  }
}
```

### CSS Guidelines

```css
/* ✅ Good - Use CSS custom properties */
:host {
  --primary-color: #4285f4;
  --spacing-unit: 8px;
  
  display: block;
  padding: calc(var(--spacing-unit) * 2);
}

/* ✅ Good - Mobile-first responsive design */
.container {
  width: 100%;
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

/* ✅ Good - Use logical properties */
.card {
  margin-inline: auto;
  padding-block: 1rem;
}
```

## Testing Guide

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── AudioService.test.ts
│   │   └── WebSocketService.test.ts
│   ├── components/
│   │   └── AudioControls.test.ts
│   └── utils/
│       └── audio-utils.test.ts
├── integration/
│   ├── api/
│   │   └── gemini-api.test.ts
│   └── websocket/
│       └── connection.test.ts
└── e2e/
    └── workflows/
        ├── voice-interaction.test.ts
        └── content-analysis.test.ts
```

### Writing Tests

#### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AudioService } from '../src/services/AudioService';

describe('AudioService', () => {
  let service: AudioService;
  
  beforeEach(() => {
    service = new AudioService();
  });
  
  describe('initialization', () => {
    it('should initialize audio context', async () => {
      await service.initialize();
      expect(service.isInitialized).toBe(true);
    });
    
    it('should handle initialization errors', async () => {
      // Mock getUserMedia to fail
      global.navigator.mediaDevices = {
        getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied'))
      };
      
      await expect(service.initialize()).rejects.toThrow('Permission denied');
    });
  });
});
```

#### Component Test Example
```typescript
import { fixture, expect, html } from '@open-wc/testing';
import '../src/components/AudioControls';
import { AudioControls } from '../src/components/AudioControls';

describe('AudioControls', () => {
  it('should render record button', async () => {
    const el = await fixture<AudioControls>(html`
      <audio-controls></audio-controls>
    `);
    
    const button = el.shadowRoot?.querySelector('button');
    expect(button).to.exist;
    expect(button?.textContent).to.equal('Record');
  });
  
  it('should toggle recording state', async () => {
    const el = await fixture<AudioControls>(html`
      <audio-controls></audio-controls>
    `);
    
    const button = el.shadowRoot?.querySelector('button');
    button?.click();
    
    await el.updateComplete;
    expect(el.isRecording).to.be.true;
    expect(button?.textContent).to.equal('Stop');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test AudioService.test.ts

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e
```

## Debugging

### Chrome DevTools

1. **Console Debugging**
```typescript
// Use console methods effectively
console.group('Audio Processing');
console.time('processing');
console.log('Input data:', data);
console.timeEnd('processing');
console.groupEnd();

// Conditional logging
if (import.meta.env.VITE_DEBUG === 'true') {
  console.debug('Debug info:', debugData);
}
```

2. **Network Tab**
- Monitor WebSocket connections
- Check API requests/responses
- Analyze performance timing

3. **Performance Tab**
- Record performance profiles
- Identify bottlenecks
- Memory leak detection

### VS Code Debugging

1. **Launch Configuration** (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true,
      "trace": true
    }
  ]
}
```

2. **Breakpoint Debugging**
- Set breakpoints in TypeScript files
- Use conditional breakpoints
- Inspect variables and call stack

### Common Issues

#### WebSocket Connection Issues
```typescript
// Add debugging for WebSocket
ws.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
  console.log('WebSocket state:', ws.readyState);
  console.log('WebSocket URL:', ws.url);
});

ws.addEventListener('close', (event) => {
  console.log('WebSocket closed:', {
    code: event.code,
    reason: event.reason,
    wasClean: event.wasClean
  });
});
```

#### Audio Processing Issues
```typescript
// Debug audio levels
function debugAudioLevel(data: Float32Array) {
  const sum = data.reduce((acc, val) => acc + Math.abs(val), 0);
  const average = sum / data.length;
  const decibels = 20 * Math.log10(average);
  
  console.log('Audio Level:', {
    average,
    decibels,
    peak: Math.max(...data),
    samples: data.length
  });
}
```

## Performance Optimization

### 1. Code Splitting

```typescript
// Lazy load heavy components
const AnalysisModal = lazy(() => import('./modals/AnalysisModal'));
const Visualizer3D = lazy(() => import('./components/Visualizer3D'));
```

### 2. Bundle Optimization

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['lit', 'three'],
          'ai': ['@google/genai'],
          'content': ['xlsx', 'mammoth', 'marked']
        }
      }
    }
  }
}
```

### 3. Audio Optimization

```typescript
// Use AudioWorklet instead of ScriptProcessor
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // Process audio in separate thread
    return true;
  }
}
```

### 4. Memory Management

```typescript
// Clean up resources
class ComponentWithCleanup extends LitElement {
  private subscription?: Subscription;
  
  connectedCallback() {
    super.connectedCallback();
    this.subscription = service.subscribe(this.handleUpdate);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.subscription?.unsubscribe();
    this.cleanup();
  }
  
  private cleanup() {
    // Release resources
    this.audioContext?.close();
    this.ws?.close();
  }
}
```

## Deployment

### Production Build

1. **Build for Production**
```bash
npm run build
```

2. **Analyze Bundle**
```bash
npm run build -- --analyze
```

3. **Preview Production Build**
```bash
npm run preview
```

### Environment-Specific Builds

```bash
# Development build
npm run build:dev

# Staging build
npm run build:staging

# Production build
npm run build:prod
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Deploy to Production
        run: |
          # Deploy steps here
```

## Contributing

### Getting Started

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

### Code Review Process

1. Automated checks (linting, tests)
2. Peer review
3. Maintainer review
4. Merge to develop
5. Release planning

### Documentation

- Update relevant documentation with changes
- Add JSDoc comments for public APIs
- Include examples for complex features
- Keep README.md up to date

### Community

- Report bugs via GitHub Issues
- Discuss features in Discussions
- Join our Discord server
- Follow coding standards
- Be respectful and inclusive