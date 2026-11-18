FROM python:3.12-slim

ARG TARGETARCH
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7890

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/bin \
    && ARCH="${TARGETARCH:-amd64}" \
    && curl -4 --retry 5 --retry-delay 2 --retry-all-errors -fsSL "https://github.com/YouROK/TorrServer/releases/latest/download/TorrServer-linux-${ARCH}" -o /app/bin/TorrServer \
    && chmod +x /app/bin/TorrServer

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    grep -viE '^(pywebview|pyinstaller)' requirements.txt > /tmp/req-docker.txt \
    && pip install -r /tmp/req-docker.txt \
    && rm -f /tmp/req-docker.txt

COPY . .

EXPOSE 7890 8090

CMD ["python", "run_server.py"]
