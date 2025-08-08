import os
import base64
import asyncio
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# Google GenAI live
from google import genai
from google.genai import types

# Load environment variables if .env is present
try:
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
except Exception:
    pass

app = FastAPI(title="AI Assistant Backend", version="1.1.0")

# CORS: allow the frontend origin only if provided, otherwise allow all (dev)
frontend_origin = os.environ.get("FRONTEND_ORIGIN")
allow_origins = [frontend_origin] if frontend_origin else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google GenAI client
# google-genai >=1.x client no longer needs global configure; we pass key in Client()
# genai.configure(...) not used.



class TavilyRequest(BaseModel):
    query: str
    options: Optional[Dict[str, Any]] = None


class FirecrawlRequest(BaseModel):
    url: str


class GenAIGenerateRequest(BaseModel):
    model: str
    contents: Any  # Accept flexible shape, we will adapt to API format
    tools: Optional[List[Dict[str, Any]]] = None
    generationConfig: Optional[Dict[str, Any]] = None


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/search/tavily")
async def tavily_search(payload: TavilyRequest):
    api_key = os.environ.get("TAVILY_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Tavily API key not configured on server")

    url = "https://api.tavily.com/search"
    headers = {
        "Content-Type": "application/json",
        # Tavily supports Authorization: Bearer and also api_key in body; we use Authorization
        "Authorization": f"Bearer {api_key}",
    }

    body: Dict[str, Any] = {"query": payload.query}
    if payload.options:
        body.update(payload.options)

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=detail)
        return resp.json()


@app.post("/api/scrape")
async def firecrawl_scrape(payload: FirecrawlRequest):
    api_key = os.environ.get("FIRECRAWL_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Firecrawl API key not configured on server")

    url = "https://api.firecrawl.dev/v1/scrape"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    body = {
        "url": payload.url,
        "formats": ["markdown"],
    }

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, headers=headers, json=body)
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=detail)
        return resp.json()


@app.post("/api/genai/generate")
async def genai_generate(payload: GenAIGenerateRequest):
    """
    Proxy to Google Generative Language API generateContent.
    Accepts the same shape for contents used on the frontend (object with parts or array),
    and adapts to REST format.
    """
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Google API key not configured on server")

    model = payload.model or "gemini-2.5-flash"

    # Ensure contents is a list of messages with role and parts
    contents = payload.contents
    if isinstance(contents, dict) and "parts" in contents:
        # Wrap into a user message if a single object provided
        contents = [{"role": "user", "parts": contents.get("parts", [])}]
    elif isinstance(contents, list):
        # Try to ensure each item has role; if not, assume user
        normalized = []
        for item in contents:
            if isinstance(item, dict) and "parts" in item:
                if "role" not in item:
                    item = {"role": "user", **item}
                normalized.append(item)
        contents = normalized
    else:
        raise HTTPException(status_code=400, detail="Invalid contents format")

    query_params = {"key": api_key}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    body: Dict[str, Any] = {
        "contents": contents,
    }
    if payload.tools:
        body["tools"] = payload.tools
    if payload.generationConfig:
        body["generationConfig"] = payload.generationConfig

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(url, params=query_params, json=body)
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = {"error": resp.text}
            raise HTTPException(status_code=resp.status_code, detail=detail)
        return resp.json()


# ------------- Live Audio WebSocket Proxy ----------------
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, Any] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active[client_id] = websocket

    async def disconnect(self, client_id: str):
        ws = self.active.pop(client_id, None)
        if ws:
            try:
                await ws.close()
            except Exception:
                pass
        session = self.sessions.pop(client_id, None)
        if session:
            try:
                await session.close()
            except Exception:
                pass

manager = ConnectionManager()


def _b64_to_bytes(b64: str) -> bytes:
    return base64.b64decode(b64)


def _bytes_to_b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


@app.websocket("/api/ws/{client_id}")
async def live_ws(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)

    # Initialize GenAI async client
    client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY"))

    # Configure model/session
    model = os.environ.get("GENAI_LIVE_MODEL", "gemini-2.5-flash-preview-native-audio-dialog")
    config = {
        "response_modalities": ["AUDIO", "TEXT"],
        "speech_config": {
            "voice_config": {"prebuilt_voice_config": {"voice_name": "Orus"}},
            "language_code": "pt-BR",
        },
        "system_instruction": "Você é um assistente de voz prestativo em pt-BR.",
    }

    try:
        session = await client.aio.live.connect(model=model, config=config)
        manager.sessions[client_id] = session

        async def pump_client_to_gemini():
            while True:
                msg = await websocket.receive_json()
                mtype = msg.get("type")
                if mtype == "audio_chunk":
                    audio_b64 = msg.get("data")
                    if not audio_b64:
                        continue
                    await session.send_realtime_input(
                        media=types.Blob(data=_b64_to_bytes(audio_b64), mime_type="audio/pcm;rate=16000")
                    )
                elif mtype == "audio_stream_end":
                    await session.send_realtime_input(
                        media=types.Blob(data=b"", mime_type="audio/pcm;rate=16000"),
                        line_end=True,
                    )
                elif mtype == "text_message":
                    text = msg.get("text", "")
                    await session.send_client_content(parts=[types.Part(text=text)])
                elif mtype == "ping":
                    await websocket.send_json({"type": "pong", "ts": msg.get("ts")})
                else:
                    await websocket.send_json({"type": "error", "message": f"Unknown message type: {mtype}", "recoverable": True})

        async def pump_gemini_to_client():
            async for server_msg in session:
                # server_msg may contain audio inlineData or text
                try:
                    # Text
                    text_parts = getattr(server_msg, "model_turn", None)
                    text_out = None
                    if text_parts and getattr(text_parts, "parts", None):
                        for p in text_parts.parts:
                            if getattr(p, "text", None):
                                text_out = p.text
                                break
                    # Audio
                    inline = None
                    parts0 = getattr(text_parts, "parts", []) if text_parts else []
                    if parts0:
                        p0 = parts0[0]
                        inline = getattr(p0, "inline_data", None)

                    payload: Dict[str, Any] = {"type": "gemini_response"}
                    if text_out:
                        payload["text"] = text_out
                        payload["content_type"] = "text"
                    if inline and getattr(inline, "data", None):
                        payload["audio"] = inline.data  # already base64
                        payload["audio_format"] = "pcm"
                        payload["content_type"] = "audio"
                    await websocket.send_json(payload)
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e), "recoverable": True})

        await asyncio.gather(pump_client_to_gemini(), pump_gemini_to_client())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e), "recoverable": False})
    finally:
        await manager.disconnect(client_id)