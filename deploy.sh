#!/bin/bash

# Smart Process Flow Deployment Script
# Usage: ./deploy.sh [local|production]

set -e

ENVIRONMENT=${1:-local}
APP_DIR="/var/www/smart-process-flow"
NGINX_SITE="smart-process-flow"

echo "🚀 Starting Smart Process Flow deployment for $ENVIRONMENT environment..."

if [ "$ENVIRONMENT" = "production" ]; then
    echo "📦 Production deployment starting..."
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        echo "❌ Please run as root or with sudo for production deployment"
        exit 1
    fi
    
    # Update system
    echo "🔄 Updating system packages..."
    apt update && apt upgrade -y
    
    # Install Node.js if not installed
    if ! command -v node &> /dev/null; then
        echo "📦 Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    # Install Nginx if not installed
    if ! command -v nginx &> /dev/null; then
        echo "📦 Installing Nginx..."
        apt install nginx -y
        systemctl start nginx
        systemctl enable nginx
    fi
    
    # Create application directory
    echo "📁 Setting up application directory..."
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install --production
    
    # Build frontend
    echo "🏗️ Building frontend..."
    npm run build
    
    # Create necessary directories
    echo "📁 Creating necessary directories..."
    mkdir -p uploads results logs automation_scripts
    chmod 755 uploads results logs automation_scripts
    
    # Copy PM2 ecosystem file
    echo "⚙️ Setting up PM2 configuration..."
    cp ecosystem.config.js $APP_DIR/
    
    # Start/restart application with PM2
    echo "🚀 Starting application with PM2..."
    pm2 delete smart-process-flow-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u root --hp /root
    
    # Configure Nginx
    echo "🌐 Configuring Nginx..."
    cp nginx.conf /etc/nginx/sites-available/$NGINX_SITE
    ln -sf /etc/nginx/sites-available/$NGINX_SITE /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    nginx -t
    systemctl restart nginx
    
    # Setup firewall
    echo "🔥 Configuring firewall..."
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
    
    # Install Python dependencies for automation
    echo "🐍 Installing Python dependencies..."
    apt install python3 python3-pip -y
    python3 -m pip install selenium pandas openpyxl beautifulsoup4 requests webdriver-manager
    
    # Install Chrome for automation
    echo "🌐 Installing Chrome for automation..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | tee /etc/apt/sources.list.d/google-chrome.list
    apt update
    apt install google-chrome-stable chromium-chromedriver -y
    
    echo "✅ Production deployment completed!"
    echo "📊 Check status with: pm2 list"
    echo "📝 View logs with: pm2 logs"
    echo "🌐 Your application should be available at your domain"
    
elif [ "$ENVIRONMENT" = "local" ]; then
    echo "💻 Local development setup starting..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+ first."
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    # Create necessary directories
    echo "📁 Creating necessary directories..."
    mkdir -p uploads results logs automation_scripts
    
    # Copy environment file
    if [ ! -f .env ]; then
        echo "⚙️ Creating environment file..."
        cp .env.example .env
        echo "📝 Please edit .env file with your configuration"
    fi
    
    echo "✅ Local setup completed!"
    echo "🚀 Start development with: npm run dev:full"
    echo "🌐 Frontend: http://localhost:5173"
    echo "🔧 Backend: http://localhost:3001"
    
else
    echo "❌ Invalid environment. Use 'local' or 'production'"
    exit 1
fi

echo "🎉 Deployment completed successfully!"