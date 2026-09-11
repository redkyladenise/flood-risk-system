"""
One-time script.
Computes average river water level per city per month from weather_records
and inserts results into river_level_monthly_averages.
Run once with: python compute_river_averages.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pandas as pd
from sqlalchemy import func, extract
from app import create_app
from app.db_models import db, City, WeatherRecord, RiverLevelMonthlyAverage

app = create_app()

with app.app_context():
    RiverLevelMonthlyAverage.query.delete()
    db.session.commit()
    print("Cleared existing river level monthly averages.\n")

    # SQLAlchemy query: group by city_id and month, get AVG(water_level_m)
    results = (
        db.session.query(
            WeatherRecord.city_id,
            extract("month", WeatherRecord.date).label("month"),
            func.avg(WeatherRecord.water_level_m).label("avg_level"),
        )
        .group_by(WeatherRecord.city_id, extract("month", WeatherRecord.date))
        .order_by(WeatherRecord.city_id, extract("month", WeatherRecord.date))
        .all()
    )

    # insert results
    rows_inserted = 0
    for city_id, month, avg_level in results:
        avg = RiverLevelMonthlyAverage(
            city_id=city_id,
            month=int(month),
            avg_river_level=round(float(avg_level), 4),
        )
        db.session.add(avg)
        rows_inserted += 1

    db.session.commit()

    # verify
    print(f"Inserted {rows_inserted} monthly averages.\n")

    verification = (
        db.session.query(City.name, RiverLevelMonthlyAverage.month, RiverLevelMonthlyAverage.avg_river_level)
        .join(RiverLevelMonthlyAverage, City.city_id == RiverLevelMonthlyAverage.city_id)
        .order_by(City.name, RiverLevelMonthlyAverage.month)
        .limit(12)
        .all()
    )

    print("Sample (first 12 rows):")
    for city_name, month, avg_level in verification:
        print(f"  {city_name:15s} | Month {int(month):2d} | Avg Water Level: {avg_level}")