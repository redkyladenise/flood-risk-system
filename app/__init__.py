from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "oquwn788cabxma124s5a78kaunas24562ajysa"

    # Database configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    from app.db_models import db
    db.init_app(app)
    
    from app import model_loader
    model_loader.load_models()
    
    from app import routes
    app.register_blueprint(routes.bp)

    return app