# MediChain ML scanner — for hosting on Render, Railway, Hugging Face Spaces, etc.
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py ./
COPY models ./models
ENV HOST=0.0.0.0
# Render/Railway set $PORT; Hugging Face Spaces expects 7860
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
