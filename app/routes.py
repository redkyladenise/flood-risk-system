from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
from flask import Blueprint, render_template, request, jsonify
from app import model_loader
from datetime import date
from datetime import timedelta
from app.db_models import Hotline, Hotspot, db, City, MonthlyAverage, WeatherRecord, EvacuationCenter
from app import weather_api
import time

_map_data_cache = {"timestamp": 0, "data": None}
_MAP_CACHE_TTL = 300 

bp = Blueprint("main", __name__)

@bp.route("/")
def home():
    """
    Home page: assessment board, alert banner, forecast summary, interactive map.
    Passes city list for the dropdown and map setup.
    Predictions are fetched separately via /api/nowcast and /api/forecast.
    """
    cities = City.query.order_by(City.name).all()

    city_list = [
        {
            "id": c.city_id,
            "name": c.name,
            "elevation_m": c.elevation_m,
            "latitude": c.latitude,
            "longitude": c.longitude,
        }
        for c in cities
    ]

    return render_template("home.html", cities=city_list)

@bp.route("/simulator")
def simulator():
    return render_template("simulator.html")

@bp.route("/live-weather")
def live_weather():
    cities = City.query.order_by(City.name).all()
    return render_template(
        "live_weather.html",
        cities=[{"name": c.name} for c in cities],
    )

@bp.route("/model-insights")
def model_insights():
    metrics = {
        "regression": {
            "model": "CART DecisionTreeRegressor (min_samples_leaf=20)",
            "mae": 0.0010,
            "rmse": 0.0116,
            "r2": 0.9848,
            "mape_global": 0.18,
            "mape_nonzero": 13.90,
        },
        "classification": {
            "model": "CART DecisionTreeClassifier (8 unscaled features)",
            "accuracy": 0.9952,
            "precision_macro": 0.8556,
            "recall_macro": 0.9730,
            "f1_macro": 0.9065,
            "f1_weighted": 0.9956,
            "kappa_quadratic": 0.9336,
        },
    }
    return render_template("model_insights.html", metrics=metrics)

@bp.route("/emergency")
def emergency():
    cities = City.query.order_by(City.name).all()

    # National hotlines (city_id is NULL)
    national = Hotline.query.filter(Hotline.city_id.is_(None)).all()
    national_list = [
        {
            "agency": h.agency_name,
            "type": h.type,
            "service": h.service,
            "number": h.number,
        }
        for h in national
    ]

    # Per-city data
    emergency_data = {}

    for city in cities:
        centers = EvacuationCenter.query.filter_by(city_id=city.city_id).all()
        hotlines = Hotline.query.filter_by(city_id=city.city_id).all()

        emergency_data[city.name] = {
            "centers": [
                {
                    "name": c.name,
                    "district": c.district,
                    "barangay": c.barangay,
                    "address": c.address,
                    "capacity": c.capacity,
                }
                for c in centers
            ],
            "hotlines": [
                {
                    "agency": h.agency_name,
                    "type": h.type,
                    "service": h.service,
                    "number": h.number,
                }
                for h in hotlines
            ],
        }

    return render_template(
        "emergency.html",
        cities=[{"name": c.name} for c in cities],
        national_hotlines=national_list,
        emergency_data=emergency_data,
    )

@bp.route("/about")
def about():
    return render_template("about.html")

# ============== SIMULATION API +=================
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

# ============== LIVE WEATHER API +=================

def _build_features(city, rainfall, river_level, soil_moisture):
    """
    Used by both /api/nowcast and /api/forecast.
    """
    dummies = {
        "Manila":       [1, 0, 0, 0],
        "Marikina":     [0, 1, 0, 0],
        "Pasig":        [0, 0, 1, 0],
        "Quezon City":  [0, 0, 0, 1],
    }.get(city.name, [1, 0, 0, 0])

    features = [
        rainfall, river_level, soil_moisture, city.elevation_m,
        dummies[0], dummies[1], dummies[2], dummies[3],
    ]

    return pd.DataFrame([features], columns=[
        "Rainfall_mm", "WaterLevel_m", "SoilMoisture_pct", "Elevation_m",
        "Location_Manila", "Location_Marikina", "Location_Pasig", "Location_Quezon City",
    ])

def _get_monthly_proxies(city):
    """
    Returns (river_level, soil_moisture) proxy values for the current month.
    """
    current_month = date.today().month
    monthly = MonthlyAverage.query.filter_by(
        city_id=city.city_id, month=current_month
    ).first()

    river_level = monthly.avg_river_level if monthly else 2.5
    soil_moisture = monthly.avg_soil_moisture if monthly else 15.0
    return river_level, soil_moisture

@bp.route("/api/nowcast")
def api_nowcast():
    city_name = request.args.get("city", "Manila")
    city = City.query.filter_by(name=city_name).first()
    if not city:
        return jsonify({"error": f"Unknown city: {city_name}"}), 400

    # live rainfall
    rainfall = weather_api.get_today_rainfall(city.latitude, city.longitude)
    api_status = "ok" if rainfall is not None else "unavailable"
    if rainfall is None:
        rainfall = 0.0

    # proxy values (current month)
    river_level, soil_moisture = _get_monthly_proxies(city)

    # feature vector
    X = _build_features(city, rainfall, river_level, soil_moisture)

    predicted_depth = float(model_loader.regressor.predict(X)[0])
    predicted_risk = str(model_loader.classifier.predict(X)[0])
    proba = model_loader.classifier.predict_proba(X)[0]
    confidence = float(max(proba)) * 100

    return jsonify({
        "city": city.name,
        "date": date.today().isoformat(),
        "risk_level": predicted_risk,
        "estimated_depth_m": round(predicted_depth, 3),
        "confidence_pct": round(confidence, 2),
        "rainfall_mm": round(rainfall, 2),
        "water_level_m": round(river_level, 3),
        "soil_moisture_pct": round(soil_moisture, 2),
        "elevation_m": city.elevation_m,
        "api_status": api_status,
    })

@bp.route("/api/forecast")
def api_forecast():
    """
    Returns today's (nowcast), tomorrow's (24h), and +48h forecasted risk for a given city, along with a trend indicator.

    Query parameter: ?city=Manila
    """
    city_name = request.args.get("city", "Manila")
    city = City.query.filter_by(name=city_name).first()
    if not city:
        return jsonify({"error": f"Unknown city: {city_name}"}), 400

    # live daily rainfall: 1 past day, 3 forecast days
    rainfall_by_date = weather_api.get_daily_rainfall(
        city.latitude, city.longitude, past_days=1, forecast_days=3
    )
    if not rainfall_by_date:
        return jsonify({"error": "Weather API unavailable"}), 503

    today = date.today()
    tomorrow = today + timedelta(days=1)
    day_after = today + timedelta(days=2)

    def rain_on(day):
        return rainfall_by_date.get(day.isoformat(), 0.0)

    # proxy values
    river_level, soil_moisture = _get_monthly_proxies(city)

    # predictions for each day
    predictions = []
    for label, day in [("today", today), ("tomorrow", tomorrow), ("plus48h", day_after)]:
        rainfall = rain_on(day)
        X = _build_features(city, rainfall, river_level, soil_moisture)
        depth = float(model_loader.regressor.predict(X)[0])
        risk = str(model_loader.classifier.predict(X)[0])
        proba = model_loader.classifier.predict_proba(X)[0]
        confidence = float(max(proba)) * 100

        predictions.append({
            "label": label,
            "date": day.isoformat(),
            "rainfall_mm": round(rainfall, 2),
            "risk_level": risk,
            "estimated_depth_m": round(depth, 3),
            "confidence_pct": round(confidence, 2),
        })

    # check trend
    today_depth = predictions[0]["estimated_depth_m"]
    tomorrow_depth = predictions[1]["estimated_depth_m"]

    tier_order = {"Low": 0, "Moderate": 1, "High": 2}
    today_tier = tier_order.get(predictions[0]["risk_level"], 0)
    tomorrow_tier = tier_order.get(predictions[1]["risk_level"], 0)

    if tomorrow_tier > today_tier:
        trend = "Increasing"
    elif tomorrow_tier < today_tier:
        trend = "Decreasing"
    else:
        if tomorrow_depth - today_depth > 0.05:
            trend = "Increasing"
        elif today_depth - tomorrow_depth > 0.05:
            trend = "Decreasing"
        else:
            trend = "Steady"

    return jsonify({
        "city": city.name,
        "trend": trend,
        "predictions": predictions,
    })

# ============== MAP ======================
@bp.route("/api/map-data")
def api_map_data():
    """
    Returns per-city risk colors for the choropleth map, plus all hotspots.
    Risk is computed via the same nowcast logic.
    """
    if _map_data_cache["data"] and time.time() - _map_data_cache["timestamp"] < _MAP_CACHE_TTL:
        return jsonify(_map_data_cache["data"])

    cities = City.query.all()
    city_risks = {}
    
    for city in cities:
        rainfall = weather_api.get_today_rainfall(city.latitude, city.longitude) or 0.0

        river_level, soil_moisture = _get_monthly_proxies(city)

        X = _build_features(city, rainfall, river_level, soil_moisture)
        risk = str(model_loader.classifier.predict(X)[0])

        city_risks[city.name] = {
            "risk_level": risk,
            "rainfall_mm": round(rainfall, 2),
            "depth_m": round(float(model_loader.regressor.predict(X)[0]), 3),
        }

    # Hotspots
    hotspots = Hotspot.query.all()
    hotspot_list = [
        {
            "name": h.name,
            "description": h.description,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "city": h.city.name if h.city else None,
        }
        for h in hotspots
    ]

    result = {"cities": city_risks, "hotspots": hotspot_list}
    _map_data_cache["data"] = result
    _map_data_cache["timestamp"] = time.time()
    return jsonify(result)


WMO_CODES = {
    0:  ("Clear sky", "☀️"),
    1:  ("Mainly clear", "🌤️"),
    2:  ("Partly cloudy", "⛅"),
    3:  ("Overcast", "☁️"),
    45: ("Fog", "🌫️"),
    48: ("Depositing rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌦️"),
    56: ("Light freezing drizzle", "🌧️"),
    57: ("Dense freezing drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    66: ("Light freezing rain", "🌧️"),
    67: ("Heavy freezing rain", "🌧️"),
    71: ("Slight snow", "❄️"),
    73: ("Moderate snow", "❄️"),
    75: ("Heavy snow", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Slight rain showers", "🌦️"),
    81: ("Moderate rain showers", "🌧️"),
    82: ("Violent rain showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "🌨️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with slight hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}


def wmo_info(code):
    """Returns (label, icon) for a WMO weather code."""
    return WMO_CODES.get(int(code), ("Unknown", "❓"))

@bp.route("/api/live-weather")
def api_live_weather():
    """
    Returns current conditions + 7-day forecast for a given city.
    Query parameter: ?city=Manila
    """
    city_name = request.args.get("city", "Manila")
    city = City.query.filter_by(name=city_name).first()
    if not city:
        return jsonify({"error": f"Unknown city: {city_name}"}), 400

    data = weather_api.get_current_and_forecast(city.latitude, city.longitude)
    if not data:
        return jsonify({"error": "Weather API unavailable"}), 503

    # Current conditions
    cur = data["current"]
    cur_label, cur_icon = wmo_info(cur.get("weather_code", 0))

    current = {
        "time": cur.get("time"),
        "temperature_c": cur.get("temperature_2m"),
        "apparent_temperature_c": cur.get("apparent_temperature"),
        "humidity_pct": cur.get("relative_humidity_2m"),
        "rain_mm": cur.get("rain"),
        "pressure_hpa": cur.get("surface_pressure"),
        "wind_speed_kmh": cur.get("wind_speed_10m"),
        "wind_direction_deg": cur.get("wind_direction_10m"),
        "weather_label": cur_label,
        "weather_icon": cur_icon,
    }

    # 7-day forecast
    daily = data["daily"]
    forecast = []
    for i in range(len(daily["time"])):
        code = daily["weather_code"][i]
        label, icon = wmo_info(code)
        forecast.append({
            "date": daily["time"][i],
            "weather_code": code,
            "weather_label": label,
            "weather_icon": icon,
            "temp_max_c": daily["temperature_2m_max"][i],
            "temp_min_c": daily["temperature_2m_min"][i],
            "precip_prob_pct": daily["precipitation_probability_max"][i],
            "rain_sum_mm": daily["rain_sum"][i],
        })

    return jsonify({
        "city": city.name,
        "current": current,
        "forecast": forecast,
    })