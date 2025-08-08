import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# Load environment variables if .env is present
try:
    from dotenv import load_dotenv
    load_dotenv("/app/backend/.env")
except Exception:
    pass

app = FastAPI(title="AI Assistant Backend", version="1.0.0")

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