# CivicShield Vision Service (optional)

The **production** computer-vision path for CivicShield AI: a small FastAPI
service running YOLOv8 inference for issue detection and resolution
verification.

The web app works without it (clearly-labeled development providers are used
and every result is disclosed in the UI/agent log) — configure this service
when you have trained civic-issue weights.

## Endpoints

| Endpoint | Body | Response |
|---|---|---|
| `GET /health` | — | service + model status |
| `POST /detect` | multipart `file` (image) | `{ detections: [{label, confidence, bbox}] }` |
| `POST /verify` | multipart `after` (image), `category` (str), optional `before` (image) | `{ verified, confidence, reason }` |

## Setup

```bash
cd vision-service
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export MODEL_PATH=path/to/best.pt
uvicorn main:app --port 8000
```

Then in the web app `.env`:

```
YOLO_SERVICE_URL=http://localhost:8000
```

## Training weights

Train YOLOv8 on a civic-issue dataset (potholes, garbage, waterlogging,
streetlights, road damage). Public datasets exist on Roboflow Universe and
Kaggle (respect their licenses). Example:

```bash
yolo train model=yolov8n.pt data=civic.yaml epochs=50 imgsz=640
```

Point `MODEL_PATH` at the produced `best.pt`. Detection labels are mapped to
CivicShield categories in `src/lib/ai/yoloVision.ts` (`mapYoloLabel`).

## Honest-AI note

- If this service is unreachable or errors, the web app falls back to the
  **clearly-labeled** dev provider and records that fact in the agent log —
  production results are never simulated silently.
- This service has NOT been exercised with real trained weights during the
  hackathon window (no GPU/weights available); its contract is covered by the
  web app's provider-fallback tests.
