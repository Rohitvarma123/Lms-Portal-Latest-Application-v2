#!/常用bash
# Permanent Server Management Setup Script
# This script installs your Python server as a System Service

PROJECT_DIR=$(pwd)
SERVICE_NAME="vcube"
PYTHON_PATH=$(which python3)

echo "🚀 Setting up Permanent Server Management..."
echo "📂 Project Directory: $PROJECT_DIR"
echo "🐍 Python Path: $PYTHON_PATH"

# 1. Clear the port immediately
echo "🛑 Clearing port 5000..."
sudo fuser -k 5000/tcp || true

# 2. Create the Systemd Service File
echo "📝 Creating service configuration..."
CAT_SERVICE <<EOF | sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null
[Unit]
Description=Vcube Secure Video Engine
After=network.target

[Service]
User=$USER
WorkingDirectory=$PROJECT_DIR
ExecStart=$PYTHON_PATH $PROJECT_DIR/server.py
Restart=always
RestartSec=5
StandardOutput=inherit
StandardError=inherit

[Install]
WantedBy=multi-user.target
EOF

# 3. Enable and Start the Service
echo "⚙️  Activating service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl restart $SERVICE_NAME

echo "✅ SUCCESS! Your server is now running permanently in the background."
echo "👉 To stop it: sudo systemctl stop $SERVICE_NAME"
echo "👉 To restart it: sudo systemctl restart $SERVICE_NAME"
echo "👉 To check logs: sudo journalctl -u $SERVICE_NAME -f"
