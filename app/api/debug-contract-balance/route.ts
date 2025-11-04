import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get environment variables
    const contractAddress = process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || '0xd8F082fa4EF6a4C59F8366c19a196d488485682b';
    const usdcAddress = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';
    
    // Debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS: contractAddress,
        NEXT_PUBLIC_BASE_RPC_URL: rpcUrl,
        NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
      },
      contract: {
        address: contractAddress,
        usdcAddress: usdcAddress,
        network: 'Base Mainnet',
        chainId: 8453,
      },
      rpc: {
        url: rpcUrl,
        accessible: 'Unknown - requires client-side test',
      },
      troubleshooting: {
        steps: [
          '1. Verify contract is deployed at the correct address',
          '2. Check if contract has received any USDC tokens',
          '3. Verify RPC URL is accessible',
          '4. Check browser console for wagmi/ethers errors',
          '5. Ensure wallet is connected to Base Mainnet',
        ],
        commonIssues: [
          'Contract not deployed or wrong address',
          'No USDC tokens in contract',
          'RPC URL not accessible',
          'Network mismatch (not on Base Mainnet)',
          'Wallet not connected',
        ],
      },
    };

    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get debug information',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
