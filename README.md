## Model Inference Specifications

Trained model artifacts are stored in `models/` as `.joblib` files (Python `joblib` serialization). 

> **Important:** Feature arrays passed to `.predict()` or `.predict_proba()` must be structured as a 2D array or pandas DataFrame matching the exact column order below. Categorical cities must be one-hot encoded (`1` for active city, `0` otherwise).

---

### 1. Linear Models (Baseline)
* **Files:** 
  * `models/baseline_linear_regression.joblib`
  * `models/baseline_logistic_regression.joblib`
* **Scaler File:**
  * `models/scaler_linear_features.joblib` (`StandardScaler` fitted on 80% training data; **must** transform input before `.predict()`)
* **Feature Handling:** `Elevation_m` is omitted due to multicollinearity; `Location_Manila` is dropped as the reference dummy to avoid the dummy variable trap.
* **Input Schema (6 features in strict order):**
  1. `Rainfall_mm` (*float*): Accumulated precipitation in millimeters.
  2. `WaterLevel_m` (*float*): River/water station stage in meters.
  3. `SoilMoisture_pct` (*float*): Volumetric soil moisture percentage (0.0 - 100.0).
  4. `Location_Marikina` (*int*): `1` if Marikina, else `0`.
  5. `Location_Pasig` (*int*): `1` if Pasig, else `0`.
  6. `Location_Quezon City` (*int*): `1` if Quezon City, else `0`.
  *(If all three city indicators are `0`, the location defaults to Manila).*

---

### 2. CART Decision Tree Models (Primary Production)
* **Model Files:**
  * `models/cart_decision_tree_regressor.joblib`
  * `models/cart_decision_tree_classifier.joblib`
* **Feature Handling:** Invariant to monotonic scaling—requires **raw physical units** (no scaling). Includes `Elevation_m` and all four city indicators (orthogonal tree partitioning naturally handles multicollinear features).
* **Input Schema (8 features in strict order):**
  1. `Rainfall_mm` (*float*): Accumulated precipitation in millimeters.
  2. `WaterLevel_m` (*float*): River/water station stage in meters.
  3. `SoilMoisture_pct` (*float*): Volumetric soil moisture percentage (0.0 - 100.0).
  4. `Elevation_m` (*float*): Mean ground elevation in meters (Manila: ~7.0, Pasig: ~9.0, Marikina: ~15.0, QC: ~45.0).
  5. `Location_Manila` (*int*): `1` if Manila, else `0`.
  6. `Location_Marikina` (*int*): `1` if Marikina, else `0`.
  7. `Location_Pasig` (*int*): `1` if Pasig, else `0`.
  8. `Location_Quezon City` (*int*): `1` if Quezon City, else `0`.
---

### 3. Model Targets & Output Formats
* **Depth Regression** 
  * Model: `cart_decision_tree_regressor.joblib` 
  * Target: `FloodDepth_m`
  * Output: Continuous numerical prediction of flood inundation depth in meters (0.0 m).
* **Hazard Classification** 
  * `cart_decision_tree_classifier.joblib` 
  * Target: `RiskLevel`
  * Output: Discrete 3-tier MGB hazard class string (`Low`, `Moderate`, `High`) and 3-element probability distribution via `.predict_proba()`
---

### 4. Machine-Readable Feature Mapping Contract
For automated schema validation and dynamic ingestion in downstream API or dashboard pipelines, refer to `models/model_features.json`:

```json
{
  "linear_features": [
    "Rainfall_mm",
    "WaterLevel_m",
    "SoilMoisture_pct",
    "Location_Marikina",
    "Location_Pasig",
    "Location_Quezon City"
  ],
  "cart_features": [
    "Rainfall_mm",
    "WaterLevel_m",
    "SoilMoisture_pct",
    "Elevation_m",
    "Location_Manila",
    "Location_Marikina",
    "Location_Pasig",
    "Location_Quezon City"
  ],
  "target_regression": "FloodDepth_m",
  "target_classification": "RiskLevel",
  "classification_classes": [
    "High",
    "Low",
    "Moderate"
  ],
  "scaling_required_for_linear": true,
  "scaling_required_for_cart": false,
  "dropped_reference_dummy": "Location_Manila",
  "dropped_collinear_feature": "Elevation_m"
}