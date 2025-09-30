#!/bin/bash

# Script to compile and run the JWT generation
# This follows the exact pattern from the CDP documentation

echo "🔐 Compiling and running JWT generation..."

# Compile TypeScript to JavaScript
echo "📦 Compiling main.ts..."
npx tsc main.ts

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
    
    # Run the compiled JavaScript and capture the JWT
    echo "🚀 Generating JWT..."
    export JWT=$(npx tsx main.ts)
    
    # Display the JWT
    echo "📋 Generated JWT:"
    echo $JWT
    
    # Show how to use it
    echo ""
    echo "🔧 To use this JWT in your environment:"
    echo "export JWT=$JWT"
    echo ""
    echo "🧪 Test the JWT with a CDP API call:"
    echo "curl -L -X POST \"https://api.cdp.coinbase.com/platform/v1/networks/base-mainnet/assets/BTC\" \\"
    echo "  -H \"Authorization: Bearer \${JWT}\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -H \"Accept: application/json\""
    
else
    echo "❌ Compilation failed"
    exit 1
fi
