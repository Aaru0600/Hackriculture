"""
Train the irrigation-need classifier (Low / Medium / High).

    python -m src.prepare_irrigation_data
    python -m src.train_irrigation      # -> models/irrigation_model.joblib + card

RandomForestClassifier with class_weight="balanced" - the dataset is heavily
skewed (High ~3%), so accuracy is misleading; macro-F1 and per-class recall
matter, especially recall on "High".
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from .irrigation import (
    IRR_CATEGORICAL, IRR_FEATURE_ORDER, IRR_NUMERIC, IRR_TARGET,
)

DATA = Path("data/irrigation_dataset.csv")
OUT = Path("models/irrigation_model.joblib")
SOURCE = Path("data/irrigation_data_source.json")


def build_pipeline() -> Pipeline:
    prep = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), IRR_CATEGORICAL),
        ("num", "passthrough", IRR_NUMERIC),
    ])
    clf = RandomForestClassifier(
        n_estimators=400, min_samples_leaf=2, class_weight="balanced",
        n_jobs=-1, random_state=42,
    )
    return Pipeline([("prep", prep), ("clf", clf)])


def _grouped_importance(pipe, X_s, y_s) -> dict:
    r = permutation_importance(pipe, X_s, y_s, n_repeats=5, random_state=42, n_jobs=-1)
    g = {c: float(v) for c, v in zip(IRR_FEATURE_ORDER, r.importances_mean)}
    tot = sum(max(v, 0) for v in g.values()) or 1.0
    return dict(sorted(((k, round(max(v, 0) / tot, 4)) for k, v in g.items()),
                       key=lambda kv: -kv[1]))


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--data", type=Path, default=DATA)
    p.add_argument("--out", type=Path, default=OUT)
    args = p.parse_args()

    if not args.data.exists():
        raise SystemExit(f"[train-irr] {args.data} missing - run: python -m src.prepare_irrigation_data")

    df = pd.read_csv(args.data)
    X, y = df[IRR_FEATURE_ORDER], df[IRR_TARGET]
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    pipe = build_pipeline()
    pipe.fit(X_tr, y_tr)
    pred = pipe.predict(X_te)

    report = classification_report(y_te, pred, output_dict=True, zero_division=0)
    macro_f1 = round(float(f1_score(y_te, pred, average="macro")), 4)
    cm = confusion_matrix(y_te, pred, labels=["Low", "Medium", "High"]).tolist()
    cv = cross_val_score(
        build_pipeline(), X, y,
        cv=StratifiedKFold(5, shuffle=True, random_state=42),
        scoring="f1_macro", n_jobs=-1,
    )
    print(f"[train-irr] macro-F1 hold-out: {macro_f1}  | 5-fold macro-F1: "
          f"mean={cv.mean():.4f} std={cv.std():.4f}")
    for cls in ("Low", "Medium", "High"):
        r = report.get(cls, {})
        print(f"[train-irr]   {cls:<7} precision={r.get('precision', 0):.3f} "
              f"recall={r.get('recall', 0):.3f} f1={r.get('f1-score', 0):.3f} "
              f"support={int(r.get('support', 0))}")

    importance = _grouped_importance(pipe, X_te.iloc[:3000], y_te.iloc[:3000])
    print(f"[train-irr] importance: {importance}")

    defaults = {c: round(float(df[c].median()), 3) for c in IRR_NUMERIC}
    for c in IRR_CATEGORICAL:
        defaults[c] = df[c].mode().iloc[0]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    dump(pipe, args.out)

    source = json.loads(SOURCE.read_text()) if SOURCE.exists() else {"synthetic": True}
    card = {
        "task": "irrigation_need",
        "model_type": "RandomForestClassifier (class_weight=balanced), one-hot categoricals",
        "features": {"numeric": IRR_NUMERIC, "categorical": IRR_CATEGORICAL},
        "classes": list(pipe.named_steps["clf"].classes_),
        "dataset": {
            "path": str(args.data), "rows": int(len(df)),
            "sha256": hashlib.sha256(args.data.read_bytes()).hexdigest(),
            "synthetic": bool(source.get("synthetic", False)),
            "source": source.get("origin", "unknown"),
        },
        "metrics": {
            "macro_f1_holdout": macro_f1,
            "per_class": {k: {m: round(float(report[k][m]), 4) for m in
                              ("precision", "recall", "f1-score")}
                          for k in ("Low", "Medium", "High") if k in report},
            "confusion_matrix_low_med_high": cm,
        },
        "cv_macro_f1": {"mean": round(float(cv.mean()), 4), "std": round(float(cv.std()), 4)},
        "feature_importance": importance,
        "feature_defaults": defaults,
        "versions": {"python": platform.python_version(), "scikit_learn": sklearn.__version__,
                     "numpy": np.__version__, "pandas": pd.__version__},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "Predicts a Low/Medium/High irrigation-need class from soil and "
            "weather context; the water depth and schedule are a rule-of-thumb "
            "layer on top. Adjust to your own field observations and local "
            "extension advice - do not irrigate purely on this number."
        ),
    }
    args.out.with_name("irrigation_model_card.json").write_text(json.dumps(card, indent=2))
    print(f"[train-irr] saved -> {args.out}")


if __name__ == "__main__":
    main()
