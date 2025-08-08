/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html, svg} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {marked} from 'marked';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import {
  createBlob,
  decode,
  decodeAudioData,
  fileToArrayBuffer,
  fileToBase64,
} from './utils';
import {
  getYouTubeVideoId,
  getYouTubeVideoTitle,
  isValidUrl,
} from './youtube-utils';
import {scrapeUrl} from './firecrawl-utils';
import {searchTavily, formatSearchResultsForAssistant} from './tavily-utils';
import './visual-3d';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

interface SearchResult {
  uri: string;
  title: string;
}

interface TimelineEvent {
  timestamp: string;
  message: string;
  type:
    | 'info'
    | 'success'
    | 'error'
    | 'record'
    | 'process'
    | 'connect'
    | 'disconnect';
}

// Speech Recognition API type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';
  @state() urlInput = '';
  @state() selectedFile: File | null = null;
  @state() isProcessing = false;
  @state() analysisResult = '';
  @state() showAnalysisModal = false;
  @state() showTimelineModal = false;
  @state() searchResults: SearchResult[] = [];
  @state() timelineEvents: TimelineEvent[] = [];
  @state() processedContentInfo: {title: string; source: string} | null = null;
  @state() systemInstruction =
    'Você é um assistente de voz prestativo que fala português do Brasil. Você não tem a capacidade de pesquisar na internet.';
  @state() private analysisProgress = 0;
  @state() private isSearching = false;
  @state() private pendingSearchQuery = '';

  // Connection state management
  @state() private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout?: number;
  
  // Fallback system
  private usingFallback = false;
  private currentProvider: 'gemini' | 'openrouter' = 'gemini';
  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];
  private speechRecognition?: SpeechRecognition;

  private client: GoogleGenAI;
  private session: Session; private ws?: WebSocket;
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();
  private analysisTimer?: number;

  static styles = css`
    :host {
      --analysis-panel-width: clamp(320px, 40vw, 600px);
    }
    .app-content {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      transition: padding-left 0.35s ease;
      padding-left: 0;
    }
    .app-content.with-panel {
      padding-left: var(--analysis-panel-width);
    }

    gdm-live-audio-visuals-3d {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
    /* Reposiciona elementos flutuantes quando painel abre */
    .app-content.with-panel .input-container {
      left: calc(var(--analysis-panel-width) + 50%);
      transform: translateX(-50%);
    }
    .app-content.with-panel #status {
      left: var(--analysis-panel-width);
      right: 0;
    }
    .app-content.with-panel .bottom-container {
      left: calc(var(--analysis-panel-width) + 50%);
      transform: translateX(-50%);
    }
    #status {
      position: absolute;
      bottom: calc(2vh + 100px); /* Position above the control bar */
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      font-family: sans-serif;
      transition: color 0.3s ease;
      text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
      pointer-events: none; /* Avoid interfering with controls */
    }

    #status.error {
      color: #ff8a80; /* A less harsh red */
    }

    .input-container {
      position: absolute;
      top: 2vh;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 550px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .input-form {
      width: 100%;
      display: flex;
      gap: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      padding: 4px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .input-form input[type='text'] {
      flex-grow: 1;
      border: none;
      background: transparent;
      color: white;
      padding: 10px 18px;
      font-size: 14px;
      outline: none;
      height: 40px;
      box-sizing: border-box;
    }

    .input-form button {
      outline: none;
      border: none;
      color: white;
      border-radius: 20px;
      background: rgba(80, 120, 255, 0.5);
      height: 40px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
    }

    .input-form button.icon-button {
      background: transparent;
      width: 40px;
      padding: 0;
    }

    .input-form button:hover {
      background: rgba(80, 120, 255, 0.8);
    }

    .input-form button.icon-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .input-form button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .input-form button[type='submit']:disabled {
      background: rgba(80, 120, 255, 0.4);
      gap: 12px;
      opacity: 1; /* Override general disabled opacity */
    }

    .input-form button.icon-button:disabled {
      background: transparent;
    }

    /* Progress ring for processing button */
    .progress-ring-wrapper {
      position: relative;
      width: 22px;
      height: 22px;
      flex-shrink: 0; /* Prevents shrinking in flex layout */
    }

    .progress-ring-wrapper svg {
      position: absolute;
      top: 0;
      left: 0;
    }

    .progress-ring__circle {
      fill: transparent;
      stroke-width: 3;
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
    }

    .progress-ring__circle--bg {
      stroke: rgba(255, 255, 255, 0.3);
    }

    .progress-ring__circle--fg {
      stroke: #fff;
      stroke-dasharray: 56.55; /* 2 * PI * 9 */
      transition: stroke-dashoffset 0.3s linear;
    }

    .search-loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    }

    .search-loading-circle {
      background: rgba(0, 20, 40, 0.95);
      border: 2px solid #00ff88;
      border-radius: 20px;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
      animation: pulse-glow 2s infinite;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid rgba(0, 255, 136, 0.3);
      border-top: 4px solid #00ff88;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .search-text {
      text-align: center;
      color: white;
      font-family: sans-serif;
    }

    .search-title {
      font-size: 18px;
      font-weight: bold;
      color: #00ff88;
      margin-bottom: 8px;
    }

    .search-query {
      font-size: 16px;
      color: #ffffff;
      margin-bottom: 8px;
      max-width: 300px;
      word-wrap: break-word;
    }

    .search-status {
      font-size: 14px;
      color: #cccccc;
      animation: blink 1.5s infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
        border-color: #00ff88;
      }
      50% { 
        box-shadow: 0 0 50px rgba(0, 255, 136, 0.8);
        border-color: #00ffbb;
      }
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.5; }
    }

    .content-display {
      background: rgba(0, 0, 0, 0.4);
      padding: 12px 18px;
      border-radius: 12px;
      font-family: sans-serif;
      font-size: 14px;
      color: #eee;
      text-align: center;
      border: 1px solid #5078ff;
      box-shadow: 0 0 10px #5078ff;
      margin-top: 8px;
      backdrop-filter: blur(10px);
      /* Force refresh */
    }
    .content-display h3 {
      margin: 0 0 4px 0;
      font-size: 1em;
      color: white;
      font-weight: 500;
    }
    .content-display p {
      margin: 0;
      font-size: 0.8em;
      color: #ccc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bottom-container {
      position: absolute;
      bottom: 2vh;
      left: 50%;
      transform: translateX(-50%);
      width: 90%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 10;
      align-items: center;
    }

    .media-controls {
      display: flex;
      gap: 8px;
    }

    .media-controls button {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.2);
      width: 48px;
      height: 48px;
      cursor: pointer;
      font-size: 24px;
      padding: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }

    .media-controls button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .media-controls button[disabled] {
      display: none;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }

    .modal-content {
      background: rgba(30, 30, 30, 0.9);
      padding: 24px;
      border-radius: 12px;
      width: clamp(300px, 80vw, 900px);
      max-height: 85vh;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #eee;
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
    }

    .modal-content h3 {
      margin-top: 0;
      color: #5078ff;
      flex-shrink: 0;
    }

    .analysis-text-content {
      flex-grow: 1;
      overflow-y: auto;
      padding: 1px 16px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      line-height: 1.6;
      color: #eee;
    }
    .analysis-text-content h1,
    .analysis-text-content h2,
    .analysis-text-content h3,
    .analysis-text-content h4 {
      color: #87cefa;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
      margin-top: 24px;
    }
    .analysis-text-content h1 {
      font-size: 1.5em;
    }
    .analysis-text-content h2 {
      font-size: 1.3em;
    }
    .analysis-text-content h3 {
      font-size: 1.1em;
    }
    .analysis-text-content p {
      margin-bottom: 12px;
    }
    .analysis-text-content ul,
    .analysis-text-content ol {
      padding-left: 24px;
    }
    .analysis-text-content li {
      margin-bottom: 8px;
    }
    .analysis-text-content strong,
    .analysis-text-content b {
      color: #fff;
      font-weight: 600;
    }
    .analysis-text-content em,
    .analysis-text-content i {
      color: #f0f0f0;
      font-style: italic;
    }
    .analysis-text-content blockquote {
      border-left: 4px solid #5078ff;
      padding-left: 16px;
      margin-left: 0;
      color: #ccc;
      font-style: italic;
    }
    .analysis-text-content code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.9em;
    }
    .analysis-text-content pre > code {
      display: block;
      padding: 12px;
      white-space: pre-wrap;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      flex-shrink: 0;
      flex-wrap: wrap;
    }
    .modal-actions button {
      padding: 10px 20px;
      border-radius: 20px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.2s;
    }
    .modal-actions button svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .modal-actions button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .modal-actions .primary-btn {
      background: #5078ff;
    }
    .modal-actions .primary-btn:hover {
      background: #6a8dff;
    }

    /* Analysis Side Panel */
    .analysis-panel {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: var(--analysis-panel-width);
      background: rgba(30, 30, 30, 0.95);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 20px 0 30px rgba(0, 0, 0, 0.35);
      transform: translateX(-100%);
      transition: transform 0.35s ease;
      z-index: 950; /* abaixo do overlay da timeline (1000) */
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .analysis-panel.open {
      transform: translateX(0);
    }
    .analysis-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    .analysis-panel-header h3 {
      margin: 0;
      color: #5078ff;
      font-weight: 600;
    }
    .close-btn {
      outline: none;
      border: none;
      color: white;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.1);
      height: 36px;
      padding: 0 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .analysis-panel .analysis-text-content {
      flex: 1;
      margin: 12px 16px 0 16px;
    }
    .analysis-panel .modal-actions {
      padding: 12px 16px 16px 16px;
    }

    .search-results {
      background: rgba(0, 0, 0, 0.3);
      padding: 8px 16px;
      border-radius: 12px;
      font-family: sans-serif;
      font-size: 14px;
      color: #ccc;
      max-width: 100%;
      backdrop-filter: blur(10px);
    }

    .search-results p {
      margin: 0 0 8px 0;
      font-weight: bold;
    }

    .search-results ul {
      margin: 0;
      padding: 0;
      list-style: none;
      max-height: 100px;
      overflow-y: auto;
    }

    .search-results li {
      margin-bottom: 4px;
    }

    .search-results a {
      color: #87cefa;
      text-decoration: none;
    }
    .search-results a:hover {
      text-decoration: underline;
    }

    /* Timeline Modal Styles */
    .timeline-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex-grow: 1;
      overflow-y: auto;
    }
    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-icon {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 2px;
    }
    .timeline-icon svg {
      width: 20px;
      height: 20px;
    }
    .timeline-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-grow: 1;
    }
    .timeline-message {
      font-size: 0.9em;
      color: #f0f0f0;
    }
    .timeline-timestamp {
      font-size: 0.75em;
      color: #aaa;
    }
    .timeline-type-success .timeline-icon {
      color: #4caf50;
    }
    .timeline-type-error .timeline-icon {
      color: #f44336;
    }
    .timeline-type-info .timeline-icon {
      color: #2196f3;
    }
    .timeline-type-record .timeline-icon {
      color: #c80000;
    }
    .timeline-type-process .timeline-icon {
      color: #ff9800;
    }
    .timeline-type-connect .timeline-icon {
      color: #00e676;
    }
    .timeline-type-disconnect .timeline-icon {
      color: #9e9e9e;
    }
    /* Connection Status Indicator */
    .connection-status {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 0, 0, 0.7);
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8);
      z-index: 100;
    }

    .connection-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }

    .connection-indicator.connected {
      background-color: #4caf50;
      box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
    }

    .connection-indicator.connecting {
      background-color: #ff9800;
      animation: pulse 2s infinite;
    }

    .connection-indicator.disconnected {
      background-color: #f44336;
    }

    .connection-indicator.error {
      background-color: #e91e63;
      animation: blink 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.3; }
    }
  `;

  constructor() {
    super();
    this.initClient();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private logEvent(message: string, type: TimelineEvent['type']) {
    const timestamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newEvent: TimelineEvent = {timestamp, message, type};
    this.timelineEvents = [newEvent, ...this.timelineEvents];
  }

  private async initClient() {
    this.logEvent('Assistente inicializado.', 'info');
    this.initAudio();

    // Client-side direct GoogleGenAI disabled; now using backend WS proxy
    // this.client = new GoogleGenAI({
    //   apiKey: import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY,
    // });
    this.client = null as any;
    // Initialize WS proxy connection instead of direct Gemini session
    try {
      const backend = (import.meta as any).env?.REACT_APP_BACKEND_URL || '';
      const wsUrl = backend.replace('https://','wss://').replace('http://','ws://') + '/api/ws/' + crypto.randomUUID();
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.connectionState = 'connected';
        this.updateStatus('Conectado');
        this.logEvent('Conexão WS com backend estabelecida.', 'connect');
      };
      this.ws.onclose = () => {
        this.connectionState = 'disconnected';
        this.logEvent('Conexão WS fechada.', 'disconnect');
      };
      this.ws.onerror = (e) => {
        this.connectionState = 'error';
        this.updateError('Erro na conexão WS');
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'gemini_response') {
            if (msg.audio) {
              // Received base64 PCM16 from backend (already base64)
              // Decode and play using existing pipeline
              (async () => {
                this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                const audioBytes = Uint8Array.from(atob(msg.audio), c => c.charCodeAt(0));
                const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext, 24000, 1);
                const source = this.outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.outputNode);
                source.start(this.nextStartTime);
                this.nextStartTime += audioBuffer.duration;
                this.sources.add(source);
              })();
            }
            if (msg.text) {
              this.logEvent(msg.text, 'info');
            }
          } else if (msg.type === 'error') {
            this.updateError(msg.message || 'Erro no backend');
          }
        } catch (e) {
          // ignore parse errors
        }
      };
    } catch (e) {
      this.updateError('Falha ao iniciar WS com backend');
    }

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private async initSession(
    newSystemInstruction?: string,
    persona?: 'assistant' | 'analyst',
  ) {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this.connectionState = 'connecting';
    // No longer creating a Gemini session directly; we rely on WS connection
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.connectionState = 'connected';
      this.updateStatus('Conectado');
      return;
    }

    if (this.session) {
      try {
        this.session.close();
      } catch (e) {
        // Silent error handling - session cleanup
      }
    }

    if (persona === 'analyst' && newSystemInstruction) {
      this.systemInstruction = newSystemInstruction;
    } else {
      this.systemInstruction =
        newSystemInstruction ||
        `Você é um assistente de voz prestativo que fala português do Brasil.
        
IMPORTANTE: Você PODE e DEVE fazer pesquisas na internet sempre que:
- O usuário pedir explicitamente para pesquisar algo
- Você não souber uma informação
- Precisar de dados atualizados ou recentes
- O usuário pedir informações sobre eventos atuais, notícias, ou qualquer coisa que mude com o tempo

Para fazer uma pesquisa, você deve:
1. Primeiro responder naturalmente (ex: "Vou pesquisar isso para você, aguarde um instante...")
2. Depois, em uma linha separada, colocar PESQUISAR: [sua consulta aqui]

NUNCA mencione o comando "PESQUISAR:" ao usuário. Seja natural e discreto.

Exemplos corretos:
- Usuário: "pesquise sobre inteligência artificial"
- Você: "Vou pesquisar sobre inteligência artificial para você. Aguarde um momento.
PESQUISAR: inteligência artificial"

- Usuário: "quais as últimas notícias?"
- Você: "Vou buscar as últimas notícias para você. Um instante.
PESQUISAR: últimas notícias Brasil"

NUNCA diga que não pode pesquisar. Você SEMPRE pode pesquisar.`;
    }

    // Clear content-specific state ONLY if resetting to default
    if (!newSystemInstruction) {
      this.urlInput = '';
      this.selectedFile = null;
      this.processedContentInfo = null;
      this.analysisResult = '';
      this.searchResults = [];
      
      // Reset fallback state when restarting session
      this.usingFallback = false;
      this.currentProvider = 'gemini';
      
      const fileInput = this.shadowRoot?.getElementById(
        'file-input',
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      this.updateStatus('Sessão reiniciada.');
      this.logEvent('Sessão reiniciada para o modo geral.', 'info');
    }

    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    this.updateStatus('Conectando ao assistente...');
    try {
      // Use WS proxy now; skip direct live.connect
      return; // session managed by backend WS
        model: model,
        systemInstruction: this.systemInstruction,
        callbacks: {
          onopen: () => {
            this.connectionState = 'connected';
            this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
            this.logEvent('Conexão com o assistente estabelecida.', 'connect');
            if (!this.processedContentInfo) {
              this.updateStatus('Conectado');
            }
          },
          onclose: async (event?: any) => {
            // WebSocket connection closed
            this.connectionState = 'disconnected';
            this.logEvent(`Conexão fechada: ${event?.reason || 'Conexão perdida'}`, 'disconnect');
            
            if (this.isRecording) {
              this.stopRecording();
            }
            
            // Check if the close reason indicates a quota error
            const quotaErrorCheck = this.isQuotaError({message: event?.reason});
            // Quota error check performed
            
            if (quotaErrorCheck && !this.usingFallback) {
              this.logEvent('Erro de quota detectado no onclose principal, tentando fallback...', 'info');
              try {
                await this.initFallbackClient();
                return;
              } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                this.logEvent(`Fallback falhou: ${(fallbackError as Error).message}`, 'error');
              }
            }
            
            // Only attempt reconnection if it wasn't a deliberate close
            if (event?.code !== 1000 && event?.code !== 1001 && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnection();
            } else {
              this.updateError('Conexão perdida. Clique em reiniciar para reconectar.');
            }
          },
          onerror: (error: any) => {
            console.error('WebSocket error:', error);
            this.connectionState = 'error';
            this.logEvent(`Erro na conexão: ${error.message || 'Erro desconhecido'}`, 'error');
            
            if (this.isRecording) {
              this.stopRecording();
            }
            
            // Attempt reconnection on error
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnection();
            } else {
              this.updateError('Erro na conexão. Clique em reiniciar para reconectar.');
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Log all incoming messages for debugging
            // Processing received message
            
            // Check for text response to detect search requests FIRST
            const textPart = message.serverContent?.modelTurn?.parts?.find(
              part => part.text
            );
            
            if (textPart?.text) {
              // Text part received
              
              // More flexible search detection
              const searchMatch = textPart.text.match(/PESQUISAR:\s*(.+)/i) || 
                                 textPart.text.match(/pesquisar:\s*(.+)/i);
              
              // Also check if the text contains search triggers
              const containsSearchTrigger = textPart.text.toLowerCase().includes('pesquisar') || 
                                          textPart.text.toLowerCase().includes('buscar') ||
                                          textPart.text.toLowerCase().includes('procurar');
              
              // Search pattern detection
              
              if (searchMatch) {
                const query = searchMatch[1].trim();
                // Search query detected: executing search
                
                this.pendingSearchQuery = query;
                this.isSearching = true;
                
                // STOP all audio sources immediately to prevent saying "PESQUISAR:"
                this.sources.forEach(source => {
                  try {
                    source.stop();
                  } catch (e) {
                    // Source may already be stopped
                  }
                });
                this.sources.clear();
                
                // STOP recording immediately when search is detected
                if (this.isRecording) {
                  this.stopRecording();
                }
                
                // Play search sound
                this.playSearchSound();
                
                // Log search activation
                this.logEvent(`🔍 PESQUISA ATIVADA: "${query}"`, 'process');
                this.logEvent('⏸️ Assistente BLOQUEADO durante pesquisa', 'info');
                
                // Perform the search
                await this.performTavilySearch(query);
                return; // Don't process audio when we're searching
              }
            }

            // Only process audio if not searching
            if (this.isSearching) {
              // Skipping audio during search operation
              return;
            }

            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const grounding = (message.serverContent as any)?.candidates?.[0]
              ?.groundingMetadata;
            if (grounding?.groundingChunks?.length) {
              this.searchResults = grounding.groundingChunks
                .map((chunk) => chunk.web)
                .filter(Boolean);
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}},
            languageCode: 'pt-BR',
          },
          systemInstruction: this.systemInstruction,
        },
      });
    } catch (e) {
      console.error('Session connection failed:', e);
      this.connectionState = 'error';
      this.logEvent(`Falha na conexão: ${(e as Error).message}`, 'error');
      
      // Check if it's a quota error and we haven't tried fallback yet
      if (this.isQuotaError(e) && !this.usingFallback) {
        this.logEvent('Erro de quota detectado, tentando fallback...', 'info');
        try {
          await this.initFallbackClient();
          // For OpenRouter fallback, we don't create a Gemini session
          // Instead, we'll handle audio differently in the recording methods
          return;
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
          this.logEvent(`Fallback falhou: ${(fallbackError as Error).message}`, 'error');
        }
      }
      
      // Attempt reconnection if we haven't exceeded the limit
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnection();
      } else {
        this.updateError(`Erro na conexão: ${(e as Error).message}`);
      }
    }
  }

  private attemptReconnection() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Exponential backoff, max 10s
    
    this.updateStatus(`Tentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.logEvent(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay}ms`, 'info');
    
    this.reconnectTimeout = setTimeout(() => {
      this.initSession(this.systemInstruction, undefined);
    }, delay);
  }

  private updateStatus(msg: string) {
    // Updating status
    
    // Check if this status message indicates a quota issue
    if (!this.usingFallback && this.isQuotaError({message: msg})) {
      // Quota error detected, attempting fallback
      this.logEvent('Erro de quota detectado no updateStatus, tentando fallback...', 'info');
      this.initFallbackClient().catch(fallbackError => {
        console.error('Fallback failed in updateStatus:', fallbackError);
        this.logEvent(`Fallback falhou: ${(fallbackError as Error).message}`, 'error');
      });
      return;
    }
    
    this.status = msg;
    this.error = '';
  }

  private updateError(msg: string) {
    // Updating error state
    
    // Check if this error message indicates a quota issue
    if (!this.usingFallback && this.isQuotaError({message: msg})) {
      // Quota error detected, attempting fallback
      this.logEvent('Erro de quota detectado no updateError, tentando fallback...', 'info');
      this.initFallbackClient().catch(fallbackError => {
        console.error('Fallback failed in updateError:', fallbackError);
        this.logEvent(`Fallback falhou: ${(fallbackError as Error).message}`, 'error');
      });
      return;
    }
    
    this.error = msg;
    this.status = '';
    this.logEvent(msg, 'error');
    setTimeout(() => {
      if (this.error === msg) {
        this.error = '';
      }
    }, 5000);
  }

  private getConnectionStatusText(): string {
    const baseStatus = (() => {
      switch (this.connectionState) {
        case 'connected':
          return 'Conectado';
        case 'connecting':
          return 'Conectando...';
        case 'disconnected':
          return 'Desconectado';
        case 'error':
          return 'Erro de Conexão';
        default:
          return 'Desconectado';
      }
    })();
    
    // Add fallback indicator if using OpenRouter
    return this.usingFallback ? `${baseStatus} (Fallback)` : baseStatus;
  }

  private isQuotaError(error: any): boolean {
    // Log error details for debugging
    // Checking for quota-related error
    
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorString = String(error).toLowerCase();
    const errorCode = error?.status || error?.code;
    
    // Check multiple possible locations for quota error messages
    const isQuotaRelated = errorMessage.includes('quota') || 
                          errorMessage.includes('exceeded') ||
                          errorMessage.includes('limit') ||
                          errorMessage.includes('billing') ||
                          errorString.includes('quota') ||
                          errorString.includes('exceeded') ||
                          errorString.includes('limit') ||
                          errorString.includes('billing') ||
                          errorCode === 429;
    
    // Quota error detection result: isQuotaRelated
    
    return isQuotaRelated;
  }

  private async initFallbackClient() {
    this.currentProvider = 'openrouter';
    this.usingFallback = true;
    
    this.logEvent('Ativando fallback OpenRouter devido a erro de quota do Gemini', 'info');
    this.updateStatus('Conectando via OpenRouter (fallback)...');
    
    // OpenRouter doesn't support native audio streaming like Gemini,
    // so we'll need to handle this differently - convert audio to text first
    // For now, we'll indicate that fallback is active and ready
    try {
      this.logEvent('Fallback OpenRouter configurado e pronto', 'success');
      this.updateStatus('Conectado via OpenRouter (fallback)');
      this.connectionState = 'connected';
    } catch (error) {
      this.logEvent(`Erro ao configurar fallback: ${(error as Error).message}`, 'error');
      throw error;
    }
  }

  private async sendToOpenRouter(message: string): Promise<string> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Title': 'Live Gemini Assistant Fallback'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:preview',
          messages: [
            {
              role: 'system',
              content: this.systemInstruction
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';
    } catch (error) {
      this.logEvent(`Erro no OpenRouter: ${(error as Error).message}`, 'error');
      throw error;
    }
  }

  private async startFallbackRecording() {
    this.isRecording = true;
    this.audioChunks = [];
    
    // Setup MediaRecorder for fallback audio recording
    this.mediaRecorder = new MediaRecorder(this.mediaStream);
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };
    
    this.mediaRecorder.onstop = async () => {
      try {
        // Convert recorded audio to text using speech recognition
        await this.processAudioWithSpeechRecognition();
      } catch (error) {
        this.updateError(`Erro no reconhecimento de fala: ${(error as Error).message}`);
        this.logEvent(`Erro no reconhecimento de fala: ${(error as Error).message}`, 'error');
      }
    };
    
    // Setup speech recognition as backup
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = false;
      this.speechRecognition.interimResults = false;
      this.speechRecognition.lang = 'pt-BR';
      this.speechRecognition.maxAlternatives = 1;
      
      this.speechRecognition.onstart = () => {
        // Speech recognition started
        this.updateStatus('🎤 Processando fala... (Fallback)');
      };
      
      this.speechRecognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        // Speech recognition result received
        this.logEvent(`Fala reconhecida: ${transcript}`, 'process');
        await this.sendTextToOpenRouter(transcript);
      };
      
      this.speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.logEvent(`Erro no reconhecimento de fala: ${event.error}`, 'error');
      };
      
      this.speechRecognition.onend = () => {
        // Speech recognition ended
      };
    } else {
      console.warn('Speech Recognition not supported in this browser');
      this.logEvent('Reconhecimento de fala não suportado neste navegador', 'error');
    }
    
    this.mediaRecorder.start();
    this.updateStatus('🔴 Gravando... Fale agora (Fallback).');
    this.logEvent('Gravação iniciada no modo fallback.', 'record');
  }

  private async processAudioWithSpeechRecognition() {
    if (this.speechRecognition) {
      this.speechRecognition.start();
    } else {
      this.updateError('Reconhecimento de fala não disponível neste navegador.');
    }
  }

  private async sendTextToOpenRouter(text: string) {
    try {
      this.updateStatus('Enviando mensagem para OpenRouter...');
      const response = await this.sendToOpenRouter(text);
      
      // Convert text response to speech using browser's speech synthesis
      this.speakResponse(response);
      
      this.updateStatus('Conectado via OpenRouter (fallback)');
      this.logEvent('Resposta recebida do OpenRouter.', 'success');
    } catch (error) {
      this.updateError(`Erro ao comunicar com OpenRouter: ${(error as Error).message}`);
      this.logEvent(`Erro no OpenRouter: ${(error as Error).message}`, 'error');
    }
  }

  private speakResponse(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      
      // Find Portuguese voice if available
      const voices = speechSynthesis.getVoices();
      const portugueseVoice = voices.find(voice => 
        voice.lang.includes('pt') || voice.lang.includes('BR')
      );
      if (portugueseVoice) {
        utterance.voice = portugueseVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  }


  private async startRecording() {
    if (this.isRecording) {
      return;
    }
    this.searchResults = [];

    this.updateStatus('Pedindo acesso ao microfone...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Acesso ao microfone concedido. Iniciando captura...');

      // If using fallback (OpenRouter), use speech recognition instead of real-time audio
      if (this.usingFallback) {
        await this.startFallbackRecording();
        return;
      }

      // Original Gemini audio streaming logic
      this.inputAudioContext.resume();
      
      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256;
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        // Immediate exit if recording has been stopped
        if (!this.isRecording) return;
        
        // Check if session is still active and connected before sending audio data
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          // Session not available - stopping recording
          this.stopRecording();
          return;
        }

        // Additional check: verify we're not in an error state or trying to reconnect
        if (this.connectionState === 'error' || this.connectionState === 'connecting') {
          // Connection error - stopping recording
          this.stopRecording();
          return;
        }

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        // Additional safety check: ensure the session exists and is properly connected
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          // Session unavailable - stopping recording
          this.stopRecording();
          return;
        }

        try {
          this.session.sendRealtimeInput({media: createBlob(pcmData)});
        } catch (error) {
          console.error('Error sending audio data:', error);
          
          // Always stop recording on any audio sending error to prevent spam
          this.stopRecording();
          this.connectionState = 'error';
          
          // Check if it's a WebSocket-related error
          const errorMessage = (error as Error).message?.toLowerCase() || '';
          if (errorMessage.includes('websocket') || 
              errorMessage.includes('connection') || 
              errorMessage.includes('closed') ||
              errorMessage.includes('closing')) {
            
            // Attempt reconnection if we haven't exceeded the limit
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.attemptReconnection();
            } else {
              this.updateError('Conexão perdida. Clique em reiniciar para reconectar.');
            }
          } else {
            this.updateError(`Erro ao enviar áudio: ${(error as Error).message}`);
          }
        }
      };

      this.sourceNode.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.inputAudioContext.destination);

      this.isRecording = true;
      this.updateStatus('🔴 Gravando... Fale agora.');
      this.logEvent('Gravação iniciada.', 'record');
    } catch (err) {
      console.error('Error starting recording:', err);
      this.updateError(`Erro ao iniciar gravação: ${(err as Error).message}`);
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext)
      return;

    this.updateStatus('Parando gravação...');

    this.isRecording = false;

    // Handle fallback recording cleanup
    if (this.usingFallback) {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      if (this.speechRecognition) {
        try {
          this.speechRecognition.stop();
        } catch (e) {
          // Error stopping speech recognition
        }
      }
    } else {
      // Clean up audio processing nodes with proper error handling
      if (this.scriptProcessorNode) {
        try {
          // Remove the audio processing callback to stop processing immediately
          this.scriptProcessorNode.onaudioprocess = null;
          this.scriptProcessorNode.disconnect();
        } catch (e) {
          // Error disconnecting audio processor
        }
        this.scriptProcessorNode = null;
      }

      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch (e) {
          // Error disconnecting audio source
        }
        this.sourceNode = null;
      }
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.logEvent('Gravação parada.', 'record');
    this.updateStatus('Gravação parada. Clique para começar de novo.');
  }

  private async handleAnalysisSubmit(e: Event) {
    e.preventDefault();
    if (this.isProcessing) return;

    const hasTextInput = this.urlInput.trim().length > 0;
    const hasFile = this.selectedFile !== null;

    if (!hasTextInput && !hasFile) {
      this.updateError('Forneça uma URL, um tópico ou carregue um arquivo.');
      return;
    }

    this.isProcessing = true;
    this.analysisProgress = 0;
    // Faked progress timer
    const estimatedDuration = 45000; // 45 seconds seems like a good estimate
    const intervalStartTime = Date.now();
    this.analysisTimer = window.setInterval(() => {
      if (this.analysisProgress < 95) {
        // Stop updating if it's "stuck" at 95
        const elapsedTime = Date.now() - intervalStartTime;
        const progress = (elapsedTime / estimatedDuration) * 95;
        this.analysisProgress = Math.min(95, Math.floor(progress));
      }
    }, 500); // update twice a second

    this.updateStatus('Iniciando análise...');
    this.logEvent('Análise de conteúdo iniciada.', 'process');
    this.analysisResult = '';
    this.searchResults = [];
    this.processedContentInfo = null;

    try {
      let contents: any;
      let contentTitle: string = '';
      let contentSource: string = '';
      let analysisPrompt: string;
      let persona: 'assistant' | 'analyst' = 'assistant';
      let contentType = 'general';
      const generateContentConfig: any = {
        model: 'gemini-2.5-flash',
      };

      if (hasFile) {
        contentTitle = this.selectedFile!.name;
        contentSource = 'Arquivo Local';
        const file = this.selectedFile!;
        const mimeType = file.type;
        const fileName = file.name.toLowerCase();

        if (mimeType.startsWith('image/')) {
          this.updateStatus(`Processando imagem: ${contentTitle}`);
          this.logEvent(`Analisando imagem: ${contentTitle}`, 'process');
          const base64Data = await fileToBase64(file);
          analysisPrompt =
            'Analise esta imagem em detalhes. Descreva todos os elementos visuais, o contexto e quaisquer textos visíveis. Responda em português.';
          contents = {
            parts: [
              {text: analysisPrompt},
              {inlineData: {mimeType, data: base64Data}},
            ],
          };
        } else if (mimeType === 'application/pdf') {
          this.updateStatus(`Processando PDF: ${contentTitle}`);
          this.logEvent(`Analisando PDF: ${contentTitle}`, 'process');
          const base64Data = await fileToBase64(file);
          analysisPrompt =
            'Analise este documento PDF. Extraia um resumo detalhado, os pontos principais e quaisquer conclusões importantes. Responda em português.';
          contents = {
            parts: [
              {text: analysisPrompt},
              {inlineData: {mimeType, data: base64Data}},
            ],
          };
        } else if (
          fileName.endsWith('.csv') ||
          mimeType === 'text/csv' ||
          fileName.endsWith('.xlsx') ||
          mimeType.includes('spreadsheet') ||
          fileName.endsWith('.xls')
        ) {
          persona = 'analyst';
          this.updateStatus(`Processando planilha: ${contentTitle}`);
          this.logEvent(`Analisando planilha: ${contentTitle}`, 'process');
          const arrayBuffer = await fileToArrayBuffer(file);
          const workbook = XLSX.read(arrayBuffer, {type: 'array'});
          const sheetNames = workbook.SheetNames;
          let fullCsvContent = '';
          for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            fullCsvContent += `--- INÍCIO DA PLANILHA: ${sheetName} ---\n\n${csv}\n\n--- FIM DA PLANILHA: ${sheetName} ---\n\n`;
          }
          analysisPrompt = `Você é um analista de dados especialista. O seguinte texto contém dados extraídos de uma planilha, possivelmente com múltiplas abas, em formato CSV. Sua tarefa é analisar esses dados profundamente. Responda em português.\n\n**Análise Requerida:**\n1.  **Resumo Geral:** Forneça uma visão geral dos dados.\n2.  **Estrutura dos Dados:** Identifique as colunas e o tipo de dados que elas contêm.\n3.  **Principais Métricas:** Calcule ou identifique métricas importantes (médias, totais, contagens, etc.).\n4.  **Insights e Tendências:** Aponte quaisquer padrões, correlações ou tendências interessantes que você observar.\n\nEste resumo detalhado será seu único conhecimento sobre a planilha. Prepare-se para responder a perguntas específicas sobre ela.\n\n--- CONTEÚDO DA PLANILHA ---\n${fullCsvContent}`;
          contents = {parts: [{text: analysisPrompt}]};
        } else if (
          fileName.endsWith('.doc') ||
          fileName.endsWith('.docx') ||
          mimeType.includes('wordprocessingml')
        ) {
          this.updateStatus(`Processando documento: ${contentTitle}`);
          this.logEvent(`Analisando documento: ${contentTitle}`, 'process');
          const arrayBuffer = await fileToArrayBuffer(file);
          const {value: textContent} = await mammoth.extractRawText({
            arrayBuffer,
          });
          analysisPrompt = `Analise este documento de texto. Extraia um resumo detalhado, os pontos principais e quaisquer conclusões importantes. Responda em português.\n\n--- CONTEÚDO DO DOCUMENTO ---\n${textContent}`;
          contents = {parts: [{text: analysisPrompt}]};
        } else if (
          fileName.endsWith('.md') ||
          mimeType === 'text/markdown' ||
          mimeType === 'text/x-markdown'
        ) {
          this.updateStatus(`Processando arquivo Markdown: ${contentTitle}`);
          this.logEvent(`Analisando arquivo Markdown: ${contentTitle}`, 'process');
          const text = await file.text();
          analysisPrompt = `Analise este arquivo Markdown. Forneça um resumo abrangente, identifique os pontos-chave, a estrutura do documento e quaisquer informações importantes. Responda em português.\n\n--- CONTEÚDO MARKDOWN ---\n${text}`;
          contents = {parts: [{text: analysisPrompt}]};
        } else {
          throw new Error(
            `Tipo de arquivo não suportado: ${
              mimeType || fileName
            }. Por favor, use imagens, PDFs, planilhas, documentos ou arquivos Markdown.`,
          );
        }
      } else {
        // hasTextInput
        const input = this.urlInput.trim();
        if (isValidUrl(input)) {
          contentSource = input;

          if (getYouTubeVideoId(input)) {
            contentType = 'youtube';
            this.updateStatus('Buscando informações do vídeo do YouTube...');
            contentTitle = await getYouTubeVideoTitle(input);
            this.updateStatus('Analisando vídeo do YouTube...');
            this.logEvent(`Analisando YouTube: ${contentTitle}`, 'process');
            analysisPrompt = `Você é um assistente multimodal. Analise este vídeo do YouTube de forma completa, processando tanto o áudio quanto os quadros visuais. Crie um resumo detalhado para que você possa responder perguntas sobre o vídeo. Sua análise deve incluir:
1. **Conteúdo Falado**: Tópicos principais, argumentos e conclusões.
2. **Análise Visual**: Descrição de cenas importantes, pessoas (e suas ações ou aparências, como cor de roupa), objetos, textos na tela e o ambiente geral.
3. **Eventos Chave**: Uma cronologia de eventos importantes, combinando informações visuais e de áudio, com timestamps se possível.

Seja o mais detalhado possível. Este resumo será seu único conhecimento sobre o vídeo. Responda em português.`;
            contents = {
              parts: [
                {text: analysisPrompt},
                {fileData: {mimeType: 'video/mp4', fileUri: input}},
              ],
            };
          } else if (input.includes('github.com/')) {
            const repoMatch = input.match(/github\.com\/([^\/]+\/[^\/]+)/);
            if (!repoMatch) {
              throw new Error(
                'URL do GitHub inválida. Use o formato https://github.com/owner/repo.',
              );
            }
            const repoPath = repoMatch[1].replace(/\.git$/, '').replace(/\/$/, '');
            const [owner, repo] = repoPath.split('/');

            contentTitle = `${owner}/${repo}`;
            contentSource = `GitHub: ${input}`;
            contentType = 'github';

            this.updateStatus(`Analisando repositório: ${contentTitle}`);
            this.logEvent(
              `Iniciando análise do repositório: ${contentTitle}`,
              'process',
            );

            // 1. Fetch README
            this.updateStatus(`Buscando README de ${contentTitle}...`);
            const readmeResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/readme`,
            );
            if (readmeResponse.status === 404) {
              throw new Error(
                `Repositório não encontrado ou é privado: ${contentTitle}.`,
              );
            }
            if (!readmeResponse.ok) {
              throw new Error(
                `Não foi possível buscar o README do repositório ${contentTitle}.`,
              );
            }
            const readmeData = await readmeResponse.json();
            const readmeContent = atob(readmeData.content);

            // 2. Fetch file tree
            this.updateStatus(
              `Buscando estrutura de arquivos de ${contentTitle}...`,
            );
            const repoInfoResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}`,
            );
            if (!repoInfoResponse.ok) {
              throw new Error(
                `Não foi possível buscar informações do repositório ${contentTitle}.`,
              );
            }
            const repoInfo = await repoInfoResponse.json();
            const defaultBranch = repoInfo.default_branch;

            const treeResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
            );
            if (!treeResponse.ok) {
              throw new Error(
                `Não foi possível buscar a estrutura de arquivos de ${contentTitle}.`,
              );
            }
            const treeData = await treeResponse.json();
            if (treeData.truncated) {
              this.logEvent(
                'A estrutura de arquivos é muito grande e foi truncada.',
                'info',
              );
            }
            const fileTreeText = treeData.tree
              .map((file: any) => file.path)
              .join('\n');

            this.updateStatus(`Analisando ${contentTitle} com a IA...`);
            analysisPrompt = `Você é um especialista em análise de repositórios do GitHub. Analise o seguinte repositório: "${contentTitle}".
Abaixo estão o conteúdo do arquivo README.md e a estrutura de arquivos do projeto.
Sua tarefa é criar um resumo detalhado para que você possa responder a perguntas sobre o repositório. Sua análise deve incluir:
1. **Propósito do Repositório**: Qual problema ele resolve? Qual é o seu objetivo principal?
2. **Tecnologias Utilizadas**: Com base na estrutura de arquivos e no README, quais são as principais linguagens, frameworks e ferramentas usadas?
3. **Como Começar**: Como um novo desenvolvedor poderia configurar e rodar o projeto?
4. **Estrutura do Projeto**: Descreva a organização das pastas e arquivos importantes.

Seja o mais detalhado possível. Este resumo será seu único conhecimento sobre o repositório. Responda em português.

--- CONTEÚDO DO README.md ---
${readmeContent}

--- ESTRUTURA DE ARQUIVOS ---
${fileTreeText}
`;
            contents = {parts: [{text: analysisPrompt}]};
            generateContentConfig.tools = [{googleSearch: {}}];
          } else if (input.includes('docs.google.com/spreadsheets/')) {
            persona = 'analyst';
            this.updateStatus('Analisando planilha do Google Sheets...');
            this.logEvent('Analisando Google Sheets', 'process');
            const sheetKeyMatch = input.match(
              /spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            );
            if (!sheetKeyMatch) {
              throw new Error('URL do Google Sheets inválida.');
            }
            const sheetKey = sheetKeyMatch[1];

            // Scrape URL to get a title, as CSV export doesn't provide one.
            const scrapeResult = await scrapeUrl(input);
            contentTitle =
              (scrapeResult.data && scrapeResult.data.metadata.title) ||
              'Planilha do Google';
            this.updateStatus(`Analisando: ${contentTitle}`);

            // Note: This fetches the first sheet (gid=0) as CSV. Only works for public sheets.
            const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetKey}/export?format=csv`;
            const response = await fetch(csvExportUrl);
            if (!response.ok) {
              throw new Error(
                'Falha ao buscar dados da planilha. Verifique se ela é pública.',
              );
            }
            const csvData = await response.text();
            analysisPrompt = `Você é um analista de dados especialista. O seguinte texto contém dados extraídos de uma planilha do Google Sheets, em formato CSV. Sua tarefa é analisar esses dados profundamente. Responda em português.\n\n**Análise Requerida:**\n1.  **Resumo Geral:** Forneça uma visão geral dos dados.\n2.  **Principais Métricas:** Identifique e resuma as métricas chave.\n3.  **Insights e Tendências:** Aponte padrões ou tendências importantes.\n\nPrepare-se para responder a perguntas específicas sobre a planilha.\n\n--- CONTEÚDO DA PLANILHA ---\n${csvData}`;
            contents = {parts: [{text: analysisPrompt}]};
          } else {
            // Other URL (including Google Docs)
            const logMsg = input.includes('docs.google.com/document/')
              ? 'Analisando Google Docs'
              : `Analisando URL: ${input}`;
            this.updateStatus('Extraindo conteúdo com Firecrawl...');
            this.logEvent(logMsg, 'process');
            const scrapeResult = await scrapeUrl(input);
            if (!scrapeResult.success || !scrapeResult.data) {
              throw new Error(
                scrapeResult.error || 'Falha ao extrair conteúdo da URL.',
              );
            }
            contentTitle = scrapeResult.data.metadata.title || input;
            const scrapedMarkdown = scrapeResult.data.markdown;

            this.updateStatus('Analisando conteúdo da página...');
            analysisPrompt = `O seguinte é o conteúdo em markdown de uma página da web. Analise-o e extraia um resumo detalhado, os pontos principais e as conclusões. Prepare-se para responder a perguntas sobre ele. Responda em português.\n\n--- CONTEÚDO DA PÁGINA ---\n${scrapedMarkdown}`;
            contents = {parts: [{text: analysisPrompt}]};
          }
        } else {
          // It's a search topic (Deep Search)
          contentTitle = input;
          contentSource = 'Pesquisa Aprofundada na Web';
          this.updateStatus(
            `Iniciando pesquisa aprofundada sobre "${contentTitle}"...`,
          );
          this.logEvent(
            `Iniciando pesquisa sobre: "${contentTitle}"`,
            'process',
          );

          analysisPrompt = `Realize uma pesquisa aprofundada e abrangente sobre o seguinte tópico: "${contentTitle}".
Sua tarefa é atuar como um pesquisador especialista. Use o Google Search para reunir informações de diversas fontes confiáveis.
Após a pesquisa, sintetize os resultados em uma análise estruturada e detalhada. A análise deve ser formatada em markdown e cobrir os seguintes pontos:

- **Introdução**: Uma visão geral do tópico.
- **Principais Conceitos**: Definições e explicações dos termos-chave.
- **Estado da Arte**: O status atual, incluindo os desenvolvimentos mais recentes e dados relevantes.
- **Impactos e Implicações**: As consequências positivas e negativas do tópico em diferentes áreas.
- **Desafios e Controvérsias**: Quais são os principais obstáculos, debates ou críticas associados.
- **Perspectivas Futuras**: O que esperar para o futuro, incluindo tendências e previsões.
- **Conclusão**: Um resumo dos pontos mais importantes.

Responda em português.`;
          contents = {parts: [{text: analysisPrompt}]};
          generateContentConfig.tools = [{googleSearch: {}}];
        }
      }

      this.updateStatus('Gerando análise com a IA...');
      const response = await fetch(`${(import.meta as any).env?.REACT_APP_BACKEND_URL || ''}/api/genai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: generateContentConfig.model || 'gemini-2.5-flash',
          contents: contents,
          tools: generateContentConfig.tools,
          generationConfig: generateContentConfig.generationConfig,
        }),
      });

      this.analysisProgress = 100;
      await new Promise((resolve) => setTimeout(resolve, 500));

      const analysisText = response.text;
      if (!analysisText?.trim()) {
        throw new Error('A análise retornou um resultado vazio.');
      }

      this.analysisResult = analysisText;
      this.processedContentInfo = {
        title: contentTitle,
        source: contentSource,
      };
      this.logEvent('Análise concluída com sucesso.', 'success');

      let newSystemInstruction: string;
      if (persona === 'analyst') {
        newSystemInstruction = `Você é um assistente de voz e analista de dados especialista. Seu foco é o conteúdo da seguinte planilha/documento: "${contentTitle}".
Você já realizou uma análise preliminar e tem o seguinte resumo como seu conhecimento base.
--- INÍCIO DO CONHECIMENTO ---
${analysisText}
--- FIM DO CONHECIMENTO ---
Seu papel é:
1. Responder perguntas sobre os dados usando o conhecimento acima. Seja preciso e quantitativo sempre que possível.
2. Manter um tom de analista: claro, objetivo e focado nos dados. Fale em português do Brasil.
3. Se a pergunta for sobre algo não contido nos dados, indique que a informação não está na planilha. Você não pode pesquisar informações externas.
4. Não invente dados; atenha-se estritamente ao conhecimento fornecido.`;
      } else {
        if (contentType === 'github') {
          newSystemInstruction = `Você é um assistente de voz e especialista no repositório do GitHub: "${contentTitle}".
Você já analisou o README e a estrutura de arquivos do projeto. Seu conhecimento base é o seguinte resumo:
--- INÍCIO DO CONHECIMENTO ---
${analysisText}
--- FIM DO CONHECIMENTO ---
Seu papel é:
1. Responder perguntas sobre o propósito, tecnologia, estrutura e como usar o repositório.
2. Manter um tom técnico e prestativo, como um engenheiro de software sênior, falando em português do Brasil.
3. Se a informação não estiver no seu conhecimento, indique que a resposta não pode ser encontrada no resumo do repositório. Você não pode pesquisar na web.
4. Não invente informações; atenha-se estritamente ao seu conhecimento do repositório.`;
        } else if (contentType === 'youtube') {
          newSystemInstruction = `Você é um assistente de voz inteligente especializado no vídeo do YouTube: "${contentTitle}".
Você já assistiu ao vídeo e analisou tanto o áudio quanto os elementos visuais. Seu conhecimento base é o seguinte resumo:
--- INÍCIO DO CONHECIMENTO ---
${analysisText}
--- FIM DO CONHECIMENTO ---
Seu papel é:
1. Responder a perguntas sobre o vídeo. Isso inclui o conteúdo falado (tópicos, ideias) E detalhes visuais (cores, pessoas, objetos, texto na tela, ações).
2. Manter um tom conversacional e natural em português do Brasil.
3. Se a informação não estiver no seu conhecimento (o resumo do vídeo), indique que a resposta não se encontra no vídeo. Você não pode pesquisar na web.
4. Não invente informações; atenha-se estritamente ao seu conhecimento do vídeo.`;
        } else {
          newSystemInstruction = `Você é um assistente de voz inteligente especializado no seguinte conteúdo: "${contentTitle}".
Você já analisou o conteúdo e tem o seguinte resumo detalhado como seu conhecimento.
--- INÍCIO DO CONHECIMENTO ---
${analysisText}
--- FIM DO CONHECIMENTO ---
Seu papel é:
1. Responder perguntas sobre o conteúdo usando o conhecimento acima.
2. Manter um tom conversacional e natural em português do Brasil.
3. Se a informação não estiver no seu conhecimento, indique que a resposta não se encontra no conteúdo original. Você não pode pesquisar na web.
4. Não invente informações; atenha-se ao conhecimento fornecido.`;
        }
      }

      this.updateStatus('Configurando assistente para o novo conteúdo...');
      this.logEvent(
        `Assistente configurado para: "${contentTitle}"`,
        'success',
      );
      await this.initSession(newSystemInstruction, persona);

      this.updateStatus(`Pronto! Pergunte sobre "${contentTitle}"`);
    } catch (err) {
      console.error(err);
      this.updateError(`Erro na análise: ${(err as Error).message}`);
      await this.reset(); // Reset to default on error
    } finally {
      if (this.analysisTimer) {
        window.clearInterval(this.analysisTimer);
        this.analysisTimer = undefined;
      }
      this.isProcessing = false;
    }
  }

  private triggerFileInput() {
    this.shadowRoot?.getElementById('file-input')?.click();
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.urlInput = this.selectedFile.name; // Show file name in input
    } else {
      this.selectedFile = null;
    }
  }

  private reset() {
    this.initSession();
  }

  private async performTavilySearch(query: string) {
    this.updateStatus(`🔍 Pesquisando: "${query}"...`);
    this.logEvent(`🌐 Iniciando busca no Tavily API...`, 'process');

    try {
      const searchResults = await searchTavily(query, {
        search_depth: 'basic',
        max_results: 5,
        include_answer: 'basic'
      });

      // Log detailed sources
      this.logEvent(`✅ PESQUISA CONCLUÍDA - ${searchResults.results.length} fontes encontradas:`, 'success');
      searchResults.results.forEach((result, index) => {
        this.logEvent(`📄 Fonte ${index + 1}: ${result.title}`, 'info');
        this.logEvent(`🔗 URL: ${result.url}`, 'info');
      });

      const formattedResults = formatSearchResultsForAssistant(searchResults);
      
      // Send the results back to the assistant
      // Enviar resultados para o assistente via backend WS
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'text_message',
          text: `Com base na pesquisa realizada, aqui estão as informações encontradas:\n\n${formattedResults}\n\nResponda de forma natural ao usuário usando essas informações, sem mencionar que você pesquisou.`
        }));
      }

      this.updateStatus('✅ Pesquisa concluída - Assistente desbloqueado');
      this.logEvent('🎤 Assistente DESBLOQUEADO - Pronto para conversar', 'success');
      
      // Update search results for display
      this.searchResults = searchResults.results.map(r => ({
        uri: r.url,
        title: r.title
      }));

    } catch (error) {
      this.updateError(`❌ Erro na pesquisa: ${(error as Error).message}`);
      this.logEvent(`❌ ERRO na pesquisa: ${(error as Error).message}`, 'error');
      
      // Inform the assistant about the error
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'text_message',
          text: `Desculpe, ocorreu um erro ao realizar a pesquisa. Por favor, tente responder com base no seu conhecimento atual.`
        }));
      }
    } finally {
      this.isSearching = false;
      this.pendingSearchQuery = '';
      this.logEvent('🔓 Sistema desbloqueado', 'info');
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9._-]/gi, '_').substring(0, 100);
  }

  private playSearchSound() {
    try {
      // Create a subtle search sound using Web Audio API
      const audioContext = this.outputAudioContext;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a subtle two-tone search sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
      
      // Soft volume with fade
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Could not play search sound
    }
  }

  private downloadMarkdown() {
    if (!this.analysisResult) return;

    const sanitizedTitle = this.processedContentInfo
      ? this.sanitizeFilename(this.processedContentInfo.title)
      : 'analise';

    const blob = new Blob([this.analysisResult], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizedTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.logEvent('Análise baixada como Markdown.', 'info');
  }

  private async downloadPdf() {
    if (!this.analysisResult) return;
    const contentElement = this.shadowRoot?.getElementById(
      'analysis-content-for-pdf',
    );
    if (!contentElement) {
      console.error('Não foi possível encontrar o conteúdo para gerar o PDF.');
      return;
    }
    this.updateStatus('Gerando PDF...');
    this.logEvent('Iniciando geração de PDF.', 'process');

    // Inject a temporary stylesheet to ensure content is visible on a white background
    const tempStyle = document.createElement('style');
    tempStyle.id = 'temp-pdf-style';
    tempStyle.innerHTML = `
      #analysis-content-for-pdf {
        background-color: white !important;
      }
      #analysis-content-for-pdf,
      #analysis-content-for-pdf * {
        color: black !important;
        text-shadow: none !important;
      }
      #analysis-content-for-pdf blockquote {
        color: #333 !important;
        border-left-color: #ccc !important;
      }
      #analysis-content-for-pdf code {
        background: #f0f0f0 !important;
        color: #333 !important;
      }
      #analysis-content-for-pdf a {
        color: #0000ee !important;
        text-decoration: underline !important;
      }
    `;
    this.shadowRoot?.appendChild(tempStyle);

    try {
      const sanitizedTitle = this.processedContentInfo
        ? this.sanitizeFilename(this.processedContentInfo.title)
        : 'analise';

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4',
      });

      const doc = await pdf.html(contentElement, {
        margin: [40, 40, 40, 40],
        autoPaging: 'text',
        html2canvas: {
          scale: 0.7,
          useCORS: true,
          backgroundColor: '#ffffff', // Explicitly set a white background
        },
        width: 515,
        windowWidth: contentElement.scrollWidth,
      });
      doc.save(`${sanitizedTitle}.pdf`);
      this.updateStatus('PDF gerado com sucesso!');
      this.logEvent('Análise baixada como PDF.', 'info');
    } catch (err) {
      console.error('Falha ao gerar o PDF:', err);
    } finally {
      // Always remove the temporary stylesheet
      this.shadowRoot?.getElementById('temp-pdf-style')?.remove();
    }
  }

  private async shareAnalysis() {
    if (!this.analysisResult) return;

    const shareData = {
      title: `Análise: ${this.processedContentInfo?.title || 'Conteúdo Analisado'}`,
      text: this.analysisResult,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        this.logEvent('Análise compartilhada com sucesso.', 'success');
      } catch (err) {
        console.warn('Share was cancelled or failed', err);
        this.logEvent('Compartilhamento cancelado.', 'info');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(this.analysisResult);
        this.updateStatus('Análise copiada para a área de transferência!');
        this.logEvent(
          'Análise copiada para a área de transferência.',
          'info',
        );
      } catch (err) {
        this.updateError('Falha ao copiar para a área de transferência.');
        console.error('Failed to copy text: ', err);
      }
    }
  }

  private _renderTimelineIcon(type: TimelineEvent['type']) {
    const icons = {
      info: svg`<path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/>`,
      success: svg`<path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>`,
      error: svg`<path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Z"/>`,
      record: svg`<path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40-600v240q0 17 11.5 28.5T480-720q17 0 28.5-11.5T520-760v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760ZM160-80v-400h80v400h-80Zm160 0v-400h80v400h-80Zm160 0v-400h80v400h-80Zm160 0v-400h80v400h-80Z"/>`,
      process: svg`<path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>`,
      connect: svg`<path d="m560-440-56-56 103-104H160v-80h447L504-784l56-56 200 200-200 200ZM160-120v-80h240v80H160Zm0-160v-80h400v80H160Z"/>`,
      disconnect: svg`<path d="M640-120v-80H240v80h400Zm-82-160-58-58-99-99-22-21 43-43 21 22 99 99 58 58 56-56-224-224-56 56 224 224-56 56Zm82-200v-80h-87l-63-63 56-57 174 174v126h-80Z"/>`,
    };
    return svg`
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
        ${icons[type] || icons['info']}
      </svg>
    `;
  }

  render() {
    return html`
      <div class="app-content ${this.showAnalysisModal ? 'with-panel' : ''}">
        <!-- Connection Status Indicator -->
        <div class="connection-status">
          <div class="connection-indicator ${this.connectionState}"></div>
          <span>${this.getConnectionStatusText()}</span>
        </div>

        <!-- Analysis side panel (non-blocking) -->
        <div class="analysis-panel ${this.showAnalysisModal ? 'open' : ''}">
          <div class="analysis-panel-header">
            <h3>Análise do Conteúdo</h3>
            <button class="close-btn" @click=${() => (this.showAnalysisModal = false)} aria-label="Fechar painel">
              <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px">
                <path d="M480-424 272-216l-56-56 208-208-208-208 56-56 208 208 208-208 56 56-208 208 208 208-56 56-208-208Z" />
              </svg>
              Fechar
            </button>
          </div>
          <div id="analysis-content-for-pdf" class="analysis-text-content">
            ${this.analysisResult
              ? unsafeHTML(marked.parse(this.analysisResult))
              : html`<p style="color:#ccc">Nenhuma análise disponível.</p>`}
          </div>
          <div class="modal-actions">
            <button @click=${this.downloadPdf} title="Baixar como PDF">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                <path d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320v80H240v640h480v-400h80v400q0 33-23.5 56.5T720-80H240Zm420-520v-280l280 280h-280Z" />
              </svg>
              <span>PDF</span>
            </button>
            <button @click=${this.downloadMarkdown} title="Baixar como Markdown (.md)">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                <path d="M480-320 280-520l56-56 104 104v-328h80v328l104-104 56 56-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
              </svg>
              <span>MD</span>
            </button>
            <button @click=${this.shareAnalysis} title="Compartilhar Análise">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px">
                <path d="M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-14.5L323-400q-21 15-47.5 23T220-360q-50 0-85-35t-35-85q0-50 35-85t85-35q30 0 56.5 10.5T323-560l281-171q-1-5-1.5-11.5T602-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-28 0-53.5-9.5T620-640L340-468q1 7 1.5 13.5t.5 14.5q0 7-1 14.5t-3 14.5l281 171q21-14 47-21.5t54-7.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM220-440q17 0 28.5-11.5T260-480q0-17-11.5-28.5T220-520q-17 0-28.5 11.5T180-480q0 17 11.5 28.5T220-440Zm500 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Z" />
              </svg>
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
        ${this.showTimelineModal
          ? html`
              <div
                class="modal-overlay"
                @click=${() => (this.showTimelineModal = false)}>
                <div
                  class="modal-content timeline-modal"
                  @click=${(e: Event) => e.stopPropagation()}>
                  <h3>Linha do Tempo da Sessão</h3>
                  <ul class="timeline-list">
                    ${this.timelineEvents.map(
                      (event) => html`
                        <li class="timeline-item timeline-type-${event.type}">
                          <div class="timeline-icon">
                            ${this._renderTimelineIcon(event.type)}
                          </div>
                          <div class="timeline-body">
                            <span class="timeline-message"
                              >${event.message}</span
                            >
                            <span class="timeline-timestamp"
                              >${event.timestamp}</span
                            >
                          </div>
                        </li>
                      `,
                    )}
                  </ul>
                  <div class="modal-actions">
                    <button
                      class="primary-btn"
                      @click=${() => (this.showTimelineModal = false)}>
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''}

        <div class="input-container">
          <form class="input-form" @submit=${this.handleAnalysisSubmit}>
            <input
              type="text"
              id="url-input"
              aria-label="URL, tópico de pesquisa ou nome do arquivo"
              placeholder="Cole uma URL, digite um tema para pesquisar ou carregue um arquivo..."
              .value=${this.urlInput}
              @input=${(e: Event) => {
                this.urlInput = (e.target as HTMLInputElement).value;
                if (this.selectedFile) {
                  this.selectedFile = null;
                  const fileInput = this.shadowRoot?.getElementById(
                    'file-input',
                  ) as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }
              }}
              ?disabled=${this.isProcessing} />
            <button
              type="button"
              class="icon-button"
              @click=${this.triggerFileInput}
              ?disabled=${this.isProcessing}
              title="Carregar um arquivo"
              aria-label="Carregar um arquivo">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#ffffff">
                <path
                  d="M440-320v-320H320l160-200 160 200H520v320H440ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
              </svg>
            </button>
            <button
              type="submit"
              aria-label="Analisar ou Pesquisar"
              ?disabled=${
                (!this.urlInput.trim() && !this.selectedFile) ||
                this.isProcessing
              }>
              ${this.isProcessing
                ? html`
                    <div class="progress-ring-wrapper">
                      <svg width="22" height="22" viewBox="0 0 22 22">
                        <circle
                          class="progress-ring__circle progress-ring__circle--bg"
                          cx="11"
                          cy="11"
                          r="9" />
                        <circle
                          class="progress-ring__circle progress-ring__circle--fg"
                          cx="11"
                          cy="11"
                          r="9"
                          style="stroke-dashoffset: calc(56.55 - (56.55 * ${this.analysisProgress}) / 100);" />
                      </svg>
                    </div>
                    <span>Processando... ${this.analysisProgress}%</span>
                  `
                : 'Analisar'}
            </button>
          </form>
          <input
            type="file"
            id="file-input"
            style="display: none;"
            @change=${this.handleFileSelect}
            accept="image/*,application/pdf,.csv,.xls,.xlsx,.doc,.docx,.md,text/markdown,text/x-markdown" />

          ${this.processedContentInfo
            ? html`
                <div class="content-display">
                  <h3>${this.processedContentInfo.title}</h3>
                  <p>Fonte: ${this.processedContentInfo.source}</p>
                </div>
              `
            : ''}
        </div>

        <div id="status" class=${this.error ? 'error' : ''}>
          ${this.error || this.status}
        </div>

        <div class="bottom-container">
          ${this.searchResults.length > 0
            ? html`
                <div class="search-results">
                  <p>Fontes da pesquisa:</p>
                  <ul>
                    ${this.searchResults.map(
                      (result) => html`
                        <li>
                          <a
                            href=${result.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            >${result.title || result.uri}</a
                          >
                        </li>
                      `,
                    )}
                  </ul>
                </div>
              `
            : ''}

          ${this.isSearching
            ? html`
                <div class="search-loading-overlay">
                  <div class="search-loading-circle">
                    <div class="spinner"></div>
                    <div class="search-text">
                      <div class="search-title">🔍 PESQUISANDO</div>
                      <div class="search-query">"${this.pendingSearchQuery}"</div>
                      <div class="search-status">Aguarde...</div>
                    </div>
                  </div>
                </div>
              `
            : ''}

          <div class="media-controls">
            <button
              id="startButton"
              @click=${this.startRecording}
              ?disabled=${this.isRecording || this.isSearching || this.connectionState !== 'connected'}
              aria-label="Iniciar gravação">
              <svg
                viewBox="0 0 100 100"
                width="24px"
                height="24px"
                fill="#c80000"
                xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" />
              </svg>
            </button>
            <button
              id="stopButton"
              @click=${this.stopRecording}
              ?disabled=${!this.isRecording || this.isSearching}
              aria-label="Parar gravação">
              <svg
                viewBox="0 0 100 100"
                width="24px"
                height="24px"
                fill="#ffffff"
                xmlns="http://www.w3.org/2000/svg">
                <rect x="15" y="15" width="70" height="70" rx="8" />
              </svg>
            </button>
            <button
              id="resetButton"
              @click=${this.reset}
              ?disabled=${this.isRecording || this.isSearching}
              aria-label="Reiniciar sessão">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="#ffffff">
                <path
                  d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
              </svg>
            </button>
            ${this.analysisResult
              ? html`
                  <button
                    id="transcriptionButton"
                    @click=${() => (this.showAnalysisModal = true)}
                    title="Ver análise do conteúdo"
                    aria-label="Ver análise do conteúdo">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="#ffffff">
                      <path
                        d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520Z" />
                    </svg>
                  </button>
                `
              : ''}
            ${this.timelineEvents.length > 0
              ? html`
                  <button
                    id="timelineButton"
                    @click=${() => (this.showTimelineModal = true)}
                    title="Ver Linha do Tempo"
                    aria-label="Ver Linha do Tempo">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24px"
                      viewBox="0 -960 960 960"
                      width="24px"
                      fill="#ffffff">
                      <path
                        d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM200-80q-33 0-56.5-23.5T120-160v-640q0-33 23.5-56.5T200-880h560q33 0 56.5 23.5T840-800v640q0 33-23.5 56.5T760-80H200Zm0-80h560v-640H200v640Z" />
                    </svg>
                  </button>
                `
              : ''}
          </div>
        </div>

        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}
