import { NextRequest, NextResponse } from 'next/server';
import { storachaStorage } from '@/lib/apis/storacha';

type Mode = 'name-that-tune' | 'artist-match';
type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

interface TriviaQuestion {
  id: string;
  type: Mode;
  question: string;
  options: string[];
  correctAnswer: number;
  audioUrl: string;
  timeLimit: number;
  difficulty: DifficultyLevel;
  metadata: {
    artistName: string;
    songTitle: string;
    source: 'spacetime' | 'storacha' | 'local';
  };
}

// Best-effort prewarm of IPFS gateway to avoid cold-cache latency and range negotiation hiccups
const prewarmUrl = async (url: string): Promise<void> => {
  try {
    // HEAD to establish content-type quickly and wake gateway
    await fetch(url, { method: 'HEAD', cache: 'no-store' });
    // Tiny ranged GET to encourage 206 support and prime cache
    await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-1' }, cache: 'no-store' });
  } catch {
    // Ignore errors — this is a best-effort warmup
  }
};

const getTimeLimit = (difficulty: DifficultyLevel): number => {
  switch (difficulty) {
    case 'easy': return 20;
    case 'medium': return 15;
    case 'hard': return 10;
    case 'expert': return 8;
    default: return 15;
  }
};

// Shuffle array using Fisher-Yates algorithm
const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
};

// Get unique values from array
const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

// Fallback to local files if SpacetimeDB is not available
const getLocalAudioFiles = () => [
  { name: "Billie Eilish - Ocean Eyes.mp3", artistName: "Billie Eilish", songTitle: "Ocean Eyes" },
  { name: "Ed Sheeran - Perfect.mp3", artistName: "Ed Sheeran", songTitle: "Perfect" },
  { name: "Alex Warren - Ordinary.mp3", artistName: "Alex Warren", songTitle: "Ordinary" },
  { name: "Chappell Roan - Pink Pony Club.mp3", artistName: "Chappell Roan", songTitle: "Pink Pony Club" },
  { name: "The Weeknd - Blinding Lights.mp3", artistName: "The Weeknd", songTitle: "Blinding Lights" },
  { name: "Drake - One Dance.mp3", artistName: "Drake", songTitle: "One Dance" },
  { name: "Taylor Swift - Cruel Summer.mp3", artistName: "Taylor Swift", songTitle: "Cruel Summer" },
  { name: "Bad Bunny - Tití Me Preguntó.mp3", artistName: "Bad Bunny", songTitle: "Tití Me Preguntó" },
  { name: "Post Malone - I Had Some Help.mp3", artistName: "Post Malone", songTitle: "I Had Some Help" },
  { name: "Sabrina Carpenter - Espresso.mp3", artistName: "Sabrina Carpenter", songTitle: "Espresso" },
].map(song => ({
  name: song.name,
  // Local MP3s live in /public/music → they are served at /music/<file>
  path: `/music/${song.name}`,
  artistName: song.artistName,
  songTitle: song.songTitle
}));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'Global_Top_100';
    const mode = (searchParams.get('mode') as Mode) || 'name-that-tune';
    const count = Math.max(1, Math.min(20, parseInt(searchParams.get('count') || '5', 10)));
    const choices = Math.max(2, Math.min(6, parseInt(searchParams.get('choices') || '4', 10)));
    const difficulty = (searchParams.get('difficulty') as DifficultyLevel) || 'medium';

    const prefix = folder;

    console.log(`🎵 Fetching questions from SpacetimeDB + Storacha: folder=${folder}, mode=${mode}, count=${count}`);

    let files: Array<{ name: string; path: string; artistName: string; songTitle: string }> = [];
    let source = 'local';

    // Check Storacha configuration first
    if (storachaStorage.isConfigured()) {
      try {
        // Populate manifest with IPFS URLs from Storacha upload
        await storachaStorage.populateManifestFromLocalFiles();
        
        files = await storachaStorage.listAudioFiles(prefix);
        if (files.length === 0) {
          console.log(`📁 Storacha manifest is empty, falling back to local files`);
          files = getLocalAudioFiles();
          source = 'local';
          console.log(`📁 Found ${files.length} local audio files`);
        } else {
          console.log(`📁 Found ${files.length} audio files in Storacha manifest`);
          source = 'spacetime';
        }
      } catch (storachaError) {
        console.warn('⚠️ Storacha storage failed, falling back to local files:', storachaError);
        files = getLocalAudioFiles();
        source = 'local';
        console.log(`📁 Found ${files.length} local audio files`);
      }
    } else {
      console.log('ℹ️ Storacha not configured, using local files');
      files = getLocalAudioFiles();
      source = 'local';
      console.log(`📁 Found ${files.length} local audio files`);
    }

    if (files.length < choices) {
      return NextResponse.json({ 
        error: `Not enough tracks (${files.length}) to build ${choices} choices` 
      }, { status: 400 });
    }

    const questions = [];
    const bag = shuffle(files);

    for (let i = 0; i < count && i < bag.length; i++) {
      const correct = bag[i]!;
      const pool = files.filter(f => f.name !== correct.name);

      const correctText = mode === 'name-that-tune' ? correct.songTitle : correct.artistName;
      const distractorPool = mode === 'name-that-tune' 
        ? pool.map(p => p.songTitle) 
        : pool.map(p => p.artistName);

      const distractors = shuffle(
        unique(distractorPool.filter(x => x.toLowerCase() !== correctText.toLowerCase()))
      ).slice(0, Math.max(0, choices - 1));

      const options = shuffle([correctText, ...distractors]).slice(0, choices);
      const correctIndex = options.indexOf(correctText);

      let audioUrl: string;
      // Always use local files for faster loading
      audioUrl = correct.path;

      questions.push({
        id: `sp_${Date.now()}_${i}`,
        type: mode,
        question: mode === 'name-that-tune' 
          ? 'What song is this?' 
          : `Who performs "${correct.songTitle}"?`,
        options,
        correctAnswer: correctIndex >= 0 ? correctIndex : 0,
        audioUrl,
        timeLimit: getTimeLimit(difficulty),
        difficulty,
        metadata: {
          artistName: correct.artistName,
          songTitle: correct.songTitle,
          source: source as 'spacetime' | 'storacha' | 'local',
        },
      });

      console.log(`✅ Generated ${mode} question: ${correct.artistName} - ${correct.songTitle}`);
      console.log(`🔗 Audio URL: ${audioUrl}`);
    }

    console.log(`🎉 Generated ${questions.length} questions successfully from ${source}`);

    return NextResponse.json({ 
      questions,
      count: questions.length,
      difficulty,
      mode,
      source,
      folder,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating questions:', error);
    return NextResponse.json({ 
      error: 'Failed to generate questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
