"""
Turn the raw Kaggle "Crop Yield in Indian States" CSV into the model's
training schema.

    python -m src.prepare_real_data --raw data/raw/crop_yield.csv \
                                    --out data/yield_dataset.csv

Cleaning steps (all logged):
  * strip whitespace from Crop / Season / State, lower-case
  * map crop / season labels to our vocab; drop crops we do not model
  * drop rows whose Yield falls outside a sane per-crop t/ha window
    (the raw file mixes bales / nuts / tonnes between crops)
  * derive fertilizer_per_ha = Fertilizer / Area, pesticide_per_ha likewise
  * rename to the model schema and keep only those columns

Writes the cleaned CSV plus `data/data_source.json` recording provenance
(raw sha256, row counts, `synthetic: false`).
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from .features import (
    CROP_ALIASES, REAL_FEATURE_ORDER, SEASON_ALIASES, STATES, TARGET,
    YIELD_WINDOW,
)

DEFAULT_RAW = Path("data/raw/crop_yield.csv")
DEFAULT_OUT = Path("data/yield_dataset.csv")


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    log: dict = {"raw_rows": int(len(raw))}
    df = raw.copy()
    df.columns = [c.strip() for c in df.columns]
    for col in ("Crop", "Season", "State"):
        df[col] = df[col].astype(str).str.strip().str.lower()

    df["crop"] = df["Crop"].map(CROP_ALIASES)
    df["season"] = df["Season"].map(SEASON_ALIASES)
    df["state"] = df["State"]

    df = df[df["crop"].notna()]
    log["rows_after_crop_filter"] = int(len(df))
    df = df[df["season"].notna()]
    df = df[df["state"].isin(STATES)]
    log["rows_after_season_state_filter"] = int(len(df))

    df = df[(df["Area"] > 0) & (df["Production"] >= 0)]
    df["fertilizer_per_ha"] = (df["Fertilizer"] / df["Area"]).clip(0, 500)
    df["pesticide_per_ha"] = (df["Pesticide"] / df["Area"]).clip(0, 50)
    df["annual_rainfall_mm"] = df["Annual_Rainfall"].clip(100, 7000)
    df["area_ha"] = df["Area"]
    df["crop_year"] = df["Crop_Year"].astype(int)
    df[TARGET] = df["Yield"]

    # per-crop sanity window on the yield value
    keep = np.zeros(len(df), dtype=bool)
    for crop, (lo, hi) in YIELD_WINDOW.items():
        keep |= (df["crop"] == crop) & df[TARGET].between(lo, hi)
    df = df[keep]
    log["rows_after_yield_window"] = int(len(df))

    df = df.dropna(subset=REAL_FEATURE_ORDER + [TARGET])
    out = df[REAL_FEATURE_ORDER + [TARGET]].reset_index(drop=True)
    log["final_rows"] = int(len(out))
    log["crops"] = sorted(out["crop"].unique().tolist())
    log["per_crop_rows"] = out["crop"].value_counts().to_dict()
    return out, log


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    if not args.raw.exists():
        raise SystemExit(
            f"[prepare] raw file not found: {args.raw}\n"
            "Download the Kaggle 'Crop Yield in Indian States' CSV to that path."
        )

    raw = pd.read_csv(args.raw)
    cleaned, log = clean(raw)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(args.out, index=False)

    source = {
        "synthetic": False,
        "origin": "Kaggle - Crop Yield in Indian States Dataset (state-year aggregates, 1997-2020)",
        "raw_path": str(args.raw),
        "raw_sha256": hashlib.sha256(args.raw.read_bytes()).hexdigest(),
        "clean_path": str(args.out),
        "clean_sha256": hashlib.sha256(args.out.read_bytes()).hexdigest(),
        "cleaning_log": log,
        "prepared_at": datetime.now(timezone.utc).isoformat(),
    }
    (args.out.parent / "data_source.json").write_text(json.dumps(source, indent=2))

    print(f"[prepare] {log['raw_rows']:,} raw -> {log['final_rows']:,} clean rows "
          f"-> {args.out}")
    print(f"[prepare] per-crop rows: {log['per_crop_rows']}")
    print(f"[prepare] wrote provenance -> {args.out.parent / 'data_source.json'}")


if __name__ == "__main__":
    main()
