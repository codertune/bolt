#!/bin/bash

# Smart Process Flow - Ubuntu VPS Installation Script
# This script installs all dependencies for Ubuntu VPS deployment

set -e  # Exit on any error

echo "🚀 Smart Process Flow - Ubuntu VPS Installation"
echo "================================================"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install Python and pip
echo "📦 Installing Python and pip..."
sudo apt install -y python3 python3-pip python3-venv

# Verify Python installation
echo "✅ Python version: $(python3 --version)"
echo "✅ pip version: $(python3 -m pip --version)"

# Install Chrome and ChromeDriver
echo "📦 Installing Google Chrome..."
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt update
sudo apt install -y google-chrome-stable

# Install ChromeDriver
echo "📦 Installing ChromeDriver..."
sudo apt install -y chromium-chromedriver

# Alternative ChromeDriver installation if the above fails
if ! command -v chromedriver &> /dev/null; then
    echo "📦 Installing ChromeDriver manually..."
    CHROME_DRIVER_VERSION=$(curl -sS chromedriver.storage.googleapis.com/LATEST_RELEASE)
    wget -N http://chromedriver.storage.googleapis.com/$CHROME_DRIVER_VERSION/chromedriver_linux64.zip -P ~/
    unzip ~/chromedriver_linux64.zip -d ~/
    rm ~/chromedriver_linux64.zip
    sudo mv ~/chromedriver /usr/local/bin/chromedriver
    sudo chmod +x /usr/local/bin/chromedriver
fi

# Verify Chrome installation
echo "✅ Chrome version: $(google-chrome --version)"
echo "✅ ChromeDriver version: $(chromedriver --version)"

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install project dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install --user selenium pandas openpyxl xlrd beautifulsoup4 requests webdriver-manager

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p uploads results results/pdfs logs automation_scripts

# Set proper permissions
echo "🔐 Setting permissions..."
chmod +x automation_scripts/*.py
chmod 755 uploads results logs

# Install Nginx (optional)
read -p "🌐 Do you want to install Nginx for production deployment? (y/n): " install_nginx
if [[ $install_nginx == "y" || $install_nginx == "Y" ]]; then
    echo "📦 Installing Nginx..."
    sudo apt install -y nginx
    
    # Copy nginx configuration
    if [ -f "nginx.conf" ]; then
        sudo cp nginx.conf /etc/nginx/sites-available/smart-process-flow
        sudo ln -sf /etc/nginx/sites-available/smart-process-flow /etc/nginx/sites-enabled/
        sudo nginx -t
        echo "✅ Nginx configuration installed"
        echo "💡 Remember to update the domain name in /etc/nginx/sites-available/smart-process-flow"
    fi
fi

# Setup firewall (optional)
read -p "🔥 Do you want to configure UFW firewall? (y/n): " setup_firewall
if [[ $setup_firewall == "y" || $setup_firewall == "Y" ]]; then
    echo "🔥 Configuring UFW firewall..."
    sudo ufw allow ssh
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw allow 3001
    sudo ufw allow 5173
    sudo ufw --force enable
    echo "✅ Firewall configured"
fi

# Create environment file
if [ ! -f ".env" ]; then
    echo "📝 Creating environment file..."
    cp .env.example .env
    echo "💡 Please edit .env file with your configuration"
fi

# Test Python automation
echo "🧪 Testing Python automation..."
cd automation_scripts
if python3 -c "import selenium, pandas, openpyxl; print('✅ All Python dependencies working')"; then
    echo "✅ Python automation environment ready"
else
    echo "❌ Python dependencies test failed"
    exit 1
fi
cd ..

# Build the project
echo "🏗️ Building the project..."
npm run build

echo ""
echo "🎉 Installation completed successfully!"
echo "================================================"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start the application:"
echo "   npm run dev:full    # Development mode"
echo "   npm run start       # Production mode"
echo ""
echo "3. For production deployment with PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. If using Nginx, update domain in:"
echo "   /etc/nginx/sites-available/smart-process-flow"
echo ""
echo "🌐 Application will be available at:"
echo "   Development: http://localhost:5173"
echo "   Production: http://localhost:3001"
echo ""
echo "📚 Check logs:"
echo "   pm2 logs"
echo "   tail -f logs/*.log"
echo ""