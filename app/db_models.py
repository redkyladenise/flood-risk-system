from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy() # init.py will use this to bind to Flask

class City(db.Model):
    __tablename__ = "cities"

    city_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False, unique=True)
    province_region = db.Column(db.Text, default="Metro Manila")
    elevation_m = db.Column(db.Float)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    geojson_boundary = db.Column(db.Text)  # reference path for choropleth map


class WeatherRecord(db.Model):
    __tablename__ = "weather_records"

    record_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    rainfall_mm = db.Column(db.Float)
    water_level_m = db.Column(db.Float)  # dataset-scale, documented limitation
    soil_moisture_pct = db.Column(db.Float)
    flood_occurrence = db.Column(db.Boolean, default=False)  # reference only, not a model predictor
    flood_depth_m = db.Column(db.Float)  # regression target
    risk_level = db.Column(db.Text)  # classification target (Low/Moderate/High)
    data_source = db.Column(db.Text, default="Kaggle")  # "Kaggle" or "PAGASA"

    city = db.relationship("City", backref="weather_records")
# --- skipped ---
# class FloodEvent(db.Model):
#     __tablename__ = "flood_events"

#     event_id = db.Column(db.Integer, primary_key=True)
#     event_name = db.Column(db.Text)
#     date_start = db.Column(db.Date)
#     date_end = db.Column(db.Date)
#     reported_depth_description = db.Column(db.Text)
#     source_citation = db.Column(db.Text)

class MonthlyAverage(db.Model):
    __tablename__ = "monthly_averages"

    avg_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1–12
    avg_river_level = db.Column(db.Float)
    avg_soil_moisture = db.Column(db.Float)

    city = db.relationship("City", backref="monthly_averages")

class EvacuationCenter(db.Model):
    __tablename__ = "evacuation_centers"

    center_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    district = db.Column(db.Integer)  
    name = db.Column(db.Text, nullable=False)
    barangay = db.Column(db.Text)
    address = db.Column(db.Text)
    capacity = db.Column(db.Integer)

    city = db.relationship("City", backref="evacuation_centers")

class Hotline(db.Model):
    __tablename__ = "hotlines"

    hotline_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=True)  # nullable for national
    agency_name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text)
    service = db.Column(db.Text)
    number = db.Column(db.Text, nullable=False)

    city = db.relationship("City", backref="hotlines")

# --- skipped ---
# class RiverStation(db.Model):
#     __tablename__ = "river_stations"

#     station_id = db.Column(db.Integer, primary_key=True)
#     city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
#     station_name = db.Column(db.Text)
#     alarm_level_m = db.Column(db.Float)  # real-world scale, reference only
#     critical_level_m = db.Column(db.Float)
#     current_level_m = db.Column(db.Float, nullable=True)  # scraped or manually updated
#     last_updated = db.Column(db.DateTime, nullable=True)
#     latitude = db.Column(db.Float)
#     longitude = db.Column(db.Float)


class Hotspot(db.Model):
    __tablename__ = "hotspots"

    hotspot_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    city = db.relationship("City", backref="hotspots") 

# --- skipped ---
# class ModelMetric(db.Model):
#     __tablename__ = "model_metrics"

#     metric_id = db.Column(db.Integer, primary_key=True)
#     model_name = db.Column(db.Text)
#     metric_name = db.Column(db.Text)  # MAE, RMSE, Accuracy, Recall, Kappa, etc.
#     metric_value = db.Column(db.Float)
#     date_generated = db.Column(db.DateTime, default=db.func.now())

