"""
One-time migration script.
Reads cleaned_dataset.csv and inserts rows into cities and weather_records tables.
Run once with: python migrate_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd
from datetime import datetime
from app import create_app
from app.db_models import db, City, WeatherRecord

app = create_app()

CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "processed", "cleaned_dataset.csv"
)

with app.app_context():
    # ---- INSERT CITIES ----
    df = pd.read_csv(CSV_PATH)

    city_names = df["Location"].unique().tolist()

    city_elevations = {}
    for city in city_names:
        city_elevations[city] = df[df["Location"] == city]["Elevation_m"].iloc[0]

    city_coordinates = {
        "Manila": (14.5995, 120.9842),
        "Marikina": (14.6507, 121.1029),
        "Pasig": (14.5764, 121.0851),
        "Quezon City": (14.6760, 121.0437),
    }

    city_id_map = {}  # city name -> city_id

    for city in city_names:
        existing = City.query.filter_by(name=city).first()
        if existing:
            city_id_map[city] = existing.city_id
            print(f"City already exists: {city} (id={existing.city_id})")
        else:
            lat, lon = city_coordinates.get(city, (14.5995, 120.9842))
            elev = city_elevations.get(city, 5.0)
            new_city = City(
                name=city,
                province_region="Metro Manila",
                elevation_m=elev,
                latitude=lat,
                longitude=lon,
                geojson_boundary=None,  # ====== will be filled later for choropleth map =====
            )
            db.session.add(new_city)
            db.session.flush()
            city_id_map[city] = new_city.city_id
            print(f"Inserted city: {city} (id={new_city.city_id}, elevation={elev}m)")

    db.session.commit()
    print(f"\nCities done: {city_id_map}\n")

    # ---- INSERT WEATHER RECORDS ----
    WeatherRecord.query.delete()    # avoid duplication
    db.session.commit()
    print("Cleared existing weather records.\n")

    rows_inserted = 0
    for _, row in df.iterrows():
        rec = WeatherRecord(
            city_id=city_id_map[row["Location"]],
            date=datetime.strptime(row["Date"], "%Y-%m-%d").date(),
            rainfall_mm=row["Rainfall_mm"],
            water_level_m=row["WaterLevel_m"],
            soil_moisture_pct=row["SoilMoisture_pct"],
            flood_occurrence=bool(row["FloodOccurrence"]),
            flood_depth_m=float(row["FloodDepth_m"]) if pd.notna(row["FloodDepth_m"]) else None,
            risk_level=str(row["RiskLevel"]) if pd.notna(row["RiskLevel"]) else None,
            data_source="Kaggle",
        )
        db.session.add(rec)
        rows_inserted += 1

    db.session.commit()
    print(f"Inserted {rows_inserted} weather records.")

    # --- Verify ---
    total_cities = City.query.count()
    total_records = WeatherRecord.query.count()
    print(f"\nVerification: {total_cities} cities, {total_records} weather records in database.")