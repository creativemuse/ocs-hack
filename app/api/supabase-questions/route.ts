import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { lighthouseStorage } from '@/lib/apis/lighthouse';
import type { DifficultyLevel } from '@/types/game';

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

// Static list of available audio files to avoid bundling large files
const getLocalAudioFiles = (): Array<{ name: string; path: string; artistName: string; songTitle: string }> => {
  // Static list of available songs - this prevents bundling large audio files
  const availableSongs = [
    { name: "Chappell Roan - Pink Pony Club.mp3", artistName: "Chappell Roan", songTitle: "Pink Pony Club" },
    { name: "The Spins.mp3", artistName: "Mac Miller", songTitle: "The Spins" },
    { name: "Pierce The Veil - So Far So Fake.mp3", artistName: "Pierce The Veil", songTitle: "So Far So Fake" },
    { name: "Travis Scott - HIGHEST IN THE ROOM.mp3", artistName: "Travis Scott", songTitle: "HIGHEST IN THE ROOM" },
    { name: "Luke Combs - Fast Car.mp3", artistName: "Luke Combs", songTitle: "Fast Car" },
    { name: "Bad Bunny - Tití Me Preguntó.mp3", artistName: "Bad Bunny", songTitle: "Tití Me Preguntó" },
    { name: "Ed Sheeran - Perfect.mp3", artistName: "Ed Sheeran", songTitle: "Perfect" },
    { name: "Radiohead - Creep.mp3", artistName: "Radiohead", songTitle: "Creep" },
    { name: "Drake - One Dance.mp3", artistName: "Drake", songTitle: "One Dance" },
    { name: "Chris Stapleton - Tennessee Whiskey.mp3", artistName: "Chris Stapleton", songTitle: "Tennessee Whiskey" },
    { name: "will.i.am - Scream & Shout.mp3", artistName: "will.i.am", songTitle: "Scream & Shout" },
    { name: "The Black Eyed Peas - Rock That Body.mp3", artistName: "The Black Eyed Peas", songTitle: "Rock That Body" },
    { name: "Travis Scott - goosebumps  ft. Kendrick Lamar.mp3", artistName: "Travis Scott", songTitle: "goosebumps" },
    { name: "The Weeknd - Blinding Lights.mp3", artistName: "The Weeknd", songTitle: "Blinding Lights" },
    { name: "Billie Eilish - Ocean Eyes.mp3", artistName: "Billie Eilish", songTitle: "Ocean Eyes" },
    { name: "Fuerza Regida - TU SANCHO.mp3", artistName: "Fuerza Regida", songTitle: "TU SANCHO" },
    { name: "Ed Sheeran - Shape of You.mp3", artistName: "Ed Sheeran", songTitle: "Shape of You" },
    { name: "Bad Bunny - DtMF.mp3", artistName: "Bad Bunny", songTitle: "DtMF" },
    { name: "Future - WAIT FOR U.mp3", artistName: "Future", songTitle: "WAIT FOR U" },
    { name: "Taylor Swift - Cruel Summer.mp3", artistName: "Taylor Swift", songTitle: "Cruel Summer" },
    { name: "Sabrina Carpenter - Espresso.mp3", artistName: "Sabrina Carpenter", songTitle: "Espresso" },
    { name: "NOKIA.mp3", artistName: "Unknown Artist", songTitle: "NOKIA" },
    { name: "Shaboozey - A Bar Song (Tipsy).mp3", artistName: "Shaboozey", songTitle: "A Bar Song (Tipsy)" },
    { name: "Teddy Swims - Lose Control.mp3", artistName: "Teddy Swims", songTitle: "Lose Control" },
    { name: "SZA - 30 For 30 feat. Kendrick Lamar.mp3", artistName: "SZA", songTitle: "30 For 30" },
    { name: "Billie Eilish - BIRDS OF A FEATHER.mp3", artistName: "Billie Eilish", songTitle: "BIRDS OF A FEATHER" },
    { name: "Kendrick Lamar - luther.mp3", artistName: "Kendrick Lamar", songTitle: "luther" },
    { name: "Gunna - wgft.mp3", artistName: "Gunna", songTitle: "wgft" },
    { name: "Not Like Us.mp3", artistName: "Kendrick Lamar", songTitle: "Not Like Us" },
    { name: "Post Malone - I Had Some Help.mp3", artistName: "Post Malone", songTitle: "I Had Some Help" },
    { name: "ROSÉ & Bruno Mars - APT.mp3", artistName: "ROSÉ & Bruno Mars", songTitle: "APT" },
    { name: "Sabrina Carpenter - Manchild.mp3", artistName: "Sabrina Carpenter", songTitle: "Manchild" },
    { name: "Kehlani - Folded.mp3", artistName: "Kehlani", songTitle: "Folded" },
    { name: "Lady Gaga, Bruno Mars - Die With A Smile.mp3", artistName: "Lady Gaga, Bruno Mars", songTitle: "Die With A Smile" },
    { name: "BLACKPINK - JUMP.mp3", artistName: "BLACKPINK", songTitle: "JUMP" },
    { name: "Chris Brown - It Depends (Audio) ft. Bryson Tiller.mp3", artistName: "Chris Brown", songTitle: "It Depends" },
    { name: "Morgan Wallen, Tate McRae - What I Want.mp3", artistName: "Morgan Wallen, Tate McRae", songTitle: "What I Want" },
    { name: "Justin Beiber-YUKON.mp3", artistName: "Justin Bieber", songTitle: "YUKON" },
    { name: "Justin Beiber-DAISIES.mp3", artistName: "Justin Bieber", songTitle: "DAISIES" },
    { name: "Alex Warren - Ordinary.mp3", artistName: "Alex Warren", songTitle: "Ordinary" },
    { name: "Huntrix - Golden.mp3", artistName: "Huntrix", songTitle: "Golden" }
  ];
  
  return availableSongs.map(song => ({
    name: song.name,
    path: `/music/${song.name}`,
    artistName: song.artistName,
    songTitle: song.songTitle
  }));
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get('bucket') || 'Songs';
    const folder = searchParams.get('folder') || 'Global_Top_100';
    const mode = (searchParams.get('mode') as Mode) || 'name-that-tune';
    const count = Math.max(1, Math.min(20, parseInt(searchParams.get('count') || '5', 10)));
    const choices = Math.max(2, Math.min(6, parseInt(searchParams.get('choices') || '4', 10)));
    const difficulty = (searchParams.get('difficulty') as DifficultyLevel) || 'medium';

    const prefix = folder;

    console.log(`🎵 Fetching questions from SpaceTimeDB: bucket=${bucket}, folder=${folder}, mode=${mode}, count=${count}`);

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();

    let files: Array<{ name: string; path: string; artistName: string; songTitle: string }> = [];
    let source = 'local';

    // Note: In a real implementation, you'd query SpaceTimeDB for audio files
    // For now, we'll use local files
    console.log('ℹ️ SpaceTimeDB audio files integration pending, using local files');
    files = getLocalAudioFiles();
    source = 'local';
    console.log(`📁 Found ${files.length} local audio files`);

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
      if (source === 'supabase') {
        // Use Lighthouse storage instead of Supabase
        audioUrl = await lighthouseStorage.createSignedUrl(correct.path, 300);
      } else {
        // Use local file path
        audioUrl = correct.path;
      }

      questions.push({
        id: `sb_${Date.now()}_${i}`,
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
          source: source as 'supabase' | 'local',
        },
      });

      console.log(`✅ Generated ${mode} question: ${correct.artistName} - ${correct.songTitle}`);
    }

    console.log(`🎉 Generated ${questions.length} questions successfully from ${source}`);

    return NextResponse.json({ 
      questions,
      count: questions.length,
      difficulty,
      mode,
      source,
      bucket,
      folder
    });
  } catch (e) {
    console.error('❌ Error generating Supabase questions:', e);
    return NextResponse.json({ 
      error: e instanceof Error ? e.message : 'Internal error' 
    }, { status: 500 });
  }
}
