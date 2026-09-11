"""
One-time script.
Computes monthly averages for river level and soil moisture per city.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, extract
from app import create_app
from app.db_models import db, MonthlyAverage, WeatherRecord

app = create_app()

with app.app_context():
    MonthlyAverage.query.delete()
    db.session.commit()
    print("Cleared existing monthly averages.\n")

    results = (
        db.session.query(
            WeatherRecord.city_id,
            extract("month", WeatherRecord.date).label("month"),
            func.avg(WeatherRecord.water_level_m).label("avg_river"),
            func.avg(WeatherRecord.soil_moisture_pct).label("avg_soil"),
        )
        .group_by(WeatherRecord.city_id, extract("month", WeatherRecord.date))
        .order_by(WeatherRecord.city_id, extract("month", WeatherRecord.date))
        .all()
    )

    count = 0
    for city_id, month, avg_river, avg_soil in results:
        db.session.add(MonthlyAverage(
            city_id=city_id,
            month=int(month),
            avg_river_level=round(float(avg_river), 4),
            avg_soil_moisture=round(float(avg_soil), 4),
        ))
        count += 1
    db.session.commit()
    print(f"Inserted {count} monthly averages.")
    print(f"Verification: {MonthlyAverage.query.count()} rows")