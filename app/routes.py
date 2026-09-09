from flask import Blueprint, render_template

bp = Blueprint("main", __name__)


@bp.route("/")
def home():
    return render_template("home.html")


@bp.route("/simulator")
def simulator():
    return render_template("simulator.html")


@bp.route("/live-data")
def live_data():
    return render_template("live_data.html")


@bp.route("/model-insights")
def model_insights():
    return render_template("model_insights.html")


@bp.route("/emergency")
def emergency():
    return render_template("emergency.html")


@bp.route("/about")
def about():
    return render_template("about.html")