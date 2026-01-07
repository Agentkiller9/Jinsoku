# Use the newer "Bookworm" release which has a newer GLIBC
FROM python:3.10-slim-bookworm

# --- ADDED ---
# Install libcurl4 (for http) and libpcre3 (for regex),
# which are dependencies for Takajo
RUN apt-get update && apt-get install -y libcurl4 libpcre3 && rm -rf /var/lib/apt/lists/*
# --- END ---

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app's code into the container
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8000

# Run the server with auto-reload for development
# This command is from the uvicorn package
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]