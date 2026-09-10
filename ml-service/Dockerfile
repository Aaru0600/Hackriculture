# HACKRICULTURE - Python FastAPI ML service
FROM python:3.13-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt ./
RUN pip install -r requirements.txt

# Copy the whole service. `models/` and `data/` are git-ignored but ARE included
# in the Docker build context when present on the build host. If models are
# missing the entrypoint trains them from `data/raw/*.csv` when those exist;
# otherwise the yield endpoint runs in agronomic-fallback mode. Mount
# ./data/raw for a truly from-scratch build.
COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=4s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8001/health').status==200 else 1)" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
