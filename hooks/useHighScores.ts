import { useState, useEffect, useCallback } from 'react';

interface HighScore {
  id: string;
  playerName: string;
  score: number;
  timestamp: number;
  isGuest: boolean;
  guestId?: string;
}

interface HighScoreResponse {
  highScores: HighScore[];
  totalScores: number;
}

interface SubmitScoreResponse {
  success: boolean;
  score: HighScore;
  isNewHighScore: boolean;
  rank: number;
  totalScores: number;
}

export const useHighScores = () => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHighScores = useCallback(async (limit: number = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/high-scores?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch high scores');
      }
      
      const data: HighScoreResponse = await response.json();
      setHighScores(data.highScores);
    } catch (err) {
      console.error('Error fetching high scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load high scores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitScore = useCallback(async (
    playerName: string, 
    score: number, 
    isGuest: boolean = false, 
    guestId?: string
  ): Promise<SubmitScoreResponse | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/high-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName,
          score,
          isGuest,
          guestId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit score');
      }

      const data: SubmitScoreResponse = await response.json();
      
      // Refresh high scores after submitting
      await fetchHighScores();
      
      return data;
    } catch (err) {
      console.error('Error submitting score:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit score');
      return null;
    }
  }, [fetchHighScores]);

  const getCurrentHighScore = useCallback((): number => {
    return highScores.length > 0 ? highScores[0]?.score || 0 : 0;
  }, [highScores]);

  const getPlayerRank = useCallback((score: number): number => {
    const sortedScores = [...highScores].sort((a, b) => b.score - a.score);
    const rank = sortedScores.findIndex(s => s.score <= score) + 1;
    return rank > 0 ? rank : sortedScores.length + 1;
  }, [highScores]);

  // Initial fetch
  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);

  return {
    highScores,
    isLoading,
    error,
    fetchHighScores,
    submitScore,
    getCurrentHighScore,
    getPlayerRank
  };
};
