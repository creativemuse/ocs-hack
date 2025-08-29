import { NextRequest, NextResponse } from 'next/server';
import { lighthouseStorage } from '@/lib/apis/lighthouse';

export async function GET(req: NextRequest) {
  try {
    // Initialize Lighthouse storage
    await lighthouseStorage.initialize();
    
    // Check if properly configured
    const isConfigured = lighthouseStorage.isConfigured();
    
    if (!isConfigured) {
      return NextResponse.json({
        status: 'error',
        message: 'Lighthouse API key not configured',
        configured: false,
        files: 0
      });
    }
    
    // Get storage info
    const storageInfo = await lighthouseStorage.getStorageInfo();
    
    // Refresh manifest and get file count
    await lighthouseStorage.refreshManifest();
    const files = await lighthouseStorage.listAudioFiles();
    
    return NextResponse.json({
      status: 'success',
      message: 'Lighthouse storage is configured and ready',
      configured: true,
      files: files.length,
      storageInfo,
      sampleFiles: files.slice(0, 3).map(f => ({
        name: f.name,
        artist: f.artistName,
        title: f.songTitle,
        hasIPFS: !!f.ipfsUrl
      }))
    });
    
  } catch (error) {
    console.error('❌ Lighthouse status check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      configured: false,
      files: 0
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    if (action === 'refresh-manifest') {
      await lighthouseStorage.refreshManifest();
      const files = await lighthouseStorage.listAudioFiles();
      
      return NextResponse.json({
        status: 'success',
        message: 'Manifest refreshed successfully',
        files: files.length
      });
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Unknown action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Lighthouse action failed:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
