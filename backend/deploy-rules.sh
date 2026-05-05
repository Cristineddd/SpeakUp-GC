#!/bin/bash

# 🔒 Deploy Firebase Security Rules
# This script deploys Firestore and Storage security rules

echo "🚀 Deploying Firebase Security Rules..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed!"
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Navigate to project root (one level up from backend/)
cd "$(dirname "$0")/.."

# Check if rules files exist
if [ ! -f "backend/firebase/firestore.rules" ]; then
    echo "❌ Firestore rules file not found!"
    echo "Expected: backend/firebase/firestore.rules"
    exit 1
fi

if [ ! -f "backend/firebase/storage.rules" ]; then
    echo "❌ Storage rules file not found!"
    echo "Expected: backend/firebase/storage.rules"
    exit 1
fi

echo "✅ Rules files found"
echo ""

# Show what will be deployed
echo "📋 Will deploy:"
echo "   - Firestore Rules (backend/firebase/firestore.rules)"
echo "   - Storage Rules (backend/firebase/storage.rules)"
echo ""

# Deploy rules
echo "🚀 Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Failed to deploy Firestore rules"
    exit 1
fi

echo ""
echo "🚀 Deploying Storage rules..."
firebase deploy --only storage:rules

if [ $? -eq 0 ]; then
    echo "✅ Storage rules deployed successfully"
else
    echo "❌ Failed to deploy Storage rules"
    exit 1
fi

echo ""
echo "🎉 All security rules deployed successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Go to Firebase Console"
echo "   2. Check Firestore → Rules tab"
echo "   3. Check Storage → Rules tab"
echo "   4. Test the rules with the Rules Playground"
echo ""
