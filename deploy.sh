#!/bin/bash

# Smart Process Flow - Production Deployment Script for Ubuntu VPS
# This script deploys the application to production using PM2

set -e  # Exit on any error

echo "🚀 Smart Process Flow - Production Deployment"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Stop existing processes
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install --production

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
python3 -m pip install --user selenium pandas openpyxl xlrd beautifulsoup4 requests webdriver-manager

# Build the application
echo "🏗️ Building application..."
npm run build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads results results/pdfs logs

# Set permissions
echo "🔐 Setting permissions..."
chmod +x automation_scripts/*.py
chmod 755 uploads results logs

# Check environment file
if [ ! -f ".env" ]; then
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "⚠️ Please edit .env file with your production configuration"
fi

# Start with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "🔄 Setting up PM2 startup script..."
pm2 startup | tail -1 | sudo bash || true

# Show status
echo "📊 Application status:"
pm2 status

# Show logs
echo "📋 Recent logs:"
pm2 logs --lines 10

echo ""
echo "🎉 Deployment completed successfully!"
echo "====================================="
echo ""
echo "📊 Monitor your application:"
echo "   pm2 status"
echo "   pm2 logs"
echo "   pm2 monit"
echo ""
echo "🔄 Manage your application:"
echo "   pm2 restart ecosystem.config.js"
echo "   pm2 stop ecosystem.config.js"
echo "   pm2 reload ecosystem.config.js"
echo ""
echo "🌐 Application URLs:"
echo "   Backend API: http://localhost:3001"
echo "   Health Check: http://localhost:3001/api/health"
echo ""
echo "📁 Important directories:"
echo "   Uploads: ./uploads/"
echo "   Results: ./results/"
echo "   Logs: ./logs/"
echo ""
echo "💡 Next steps:"
echo "1. Configure Nginx reverse proxy (optional)"
echo "2. Set up SSL certificate (recommended)"
echo "3. Configure domain DNS"
echo "4. Test automation scripts"
echo ""