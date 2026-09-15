import requests
from datetime import date, timedelta
import time

_rainfall_cache = {}   
_CACHE_TTL = 600

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_daily_rainfall(latitude, longitude, past_days=2, forecast_days=3):
    """
    Parameters:
        latitude, longitude: coordinates of the city
        past_days: how many past days to include (default 2 - yesterday + today)
        forecast_days: how many forecast days to include (default 3 - today, +1, +2)

    Returns:
        A dict mapping date (as string 'YYYY-MM-DD') to rainfall_mm (float).
    """

    cache_key = (round(latitude, 3), round(longitude, 3), past_days, forecast_days)

    if cache_key in _rainfall_cache:
        cached = _rainfall_cache[cache_key]
        if time.time() - cached["timestamp"] < _CACHE_TTL:
            return cached["data"]

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": "rain_sum",
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": "Asia/Manila",
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"Open-Meteo request failed: {e}")
        return {}

    dates = data["daily"]["time"]
    rains = data["daily"]["rain_sum"]

    result = {d: (float(r) if r is not None else 0.0) for d, r in zip(dates, rains)}

    _rainfall_cache[cache_key] = {"timestamp": time.time(), "data": result}
    return result

def get_today_rainfall(latitude, longitude):
    data = get_daily_rainfall(latitude, longitude, past_days=1, forecast_days=1)
    if not data:
        return None

    today = date.today().isoformat()
    return data.get(today)


def get_forecast_rainfall(latitude, longitude, days_ahead=1):
    """
    days_ahead=1 for tomorrow, 2 for +48h.
    """
    data = get_daily_rainfall(latitude, longitude, past_days=0, forecast_days=days_ahead + 1)
    if not data:
        return None

    target_date = (date.today() + timedelta(days=days_ahead)).isoformat()
    return data.get(target_date)


def get_current_and_forecast(latitude, longitude):
    """
    Returns a dict with 'current' and 'daily' sections, or None on failure.
    Uses the same 10-min cache as get_daily_rainfall.
    """
    cache_key = ("wx_current_7day", round(latitude, 3), round(longitude, 3))

    if cache_key in _rainfall_cache:
        cached = _rainfall_cache[cache_key]
        if time.time() - cached["timestamp"] < _CACHE_TTL:
            return cached["data"]

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "rain",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "weather_code",
        ]),
        "daily": ",".join([
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "rain_sum",
        ]),
        "forecast_days": 7,
        "timezone": "Asia/Manila",
    }

    try:
        response = requests.get(OPEN_METEO_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as e:
        print(f"Open-Meteo current+forecast request failed: {e}")
        return None

    _rainfall_cache[cache_key] = {"timestamp": time.time(), "data": data}
    return data