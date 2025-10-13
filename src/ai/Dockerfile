FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt . 

# 1) Install the PyTorch CPU wheels from the PyTorch index
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    torch==2.4.1 torchvision==0.19.1 torchaudio==2.4.1

# 2) Install your other deps from PyPI (fastapi, pydantic, uvicorn, etc.)
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "main.py"]
