# Live Gemini Assistant - API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Core APIs](#core-apis)
4. [WebSocket Protocol](#websocket-protocol)
5. [Content Analysis APIs](#content-analysis-apis)
6. [Audio Processing](#audio-processing)
7. [Error Handling](#error-handling)
8. [Rate Limits](#rate-limits)

## Overview

The Live Gemini Assistant integrates multiple APIs to provide real-time voice interaction with AI-powered content analysis.

### Base Configuration

```typescript
interface APIConfiguration {
  geminiApiKey: string;      // Google Gemini API key
  googleApiKey: string;       // Google API key for YouTube
  firecrawlApiKey: string;    // Firecrawl API for web scraping
  tavilyApiKey: string;       // Tavily API for search
  openRouterApiKey?: string;  // Optional OpenRouter API
}
```

## Authentication

### Environment Variables

All API keys must be prefixed with `VITE_` for Vite to expose them to the client:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key
VITE_TAVILY_API_KEY=your_tavily_api_key
```

### Accessing API Keys

```typescript
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

## Core APIs

### 1. Google Gemini API

#### Initialize Client

```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI(apiKey);
```

#### Create Session

```typescript
const model = genai.getGenerativeModel({
  model: 'gemini-2.5-flash-preview-native-audio-dialog',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096,
  },
  systemInstruction: 'You are a helpful assistant...'
});

const session = await model.startSession({
  modality: 'AUDIO',
  audioConfig: {
    sampleRate: 16000,
    encoding: 'PCM'
  }
});
```

#### Content Analysis

```typescript
const analysisModel = genai.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [{
    googleSearch: {}
  }]
});

const result = await analysisModel.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: prompt }]
  }]
});
```

### 2. WebSocket Connection

#### Connection Setup

```typescript
interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

class WebSocketManager {
  connect(sessionId: string): WebSocket {
    const wsUrl = `wss://generativelanguage.googleapis.com/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('Connected');
    ws.onmessage = (event) => this.handleMessage(event);
    ws.onerror = (error) => this.handleError(error);
    ws.onclose = () => this.handleClose();
    
    return ws;
  }
}
```

#### Message Protocol

```typescript
interface WebSocketMessage {
  type: 'audio' | 'text' | 'control' | 'status';
  payload: any;
  timestamp: number;
  sessionId?: string;
}

// Sending audio data
ws.send(JSON.stringify({
  type: 'audio',
  payload: {
    data: base64AudioData,
    sampleRate: 16000,
    encoding: 'PCM'
  }
}));

// Receiving responses
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'audio':
      processAudioResponse(message.payload);
      break;
    case 'text':
      displayTranscription(message.payload);
      break;
  }
};
```

## Content Analysis APIs

### 1. Firecrawl API (Web Scraping)

```typescript
interface FirecrawlConfig {
  apiKey: string;
  baseUrl: string;
}

async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      includeTags: ['main', 'article'],
      excludeTags: ['nav', 'footer', 'aside']
    })
  });
  
  return response.json();
}
```

### 2. Tavily Search API

```typescript
interface TavilySearchParams {
  query: string;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'general' | 'news';
  maxResults?: number;
  includeImages?: boolean;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}

async function searchTavily(params: TavilySearchParams): Promise<SearchResults> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      ...params,
      api_key: apiKey
    })
  });
  
  return response.json();
}
```

### 3. YouTube Data API

```typescript
interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: string;
  publishedAt: string;
  channelTitle: string;
  thumbnails: Thumbnails;
}

async function getYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos');
  url.searchParams.append('id', videoId);
  url.searchParams.append('part', 'snippet,contentDetails');
  url.searchParams.append('key', googleApiKey);
  
  const response = await fetch(url.toString());
  const data = await response.json();
  
  return data.items[0];
}
```

### 4. GitHub API

```typescript
interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

async function getGitHubReadme(info: GitHubRepoInfo): Promise<string> {
  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/readme`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3.raw'
    }
  });
  
  return response.text();
}

async function getGitHubFileStructure(info: GitHubRepoInfo): Promise<FileTree> {
  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/git/trees/${info.branch || 'main'}?recursive=1`;
  
  const response = await fetch(url);
  return response.json();
}
```

## Audio Processing

### Audio Configuration

```typescript
interface AudioConfig {
  input: {
    sampleRate: 16000;    // Input sample rate
    encoding: 'PCM';      // Audio encoding
    channels: 1;          // Mono
    bitDepth: 16;         // 16-bit
  };
  output: {
    sampleRate: 24000;    // Output sample rate
    encoding: 'PCM';      // Audio encoding
    channels: 1;          // Mono
    bitDepth: 16;         // 16-bit
  };
}
```

### Audio Recording

```typescript
class AudioRecorder {
  private mediaRecorder?: MediaRecorder;
  private audioContext?: AudioContext;
  
  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(stream);
    
    // Process audio through ScriptProcessorNode (deprecated)
    // or AudioWorkletNode (recommended)
    const processor = this.audioContext.createScriptProcessor(256, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      this.processAudioChunk(inputData);
    };
    
    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }
  
  private processAudioChunk(data: Float32Array): void {
    // Convert to PCM and send via WebSocket
    const pcmData = this.convertToPCM(data);
    this.sendAudioData(pcmData);
  }
}
```

### Audio Playback

```typescript
class AudioPlayer {
  private audioContext: AudioContext;
  private queue: AudioBuffer[] = [];
  
  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }
  
  async playAudioData(pcmData: ArrayBuffer): Promise<void> {
    const audioBuffer = await this.decodeAudioData(pcmData);
    this.queue.push(audioBuffer);
    
    if (!this.isPlaying) {
      this.processQueue();
    }
  }
  
  private async decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
    const floatData = new Float32Array(data);
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.copyToChannel(floatData, 0);
    return audioBuffer;
  }
}
```

## Error Handling

### Error Types

```typescript
enum ErrorCode {
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  AUDIO_PERMISSION_DENIED = 'AUDIO_PERMISSION_DENIED',
  CONTENT_ANALYSIS_FAILED = 'CONTENT_ANALYSIS_FAILED',
  INVALID_URL = 'INVALID_URL',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE'
}

interface APIError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: number;
  retryable: boolean;
  retryAfter?: number;
}
```

### Error Handler

```typescript
class ErrorHandler {
  static handle(error: any): APIError {
    if (error.status === 429) {
      return {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Rate limit exceeded',
        retryable: true,
        retryAfter: parseInt(error.headers.get('Retry-After') || '60'),
        timestamp: Date.now()
      };
    }
    
    if (error.status === 401) {
      return {
        code: ErrorCode.API_KEY_INVALID,
        message: 'Invalid API key',
        retryable: false,
        timestamp: Date.now()
      };
    }
    
    // Default error
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: error.message || 'Unknown error occurred',
      retryable: true,
      timestamp: Date.now()
    };
  }
}
```

## Rate Limits

### API Rate Limits

| API | Limit | Window | Headers |
|-----|-------|--------|---------|
| Gemini | 60 requests | per minute | X-RateLimit-Remaining |
| Firecrawl | 100 requests | per minute | X-RateLimit-Limit |
| Tavily | 1000 requests | per month | X-API-Requests-Remaining |
| YouTube | 10,000 units | per day | - |
| GitHub | 60 requests | per hour | X-RateLimit-Remaining |

### Rate Limit Handler

```typescript
class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  
  async executeWithLimit<T>(
    api: string, 
    fn: () => Promise<T>
  ): Promise<T> {
    const limit = this.limits.get(api);
    
    if (limit && limit.remaining === 0) {
      const waitTime = limit.resetTime - Date.now();
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }
    
    try {
      const result = await fn();
      this.updateLimits(api, result);
      return result;
    } catch (error) {
      if (error.status === 429) {
        // Handle rate limit error
        await this.handleRateLimit(api, error);
        return this.executeWithLimit(api, fn);
      }
      throw error;
    }
  }
}
```

## Response Formats

### Gemini Content Response

```typescript
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback?: {
    safetyRatings: SafetyRating[];
  };
}
```

### Firecrawl Response

```typescript
interface FirecrawlResponse {
  success: boolean;
  data: {
    content: string;
    markdown: string;
    html: string;
    metadata: {
      title: string;
      description: string;
      language: string;
      sourceURL: string;
      statusCode: number;
    };
    links: string[];
    images: string[];
  };
}
```

### Tavily Search Response

```typescript
interface TavilyResponse {
  answer?: string;
  query: string;
  response_time: number;
  images?: string[];
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    published_date?: string;
    raw_content?: string;
  }>;
}
```

## Best Practices

1. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly
   - Implement key validation on startup

2. **Error Handling**
   - Implement exponential backoff for retries
   - Log all API errors for debugging
   - Provide user-friendly error messages
   - Handle network failures gracefully

3. **Performance**
   - Cache API responses when appropriate
   - Implement request batching
   - Use connection pooling for WebSockets
   - Monitor API usage and costs

4. **Rate Limiting**
   - Implement client-side rate limiting
   - Track API usage across sessions
   - Queue requests when approaching limits
   - Provide feedback to users about limits