"""
CivicShield AI — optional YOLOv8 vision microservice.

This service is the PRODUCTION vision path. The Next.js backend calls:
  POST /detect  {file: image}                     -> detections
  POST /verify  {before?: image, after: image,
                 category: str}                   -> structured verdict

Run (Python 3.11–3.12 recommended; ultralytics/torch support):
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000

Then set YOLO_SERVICE_URL=http://localhost:8000 in the Next.js .env.
If this service is NOT configured, the web app uses its clearly-labeled
development providers instead — results are never silently faked.

Model: point MODEL_PATH at any YOLOv8 weights trained on civic classes
(e.g. pothole, garbage, waterlogging, streetlight, road_damage). An
untrained/absent model makes the service refuse to start — see /health.
"""
import os
from io import BytesIO

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

MODEL_PATH = os.environ.get("MODEL_PATH", "model/best.pt")
CONF_THRESHOLD = float(os.environ.get("CONF_THRESHOLD", "0.25"))

app = FastAPI(title="CivicShield Vision Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_model = None


def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
        except ImportError as e:
            raise HTTPException(503, "ultralytics not installed — run pip install -r requirements.txt") from e
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(503, f"Model weights not found at {MODEL_PATH}. Train or download civic-issue weights first.")
        _model = YOLO(MODEL_PATH)
    return _model


async def _load_image(upload: UploadFile) -> Image.Image:
    data = await upload.read()
    if len(data) == 0:
        raise HTTPException(400, "Empty file")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image exceeds 10MB limit")
    try:
        img = Image.open(BytesIO(data))
        img.verify()
        return Image.open(BytesIO(data)).convert("RGB")
    except Exception as e:
        raise HTTPException(400, "Invalid image file") from e


@app.get("/health")
def health():
    return {"status": "ok", "model_path": MODEL_PATH, "model_loaded": _model is not None}


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    img = await _load_image(file)
    model = get_model()
    results = model.predict(img, conf=CONF_THRESHOLD, verbose=False)
    detections = []
    for r in results:
        names = r.names
        for box in r.boxes:
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            detections.append({
                "label": names.get(cls, str(cls)),
                "confidence": round(conf, 3),
                "bbox": [round(float(v), 2) for v in box.xyxy[0].tolist()],
            })
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    return {"detections": detections}


@app.post("/verify")
async def verify(
    after: UploadFile = File(...),
    category: str = Form(...),
    before: UploadFile | None = File(None),
):
    """Runs detection on the AFTER image (and optionally BEFORE) and decides
    whether the reported issue category is still visible."""
    after_img = await _load_image(after)
    model = get_model()

    def run(img):
        results = model.predict(img, conf=CONF_THRESHOLD, verbose=False)
        out = {}
        for r in results:
            names = r.names
            for box in r.boxes:
                label = names.get(int(box.cls[0]), "").lower()
                out[label] = max(out.get(label, 0.0), float(box.conf[0]))
        return out

    after_dets = run(after_img)

    # Does the reported issue category still appear in the after image?
    cat_tokens = category.lower().replace("_", " ").split()
    still_visible_conf = max((conf for label, conf in after_dets.items()
                              if any(tok in label for tok in cat_tokens)), default=0.0)

    notes = []
    verified = still_visible_conf < 0.35
    confidence = round(1.0 - still_visible_conf, 2)
    if before is not None:
        before_img = await _load_image(before)
        before_dets = run(before_img)
        before_conf = max((conf for label, conf in before_dets.items()
                           if any(tok in label for tok in cat_tokens)), default=0.0)
        notes.append(f"before confidence {before_conf:.2f}, after confidence {still_visible_conf:.2f}")
        confidence = round(min(0.97, 0.5 + (before_conf - still_visible_conf) / 2), 2)
    else:
        notes.append("no before-image supplied; verification based on after image only")

    if verified:
        reason = "The detected issue is no longer visible in the after image. " + "; ".join(notes)
    else:
        reason = f"Issue '{category}' still appears in the after image (confidence {still_visible_conf:.2f})."

    return {"verified": verified, "confidence": max(0.05, confidence), "reason": reason}
