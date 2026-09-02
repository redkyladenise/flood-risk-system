## Model Inference Specifications

Trained model artifacts are stored in `models/` as `.joblib` files (Python `joblib` serialization). 

> **Important:** Feature arrays passed to `.predict()` or `.predict_proba()` must be structured as a 2D array or pandas DataFrame matching the exact column order below. Categorical cities must be one-hot encoded (`1` for active city, `0` otherwise).

---

### 1. Linear Models (Baseline)
* **Files:** 
  * `models/baseline_linear_regression.joblib`
  * `models/baseline_logistic_regression.joblib`
* **Exclusions:** `Elevation_m` is omitted due to collinearity; `Location_Manila` is dropped as the reference dummy to prevent the dummy variable trap.
* **Input Schema (5 features in order):**
  1. `WaterLevel_m` (*float*): River/water station level in meters.
  2. `SoilMoisture_pct` (*float*): Volumetric soil moisture percentage ($0.0 - 100.0$).
  3. `Location_Marikina` (*int*): `1` if Marikina, else `0`.
  4. `Location_Pasig` (*int*): `1` if Pasig, else `0`.
  5. `Location_Quezon City` (*int*): `1` if Quezon City, else `0`.
  *(If all three city dummies are `0`, the location is Manila).*

---

### 2. CART Decision Tree Models (Primary)
* **Files:**
  * `models/cart_decision_tree_regressor.joblib`
  * `models/cart_decision_tree_classifier.joblib`
* **Inclusions:** Includes `Elevation_m` and all 4 city indicators (orthogonal tree splits handle multi-collinear inputs).
* **Input Schema (7 features in order):**
  1. `WaterLevel_m` (*float*): River/water station level in meters.
  2. `SoilMoisture_pct` (*float*): Volumetric soil moisture percentage ($0.0 - 100.0$).
  3. `Elevation_m` (*float*): Mean ground elevation in meters (Manila: ~7.0, Marikina: ~15.0, Pasig: ~9.0, QC: ~45.0).
  4. `Location_Manila` (*int*): `1` if Manila, else `0`.
  5. `Location_Marikina` (*int*): `1` if Marikina, else `0`.
  6. `Location_Pasig` (*int*): `1` if Pasig, else `0`.
  7. `Location_Quezon City` (*int*): `1` if Quezon City, else `0`.

---

### 3. Machine-Readable Feature Mapping
For automated dynamic loading, refer to `models/model_features.json`:
```json
{
  "linear_features": [
    "WaterLevel_m",
    "SoilMoisture_pct",
    "Location_Marikina",
    "Location_Pasig",
    "Location_Quezon City"
  ],
  "cart_features": [
    "WaterLevel_m",
    "SoilMoisture_pct",
    "Elevation_m",
    "Location_Manila",
    "Location_Marikina",
    "Location_Pasig",
    "Location_Quezon City"
  ]
}