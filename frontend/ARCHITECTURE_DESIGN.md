# Live Gemini Assistant - Architecture Design Document

## Executive Summary

This document outlines a comprehensive architectural redesign for the Live Gemini Assistant application, transforming it from a monolithic single-file implementation into a modular, maintainable, and scalable system.

## Current State Analysis

### Issues Identified
1. **Monolithic Structure**: 2474 lines in a single `index.tsx` file
2. **Mixed Concerns**: UI, business logic, API calls, audio processing all in one component
3. **State Management**: All state managed in a single LitElement component
4. **Limited Testability**: Difficult to unit test individual functionalities
5. **Code Duplication**: WebSocket handling has duplicate callbacks
6. **Technical Debt**: Using deprecated ScriptProcessorNode for audio

### Current Components
- `GdmLiveAudio`: Main monolithic component
- `gdm-live-audio-visuals-3d`: 3D visualization component
- Utility files: `utils.ts`, `youtube-utils.ts`, `firecrawl-utils.ts`, `tavily-utils.ts`

## Proposed Architecture

### 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Components │  Views  │  Modals  │  Visualizations         │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Audio │ WebSocket │ Content │ AI │ State Management        │
├─────────────────────────────────────────────────────────────┤
│                     Core Layer                               │
├─────────────────────────────────────────────────────────────┤
│  Models │ Interfaces │ Types │ Constants │ Utils            │
└─────────────────────────────────────────────────────────────┘
```

### 2. Component Architecture

#### 2.1 Core Components Structure
```
src/
├── components/
│   ├── app/
│   │   ├── AppRoot.ts              # Root application component
│   │   ├── AppHeader.ts            # Header with controls
│   │   └── AppLayout.ts            # Layout manager
│   ├── audio/
│   │   ├── AudioControls.ts        # Recording controls
│   │   ├── AudioVisualizer.ts      # 2D audio visualization
│   │   └── AudioVisualizer3D.ts    # 3D sphere visualization
│   ├── content/
│   │   ├── ContentInput.ts         # URL/file input component
│   │   ├── ContentAnalyzer.ts      # Analysis display
│   │   └── ContentProcessor.ts     # Processing status
│   ├── modals/
│   │   ├── AnalysisModal.ts        # Analysis viewer
│   │   ├── TimelineModal.ts        # Timeline viewer
│   │   └── SettingsModal.ts        # Settings configuration
│   └── shared/
│       ├── Button.ts                # Reusable button
│       ├── Modal.ts                 # Base modal component
│       └── StatusBar.ts             # Status display
```

#### 2.2 Service Architecture
```
src/
├── services/
│   ├── audio/
│   │   ├── AudioService.ts         # Audio recording/playback
│   │   ├── AudioProcessor.ts       # Audio processing logic
│   │   └── AudioWorkletService.ts  # Modern audio processing
│   ├── websocket/
│   │   ├── WebSocketService.ts     # WebSocket connection manager
│   │   ├── MessageHandler.ts       # Message processing
│   │   └── ReconnectionManager.ts  # Connection recovery
│   ├── ai/
│   │   ├── GeminiService.ts        # Gemini API integration
│   │   ├── SessionManager.ts       # AI session management
│   │   └── PromptBuilder.ts        # Prompt construction
│   ├── content/
│   │   ├── ContentAnalysisService.ts    # Content analysis orchestrator
│   │   ├── URLScraperService.ts         # Web scraping
│   │   ├── YouTubeService.ts            # YouTube integration
│   │   ├── DocumentService.ts           # Document processing
│   │   ├── SpreadsheetService.ts        # Excel processing
│   │   └── GitHubService.ts             # GitHub integration
│   └── state/
│       ├── StateManager.ts         # Global state management
│       ├── StateStore.ts            # State storage
│       └── StateActions.ts          # State mutations
```

### 3. Data Flow Architecture

#### 3.1 State Management Pattern
```typescript
interface AppState {
  ui: UIState;
  audio: AudioState;
  content: ContentState;
  session: SessionState;
  timeline: TimelineState;
}

interface UIState {
  isRecording: boolean;
  isProcessing: boolean;
  currentModal: ModalType | null;
  status: string;
  error: string | null;
}

interface AudioState {
  inputStream: MediaStream | null;
  outputStream: MediaStream | null;
  visualizationData: AudioData;
}

interface ContentState {
  currentContent: ProcessedContent | null;
  analysisResult: string;
  sourceType: ContentSourceType;
}

interface SessionState {
  isConnected: boolean;
  sessionId: string | null;
  systemInstruction: string;
}
```

#### 3.2 Event Flow
```
User Input → Component → Service → State Update → Component Re-render
     ↓                      ↓
  Validation            WebSocket/API
                            ↓
                        Response
                            ↓
                      State Update
```

### 4. API Layer Design

#### 4.1 API Service Structure
```typescript
interface APIService {
  gemini: GeminiAPIClient;
  firecrawl: FirecrawlAPIClient;
  tavily: TavilyAPIClient;
  youtube: YouTubeAPIClient;
  github: GitHubAPIClient;
}

class APIServiceFactory {
  static create(config: APIConfig): APIService
  static configureFromEnv(): APIConfig
}
```

#### 4.2 WebSocket Protocol
```typescript
interface WebSocketProtocol {
  connect(): Promise<void>;
  disconnect(): void;
  send(message: WebSocketMessage): void;
  on(event: WebSocketEvent, handler: EventHandler): void;
  reconnect(): Promise<void>;
}

interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  sessionId?: string;
}
```

### 5. Module Boundaries

#### 5.1 Core Modules
1. **Audio Module**: Handles all audio-related functionality
2. **Content Module**: Manages content analysis and processing
3. **AI Module**: Manages Gemini API interactions
4. **UI Module**: All visual components and interactions
5. **State Module**: Centralized state management

#### 5.2 Module Communication
- Modules communicate via events and state updates
- No direct module-to-module dependencies
- Service layer acts as orchestrator

### 6. Testing Architecture

#### 6.1 Test Structure
```
tests/
├── unit/
│   ├── services/        # Service unit tests
│   ├── components/      # Component tests
│   └── utils/          # Utility tests
├── integration/
│   ├── api/            # API integration tests
│   └── websocket/      # WebSocket tests
└── e2e/
    └── workflows/      # End-to-end workflows
```

#### 6.2 Testing Strategy
- Unit tests for all services and utilities
- Component testing with mock services
- Integration tests for API interactions
- E2E tests for critical user workflows

### 7. Performance Optimizations

#### 7.1 Code Splitting
```typescript
// Lazy load heavy components
const AnalysisModal = lazy(() => import('./modals/AnalysisModal'));
const Visualizer3D = lazy(() => import('./audio/AudioVisualizer3D'));
```

#### 7.2 Audio Processing
- Replace ScriptProcessorNode with AudioWorkletNode
- Implement efficient buffering strategies
- Use Web Workers for heavy processing

#### 7.3 State Updates
- Implement selective re-rendering
- Use memoization for expensive computations
- Batch state updates

### 8. Security Considerations

#### 8.1 API Key Management
```typescript
class SecureConfigManager {
  private keys: Map<string, string>;
  
  loadFromEnv(): void;
  getKey(service: string): string;
  validateKeys(): boolean;
}
```

#### 8.2 Content Security
- Sanitize all user inputs
- Validate URLs before processing
- Implement rate limiting
- Use CSP headers

### 9. Deployment Architecture

#### 9.1 Build Configuration
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

#### 9.2 Environment Configuration
```
.env.development
.env.production
.env.test
```

### 10. Migration Strategy

#### Phase 1: Foundation (Week 1)
1. Set up new project structure
2. Create core services
3. Implement state management
4. Add testing framework

#### Phase 2: Service Layer (Week 2)
1. Extract audio services
2. Extract WebSocket handling
3. Extract content processing
4. Extract AI integration

#### Phase 3: Component Refactoring (Week 3)
1. Break down main component
2. Create reusable components
3. Implement new routing
4. Add lazy loading

#### Phase 4: Optimization (Week 4)
1. Replace deprecated APIs
2. Implement performance optimizations
3. Add comprehensive tests
4. Documentation update

## Implementation Specifications

### Service Interfaces

```typescript
// AudioService Interface
interface IAudioService {
  startRecording(): Promise<void>;
  stopRecording(): void;
  processAudioChunk(data: Float32Array): void;
  getVisualizationData(): AudioData;
  setOutputVolume(volume: number): void;
}

// WebSocketService Interface
interface IWebSocketService {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(data: any): void;
  on(event: string, handler: Function): void;
  reconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
}

// ContentAnalysisService Interface
interface IContentAnalysisService {
  analyzeURL(url: string): Promise<AnalysisResult>;
  analyzeFile(file: File): Promise<AnalysisResult>;
  analyzeYouTubeVideo(videoId: string): Promise<AnalysisResult>;
  analyzeGitHubRepo(repoUrl: string): Promise<AnalysisResult>;
}

// StateManager Interface
interface IStateManager {
  getState(): AppState;
  setState(partial: Partial<AppState>): void;
  subscribe(listener: StateListener): Unsubscribe;
  dispatch(action: Action): void;
}
```

### Component Templates

```typescript
// Base Component Template
export abstract class BaseComponent extends LitElement {
  protected stateManager: IStateManager;
  protected services: ServiceRegistry;
  
  abstract render(): TemplateResult;
  
  connectedCallback(): void {
    super.connectedCallback();
    this.subscribeToState();
  }
  
  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribeFromState();
  }
}
```

## Benefits of New Architecture

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Each module can be tested independently
3. **Scalability**: Easy to add new features
4. **Performance**: Optimized loading and processing
5. **Developer Experience**: Clear structure and patterns
6. **Code Reusability**: Shared components and services
7. **Error Handling**: Centralized error management
8. **Documentation**: Self-documenting structure

## Next Steps

1. Review and approve architecture design
2. Set up new project structure
3. Begin incremental migration
4. Implement core services
5. Add comprehensive testing
6. Update documentation