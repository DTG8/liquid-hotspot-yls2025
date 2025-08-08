#!/bin/bash

echo "Starting LIQUID Hotspot System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL is not running. Starting PostgreSQL..."
    sudo systemctl start postgresql
fi

# Function to start backend
start_backend() {
    echo "🚀 Starting Backend Server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    echo "✅ Backend started with PID: $BACKEND_PID"
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "⏳ Waiting 3 seconds for backend to start..."
    sleep 3
    
    echo "🌐 Starting Frontend..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started with PID: $FRONTEND_PID"
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down LIQUID Hotspot System..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ Backend stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ Frontend stopped"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start services
start_backend
start_frontend

echo ""
echo "🎉 LIQUID Hotspot System is running!"
echo "📍 Backend: http://localhost:3001"
echo "📍 Frontend: http://localhost:5173"
echo "📍 Admin Panel: http://localhost:5173?admin=true"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user to stop
wait 