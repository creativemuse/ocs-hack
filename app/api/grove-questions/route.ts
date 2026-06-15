import { NextRequest, NextResponse } from 'next/server';
import type { DifficultyLevel } from '@/types/game';
import { logger } from '@/lib/utils/logger';
import { signQuestionToken } from '@/lib/utils/questionToken';
import { parseArtistAndTitle, stripFeaturingFromTitle } from '@/lib/grove/parseMetadata';
import {
  hasUploadedGroveTriviaFiles,
  listGroveAudioByPrefix,
  resolveGroveAudioUrl,
} from '@/lib/grove/manifest';
import { getLocalAudioCatalog } from '@/lib/grove/localCatalog';
import type { GroveFileEntry } from '@/lib/grove-files';

type Mode = 'name-that-tune' | 'artist-match';

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
};

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }

  return output;
};

const getTimeLimit = (difficulty: DifficultyLevel): number => {
  switch (difficulty) {
    case 'easy':
      return 20;
    case 'medium':
      return 15;
    case 'hard':
      return 10;
    case 'expert':
      return 8;
    default:
      return 15;
  }
};

const normalizeTrackMetadata = (file: GroveFileEntry): GroveFileEntry => {
  const parsed =
    file.artistName === 'Unknown' ? parseArtistAndTitle(file.name) : null;

  const artistName =
    parsed && parsed.artistName !== 'Unknown' ? parsed.artistName : file.artistName;
  const rawTitle =
    parsed && parsed.artistName !== 'Unknown' ? parsed.songTitle : file.songTitle;

  return {
    ...file,
    artistName,
    songTitle: stripFeaturingFromTitle(rawTitle),
  };
};

const loadAudioFiles = (prefix: string): { files: GroveFileEntry[]; source: string } => {
  if (hasUploadedGroveTriviaFiles()) {
    const groveFiles = listGroveAudioByPrefix(prefix);
    if (groveFiles.length > 0) {
      return { files: groveFiles, source: 'grove' };
    }
  }

  const localFiles = getLocalAudioCatalog().filter((file) => file.path.startsWith(prefix));
  return {
    files: localFiles,
    source: hasUploadedGroveTriviaFiles() ? 'local-grove-pending' : 'local',
  };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'Global_Top_100';
    const mode = (searchParams.get('mode') as Mode) || 'name-that-tune';
    const count = Math.max(1, Math.min(20, parseInt(searchParams.get('count') || '5', 10)));
    const choices = Math.max(2, Math.min(6, parseInt(searchParams.get('choices') || '4', 10)));
    const difficulty = (searchParams.get('difficulty') as DifficultyLevel) || 'medium';

    logger.debug(`🌳 Fetching questions from Grove: folder=${folder}, mode=${mode}, count=${count}`);

    const { files: rawFiles, source } = loadAudioFiles(folder);
    const files = rawFiles.map(normalizeTrackMetadata);

    if (files.length < choices) {
      return NextResponse.json(
        { error: `Not enough tracks (${files.length}) to build ${choices} choices` },
        { status: 400 },
      );
    }

    const questions = [];
    const bag = shuffle(files);

    for (let i = 0; i < count && i < bag.length; i += 1) {
      const correct = bag[i]!;
      const pool = files.filter((file) => file.name !== correct.name);

      const correctText = mode === 'name-that-tune' ? correct.songTitle : correct.artistName;
      const distractorPool =
        mode === 'name-that-tune'
          ? pool.map((file) => file.songTitle)
          : pool.map((file) => file.artistName);

      const distractors = shuffle(
        unique(distractorPool.filter((value) => value.toLowerCase() !== correctText.toLowerCase())),
      ).slice(0, Math.max(0, choices - 1));

      const options = shuffle([correctText, ...distractors]).slice(0, choices);
      const correctIndex = options.indexOf(correctText);
      const audioUrl = resolveGroveAudioUrl(correct);
      const qId = `grove_${Date.now()}_${i}`;
      const correctAns = correctIndex >= 0 ? correctIndex : 0;
      const timeLimit = getTimeLimit(difficulty);

      questions.push({
        id: qId,
        type: mode,
        question:
          mode === 'name-that-tune'
            ? 'What song is this?'
            : `Who performs "${correct.songTitle}"?`,
        options,
        questionToken: signQuestionToken(qId, correctAns, timeLimit, difficulty),
        audioUrl,
        timeLimit,
        difficulty,
        metadata: {
          artistName: correct.artistName,
          songTitle: correct.songTitle,
          source: source as 'grove' | 'local' | 'local-grove-pending',
        },
      });
    }

    logger.info(`🎉 Generated ${questions.length} questions from ${source}`);

    return NextResponse.json({
      questions,
      count: questions.length,
      difficulty,
      mode,
      source,
      folder,
    });
  } catch (error) {
    logger.error('❌ Error generating Grove questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
