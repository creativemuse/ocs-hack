import { NextRequest, NextResponse } from 'next/server';
import { createCDPSQLClient } from '@/lib/cdp/sql-api';

export async function GET(req: NextRequest) {
  try {
    // Test 1: Check if environment variables are loaded
    const envCheck = {
      hasCDPKey: !!process.env.CDP_API_KEY,
      hasCDPSecret: !!process.env.CDP_API_SECRET,
      keyLength: process.env.CDP_API_KEY?.length || 0,
      secretLength: process.env.CDP_API_SECRET?.length || 0,
      nodeEnv: process.env.NODE_ENV
    };

    console.log('Environment Check:', envCheck);

    if (!envCheck.hasCDPKey || !envCheck.hasCDPSecret) {
      return NextResponse.json({
        error: 'CDP credentials not found',
        envCheck,
        message: 'Make sure CDP_API_KEY and CDP_API_SECRET are set in .env.local'
      }, { status: 400 });
    }

    // Test 2: Try to create CDP client
    let sqlClient;
    try {
      sqlClient = createCDPSQLClient();
      console.log('✅ CDP client created successfully');
    } catch (clientError) {
      return NextResponse.json({
        error: 'Failed to create CDP client',
        details: clientError instanceof Error ? clientError.message : 'Unknown error',
        envCheck
      }, { status: 500 });
    }

    // Test 3: Try a simple query
    try {
      const result = await sqlClient.executeQuery('SELECT 1 as test');
      console.log('✅ CDP query executed successfully');
      
      return NextResponse.json({
        success: true,
        message: 'CDP API is working correctly',
        envCheck,
        queryResult: result
      });
    } catch (queryError) {
      console.error('❌ CDP query failed:', queryError);
      
      return NextResponse.json({
        error: 'CDP query failed',
        details: queryError instanceof Error ? queryError.message : 'Unknown error',
        envCheck
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
