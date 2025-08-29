export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatTimeRemainingText = (seconds: number): string => {
  if (seconds <= 0) return 'Game started';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')} min left to join`;
  } else {
    return `${remainingSeconds} sec left to join`;
  }
};
