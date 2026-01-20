#!/bin/bash
# Script to check status and logs for the weekly-prize-distribution CRE workflow
# Workflow ID: 00e2a445035c11336376e1084248a91975d4bdb70a8c40a112a6bd58fd3ba3bb

set -e

WORKFLOW_ID="00e2a445035c11336376e1084248a91975d4bdb70a8c40a112a6bd58fd3ba3bb"
WORKFLOW_NAME="weekly-prize-dist-stg"
TARGET="staging-settings"
WORKFLOW_DIR="chainlink-cre-workflows/weekly-prize-distribution"

# Check if we're in the right directory
if [ ! -d "$WORKFLOW_DIR" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Checking CRE Workflow Status"
echo "=================================================="
echo ""
echo "Workflow Name: $WORKFLOW_NAME"
echo "Workflow ID: $WORKFLOW_ID"
echo "Target: $TARGET"
echo ""

# Navigate to workflow directory
cd "$WORKFLOW_DIR"

# Check CRE CLI availability
if ! command -v /Users/sirgawain/.cre/bin/cre &> /dev/null; then
    echo "❌ Error: CRE CLI not found at /Users/sirgawain/.cre/bin/cre"
    echo "   Please ensure CRE CLI is installed"
    exit 1
fi

CRE_CLI="/Users/sirgawain/.cre/bin/cre"

echo "🔍 Step 1: Checking workflow activation status..."
echo "--------------------------------------------------"
$CRE_CLI workflow activate weekly-prize-distribution --target "$TARGET" 2>&1 | grep -E "(active|inactive|Error)" || echo "   ⚠️  Could not determine status"
echo ""

echo "📝 Step 2: Attempting to fetch workflow logs..."
echo "--------------------------------------------------"
echo "   Note: Log commands may vary by CRE CLI version"
echo ""

# Try to get logs - note: actual command may vary
echo "   Workflow binary URL:"
echo "   https://storage.cre.chain.link/artifacts/$WORKFLOW_ID/binary.wasm"
echo ""
echo "   Workflow config URL:"
echo "   https://storage.cre.chain.link/artifacts/$WORKFLOW_ID/config"
echo ""

echo "🌐 Step 3: Dashboard Information"
echo "--------------------------------------------------"
echo "   View workflow in CRE Dashboard:"
echo "   https://cre.chain.link"
echo ""
echo "   Search for workflow: $WORKFLOW_NAME"
echo "   Or use Workflow ID: $WORKFLOW_ID"
echo ""

echo "📋 Step 4: Deployment Details"
echo "--------------------------------------------------"
echo "   Workflow ID: $WORKFLOW_ID"
echo "   Workflow Name: $WORKFLOW_NAME"
echo "   Target: $TARGET"
echo "   Schedule: Every Sunday at 00:00 UTC (0 0 * * 0)"
echo ""

echo "💡 Additional Commands:"
echo "--------------------------------------------------"
echo "   To simulate the workflow locally:"
echo "   $CRE_CLI workflow simulate weekly-prize-distribution --target $TARGET"
echo ""
echo "   To redeploy the workflow:"
echo "   cd ../.. && ./scripts/redeploy-workflow.sh"
echo ""
echo "   To view workflow in browser:"
echo "   open https://cre.chain.link"
echo ""

echo "✅ Status check complete!"
echo ""
echo "📌 Quick Reference:"
echo "   - Workflow ID: $WORKFLOW_ID"
echo "   - Dashboard: https://cre.chain.link"
echo "   - Binary: https://storage.cre.chain.link/artifacts/$WORKFLOW_ID/binary.wasm"
echo ""
