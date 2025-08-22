import { NextRequest, NextResponse } from 'next/server';
import { SupabaseStorage } from '@/lib/apis/supabase';
import type { DifficultyLevel } from '@/types/game';
import fs from 'fs';
import path from 'path';

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

// Fallback audio files from public directory
const getLocalAudioFiles = (): Array<{ name: string; path: string; artistName: string; songTitle: string }> => {
  try {
    const musicDir = path.join(process.cwd(), 'public', 'music');
    
    if (!fs.existsSync(musicDir)) {
      console.error('❌ Music directory does not exist:', musicDir);
      return [];
    }
    
    const allFiles = fs.readdirSync(musicDir);
    const files = allFiles.filter(file => 
      file.endsWith('.mp3') && !file.startsWith('.')
    );
    
    return files.map(file => {
      const base = file.replace('.mp3', '');
      const parts = base.split(' - ');
      const artistName = parts.length >= 2 ? parts[0]!.trim() : 'Unknown Artist';
      const songTitle = parts.length >= 2 ? parts.slice(1).join(' - ').trim() : base;
      
      return {
        name: file,
        path: `/music/${file}`,
        artistName,
        songTitle
      };
    });
  } catch (error) {
    console.error('❌ Error reading local audio files:', error);
    return [];
  }
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

    console.log(`🎵 Fetching questions from Supabase: bucket=${bucket}, folder=${folder}, mode=${mode}, count=${count}`);

    let files: Array<{ name: string; path: string; artistName: string; songTitle: string }> = [];
    let source = 'local'; // Force local since Supabase is not configured

    try {
      // Try Supabase first (but skip since env vars are not set)
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        files = await SupabaseStorage.listAudioFiles(bucket, prefix);
        console.log(`📁 Found ${files.length} audio files in Supabase ${bucket}/${folder}`);
        source = 'supabase';
      } else {
        throw new Error('Supabase not configured');
      }
    } catch (supabaseError) {
      console.warn('⚠️ Supabase storage failed, falling back to local files:', supabaseError);
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
      if (source === 'supabase') {
        audioUrl = await SupabaseStorage.createSignedUrl(bucket, correct.path, 300);
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
