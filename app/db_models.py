from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class City(db.Model):
    __tablename__ = "cities"

    city_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text, nullable=False, unique=True)
    province_region = db.Column(db.Text, default="Metro Manila")
    elevation_m = db.Column(db.Float)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)


class WeatherRecord(db.Model):
    __tablename__ = "weather_records"

    record_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    rainfall_mm = db.Column(db.Float)
    water_level_m = db.Column(db.Float)  # dataset-scale
    soil_moisture_pct = db.Column(db.Float)
    flood_occurrence = db.Column(db.Boolean, default=False)  # reference only, not a model predictor
    flood_depth_m = db.Column(db.Float)  # regression target
    risk_level = db.Column(db.Text)  # classification target (Low/Moderate/High)
    data_source = db.Column(db.Text, default="Kaggle")  # "Kaggle" or "PAGASA"

    city = db.relationship("City", backref="weather_records")

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

    city = db.relationship("City", backref="evacuation_centers")

class Hotline(db.Model):
    __tablename__ = "hotlines"

    hotline_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=True)
    agency_name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text)
    service = db.Column(db.Text)
    number = db.Column(db.Text, nullable=False)
    sim = db.Column(db.Text, nullable=True)

    city = db.relationship("City", backref="hotlines")


class Hotspot(db.Model):
    __tablename__ = "hotspots"

    hotspot_id = db.Column(db.Integer, primary_key=True)
    city_id = db.Column(db.Integer, db.ForeignKey("cities.city_id"), nullable=False)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    city = db.relationship("City", backref="hotspots") 