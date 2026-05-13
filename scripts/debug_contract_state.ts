import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { TRIVIA_CONTRACT_ADDRESS } from '../lib/blockchain/contracts';

const MINIMAL_ABI = [
    { inputs: [], name: 'isSessionActive', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'sessionCounter', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'entryFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'lastSessionTime', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'sessionInterval', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
];

const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || (() => { throw new Error('NEXT_PUBLIC_BASE_RPC_URL is required. Set it in .env'); })()),
});

async function main() {
    console.log('🔍 Debugging Contract State');
    console.log('Contract Address:', TRIVIA_CONTRACT_ADDRESS);

    try {
        const code = await publicClient.getBytecode({ address: TRIVIA_CONTRACT_ADDRESS as `0x${string}` });
        if (!code || code === '0x') {
            console.error('❌ CRITICAL: No contract code found at address!');
            return;
        }
        console.log('✅ Contract code exists.');

        const abi = MINIMAL_ABI;

        const isSessionActive = await publicClient.readContract({
            address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'isSessionActive',
        });
        console.log('ℹ️ isSessionActive:', isSessionActive);

        const sessionCounter = await publicClient.readContract({
            address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'sessionCounter',
        });
        console.log('ℹ️ sessionCounter:', (sessionCounter as bigint).toString());

        const entryFee = await publicClient.readContract({
            address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
            abi,
            functionName: 'entryFee',
        });
        console.log('ℹ️ entryFee:', formatUnits(entryFee as bigint, 6), 'USDC');

    } catch (error) {
        console.error('❌ Error querying contract:', error);
    }
}

main();
