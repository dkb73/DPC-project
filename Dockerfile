# syntax=docker/dockerfile:1.4
FROM python:3.10-alpine

WORKDIR /code

# Install system dependencies for building Python packages
RUN apk add --no-cache gcc musl-dev linux-headers

# Copy and install Python dependencies
COPY requirements.txt /code/
RUN --mount=type=cache,target=/root/.cache/pip \
    pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /code/

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]