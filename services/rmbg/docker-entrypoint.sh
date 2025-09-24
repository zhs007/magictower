#!/usr/bin/env sh
set -e

# Ensure the model directory exists before attempting downloads
if [ -n "${U2NET_HOME}" ]; then
  mkdir -p "${U2NET_HOME}"
fi

if [ -n "${REMBG_MODELS}" ]; then
  echo "Preparing rembg models: ${REMBG_MODELS}"
else
  echo "Preparing rembg models: isnet-general-use (default)"
fi

python /app/prepare_models.py

echo "Model preparation complete. Starting service..."
exec "$@"
