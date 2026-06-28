FROM buildpack-deps:bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV VIRTUAL_ENV=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    sudo \
    git \
    curl \
    wget \
    ca-certificates \
    jq \
    unzip \
    zip \
    file \
    tree \
    make \
    cmake \
    build-essential \
    pkg-config \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    golang \
    rustc \
    cargo \
    ffmpeg \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/python -m pip install --upgrade pip setuptools wheel "pytest<9" \
    && useradd -m -s /bin/bash runner \
    && mkdir -p /workspace /artifacts \
    && chown -R runner:runner /workspace /artifacts /opt/venv

WORKDIR /workspace

CMD ["bash"]
