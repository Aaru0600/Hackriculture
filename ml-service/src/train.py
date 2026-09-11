"""
Train the crop-yield regression model on the prepared REAL dataset.

    python -m src.prepare_real_data      # data/raw/crop_yield.csv -> data/yield_dataset.csv
    python -m src.train                  # -> models/yield_model.joblib + model_card.json

Fits, on log1p(yield):
  * a LinearRegression baseline (reported only), and
  * a HistGradientBoostingRegressor (squared error) - the served model.

The predictive interval is derived at serve time from the relative residual
standard deviation measured here on the hold-out set (stored in the card).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from joblib import dump
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .features import (
    REAL_CATEGORICAL, REAL_FEATURE_ORDER, REAL_NUMERIC, TARGET,
)

DEFAULT_DATA = Path("data/yield_dataset.csv")
DEFAULT_OUT = Path("models/yield_model.joblib")
SOURCE_JSON = Path("data/data_source.json")


def _metrics(y_true, y_pred) -> dict[str, float]:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mape = float(np.mean(np.abs((y_true - y_pred) / np.clip(np.abs(y_true), 1e-6, None))) * 100)
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(rmse, 4),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "mape_pct": round(mape, 2),
    }


def _prep() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
             REAL_CATEGORICAL),
            ("num", "passthrough", REAL_NUMERIC),
        ],
        remainder="drop",
    )


def build_pipeline() -> Pipeline:
    model = HistGradientBoostingRegressor(
        loss="squared_error", max_iter=600, learning_rate=0.05,
        max_leaf_nodes=63, min_samples_leaf=15, l2_regularization=0.1,
        early_stopping=True, random_state=42,
    )
    return Pipeline([("prep", _prep()), ("model", model)])


def _grouped_importance(pipe: Pipeline, X_sample, y_sample) -> dict[str, float]:
    result = permutation_importance(
        pipe, X_sample, y_sample, n_repeats=6, random_state=42, n_jobs=-1,
    )
    grouped = {c: float(v) for c, v in zip(REAL_FEATURE_ORDER, result.importances_mean)}
    # `crop` sets the yield scale (0.5-70 t/ha) and swamps the rest; report
    # importance among the other regional features.
    grouped.pop("crop", None)
    total = sum(max(v, 0) for v in grouped.values()) or 1.0
    grouped = {k: round(max(v, 0) / total, 4) for k, v in grouped.items()}
    return dict(sorted(grouped.items(), key=lambda kv: kv[1], reverse=True))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if not args.data.exists():
        raise SystemExit(
            f"[train] {args.data} not found.\n"
            "Run:  python -m src.prepare_real_data"
        )

    df = pd.read_csv(args.data)
    missing = set(REAL_FEATURE_ORDER + [TARGET]) - set(df.columns)
    if missing:
        raise SystemExit(f"[train] dataset is missing columns: {sorted(missing)}")

    source = {"synthetic": True}
    if SOURCE_JSON.exists():
        source = json.loads(SOURCE_JSON.read_text())
    synthetic = bool(source.get("synthetic", True))

    # Fit on log1p(yield): the target spans <1 to ~160 t/ha across crops.
    X, y = df[REAL_FEATURE_ORDER], df[TARGET]
    y_log = np.log1p(y)
    X_tr, X_te, yl_tr, yl_te = train_test_split(X, y_log, test_size=0.2, random_state=42)
    y_te = np.expm1(yl_te).to_numpy()

    base = Pipeline([("prep", _prep()), ("model", LinearRegression())])
    base.fit(X_tr, yl_tr)
    base_metrics = _metrics(y_te, np.expm1(base.predict(X_te)))
    print(f"[train] LinearRegression      hold-out: {base_metrics}")

    pipe = build_pipeline()
    pipe.fit(X_tr, yl_tr)
    pred_te = np.expm1(pipe.predict(X_te))
    train_metrics = _metrics(np.expm1(yl_tr), np.expm1(pipe.predict(X_tr)))
    test_metrics = _metrics(y_te, pred_te)
    cv = cross_val_score(build_pipeline(), X, y_log,
                         cv=KFold(5, shuffle=True, random_state=42),
                         scoring="r2", n_jobs=-1)
    print(f"[train] HistGradientBoosting  train:    {train_metrics}")
    print(f"[train] HistGradientBoosting  hold-out: {test_metrics}")
    print(f"[train] HistGradientBoosting  5-fold R2 (log): "
          f"mean={cv.mean():.4f} std={cv.std():.4f}")

    rel_resid = (y_te - pred_te) / np.clip(pred_te, 0.1, None)
    resid_std_rel = float(np.std(rel_resid))
    half = 1.28 * resid_std_rel * pred_te
    coverage = float(np.mean(np.abs(y_te - pred_te) <= half))
    print(f"[train] relative residual std = {resid_std_rel:.3f}  "
          f"-> ~80% band empirical coverage {coverage:.3f}")

    importance = _grouped_importance(pipe, X_te.iloc[:3000], yl_te.iloc[:3000])
    print(f"[train] permutation importance: {importance}")

    # Serve-time fallbacks for inputs the caller omits. `area_ha`,
    # `fertilizer_per_ha`, `annual_rainfall_mm` and `pesticide_per_ha` are
    # STATE-YEAR AGGREGATES (e.g. area_ha=3.5M for Punjab wheat), not a single
    # farm's size - a GLOBAL median across every crop/state badly
    # mismatches the scale the model actually learned from (a few thousand ha
    # of global median area for what should be a multi-million-ha wheat
    # state), which was silently under-predicting yield for exactly the big,
    # high-input states/crops. Regional defaults are keyed by crop+state,
    # taken from each pair's most recent year, falling back to crop-only
    # then global at serve time.
    defaults = {c: round(float(df[c].median()), 3) for c in REAL_NUMERIC}
    defaults["crop_year"] = int(df["crop_year"].max())
    for c in REAL_CATEGORICAL:
        defaults[c] = df[c].mode().iloc[0]
    per_crop_yield = {c: round(float(g[TARGET].median()), 3)
                      for c, g in df.groupby("crop")}

    def _latest_row_defaults(group: pd.DataFrame) -> dict[str, float]:
        latest = group.sort_values("crop_year").iloc[-1]
        return {c: round(float(latest[c]), 3) for c in REAL_NUMERIC if c != "crop_year"}

    regional_defaults_by_crop = {
        crop: _latest_row_defaults(g) for crop, g in df.groupby("crop")
    }
    regional_defaults_by_crop_state = {
        f"{crop}|{state}": _latest_row_defaults(g)
        for (crop, state), g in df.groupby(["crop", "state"])
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    dump(pipe, args.out)

    card = {
        "model_type": "HistGradientBoostingRegressor (squared error), "
                      "sklearn Pipeline with one-hot categoricals",
        "target": TARGET,
        "target_units": "tonnes per hectare",
        "target_transform": "log1p",
        "residual_std_relative": round(resid_std_rel, 4),
        "interval_method": "point * (1 +/- 1.28 * residual_std_relative), ~80% nominal",
        "features": {"numeric": REAL_NUMERIC, "categorical": REAL_CATEGORICAL},
        "dataset": {
            "path": str(args.data),
            "rows": int(len(df)),
            "sha256": hashlib.sha256(args.data.read_bytes()).hexdigest(),
            "synthetic": synthetic,
            "source": source.get("origin", "unknown"),
        },
        "metrics": {
            "baseline_linear_holdout": base_metrics,
            "gbm_train": train_metrics,
            "gbm_holdout": test_metrics,
            "gbm_cv_r2_logspace": {"mean": round(float(cv.mean()), 4),
                                   "std": round(float(cv.std()), 4)},
            "interval_80_coverage_holdout": round(coverage, 3),
        },
        "feature_importance": importance,
        "feature_defaults": defaults,
        "regional_feature_defaults_by_crop_state": regional_defaults_by_crop_state,
        "regional_feature_defaults_by_crop": regional_defaults_by_crop,
        "per_crop_median_yield_t_ha": per_crop_yield,
        "versions": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "Trained on state-year AGGREGATE data (no plot-level soil chemistry). "
            "The service applies a separate agronomic adjustment for soil / "
            "temperature inputs. Show every prediction with a 'verify with a "
            "local agricultural expert / soil test' note."
        ),
    }
    card_path = args.out.with_name("model_card.json")
    card_path.write_text(json.dumps(card, indent=2))
    print(f"[train] saved model -> {args.out}")
    print(f"[train] saved card  -> {card_path}")
    print(f"[train] dataset synthetic = {synthetic}")


if __name__ == "__main__":
    main()
