#!/bin/bash
# NexChat Quick Start Script

set -e

echo "🚀 NexChat - Quick Start Setup"
echo "================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js >= 18.0.0 from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Type check
echo "🔍 Type checking..."
npm run type-check
echo "✅ All types are correct"
echo ""

# Build
echo "🔨 Building project..."
npm run build
echo "✅ Build successful"
echo ""

echo "================================"
echo "✅ Setup complete!"
echo ""
echo "To start developing:"
echo "   npm run dev"
echo ""
echo "Then open:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "To test locally:"
echo "   1. Open http://localhost:5173 in two tabs"
echo "   2. Use the same key in both tabs"
echo "   3. Set different nicknames"
echo "   4. Start chatting!"
echo ""
echo "To build for production:"
echo "   npm run build"
echo ""
echo "Happy coding! 🎉"
