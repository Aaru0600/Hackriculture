"""
irrigation_prediction.csv -> model schema.

    python -m src.prepare_irrigation_data --raw data/raw/irrigation.csv \
                                          --out data/irrigation_dataset.csv
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .irrigation import (
    IRR_CATEGORICAL, IRR_CSV_RENAME, IRR_FEATURE_ORDER, IRR_TARGET,
)

DEFAULT_RAW = Path("data/raw/irrigation.csv")
DEFAULT_OUT = Path("data/irrigation_dataset.csv")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = p.parse_args()

    if not args.raw.exists():
        raise SystemExit(f"[prepare-irr] raw not found: {args.raw}")

    df = pd.read_csv(args.raw).rename(columns=IRR_CSV_RENAME)
    for col in IRR_CATEGORICAL:
        df[col] = df[col].astype(str).str.strip().str.lower()
    df[IRR_TARGET] = df[IRR_TARGET].astype(str).str.strip().str.title()  # Low/Medium/High
    df = df.dropna(subset=IRR_FEATURE_ORDER + [IRR_TARGET])
    out = df[IRR_FEATURE_ORDER + [IRR_TARGET]].reset_index(drop=True)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.out, index=False)
    (args.out.parent / "irrigation_data_source.json").write_text(json.dumps({
        "synthetic": False,
        "origin": "irrigation_prediction.csv (soil/weather/crop context -> Low/Medium/High irrigation need)",
        "raw_sha256": hashlib.sha256(args.raw.read_bytes()).hexdigest(),
        "rows": int(len(out)),
        "class_balance": out[IRR_TARGET].value_counts().to_dict(),
        "prepared_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))
    print(f"[prepare-irr] {len(out):,} rows -> {args.out}")
    print(f"[prepare-irr] class balance: {out[IRR_TARGET].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
