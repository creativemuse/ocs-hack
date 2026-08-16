import { NextRequest, NextResponse } from 'next/server';
import type { DifficultyLevel } from '@/types/game';
import { signQuestionToken } from '@/lib/utils/questionToken';
import { getLocalAudioCatalog } from '@/lib/grove/localCatalog';

type Mode = 'name-that-tune' | 'artist-match';

const shuffle = <T,>(a: T[]) => {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};

const unique = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = s.trim().toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
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

const getLocalAudioFiles = () =>
  getLocalAudioCatalog().map((file) => ({
    name: file.name,
    path: `/music/${file.name}`,
    artistName: file.artistName,
    songTitle: file.songTitle,
  }));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'Global_Top_100';
    const mode = (searchParams.get('mode') as Mode) || 'name-that-tune';
    const count = Math.max(1, Math.min(20, parseInt(searchParams.get('count') || '5', 10)));
    const choices = Math.max(2, Math.min(6, parseInt(searchParams.get('choices') || '4', 10)));
    const difficulty = (searchParams.get('difficulty') as DifficultyLevel) || 'medium';

    // Check for bls-eth-wasm module availability
    try {
      await import('bls-eth-wasm');
    } catch (blsError) {
      console.warn('⚠️ bls-eth-wasm module not available, falling back to local files:', blsError instanceof Error ? blsError.message : String(blsError));
      // Fallback to local files immediately
      const files = getLocalAudioFiles();
      
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
        audioUrl = correct.path;

        const qId = `lh_fallback_${Date.now()}_${i}`;
        const correctAns = correctIndex >= 0 ? correctIndex : 0;
        const tl = getTimeLimit(difficulty);
        questions.push({
          id: qId,
          type: mode,
          question: mode === 'name-that-tune'
            ? 'What song is this?'
            : `Who performs "${correct.songTitle}"?`,
          options,
          questionToken: signQuestionToken(qId, correctAns, tl, difficulty),
          audioUrl,
          timeLimit: tl,
          difficulty,
          metadata: {
            artistName: correct.artistName,
            songTitle: correct.songTitle,
            source: 'local' as const,
          },
        });
      }

      return NextResponse.json({ 
        questions, 
        source: 'local-fallback',
        message: 'Lighthouse unavailable, using local files'
      });
    }

    const prefix = folder;

    console.log(`🚀 Fetching questions from Lighthouse: folder=${folder}, mode=${mode}, count=${count}`);

    let files: Array<{ name: string; path: string; artistName: string; songTitle: string }> = [];
    let source = 'local';

    // Dynamically import Lighthouse storage only when needed
    try {
      const { lighthouseStorage } = await import('@/lib/apis/lighthouse');
      
      // Check Lighthouse configuration first
      if (lighthouseStorage.isConfigured()) {
        try {
          // Initialize Lighthouse storage
          await lighthouseStorage.initialize();
          
          // Try to refresh manifest from uploaded files first
          await lighthouseStorage.refreshManifest();
          
          // If no files found, populate with local files as fallback
          const manifestFiles = await lighthouseStorage.listAudioFiles(prefix);
          if (manifestFiles.length === 0) {
            console.log('📝 No uploaded files found, populating manifest with local files for testing');
            await lighthouseStorage.populateManifestFromLocalFiles();
          }
          
          files = await lighthouseStorage.listAudioFiles(prefix);
          if (files.length === 0) {
            console.log(`📁 Lighthouse manifest is empty, falling back to local files`);
            files = getLocalAudioFiles();
            source = 'local';
            console.log(`📁 Found ${files.length} local audio files`);
          } else {
            console.log(`📁 Found ${files.length} audio files in Lighthouse manifest`);
            source = 'lighthouse';
          }
        } catch (lighthouseError) {
          console.warn('⚠️ Lighthouse storage failed, falling back to local files:', lighthouseError);
          files = getLocalAudioFiles();
          source = 'local';
          console.log(`📁 Found ${files.length} local audio files`);
        }
      } else {
        console.log('ℹ️ Lighthouse not configured, using local files');
        files = getLocalAudioFiles();
        source = 'local';
        console.log(`📁 Found ${files.length} local audio files`);
      }
    } catch (importError) {
      console.warn('⚠️ Failed to import Lighthouse storage, using local files:', importError);
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

      const qId = `lh_${Date.now()}_${i}`;
      const correctAns = correctIndex >= 0 ? correctIndex : 0;
      const tl = getTimeLimit(difficulty);
      questions.push({
        id: qId,
        type: mode,
        question: mode === 'name-that-tune'
          ? 'What song is this?'
          : `Who performs "${correct.songTitle}"?`,
        options,
        questionToken: signQuestionToken(qId, correctAns, tl, difficulty),
        audioUrl,
        timeLimit: tl,
        difficulty,
        metadata: {
          artistName: correct.artistName,
          songTitle: correct.songTitle,
          source: source as 'lighthouse' | 'local',
        },
      });

    }

    console.log(`🎉 Generated ${questions.length} questions successfully from ${source}`);

    return NextResponse.json({ 
      questions,
      count: questions.length,
      difficulty,
      mode,
      source,
      folder
    });
  } catch (e) {
    console.error('❌ Error generating Lighthouse questions:', e);
    return NextResponse.json({ 
      error: e instanceof Error ? e.message : 'Internal error' 
    }, { status: 500 });
  }
}
