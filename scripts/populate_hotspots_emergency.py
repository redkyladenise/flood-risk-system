"""
One-time script.
Reads manual CSV files and inserts rows into:
  - hotspots
  - evacuation_centers
  - hotlines
Run once with: python scripts/populate_emergency_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pandas as pd
from app import create_app
from app.db_models import db, City, Hotspot, EvacuationCenter, Hotline

app = create_app()

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data", "manual"
)

HOTSPOTS_CSV = os.path.join(DATA_DIR, "hotspots.csv")
EVAC_CSV = os.path.join(DATA_DIR, "evacuation_centers.csv")
HOTLINES_CSV = os.path.join(DATA_DIR, "hotlines.csv")


with app.app_context():
    cities = City.query.all()
    city_id_map = {c.name: c.city_id for c in cities}
    print("City ID map:", city_id_map)

    # --- hotspots ---
    Hotspot.query.delete()
    db.session.commit()
    print("\nCleared existing hotspots.")

    df_hotspots = pd.read_csv(HOTSPOTS_CSV)
    count = 0
    for _, row in df_hotspots.iterrows():
        city_name = str(row["city_name"]).strip()
        if city_name not in city_id_map:
            print(f"  WARNING: City '{city_name}' not found — skipping.")
            continue
        hs = Hotspot(
            city_id=city_id_map[city_name],
            name=row["name"],
            description=row["description"],
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
        )
        db.session.add(hs)
        count += 1
    db.session.commit()
    print(f"Inserted {count} hotspots.")

    # --- evacutation center ---
    EvacuationCenter.query.delete()
    db.session.commit()
    print("\nCleared existing evacuation centers.")

    df_evac = pd.read_csv(EVAC_CSV)
    count = 0
    for _, row in df_evac.iterrows():
        city_name = str(row["city_name"]).strip()
        if city_name not in city_id_map:
            print(f"  WARNING: City '{city_name}' not found — skipping.")
            continue
        ec = EvacuationCenter(
            city_id=city_id_map[city_name],
            district=row.get("district"),
            name=row["name"],
            barangay=row["barangay"],
            address=row["address"],
            capacity=int(row["capacity"]),
        )
        db.session.add(ec)
        count += 1
    db.session.commit()
    print(f"Inserted {count} evacuation centers.")

    # --- hotlines ---
    Hotline.query.delete()
    db.session.commit()
    print("\nCleared existing hotlines.")

    df_hotlines = pd.read_csv(HOTLINES_CSV)
    count = 0
    for _, row in df_hotlines.iterrows():
        city_name = str(row["City"]).strip()
        city_id = city_id_map.get(city_name)
        h = Hotline(
            city_id=city_id,
            agency_name=row["Agency"],
            category=row["Category"],
            service=row["Service"],
            number=str(row["Number"]),
        )
        db.session.add(h)
        count += 1
    db.session.commit()
    print(f"Inserted {count} hotlines.")

    print("\nVerification:")
    print(f"  Hotspots: {Hotspot.query.count()}")
    print(f"  Evacuation centers: {EvacuationCenter.query.count()}")
    print(f"  Hotlines: {Hotline.query.count()}")