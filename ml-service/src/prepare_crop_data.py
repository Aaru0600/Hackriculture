"""
Kaggle "Crop Recommendation Dataset" -> model schema.

    python -m src.prepare_crop_data --raw data/raw/crop_recommendation.csv \
                                    --out data/crop_dataset.csv
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .crops import CROP_CSV_RENAME, CROP_FEATURES, CROP_LABELS, CROP_TARGET

DEFAULT_RAW = Path("data/raw/crop_recommendation.csv")
DEFAULT_OUT = Path("data/crop_dataset.csv")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()

    if not args.raw.exists():
        raise SystemExit(f"[prepare-crop] raw not found: {args.raw}")

    df = pd.read_csv(args.raw).rename(columns=CROP_CSV_RENAME)
    df[CROP_TARGET] = df[CROP_TARGET].astype(str).str.strip().str.lower()
    df = df[df[CROP_TARGET].isin(CROP_LABELS)]
    df = df.dropna(subset=CROP_FEATURES + [CROP_TARGET])
    out = df[CROP_FEATURES + [CROP_TARGET]].reset_index(drop=True)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.out, index=False)
    (args.out.parent / "crop_data_source.json").write_text(json.dumps({
        "synthetic": False,
        "origin": "Kaggle - Crop Recommendation Dataset (N,P,K,temperature,humidity,ph,rainfall -> crop)",
        "raw_sha256": hashlib.sha256(args.raw.read_bytes()).hexdigest(),
        "rows": int(len(out)),
        "classes": sorted(out[CROP_TARGET].unique().tolist()),
        "prepared_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))
    print(f"[prepare-crop] {len(out):,} rows, {out[CROP_TARGET].nunique()} crops -> {args.out}")


if __name__ == "__main__":
    main()
