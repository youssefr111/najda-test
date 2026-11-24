FROM python:3.12-slim
WORKDIR /srv
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY models ./models
RUN useradd --system app && chown -R app /srv
USER app
EXPOSE 8000
HEALTHCHECK --start-period=30s --interval=30s --timeout=5s CMD python -c "import os,urllib.request as u; u.urlopen('http://localhost:'+os.environ.get('PORT','8000')+'/health')"
# PORT is injected by most hosts (Render, Railway, Fly...); defaults to 8000 locally / in compose.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
