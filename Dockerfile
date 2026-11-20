FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY app /app/app
COPY firebase-adminsdk*.json /app/

ENV PYTHONPATH="/app/backend:/app"
ENV PORT=8000

EXPOSE 8000

CMD ["python", "backend/main.py"]
