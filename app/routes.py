import numpy as np
import pandas as pd
from flask import Blueprint, render_template, request, jsonify
from app import model_loader

bp = Blueprint("main", __name__)

@bp.route("/")
def home():
    return render_template("home.html")

@bp.route("/simulator")
def simulator():
    return render_template("simulator.html")

@bp.route("/live-data")
def live_data():
    return render_template("live_data.html")

@bp.route("/model-insights")
def model_insights():
    return render_template("model_insights.html")

@bp.route("/emergency")
def emergency():
    return render_template("emergency.html")

@bp.route("/about")
def about():
    return render_template("about.html")

# -- API --
@bp.route("/api/simulate", methods=["POST"])
def api_simulate():
    """
    Receives slider values from the Simulator page, runs predictions
    through both trained models, and returns results as JSON.
    """
    data = request.get_json()

    # rainfall = float(data.get("rainfall", 0))
    # river_level = float(data.get("river_level", 0))
    # soil_moisture = float(data.get("soil_moisture", 0))
    # city = data.get("city", "Manila")

    # =====Future NOTE: verify max values====
    try:
        rainfall = float(data.get("rainfall", 0))
    except (TypeError, ValueError):
        rainfall = 0.0
    rainfall = max(0.0, min(100.0, rainfall))

    try:
        river_level = float(data.get("river_level", 0))
    except (TypeError, ValueError):
        river_level = 0.0
    river_level = max(0.0, min(8.0, river_level))

    try:
        soil_moisture = float(data.get("soil_moisture", 0))
    except (TypeError, ValueError):
        soil_moisture = 0.0
    soil_moisture = max(0.0, min(100.0, soil_moisture))

    city = data.get("city", "Manila")
    if city not in ["Manila", "Marikina", "Pasig", "Quezon City"]:
        city = "Manila"

    city_dummies = {
        "Manila": [1, 0, 0, 0],
        "Marikina": [0, 1, 0, 0],
        "Pasig": [0, 0, 1, 0],
        "Quezon City": [0, 0, 0, 1],
    }

    elevation_map = {
        "Manila": 5.0,
        "Marikina": 15.0,
        "Pasig": 5.0,
        "Quezon City": 43.0,
    }

    elevation = elevation_map.get(city, 5.0)
    dummies = city_dummies.get(city, [1, 0, 0, 0])

    features = [
        rainfall,
        river_level,     
        soil_moisture,
        elevation,
        dummies[0],
        dummies[1],
        dummies[2],
        dummies[3],
    ]

    X = pd.DataFrame([features], columns=[
        "Rainfall_mm", "WaterLevel_m", "SoilMoisture_pct", "Elevation_m",
        "Location_Manila", "Location_Marikina", "Location_Pasig", "Location_Quezon City"
    ])

    # run predictions
    predicted_depth = float(model_loader.regressor.predict(X)[0])
    predicted_risk = model_loader.classifier.predict(X)[0]

    # get all three probabilities (low, moderate, high)
    proba = model_loader.classifier.predict_proba(X)[0]
    class_labels = model_loader.classifier.classes_.tolist()
    confidence = float(max(proba)) * 100 # about final prediction (has max proba)

    # proba dict (Risk level - probabaility)
    proba_dict = {
        str(label): float(prob) * 100 for label, 
        prob in zip(class_labels, proba)
    }

    return jsonify({
        "risk_level": str(predicted_risk),
        "estimated_depth_m": round(predicted_depth, 3),
        "confidence_pct": round(confidence, 2),
        "probabilities": proba_dict,
        "input": {
            "rainfall_mm": rainfall,
            "river_level": river_level,
            "soil_moisture_pct": soil_moisture,
            "city": city,
            "elevation_m": elevation,
        }
    })