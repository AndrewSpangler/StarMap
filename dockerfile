# syntax=docker/dockerfile:1.4
FROM python:3.10-alpine AS builder

WORKDIR /starmap

RUN apk update && apk add --no-cache \
    git \
    gcc \
    musl-dev \
    python3-dev \
    libffi-dev \
    openldap-dev \
    cyrus-sasl-dev \
    openssl-dev \
    docker-cli \
    docker-compose \
    make

COPY requirements.txt /starmap

# Install Python requirements
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install -r requirements.txt

COPY . /starmap

ENTRYPOINT ["python3", "-u", "run.py"]

# ENTRYPOINT ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:80", "--workers", "1", "--timeout", "30", "app:create_app()"]

# Dev environment stage
FROM builder AS dev-envs
