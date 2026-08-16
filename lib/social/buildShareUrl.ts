import { getSiteUrl } from '@/lib/config/site';

export type ShareAchievementType =
  | 'high-score'
  | 'game-complete'
  | 'round-win'
  | 'perfect-round';

export const buildShareUrl = (params: {
  score: number;
  type?: ShareAchievementType;
  rank?: number;
}): string => {
  const url = new URL('/share', getSiteUrl());
  url.searchParams.set('score', String(Math.max(0, Math.floor(params.score))));
  if (params.type) {
    url.searchParams.set('type', params.type);
  }
  if (params.rank != null && params.rank > 0) {
    url.searchParams.set('rank', String(params.rank));
  }
  return url.toString();
};
