from app import create_app
from app.db_models import db

app = create_app()

with app.app_context():
    db.create_all()
    print("Database created successfully at instance/database.db")
    print("Tables created:", db.metadata.tables.keys())