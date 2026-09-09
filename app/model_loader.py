import os
import joblib

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# global variables
regressor = None
classifier = None
model_features = None

def load_models():
    """Load all trained models and feature metadata into memory."""
    global regressor, classifier, model_features

    regressor_path = os.path.join(MODELS_DIR, "cart_decision_tree_regressor.joblib")
    classifier_path = os.path.join(MODELS_DIR, "cart_decision_tree_classifier.joblib")
    features_path = os.path.join(MODELS_DIR, "model_features.json")

    regressor = joblib.load(regressor_path)
    classifier = joblib.load(classifier_path)

    if os.path.exists(features_path):
        import json
        with open(features_path, "r") as f:
            model_features = json.load(f)

    print("Models loaded successfully.")