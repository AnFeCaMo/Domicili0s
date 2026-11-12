from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Sistema de rutas para domicilios en Ciénaga",
    version="5.3.2",
    description="DOMICILIO V5.3.2: navegación, optimización unificada y memoria de ubicaciones.",
)


@app.get("/api/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": "backend",
        "version": "5.3.2",
    }


@app.get("/manifest.webmanifest")
async def manifest() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "sw.js", media_type="application/javascript")


@app.get("/")
async def read_index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
