#!/bin/bash

# Smart Process Flow - Quick Installation Script
# Usage: ./install.sh [local|production]

set -e

ENVIRONMENT=${1:-local}

echo "🚀 Installing Smart Process Flow for $ENVIRONMENT environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python dependencies..."

# Check if pip is available for python3
if ! python3 -m pip --version &> /dev/null; then
    echo "📦 pip not found for python3, attempting to install..."
    
    # Try different package managers with proper error handling
    if command -v apt &> /dev/null; then
        echo "🔄 Updating package lists..."
        sudo apt update || echo "⚠️ Package update failed, continuing..."
        echo "📦 Installing python3-pip..."
        sudo apt install -y python3-pip python3-setuptools python3-wheel || {
            echo "❌ Failed to install pip via apt"
            echo "💡 Try manually: sudo apt install python3-pip"
            exit 1
        }
    elif command -v yum &> /dev/null; then
        sudo yum install -y python3-pip python3-setuptools python3-wheel || {
            echo "❌ Failed to install pip via yum"
            exit 1
        }
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3-pip python3-setuptools python3-wheel || {
            echo "❌ Failed to install pip via dnf"
            exit 1
        }
    elif command -v pacman &> /dev/null; then
        sudo pacman -S python-pip python-setuptools python-wheel || {
            echo "❌ Failed to install pip via pacman"
            exit 1
        }
    else
        echo "❌ Could not install pip automatically. Please install python3-pip manually."
        echo "💡 Common commands:"
        echo "   Ubuntu/Debian: sudo apt install python3-pip"
        echo "   CentOS/RHEL: sudo yum install python3-pip"
        echo "   Fedora: sudo dnf install python3-pip"
        echo "   Arch: sudo pacman -S python-pip"
        exit 1
    fi
    
    # Verify pip installation after install attempt
    echo "🔍 Verifying pip installation..."
    if ! python3 -m pip --version &> /dev/null; then
        echo "❌ pip installation failed or not accessible"
        echo "💡 Troubleshooting steps:"
        echo "   1. Try: sudo apt install --reinstall python3-pip"
        echo "   2. Check Python version: python3 --version"
        echo "   3. Try alternative: curl https://bootstrap.pypa.io/get-pip.py | python3"
        exit 1
    else
        echo "✅ pip successfully installed and verified"
    fi
fi


# Verify pandas installation
echo "🔍 Verifying pandas installation..."
python3 -c "import pandas; print('✅ pandas version:', pandas.__version__)" || {
    echo "❌ pandas verification failed"
    echo "💡 Try: python3 -m pip install --upgrade pandas"
    exit 1
}

echo "📁 Creating necessary directories..."
mkdir -p uploads results logs automation_scripts
chmod 755 uploads results logs automation_scripts

if [ "$ENVIRONMENT" = "local" ]; then
    echo "💻 Local development setup completed!"
    echo ""
    echo "🚀 To start the application:"
    echo "   npm run dev:full"
    echo ""
    echo "🌐 Access URLs:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:3001"
    echo ""
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "🏗️ Building for production..."
    npm run build
    
    echo "🌐 Production build completed!"
    echo ""
    echo "🚀 To start the production server:"
    echo "   npm start"
    echo ""
    echo "📋 Next steps for VPS deployment:"
    echo "   1. Install PM2: npm install -g pm2"
    echo "   2. Install Nginx: sudo apt install nginx"
    echo "   3. Configure domain and SSL"
    echo "   4. Use PM2 to manage the process"
    echo ""
fi

echo "✅ Installation completed successfully!"