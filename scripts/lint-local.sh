#!/bin/bash

# Super Linter Local Run Script
# This script allows you to run super-linter locally to catch issues before submitting PRs

echo "Running Super Linter locally..."
echo "This will lint the entire codebase using the same configuration as the CI pipeline."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required to run super-linter locally."
    echo "Please install Docker and try again."
    exit 1
fi

# Run super-linter in a Docker container
docker run \
  -e RUN_LOCAL=true \
  -e DEFAULT_BRANCH=main \
  -e VALIDATE_TYPESCRIPT_ES=true \
  -e VALIDATE_TYPESCRIPT_STANDARD=true \
  -e VALIDATE_JAVASCRIPT_ES=true \
  -e VALIDATE_JSON=true \
  -e VALIDATE_YAML=true \
  -e VALIDATE_MARKDOWN=true \
  -e VALIDATE_DOCKERFILE=true \
  -e VALIDATE_GITHUB_ACTIONS=true \
  -e VALIDATE_JSCPD=false \
  -e VALIDATE_NATURAL_LANGUAGE=false \
  -e TYPESCRIPT_ES_CONFIG_FILE=.eslintrc \
  -v "$PWD":/tmp/lint \
  ghcr.io/super-linter/super-linter:latest

echo "Super Linter run completed!"