import { NextResponse } from 'next/server';
import { fetchWeeklyPayoutDiagnostics } from '@/lib/game/weeklyPayoutDiagnostics';

/**
 * GET /api/weekly-payout-status
 * Public read of on-chain session + CRE distribution prediction.
 */
export async function GET() {
  try {
    const diagnostics = await fetchWeeklyPayoutDiagnostics();
    return NextResponse.json({
      success: true,
      ...diagnostics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('weekly-payout-status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weekly payout status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
