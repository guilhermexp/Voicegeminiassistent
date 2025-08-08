# Live Gemini Assistant - Refactoring Implementation Plan

## Overview

This document provides a detailed, step-by-step plan for refactoring the Live Gemini Assistant from its current monolithic structure to the proposed modular architecture.

## Refactoring Principles

1. **Incremental Changes**: Small, testable changes that don't break functionality
2. **Backward Compatibility**: Maintain existing functionality during migration
3. **Test-Driven**: Write tests before refactoring
4. **Feature Flags**: Use flags to enable/disable new implementations
5. **Continuous Integration**: Keep the app working at every step

## Phase 1: Project Setup and Foundation (Days 1-3)

### Step 1.1: Create New Directory Structure
```bash
# Create new directory structure
mkdir -p src/{components,services,models,utils,types,constants}
mkdir -p src/components/{app,audio,content,modals,shared}
mkdir -p src/services/{audio,websocket,ai,content,state}
mkdir -p tests/{unit,integration,e2e}
```

### Step 1.2: Set Up TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@services/*": ["./src/services/*"],
      "@models/*": ["./src/models/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

### Step 1.3: Install Additional Dependencies
```json
{
  "devDependencies": {
    "@vitest/ui": "^1.0.0",
    "vitest": "^1.0.0",
    "@testing-library/dom": "^9.0.0",
    "msw": "^2.0.0"
  }
}
```

### Step 1.4: Create Base Classes and Interfaces
```typescript
// src/types/index.ts
export interface ServiceConfig {
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
}

export interface ComponentConfig {
  theme?: Theme;
  locale?: string;
}

// src/services/BaseService.ts
export abstract class BaseService {
  protected config: ServiceConfig;
  
  constructor(config: ServiceConfig) {
    this.config = config;
  }
  
  abstract initialize(): Promise<void>;
  abstract destroy(): void;
}
```

## Phase 2: Service Extraction (Days 4-7)

### Step 2.1: Extract State Management
```typescript
// src/services/state/StateManager.ts
export class StateManager {
  private state: AppState;
  private listeners: Set<StateListener>;
  
  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
  }
  
  getState(): AppState {
    return { ...this.state };
  }
  
  setState(updater: StateUpdater): void {
    const newState = updater(this.state);
    this.state = newState;
    this.notifyListeners();
  }
  
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

### Step 2.2: Extract Audio Service
```typescript
// src/services/audio/AudioService.ts
export class AudioService extends BaseService {
  private mediaRecorder?: MediaRecorder;
  private audioContext?: AudioContext;
  private workletNode?: AudioWorkletNode;
  
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();
    await this.loadAudioWorklet();
  }
  
  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Recording implementation
  }
  
  stopRecording(): void {
    this.mediaRecorder?.stop();
  }
}
```

### Step 2.3: Extract WebSocket Service
```typescript
// src/services/websocket/WebSocketService.ts
export class WebSocketService extends BaseService {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = reject;
      this.setupEventHandlers();
    });
  }
  
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }
}
```

### Step 2.4: Extract Content Analysis Services
```typescript
// src/services/content/ContentAnalysisService.ts
export class ContentAnalysisService extends BaseService {
  private scraperService: URLScraperService;
  private youtubeService: YouTubeService;
  private documentService: DocumentService;
  
  async analyzeContent(input: ContentInput): Promise<AnalysisResult> {
    switch (input.type) {
      case 'url':
        return this.scraperService.scrape(input.url);
      case 'youtube':
        return this.youtubeService.analyze(input.videoId);
      case 'document':
        return this.documentService.process(input.file);
      default:
        throw new Error('Unsupported content type');
    }
  }
}
```

## Phase 3: Component Decomposition (Days 8-12)

### Step 3.1: Create Component Registry
```typescript
// src/components/ComponentRegistry.ts
export class ComponentRegistry {
  static register(): void {
    // Register all custom elements
    customElements.define('app-root', AppRoot);
    customElements.define('audio-controls', AudioControls);
    customElements.define('content-input', ContentInput);
    customElements.define('audio-visualizer-3d', AudioVisualizer3D);
  }
}
```

### Step 3.2: Extract Audio Controls Component
```typescript
// src/components/audio/AudioControls.ts
@customElement('audio-controls')
export class AudioControls extends LitElement {
  @property({ type: Boolean }) isRecording = false;
  @property({ type: Boolean }) isProcessing = false;
  
  private audioService = ServiceLocator.get(AudioService);
  
  render() {
    return html`
      <div class="audio-controls">
        <button 
          @click=${this.toggleRecording}
          ?disabled=${this.isProcessing}
        >
          ${this.isRecording ? 'Stop' : 'Record'}
        </button>
      </div>
    `;
  }
  
  private async toggleRecording() {
    if (this.isRecording) {
      this.audioService.stopRecording();
    } else {
      await this.audioService.startRecording();
    }
  }
}
```

### Step 3.3: Extract Content Input Component
```typescript
// src/components/content/ContentInput.ts
@customElement('content-input')
export class ContentInput extends LitElement {
  @property({ type: String }) urlInput = '';
  @property({ type: Object }) selectedFile: File | null = null;
  
  private contentService = ServiceLocator.get(ContentAnalysisService);
  
  render() {
    return html`
      <div class="content-input">
        <input 
          type="text" 
          .value=${this.urlInput}
          @input=${this.handleUrlInput}
          placeholder="Enter URL or search query"
        />
        <input 
          type="file"
          @change=${this.handleFileSelect}
        />
        <button @click=${this.analyzeContent}>
          Analyze
        </button>
      </div>
    `;
  }
}
```

### Step 3.4: Create App Root Component
```typescript
// src/components/app/AppRoot.ts
@customElement('app-root')
export class AppRoot extends LitElement {
  private stateManager = ServiceLocator.get(StateManager);
  
  connectedCallback() {
    super.connectedCallback();
    this.stateManager.subscribe(() => this.requestUpdate());
  }
  
  render() {
    return html`
      <div class="app-container">
        <app-header></app-header>
        <main class="app-main">
          <content-input></content-input>
          <audio-visualizer-3d></audio-visualizer-3d>
          <audio-controls></audio-controls>
        </main>
        <app-footer></app-footer>
      </div>
    `;
  }
}
```

## Phase 4: Integration and Migration (Days 13-16)

### Step 4.1: Create Service Locator
```typescript
// src/services/ServiceLocator.ts
export class ServiceLocator {
  private static services = new Map<any, any>();
  
  static register<T>(token: any, instance: T): void {
    this.services.set(token, instance);
  }
  
  static get<T>(token: any): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not found: ${token.name}`);
    }
    return service;
  }
  
  static async initialize(): Promise<void> {
    // Initialize all services
    const stateManager = new StateManager(initialState);
    const audioService = new AudioService(audioConfig);
    const wsService = new WebSocketService(wsConfig);
    
    this.register(StateManager, stateManager);
    this.register(AudioService, audioService);
    this.register(WebSocketService, wsService);
    
    await audioService.initialize();
  }
}
```

### Step 4.2: Create Migration Wrapper
```typescript
// src/MigrationWrapper.ts
export class MigrationWrapper extends LitElement {
  @property({ type: Boolean }) useNewArchitecture = false;
  
  render() {
    if (this.useNewArchitecture) {
      return html`<app-root></app-root>`;
    } else {
      return html`<gdm-live-audio></gdm-live-audio>`;
    }
  }
}
```

### Step 4.3: Implement Feature Flags
```typescript
// src/utils/FeatureFlags.ts
export class FeatureFlags {
  private static flags = new Map<string, boolean>();
  
  static set(flag: string, enabled: boolean): void {
    this.flags.set(flag, enabled);
    localStorage.setItem(`ff_${flag}`, String(enabled));
  }
  
  static get(flag: string): boolean {
    const stored = localStorage.getItem(`ff_${flag}`);
    return stored ? stored === 'true' : this.flags.get(flag) || false;
  }
}
```

## Phase 5: Testing Implementation (Days 17-19)

### Step 5.1: Set Up Test Infrastructure
```typescript
// vitest.config.ts
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
}
```

### Step 5.2: Write Service Tests
```typescript
// tests/unit/services/AudioService.test.ts
describe('AudioService', () => {
  let service: AudioService;
  
  beforeEach(() => {
    service = new AudioService({ apiKey: 'test' });
  });
  
  it('should initialize audio context', async () => {
    await service.initialize();
    expect(service.isInitialized()).toBe(true);
  });
  
  it('should start recording', async () => {
    await service.startRecording();
    expect(service.isRecording()).toBe(true);
  });
});
```

### Step 5.3: Write Component Tests
```typescript
// tests/unit/components/AudioControls.test.ts
describe('AudioControls', () => {
  it('should render record button', async () => {
    const element = await fixture<AudioControls>(
      html`<audio-controls></audio-controls>`
    );
    
    const button = element.shadowRoot?.querySelector('button');
    expect(button?.textContent).toBe('Record');
  });
});
```

## Phase 6: Performance Optimization (Days 20-21)

### Step 6.1: Implement Code Splitting
```typescript
// src/utils/LazyLoader.ts
export class LazyLoader {
  static async loadComponent(name: string): Promise<any> {
    switch (name) {
      case 'analysis-modal':
        return import('../components/modals/AnalysisModal');
      case 'visualizer-3d':
        return import('../components/audio/AudioVisualizer3D');
      default:
        throw new Error(`Unknown component: ${name}`);
    }
  }
}
```

### Step 6.2: Replace ScriptProcessorNode
```typescript
// src/services/audio/AudioWorkletService.ts
export class AudioWorkletService {
  async initialize(context: AudioContext): Promise<void> {
    await context.audioWorklet.addModule('/audio-processor.js');
    
    const workletNode = new AudioWorkletNode(context, 'audio-processor');
    workletNode.port.onmessage = this.handleAudioData.bind(this);
    
    return workletNode;
  }
}
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current codebase
- [ ] Document current functionality
- [ ] Set up new project structure
- [ ] Install dependencies
- [ ] Configure build tools

### Phase 1: Foundation
- [ ] Create directory structure
- [ ] Set up TypeScript config
- [ ] Create base classes
- [ ] Implement service locator

### Phase 2: Services
- [ ] Extract state management
- [ ] Extract audio service
- [ ] Extract WebSocket service
- [ ] Extract content services
- [ ] Extract AI service

### Phase 3: Components
- [ ] Create component registry
- [ ] Extract audio controls
- [ ] Extract content input
- [ ] Extract visualizations
- [ ] Create app root

### Phase 4: Integration
- [ ] Implement feature flags
- [ ] Create migration wrapper
- [ ] Test parallel operation
- [ ] Gradual rollout

### Phase 5: Testing
- [ ] Set up test framework
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Achieve 80% coverage

### Phase 6: Optimization
- [ ] Implement code splitting
- [ ] Replace deprecated APIs
- [ ] Optimize bundle size
- [ ] Performance testing

### Post-Migration
- [ ] Remove old code
- [ ] Update documentation
- [ ] Performance benchmarking
- [ ] User acceptance testing
- [ ] Production deployment

## Risk Mitigation

### Potential Risks
1. **Breaking Changes**: Use feature flags to roll back
2. **Performance Regression**: Benchmark before/after
3. **Missing Functionality**: Comprehensive testing
4. **User Disruption**: Gradual rollout with monitoring

### Rollback Strategy
1. Feature flags allow instant rollback
2. Keep old code until new code is stable
3. Version control for each phase
4. Database migrations are reversible

## Success Metrics

### Technical Metrics
- Bundle size reduction: Target 30%
- Load time improvement: Target 40%
- Test coverage: Target 80%
- Code complexity: Reduce by 50%

### Quality Metrics
- Bug rate: Reduce by 60%
- Time to implement features: Reduce by 40%
- Developer satisfaction: Improve
- Code maintainability: Significant improvement

## Timeline Summary

- **Week 1**: Foundation and setup
- **Week 2**: Service extraction
- **Week 3**: Component refactoring
- **Week 4**: Integration and testing
- **Week 5**: Optimization and deployment

Total estimated time: 5 weeks for complete migration