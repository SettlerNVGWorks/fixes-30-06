from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from datetime import datetime
import uuid

app = FastAPI(title="Sport Prognosis API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection would go here
# For now, we'll use in-memory data for demo

# Sample data
sample_predictions = [
    {
        "id": str(uuid.uuid4()),
        "sport": "baseball",
        "match": "Yankees vs Red Sox",
        "prediction": "Yankees победа",
        "confidence": 85,
        "odds": 2.1,
        "status": "won",
        "date": "2025-03-10",
        "result": "Yankees 7-4 Red Sox"
    },
    {
        "id": str(uuid.uuid4()),
        "sport": "football",
        "match": "Chiefs vs Bills",
        "prediction": "Тотал больше 48.5",
        "confidence": 78,
        "odds": 1.9,
        "status": "won",
        "date": "2025-03-09",
        "result": "Chiefs 31-24 Bills (55 очков)"
    },
    {
        "id": str(uuid.uuid4()),
        "sport": "hockey",
        "match": "Rangers vs Bruins",
        "prediction": "Rangers победа в основное время",
        "confidence": 72,
        "odds": 2.3,
        "status": "lost",
        "date": "2025-03-08",
        "result": "Rangers 2-3 Bruins"
    },
    {
        "id": str(uuid.uuid4()),
        "sport": "esports",
        "match": "Navi vs Astralis (CS:GO)",
        "prediction": "Navi победа 2-0",
        "confidence": 82,
        "odds": 2.5,
        "status": "won",
        "date": "2025-03-07",
        "result": "Navi 2-0 Astralis"
    }
]

sample_stats = {
    "total_predictions": 1247,
    "success_rate": 78.5,
    "active_bettors": 5892,
    "monthly_wins": 342,
    "sports_stats": {
        "baseball": {"predictions": 312, "accuracy": 82.1, "profit": 15.4},
        "football": {"predictions": 428, "accuracy": 76.3, "profit": 12.8},
        "hockey": {"predictions": 285, "accuracy": 79.8, "profit": 18.2},
        "esports": {"predictions": 222, "accuracy": 74.9, "profit": 9.6}
    }
}

# Pydantic models
class Prediction(BaseModel):
    id: Optional[str] = None
    sport: str
    match: str
    prediction: str
    confidence: int
    odds: float
    status: str
    date: str
    result: Optional[str] = None

class Stats(BaseModel):
    total_predictions: int
    success_rate: float
    active_bettors: int
    monthly_wins: int

# API Routes
@app.get("/")
async def read_root():
    return {"message": "Sport Prognosis API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/stats")
async def get_stats():
    """Get overall statistics"""
    return sample_stats

@app.get("/api/predictions")
async def get_predictions(sport: Optional[str] = None, limit: int = 10):
    """Get recent predictions, optionally filtered by sport"""
    predictions = sample_predictions
    
    if sport:
        predictions = [p for p in predictions if p["sport"] == sport.lower()]
    
    return {
        "predictions": predictions[:limit],
        "total": len(predictions)
    }

@app.get("/api/predictions/{prediction_id}")
async def get_prediction(prediction_id: str):
    """Get a specific prediction by ID"""
    prediction = next((p for p in sample_predictions if p["id"] == prediction_id), None)
    
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    
    return prediction

@app.get("/api/sports/{sport}/stats")
async def get_sport_stats(sport: str):
    """Get statistics for a specific sport"""
    sport_lower = sport.lower()
    
    if sport_lower not in sample_stats["sports_stats"]:
        raise HTTPException(status_code=404, detail="Sport not found")
    
    sport_predictions = [p for p in sample_predictions if p["sport"] == sport_lower]
    sport_stats = sample_stats["sports_stats"][sport_lower]
    
    return {
        "sport": sport,
        "stats": sport_stats,
        "recent_predictions": sport_predictions[:5]
    }

@app.post("/api/predictions")
async def create_prediction(prediction: Prediction):
    """Create a new prediction (admin only - would need auth in production)"""
    prediction.id = str(uuid.uuid4())
    prediction_dict = prediction.dict()
    sample_predictions.insert(0, prediction_dict)
    
    return {"message": "Prediction created", "prediction": prediction_dict}

@app.put("/api/predictions/{prediction_id}")
async def update_prediction(prediction_id: str, prediction: Prediction):
    """Update a prediction (admin only - would need auth in production)"""
    for i, p in enumerate(sample_predictions):
        if p["id"] == prediction_id:
            prediction.id = prediction_id
            sample_predictions[i] = prediction.dict()
            return {"message": "Prediction updated", "prediction": sample_predictions[i]}
    
    raise HTTPException(status_code=404, detail="Prediction not found")

@app.delete("/api/predictions/{prediction_id}")
async def delete_prediction(prediction_id: str):
    """Delete a prediction (admin only - would need auth in production)"""
    for i, p in enumerate(sample_predictions):
        if p["id"] == prediction_id:
            deleted_prediction = sample_predictions.pop(i)
            return {"message": "Prediction deleted", "prediction": deleted_prediction}
    
    raise HTTPException(status_code=404, detail="Prediction not found")

# Additional endpoints for telegram integration
@app.get("/api/telegram/stats")
async def get_telegram_stats():
    """Get stats formatted for Telegram messages"""
    stats = sample_stats
    recent_predictions = sample_predictions[:3]
    
    return {
        "stats_message": f"""
📊 **Актуальная статистика**

🎯 Всего прогнозов: {stats['total_predictions']}
✅ Проходимость: {stats['success_rate']}%
👥 Активных подписчиков: {stats['active_bettors']}
🏆 Побед в месяц: {stats['monthly_wins']}

📈 **По видам спорта:**
⚾ Бейсбол: {stats['sports_stats']['baseball']['accuracy']}%
🏈 Футбол: {stats['sports_stats']['football']['accuracy']}%
🏒 Хоккей: {stats['sports_stats']['hockey']['accuracy']}%
🎮 Киберспорт: {stats['sports_stats']['esports']['accuracy']}%
        """,
        "recent_predictions": recent_predictions
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)