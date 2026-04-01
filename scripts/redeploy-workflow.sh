#!/bin/bash
# Script to redeploy the weekly-prize-distribution CRE workflow with latest changes

set -e

echo "🔄 Redeploying CRE Workflow: weekly-prize-distribution"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -d "chainlink-cre-workflows/weekly-prize-distribution" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Navigate to workflow directory
cd chainlink-cre-workflows/weekly-prize-distribution

echo "📦 Step 1: Installing dependencies..."
bun install

echo ""
echo "🧪 Step 2: Testing workflow locally (optional but recommended)..."
echo "   This will compile and test the workflow before deployment"
read -p "   Run simulation test? (y/N): " run_test
if [[ $run_test =~ ^[Yy]$ ]]; then
    echo "   Running simulation..."
    cre workflow simulate weekly-prize-distribution --target staging-settings || {
        echo "   ⚠️  Simulation failed or not configured. Continuing with deployment..."
    }
fi

echo ""
echo "🚀 Step 3: Deploying workflow to CRE..."
echo "   This will compile your TypeScript code to WASM and deploy it"
cre workflow deploy weekly-prize-distribution --target staging-settings

echo ""
echo "✅ Step 4: Activating workflow..."
cre workflow activate weekly-prize-distribution --target staging-settings

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Check your workflow in the CRE dashboard: https://cre.chain.link"
echo "   2. Monitor runs/logs in the CRE dashboard (no cre workflow status/logs commands)"
echo "   3. Optional: cre workflow hash weekly-prize-distribution -e weekly-prize-distribution/.env --target staging-settings"
echo ""
echo "💡 The workflow will run on the next scheduled trigger (every Sunday at 00:00 UTC)"
echo "   Your updated heuristic should now correctly detect when prizes are distributed!"
