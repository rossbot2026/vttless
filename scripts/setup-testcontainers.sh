#!/bin/bash

# Script to set up the environment for Testcontainers
# This should be run with appropriate permissions

echo "Setting up environment for Testcontainers..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "See: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running. Please start Docker."
    echo "Try: sudo systemctl start docker"
    exit 1
fi

# Check current user's Docker permissions
if ! docker ps &> /dev/null; then
    echo "Current user does not have Docker permissions."
    echo "Attempting to add user to docker group..."
    
    # Get current user
    CURRENT_USER=$(whoami)
    
    # Add user to docker group
    echo "Adding $CURRENT_USER to docker group..."
    sudo usermod -aG docker $CURRENT_USER
    
    echo "Group membership updated. You may need to log out and back in,"
    echo "or run 'newgrp docker' to refresh your group membership."
    echo ""
    echo "After refreshing, verify with: docker ps"
    exit 0
fi

echo "✅ Docker is installed and accessible"
echo "✅ Current user has Docker permissions"
echo ""
echo "Environment is ready for Testcontainers!"
echo ""
echo "To run tests with Testcontainers:"
echo "1. Install testcontainers: npm install testcontainers --save-dev"
echo "2. Update test files to use GenericContainer('mongo')"
echo "3. Run tests: npm test"