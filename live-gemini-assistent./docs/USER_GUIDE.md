# Live Gemini Assistant - User Guide

## Welcome

Live Gemini Assistant is an AI-powered voice assistant that can analyze content from various sources and become an expert on that specific topic, allowing you to have natural voice conversations about the analyzed material.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Features Overview](#features-overview)
3. [Content Analysis](#content-analysis)
4. [Voice Interaction](#voice-interaction)
5. [Visualization](#visualization)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Microphone access for voice interaction
- Internet connection
- API keys (provided during setup)

### First Time Setup

1. **Open the Application**
   - Navigate to the application URL in your browser
   - The app will load with a 3D visualization sphere in the center

2. **Grant Permissions**
   - When prompted, allow microphone access
   - This is required for voice interaction

3. **Check Status**
   - Look for the green "Ready" status at the bottom
   - If you see any errors, check the [Troubleshooting](#troubleshooting) section

## Features Overview

### Main Capabilities

| Feature | Description |
|---------|------------|
| **Voice Conversation** | Real-time voice interaction with AI assistant |
| **Content Analysis** | Deep analysis of web pages, videos, documents |
| **3D Visualization** | Interactive audio visualization sphere |
| **Multi-format Support** | URLs, YouTube, PDFs, Excel, Word documents |
| **Search Integration** | Built-in web search capabilities |
| **Export Options** | Save conversations and analysis as PDF |

## Content Analysis

### Supported Content Types

#### 1. Web Pages
Enter any URL to analyze web content:
- News articles
- Blog posts
- Documentation
- Wikipedia pages
- Product pages

**How to analyze a web page:**
1. Enter the URL in the input field
2. Click "Analyze Content"
3. Wait for analysis to complete (usually 10-30 seconds)
4. The assistant becomes an expert on that content

#### 2. YouTube Videos
Analyze YouTube videos by URL or video ID:
- Educational videos
- Tutorials
- Lectures
- Documentaries

**How to analyze a YouTube video:**
1. Paste the YouTube URL (e.g., `https://youtube.com/watch?v=...`)
2. Click "Analyze Content"
3. The assistant will analyze the video content and transcript

#### 3. Documents
Upload and analyze various document formats:

| Format | Extensions | Use Cases |
|--------|------------|-----------|
| PDF | .pdf | Research papers, reports, ebooks |
| Word | .docx, .doc | Documents, essays, articles |
| Excel | .xlsx, .xls | Spreadsheets, data tables |
| Text | .txt, .md | Plain text, markdown files |

**How to analyze a document:**
1. Click "Choose File" button
2. Select your document
3. Click "Analyze Content"
4. Wait for processing to complete

#### 4. GitHub Repositories
Analyze GitHub repositories:
1. Enter the GitHub repository URL
2. The assistant analyzes README and structure
3. Becomes knowledgeable about the project

#### 5. Search Topics
Research any topic without a specific URL:
1. Enter a search query (e.g., "quantum computing basics")
2. Click "Analyze Content"
3. The assistant researches and synthesizes information

### Analysis Process

When you analyze content, the assistant:

1. **Extracts** - Retrieves the content from the source
2. **Processes** - Converts to readable format
3. **Analyzes** - Uses AI to understand key concepts
4. **Synthesizes** - Creates a knowledge base
5. **Prepares** - Becomes ready to answer questions

### Viewing Analysis Results

After analysis completes:
- Click "View Analysis" to see the detailed breakdown
- The analysis includes:
  - Key concepts identified
  - Main topics covered
  - Important facts and figures
  - Summary of the content

## Voice Interaction

### Starting a Conversation

1. **Click the Record Button**
   - The large microphone button at the bottom
   - Button turns red when recording

2. **Speak Your Question**
   - Speak clearly and naturally
   - No need to use wake words
   - Questions can be conversational

3. **Stop Recording**
   - Click the stop button when done
   - Or let silence detection stop automatically

4. **Listen to Response**
   - The assistant responds with voice
   - Text transcription appears on screen
   - 3D sphere reacts to audio

### Conversation Tips

#### Best Practices
- **Be Specific**: Ask detailed questions about the analyzed content
- **Follow Up**: Build on previous questions
- **Clarify**: Ask for examples or explanations
- **Explore**: Request different perspectives

#### Example Questions
After analyzing content, try asking:
- "What are the main points discussed?"
- "Can you explain [specific concept] in simple terms?"
- "What examples were given for [topic]?"
- "How does this relate to [other concept]?"
- "What are the practical applications?"

### Voice Commands

While not required, these phrases can be helpful:

| Command | Action |
|---------|--------|
| "Start over" | Reset the conversation |
| "Summarize this" | Get a brief summary |
| "Give me more details" | Expand on the last answer |
| "Explain differently" | Get alternative explanation |

## Visualization

### 3D Audio Sphere

The central sphere provides visual feedback:

#### Visual States
- **Idle**: Gentle pulsing animation
- **Listening**: Blue/green waves (your voice)
- **Processing**: Yellow spinning animation
- **Speaking**: Red/orange waves (AI voice)
- **Error**: Red flashing

#### Interaction
- **Rotate**: Click and drag to rotate view
- **Zoom**: Scroll to zoom in/out
- **Reset**: Double-click to reset position

### Status Indicators

Bottom status bar shows:
- Connection status (Connected/Disconnected)
- Current operation (Recording/Processing/Ready)
- Error messages if any
- Token usage information

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Start/stop recording |
| `Esc` | Cancel current operation |
| `Ctrl/Cmd + K` | Focus search input |
| `Ctrl/Cmd + Enter` | Analyze content |
| `Ctrl/Cmd + R` | Reset conversation |
| `Ctrl/Cmd + E` | Export conversation |
| `?` | Show help |

## Advanced Features

### Timeline View
Track all actions and events:
1. Click "Show Timeline" button
2. View chronological list of:
   - Questions asked
   - Responses received
   - Content analyzed
   - Errors encountered

### Export Options

#### Export Analysis
1. Complete an analysis
2. Click "Export as PDF"
3. Choose save location
4. PDF includes full analysis and metadata

#### Export Conversation
1. Have a conversation
2. Click "Export Conversation"
3. Saves as formatted PDF with:
   - Timestamps
   - Questions and answers
   - Analysis context

### Multi-Session Support

The assistant maintains context:
- Remembers analyzed content during session
- Can handle multiple topics sequentially
- Clear context with "Reset" button

## Troubleshooting

### Common Issues

#### Microphone Not Working
**Problem**: No audio input detected
**Solutions**:
1. Check browser permissions (Settings → Privacy → Microphone)
2. Ensure microphone is not muted
3. Try a different browser
4. Check system audio settings

#### Analysis Fails
**Problem**: Content analysis doesn't complete
**Solutions**:
1. Check internet connection
2. Verify URL is accessible
3. Ensure file size is under 10MB
4. Try a different content source

#### WebSocket Connection Error
**Problem**: "WebSocket connection failed" message
**Solutions**:
1. Refresh the page
2. Check firewall settings
3. Verify API keys are configured
4. Try incognito/private mode

#### Audio Playback Issues
**Problem**: Can't hear AI responses
**Solutions**:
1. Check system volume
2. Ensure browser isn't muted
3. Check audio output device
4. Enable autoplay in browser settings

### Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "API Key Invalid" | Gemini API key issue | Check environment configuration |
| "Rate Limit Exceeded" | Too many requests | Wait 60 seconds and retry |
| "Content Too Large" | File/page exceeds limit | Try smaller content or split |
| "Network Error" | Connection problem | Check internet connection |
| "Permission Denied" | Microphone access blocked | Grant permission in browser |

## FAQ

### General Questions

**Q: What content works best?**
A: Structured content like articles, documentation, and educational videos work best. The clearer the content, the better the analysis.

**Q: How long does analysis take?**
A: Typically 10-30 seconds depending on content size and complexity.

**Q: Can I analyze multiple sources?**
A: Yes, but one at a time. Each new analysis replaces the previous context.

**Q: Is my data private?**
A: Content is processed through secure APIs. No data is stored permanently on our servers.

### Technical Questions

**Q: What browsers are supported?**
A: Chrome, Firefox, Safari, and Edge (latest versions).

**Q: What's the file size limit?**
A: Documents up to 10MB, web pages up to 5MB of text content.

**Q: Can I use it offline?**
A: No, internet connection is required for AI processing.

**Q: What languages are supported?**
A: Primary support for English, with limited support for other major languages.

### Voice Interaction

**Q: Why does recording stop automatically?**
A: Silence detection stops recording after 2 seconds of silence.

**Q: Can I use text input instead of voice?**
A: Currently, the system is optimized for voice interaction.

**Q: How accurate is speech recognition?**
A: Very accurate for clear speech in quiet environments.

## Tips for Best Results

### Content Selection
- Choose focused, single-topic content
- Avoid paywalled or login-required pages
- Prefer text-heavy over image-heavy content
- Use direct URLs rather than shortened links

### Voice Interaction
- Speak in a normal, conversational tone
- Pause briefly between sentences
- Avoid background noise
- Position microphone 6-12 inches away

### Getting Quality Answers
- Ask specific questions
- Reference specific parts of content
- Build on previous answers
- Ask for examples or comparisons

## Support

For additional help:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the [Developer Guide](./DEVELOPER_GUIDE.md)
- Report issues on GitHub
- Contact support team

## Privacy & Security

### Data Handling
- No conversation data is stored permanently
- Analysis is performed in real-time
- API keys are stored locally in browser
- All connections use HTTPS/WSS encryption

### Permissions
The app requires:
- Microphone access for voice input
- Internet access for AI processing
- No other permissions needed

### Best Practices
- Don't share sensitive information
- Avoid analyzing confidential documents
- Use incognito mode for sensitive topics
- Clear browser data to remove stored keys