# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Audio AI Assistant is a sophisticated voice-driven web application powered by Google Gemini API with real-time 3D audio visualization. The app can analyze content from various sources (web pages, YouTube videos, GitHub repos, documents, spreadsheets) and become a conversational expert on that specific content.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 5170)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

Create a `.env` file with the following required variables:
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_FIRECRAWL_API_KEY=your_firecrawl_api_key
```

**Important**: For Vite projects, all client-side environment variables must be prefixed with `VITE_`. Access them using `import.meta.env.VITE_*` in the code.

## Architecture Overview

### Core Components

1. **Main Application Component** (`index.tsx`)
   - `<gdm-live-audio>` LitElement component
   - Manages the entire application state
   - Handles WebSocket connections for bidirectional audio streaming
   - Contains two main personas: standard assistant and content-aware analyst
   - Uses `gemini-2.5-flash-preview-native-audio-dialog` for voice interactions
   - Uses `gemini-2.5-flash` for content analysis

2. **3D Visualization** (`visual-3d.ts`)
   - `<gdm-live-audio-visuals-3d>` LitElement component
   - Three.js-based 3D sphere visualization
   - Reacts to both input (user) and output (assistant) audio streams
   - Uses Web Audio API's AnalyserNode for frequency data

3. **Content Analysis Pipeline**
   - **URL Scraping**: Uses Firecrawl API (`firecrawl-utils.ts`)
   - **Spreadsheet Processing**: Uses SheetJS (`xlsx`) library
   - **Document Processing**: Uses Mammoth.js for Word documents
   - **YouTube Analysis**: Direct multimodal processing of video content
   - **GitHub Analysis**: Fetches README and file structure via GitHub API
   - **Deep Research**: Uses Google Search tool during initial analysis phase

### Key Architectural Decisions

1. **Two-Phase AI Interaction**:
   - Phase 1: Content analysis using `gemini-2.5-flash` with tools (Google Search)
   - Phase 2: Voice conversation using `gemini-2.5-flash-preview-native-audio-dialog` without tools
   - The analysis from Phase 1 becomes the system instruction for Phase 2

2. **Context Isolation**: After content analysis, the assistant only answers based on the analyzed content, ensuring responses are grounded in the provided material.

3. **Audio Processing**:
   - Input: 16kHz sample rate, PCM encoding
   - Output: 24kHz sample rate, PCM decoding
   - Real-time streaming using ScriptProcessorNode

## Common Issues and Solutions

### WebSocket Connection Errors
- **Issue**: "WebSocket is already in CLOSING or CLOSED state"
- **Cause**: API key not properly loaded
- **Solution**: Ensure environment variables use `import.meta.env.VITE_*` pattern

### Port Already in Use
- **Issue**: Port 5170 is already in use
- **Solution**: Kill the existing process or change port in `vite.config.ts`

### API Key Configuration
- The code uses `import.meta.env.VITE_GEMINI_API_KEY` for the Gemini API
- Firecrawl API has a fallback to hardcoded key if env var is not set
- vite.config.ts defines process.env mappings for backward compatibility

## Content Analysis Flow

1. User provides input (URL, file, or search topic)
2. App detects input type and chooses appropriate processing method
3. Content is analyzed using `gemini-2.5-flash` with specific prompts
4. Analysis result becomes system instruction for voice session
5. New voice session is initialized with content-specific knowledge
6. Assistant responds only based on analyzed content

## File Dependencies

- **index.html**: Uses importmap for managing ESM dependencies
- **External libraries loaded via ESM**:
  - lit (UI components)
  - @google/genai (Gemini SDK)
  - three (3D graphics)
  - xlsx (spreadsheet processing)
  - mammoth (Word document processing)
  - marked (Markdown rendering)
  - jspdf & html2canvas (PDF export)

## UI Structure

- **Top Section**: Content input form with URL/file input and analyze button
- **Center**: 3D visualization sphere
- **Bottom**: Voice control buttons (record, stop, reset)
- **Modals**: Analysis viewer and timeline viewer
- **Status Bar**: Real-time feedback on operations

## State Management

All state is managed within the main `GdmLiveAudio` component using LitElement's reactive properties:
- `isRecording`: Voice recording state
- `processedContentInfo`: Current analyzed content metadata
- `systemInstruction`: Current AI persona and knowledge base
- `analysisResult`: Markdown analysis text
- `timelineEvents`: Action log for transparency