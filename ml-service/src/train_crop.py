"""
Train the crop-recommendation classifier.

    python -m src.prepare_crop_data
    python -m src.train_crop            # -> models/crop_model.joblib + crop_model_card.json

RandomForestClassifier on the 7 agronomic inputs. The dataset is small, clean
and perfectly balanced (100 rows x 22 crops), so this fits very tightly - the
value is the ranked probabilities, not a single label.
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import accuracy_score, f1_score, top_k_accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

from .crops import CROP_FEATURES, CROP_TARGET

DATA = Path("data/crop_dataset.csv")
OUT = Path("models/crop_model.joblib")
SOURCE = Path("data/crop_data_source.json")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--data", type=Path, default=DATA)
    p.add_argument("--out", type=Path, default=OUT)
    args = p.parse_args()

    if not args.data.exists():
        raise SystemExit(f"[train-crop] {args.data} missing - run: python -m src.prepare_crop_data")

    df = pd.read_csv(args.data)
    X, y = df[CROP_FEATURES], df[CROP_TARGET]
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=300, max_depth=None, min_samples_leaf=1,
        n_jobs=-1, random_state=42,
    )
    model.fit(X_tr, y_tr)

    proba = model.predict_proba(X_te)
    metrics = {
        "accuracy": round(float(accuracy_score(y_te, model.predict(X_te))), 4),
        "macro_f1": round(float(f1_score(y_te, model.predict(X_te), average="macro")), 4),
        "top3_accuracy": round(float(top_k_accuracy_score(y_te, proba, k=3, labels=model.classes_)), 4),
    }
    cv = cross_val_score(
        RandomForestClassifier(n_estimators=300, n_jobs=-1, random_state=42),
        X, y, cv=StratifiedKFold(5, shuffle=True, random_state=42),
        scoring="accuracy", n_jobs=-1,
    )
    print(f"[train-crop] hold-out: {metrics}")
    print(f"[train-crop] 5-fold accuracy: mean={cv.mean():.4f} std={cv.std():.4f}")

    imp = permutation_importance(model, X_te, y_te, n_repeats=8, random_state=42, n_jobs=-1)
    importance = {c: round(float(v), 4) for c, v in
                  sorted(zip(CROP_FEATURES, imp.importances_mean), key=lambda kv: -kv[1])}
    print(f"[train-crop] importance: {importance}")

    defaults = {c: round(float(df[c].median()), 3) for c in CROP_FEATURES}

    args.out.parent.mkdir(parents=True, exist_ok=True)
    dump(model, args.out)

    source = json.loads(SOURCE.read_text()) if SOURCE.exists() else {"synthetic": True}
    card = {
        "task": "crop_recommendation",
        "model_type": "RandomForestClassifier (7 agronomic inputs)",
        "features": CROP_FEATURES,
        "classes": list(model.classes_),
        "dataset": {
            "path": str(args.data), "rows": int(len(df)),
            "sha256": hashlib.sha256(args.data.read_bytes()).hexdigest(),
            "synthetic": bool(source.get("synthetic", False)),
            "source": source.get("origin", "unknown"),
        },
        "metrics": metrics,
        "cv_accuracy": {"mean": round(float(cv.mean()), 4), "std": round(float(cv.std()), 4)},
        "feature_importance": importance,
        "feature_defaults": defaults,
        "versions": {"python": platform.python_version(), "scikit_learn": sklearn.__version__,
                     "numpy": np.__version__, "pandas": pd.__version__},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "disclaimer": (
            "Suitability scores are model probabilities from soil/weather inputs "
            "only - they ignore market, seed availability, pests and local "
            "practice. Confirm with a local agricultural officer before sowing."
        ),
    }
    args.out.with_name("crop_model_card.json").write_text(json.dumps(card, indent=2))
    print(f"[train-crop] saved -> {args.out}")


if __name__ == "__main__":
    main()
