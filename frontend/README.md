# Live Audio AI Assistant with Content Analysis & Deep Research

This is a sophisticated web application that functions as a real-time, voice-driven AI assistant powered by the Google Gemini API. It features a dynamic 3D audio visualization and has the unique capability to analyze content from various sources—web pages, YouTube videos, GitHub repositories, and local files (images, PDFs, spreadsheets, Word documents)—or perform a deep web search on any topic. After analysis, the assistant becomes a conversational expert on the provided material.

## Key Features

-   **Real-Time Voice Conversation**: Engage in natural, spoken conversations with a Gemini-powered AI assistant.
-   **Dynamic 3D Visualization**: A stunning **Three.js**-based 3D sphere visualizes the user's voice (input) and the assistant's voice (output) in real-time.
-   **Advanced Content Analysis Engine**:
    -   **Data Analyst Persona**: Upload a spreadsheet (`.csv`, `.xlsx`, `.xls`) or provide a link to a public Google Sheet. The assistant ingests the data, assumes the role of a data analyst, and is ready to answer questions about metrics, trends, and insights.
    -   **GitHub Repository Expert**: Provide a GitHub repository URL. The assistant analyzes its README and file structure—aided by Google Search—to answer questions about its purpose, technology, and setup.
    -   **Document Analysis**: Upload a Word document (`.doc`, `.docx`) or a PDF. The assistant extracts the text and can provide summaries or answer specific questions about the content.
    -   **Deep Research**: Provide any topic (e.g., "The future of renewable energy"), and the assistant will perform a comprehensive web search using the Google Search tool to generate a structured analysis, becoming an instant expert.
    -   **Web Pages & Google Docs**: Provide any URL, including Google Docs, and the app will scrape its content using **Firecrawl** for analysis.
    -   **Multimodal YouTube Analysis**: Input a YouTube URL. The multimodal AI directly processes the video's content (both visual frames and audio track), enabling it to understand and answer questions about what is shown and said in the video.
    -   **Image Analysis**: Upload images (`.jpg`, `.png`, etc.) for detailed visual description.
-   **Context-Aware Sessions**: After analyzing content, the assistant's knowledge is **strictly limited** to that material. It answers questions based only on the document, video, or research you provided, without accessing external information during the conversation.
-   **Action Timeline**: A dedicated button opens a detailed, chronological log of all assistant actions, including session starts, content analyses, recordings, and errors, providing full transparency.
-   **Responsive & Modern UI**: A clean, responsive interface with modals for viewing detailed analysis (with export options for PDF/Markdown) and session history, plus a control bar for all user actions.

## How It Works (Technical Overview)

The application is built as a single-page application using modern web technologies.

1.  **Frontend**: Built with **LitElement**, a simple library for creating fast, lightweight web components. The main component (`<gdm-live-audio>`) manages the application state, user interactions, and API calls.
2.  **AI & Voice**:
    -   The core voice interaction uses the `@google/genai` SDK to connect to the **`gemini-2.5-flash-preview-native-audio-dialog`** model via a live, bidirectional stream.
    -   User audio is captured, encoded, and streamed to the API. The assistant's audio response is received, decoded, and played back using the Web Audio API.
    -   Crucially, the live chat session is configured with **no external tools (like Google Search)**. This is a key design choice to ensure the assistant's responses are grounded *exclusively* in the pre-analyzed content.
3.  **Content Analysis & Research (The "Priming" Step)**:
    -   The app intelligently detects the input type: a URL, a search topic, or a file.
    -   For **spreadsheets**, it uses the **SheetJS (xlsx)** library to parse the file in the browser, converts the data to a textual format, and sends it to the **`gemini-2.5-flash`** model with a prompt instructing it to act as a data analyst.
    -   For **Word documents**, it uses **Mammoth.js** to extract the raw text content.
    -   For URLs, the app uses the **Firecrawl API** to scrape content as Markdown. For GitHub URLs, it uses the GitHub API.
    -   For "Deep Research" or GitHub analysis, the **`gemini-2.5-flash`** model is temporarily given access to the **Google Search tool** to gather information and build its initial knowledge base. This search capability is *only* used during this initial analysis step.
    -   In all cases, the generated analysis becomes a new `systemInstruction` for the subsequent voice session, effectively priming the assistant with deep knowledge and the correct persona (e.g., "data analyst" or "repository expert").
4.  **Timeline Logging**: A custom `logEvent` function captures and timestamps key application events, which are then displayed in a user-friendly modal.
5.  **3D Visualization**: A dedicated web component (`<gdm-live-audio-visuals-3d>`) uses **Three.js** and the Web Audio API's `AnalyserNode` to create a dynamic 3D visualization that reacts to both input and output audio streams.

## Code Structure

-   `index.tsx`: The main Lit component (`gdm-live-audio`) that contains the UI and all logic for recording, session management, timeline logging, and the advanced content/research analysis engine.
-   `visual-3d.ts`: The Three.js visualization component.
-   `utils.ts`: Helper functions for encoding/decoding audio, and file conversions (`Base64`, `ArrayBuffer`).
-   `firecrawl-utils.ts`: Abstraction for making requests to the Firecrawl API.
-   `youtube-utils.ts`: Helper functions for parsing YouTube URLs and fetching metadata.
-   `analyser.ts`: A wrapper for the Web Audio API's `AnalyserNode`.
-   `*-shader.ts`: GLSL vertex and fragment shaders for the 3D objects.
-   `index.html`: The main entry point, using an `importmap` to manage dependencies like Lit, Three.js, Gemini SDK, **xlsx**, and **mammoth**.
-   `metadata.json`: Defines application metadata and required permissions (`microphone`).

## How to Use the Application

The UI is divided into the analysis/research form at the top and the voice controls at the bottom.

### 1. Standard Voice Assistant

1.  Click the **red circle button** to start recording.
2.  Speak your query. The 3D sphere will react to your voice.
3.  The assistant will respond with audio, and the sphere will react to its voice.
4.  Click the **white square button** to stop. Click the **refresh button** to reset the session.

### 2. Content-Aware Expert Assistant

1.  **Provide Context**:
    -   **For Data Analysis**:
        -   Upload a spreadsheet file (`.csv`, `.xlsx`, `.xls`) using the **upload icon**.
        -   Or, paste a public **Google Sheets URL** into the input field.
    -   **For Document/Repo Analysis**: Upload a `.pdf`, `.doc`, `.docx` file, or paste a **GitHub URL**.
    -   **For Web Research**: Type a topic into the input field (e.g., "Impacto da IA na educação").
    -   **For Web/Video Content**: Paste a URL (e.g., news article, YouTube video).
2.  **Analyze / Research**: Click the **"Analisar"** button. The app will show its progress in the status bar (e.g., "Buscando README...", "Analisando com a IA..."). For Deep Research or GitHub analysis, this step uses Google Search to build its initial knowledge base.
3.  **Converse**:
    -   Once finished, a blue box will appear with the content title. The status will say `Pronto! Pergunte sobre "..."`.
    -   You can now click the record button and ask specific questions. **The assistant will only answer based on the content you provided.** For example:
        -   *"Qual foi a receita total no último trimestre?"* (for a spreadsheet)
        -   *"Resuma os pontos principais do documento."* (for a PDF/DOCX)
        -   *"Qual o propósito deste repositório?"* (for a GitHub link)
        -   If you ask a question outside the scope of the analyzed content (e.g., "Qual a previsão do tempo?"), the assistant will state that it cannot answer.
4.  **View Analysis & Timeline**:
    -   In the control bar, two new buttons may appear:
        -   **Document Icon**: Click this to see the detailed text analysis the AI generated for itself. You can download or share this analysis.
        -   **List Icon**: Click this to open the **Timeline** and see a log of all actions.
5.  **Reset**: To go back to the general-purpose assistant, click the **refresh button**. This will clear all loaded content and restore the default assistant.