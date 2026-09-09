from flask import Flask


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "oquwn788cabxma124s5a78kaunas24562ajysa"

    from app import routes
    app.register_blueprint(routes.bp)

    return app