#!/bin/sh
set -e

# Train any missing models when the raw datasets are available. Safe to run on
# every start - each block is skipped if its .joblib already exists.
train_if_missing() {
  model_file="$1"
  raw_file="$2"
  prep_module="$3"
  train_module="$4"
  if [ ! -f "$model_file" ] && [ -f "$raw_file" ]; then
    echo "[entrypoint] $model_file missing - training from $raw_file"
    python -m "$prep_module"
    python -m "$train_module"
  fi
}

train_if_missing models/yield_model.joblib      data/raw/crop_yield.csv           src.prepare_real_data       src.train
train_if_missing models/crop_model.joblib       data/raw/crop_recommendation.csv  src.prepare_crop_data       src.train_crop
train_if_missing models/irrigation_model.joblib data/raw/irrigation.csv           src.prepare_irrigation_data src.train_irrigation

if [ ! -f models/yield_model.joblib ]; then
  echo "[entrypoint] WARNING: no trained models found - yield runs in agronomic-fallback mode; crop/irrigation need their .joblib files."
fi

exec "$@"
