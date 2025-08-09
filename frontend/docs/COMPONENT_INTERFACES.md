# Component Interfaces Documentation

## Overview

This document defines the interfaces and contracts for all components in the Live Gemini Assistant application.

## Core Component Interfaces

### 1. Base Component Interface

```typescript
/**
 * Base interface for all LitElement components
 */
interface IBaseComponent {
  // Lifecycle hooks
  connectedCallback(): void;
  disconnectedCallback(): void;
  firstUpdated(): void;
  updated(changedProperties: Map<string, any>): void;
  
  // State management
  requestUpdate(): void;
  updateComplete: Promise<boolean>;
}
```

### 2. Main Application Component

```typescript
/**
 * GdmLiveAudio - Main application component
 * @element gdm-live-audio
 */
interface IGdmLiveAudio extends IBaseComponent {
  // State properties
  isRecording: boolean;
  status: string;
  error: string;
  urlInput: string;
  selectedFile: File | null;
  isProcessing: boolean;
  isWaitingForResponse: boolean;
  processedContentInfo: ProcessedContentInfo | null;
  analysisResult: string;
  showAnalysisModal: boolean;
  showTimelineModal: boolean;
  timelineEvents: TimelineEvent[];
  
  // Audio properties
  mediaRecorder?: MediaRecorder;
  audioContext?: AudioContext;
  scriptProcessor?: ScriptProcessorNode;
  
  // WebSocket
  ws?: WebSocket;
  
  // Methods
  handleRecord(): Promise<void>;
  handleStop(): void;
  handleReset(): void;
  analyzeContent(): Promise<void>;
  connectWebSocket(): Promise<void>;
  disconnectWebSocket(): void;
  processAudioChunk(data: Float32Array): void;
  handleServerMessage(message: LiveServerMessage): void;
}
```

### 3. Audio Visualizer Component

```typescript
/**
 * AudioVisualizer3D - 3D audio visualization component
 * @element gdm-live-audio-visuals-3d
 */
interface IAudioVisualizer3D extends IBaseComponent {
  // Properties
  analyser?: AnalyserNode;
  minDecibels: number;
  maxDecibels: number;
  smoothingTimeConstant: number;
  fftSize: number;
  bassThreshold: number;
  
  // Three.js objects
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
  sphere?: THREE.Mesh;
  
  // Methods
  initScene(): void;
  startVisualization(): void;
  stopVisualization(): void;
  updateVisualization(frequencyData: Uint8Array): void;
  handleResize(): void;
  dispose(): void;
}
```

## Service Interfaces

### 1. Audio Service Interface

```typescript
/**
 * Audio recording and processing service
 */
interface IAudioService {
  // Configuration
  readonly config: AudioConfig;
  readonly isRecording: boolean;
  readonly isInitialized: boolean;
  
  // Initialization
  initialize(): Promise<void>;
  dispose(): void;
  
  // Recording control
  startRecording(): Promise<MediaStream>;
  stopRecording(): void;
  pauseRecording(): void;
  resumeRecording(): void;
  
  // Audio processing
  processAudioChunk(data: Float32Array): ArrayBuffer;
  convertToPCM(data: Float32Array): ArrayBuffer;
  convertFromPCM(data: ArrayBuffer): Float32Array;
  
  // Playback
  playAudio(data: ArrayBuffer): Promise<void>;
  stopPlayback(): void;
  
  // Analysis
  getFrequencyData(): Uint8Array;
  getWaveformData(): Uint8Array;
  getAudioLevel(): number;
  
  // Events
  on(event: AudioEvent, handler: AudioEventHandler): void;
  off(event: AudioEvent, handler: AudioEventHandler): void;
}

type AudioEvent = 'data' | 'start' | 'stop' | 'error' | 'level';
type AudioEventHandler = (data?: any) => void;
```

### 2. WebSocket Service Interface

```typescript
/**
 * WebSocket connection and message handling
 */
interface IWebSocketService {
  // State
  readonly isConnected: boolean;
  readonly connectionState: WebSocketState;
  readonly sessionId: string | null;
  
  // Connection management
  connect(url: string, protocols?: string[]): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  
  // Message handling
  send(message: WebSocketMessage): void;
  sendAudio(data: ArrayBuffer): void;
  sendText(text: string): void;
  sendControl(command: ControlCommand): void;
  
  // Event handling
  on(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  off(event: WebSocketEvent, handler: WebSocketEventHandler): void;
  
  // Health checks
  ping(): Promise<number>;
  getConnectionInfo(): ConnectionInfo;
}

enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3
}

type WebSocketEvent = 'open' | 'close' | 'error' | 'message' | 'audio' | 'text';
```

### 3. Content Analysis Service Interface

```typescript
/**
 * Content analysis and processing service
 */
interface IContentAnalysisService {
  // Analysis methods
  analyzeURL(url: string): Promise<AnalysisResult>;
  analyzeYouTube(videoId: string): Promise<AnalysisResult>;
  analyzeGitHub(repoUrl: string): Promise<AnalysisResult>;
  analyzeDocument(file: File): Promise<AnalysisResult>;
  analyzeSearch(query: string): Promise<AnalysisResult>;
  
  // Processing methods
  extractText(file: File): Promise<string>;
  parseSpreadsheet(file: File): Promise<SpreadsheetData>;
  parseDocument(file: File): Promise<DocumentContent>;
  
  // Utility methods
  detectContentType(input: string | File): ContentType;
  validateInput(input: string | File): ValidationResult;
  getSupportedFormats(): string[];
}

interface AnalysisResult {
  type: ContentType;
  title: string;
  content: string;
  metadata: ContentMetadata;
  summary: string;
  keyPoints: string[];
  timestamp: Date;
}
```

### 4. AI Service Interface

```typescript
/**
 * Gemini AI integration service
 */
interface IGeminiService {
  // Session management
  createSession(config: SessionConfig): Promise<Session>;
  endSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Session | null;
  
  // Content generation
  generateContent(prompt: string, options?: GenerationOptions): Promise<GenerationResult>;
  generateContentStream(prompt: string, options?: GenerationOptions): AsyncGenerator<string>;
  
  // Analysis
  analyzeContent(content: string, analysisType: AnalysisType): Promise<AnalysisResult>;
  
  // Tools
  useTools(tools: Tool[]): void;
  
  // Configuration
  updateConfig(config: Partial<GeminiConfig>): void;
  getConfig(): GeminiConfig;
}

interface SessionConfig {
  model: string;
  modality: 'TEXT' | 'AUDIO';
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: Tool[];
}
```

## Data Models

### 1. Audio Data Models

```typescript
interface AudioConfig {
  input: {
    sampleRate: number;
    encoding: AudioEncoding;
    channels: number;
    bitDepth: number;
  };
  output: {
    sampleRate: number;
    encoding: AudioEncoding;
    channels: number;
    bitDepth: number;
  };
  processing: {
    fftSize: number;
    smoothingTimeConstant: number;
    minDecibels: number;
    maxDecibels: number;
  };
}

interface AudioData {
  timestamp: number;
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  level: number;
}

type AudioEncoding = 'PCM' | 'OPUS' | 'FLAC' | 'MP3';
```

### 2. Content Data Models

```typescript
interface ProcessedContentInfo {
  type: ContentType;
  source: string;
  title: string;
  processedAt: Date;
  metadata: ContentMetadata;
}

interface ContentMetadata {
  author?: string;
  publishDate?: Date;
  wordCount?: number;
  language?: string;
  tags?: string[];
  url?: string;
  duration?: number; // For videos
  fileSize?: number; // For documents
}

enum ContentType {
  URL = 'url',
  YOUTUBE = 'youtube',
  GITHUB = 'github',
  PDF = 'pdf',
  WORD = 'word',
  EXCEL = 'excel',
  TEXT = 'text',
  SEARCH = 'search'
}
```

### 3. WebSocket Message Models

```typescript
interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: number;
  sessionId?: string;
  sequenceNumber?: number;
}

interface AudioMessage extends WebSocketMessage {
  type: 'audio';
  payload: {
    data: string; // Base64 encoded
    sampleRate: number;
    encoding: string;
    duration?: number;
  };
}

interface TextMessage extends WebSocketMessage {
  type: 'text';
  payload: {
    text: string;
    role: 'user' | 'assistant';
    isPartial?: boolean;
  };
}

interface ControlMessage extends WebSocketMessage {
  type: 'control';
  payload: {
    command: ControlCommand;
    params?: any;
  };
}

type ControlCommand = 'start' | 'stop' | 'pause' | 'resume' | 'reset' | 'ping';
```

### 4. UI State Models

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
  isConnected: boolean;
  currentModal: ModalType | null;
  status: string;
  error: ErrorInfo | null;
}

interface AudioState {
  inputLevel: number;
  outputLevel: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
}

interface ContentState {
  currentContent: ProcessedContentInfo | null;
  analysisResult: string;
  isAnalyzing: boolean;
  history: ProcessedContentInfo[];
}

interface SessionState {
  sessionId: string | null;
  model: string;
  systemInstruction: string;
  startTime: Date | null;
  tokenUsage: TokenUsage;
}

interface TimelineState {
  events: TimelineEvent[];
  filter: EventFilter;
  isVisible: boolean;
}
```

## Event Interfaces

### 1. Component Events

```typescript
interface ComponentEvent<T = any> extends CustomEvent<T> {
  detail: T;
  bubbles: boolean;
  composed: boolean;
}

// Audio control events
interface AudioControlEvent extends ComponentEvent<AudioControlData> {
  type: 'audio-start' | 'audio-stop' | 'audio-data';
}

interface AudioControlData {
  action: string;
  timestamp: number;
  data?: any;
}

// Content events
interface ContentEvent extends ComponentEvent<ContentEventData> {
  type: 'content-analyze' | 'content-ready' | 'content-error';
}

interface ContentEventData {
  content: ProcessedContentInfo;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}
```

### 2. Service Events

```typescript
interface ServiceEvent<T = any> {
  type: string;
  source: string;
  data: T;
  timestamp: number;
}

// Audio service events
interface AudioServiceEvent extends ServiceEvent<AudioEventData> {
  type: 'audio:start' | 'audio:stop' | 'audio:data' | 'audio:error';
}

interface AudioEventData {
  level?: number;
  samples?: Float32Array;
  error?: Error;
}

// WebSocket service events
interface WebSocketServiceEvent extends ServiceEvent<WebSocketEventData> {
  type: 'ws:open' | 'ws:close' | 'ws:error' | 'ws:message';
}

interface WebSocketEventData {
  state?: WebSocketState;
  message?: any;
  error?: Error;
  code?: number;
  reason?: string;
}
```

## Lifecycle Interfaces

### 1. Component Lifecycle

```typescript
interface ComponentLifecycle {
  // Initialization
  onCreate?(): void;
  onMount?(): void;
  onFirstRender?(): void;
  
  // Updates
  onBeforeUpdate?(changedProperties: Map<string, any>): void;
  onUpdate?(changedProperties: Map<string, any>): void;
  onAfterUpdate?(changedProperties: Map<string, any>): void;
  
  // Destruction
  onBeforeDestroy?(): void;
  onDestroy?(): void;
  onUnmount?(): void;
  
  // Error handling
  onError?(error: Error): void;
  onRecover?(): void;
}
```

### 2. Service Lifecycle

```typescript
interface ServiceLifecycle {
  // Initialization
  initialize(config?: any): Promise<void>;
  setup?(): Promise<void>;
  
  // Runtime
  start(): Promise<void>;
  stop(): Promise<void>;
  pause?(): void;
  resume?(): void;
  
  // Cleanup
  dispose(): void;
  cleanup?(): Promise<void>;
  
  // Health
  healthCheck(): Promise<HealthStatus>;
  reset(): Promise<void>;
}

interface HealthStatus {
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details?: any;
  lastCheck: Date;
}
```

## Validation Interfaces

```typescript
interface Validator<T> {
  validate(value: T): ValidationResult;
  validateAsync?(value: T): Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning' | 'info';
}
```

## Error Handling Interfaces

```typescript
interface ErrorHandler {
  handle(error: Error): void;
  handleAsync(error: Error): Promise<void>;
  canHandle(error: Error): boolean;
}

interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: Date;
  severity: ErrorSeverity;
  recoverable: boolean;
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

## Testing Interfaces

```typescript
interface ComponentTest<T extends IBaseComponent> {
  component: T;
  fixture: any;
  
  setup(): Promise<void>;
  teardown(): Promise<void>;
  
  trigger(event: string, data?: any): void;
  wait(ms: number): Promise<void>;
  waitForUpdate(): Promise<void>;
  
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): NodeListOf<Element>;
}

interface ServiceTest<T> {
  service: T;
  mocks: Map<string, any>;
  
  setup(): Promise<void>;
  teardown(): Promise<void>;
  
  mock(name: string, implementation: any): void;
  spy(method: string): any;
  stub(method: string, returnValue: any): void;
}
```