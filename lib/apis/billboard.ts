import type { BillboardTrack, BillboardChartResponse, BillboardGreatestHit, BillboardGreatestResponse } from '@/types/billboard';

export class BillboardAPI {
  private static readonly RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'billboard-api2.p.rapidapi.com';
  private static readonly RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
  
  private static getBaseUrl(): string {
    if (typeof window === 'undefined') {
      // Server-side: use env var or Vercel URL
      if (process.env.NEXT_PUBLIC_URL) return process.env.NEXT_PUBLIC_URL;
      if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
      if (process.env.NODE_ENV === 'production') {
        return 'https://beatme.creativeplatform.xyz';
      }
      return 'http://localhost:3000';
    }
    return window.location.origin;
  }

  static async getHot100(): Promise<BillboardTrack[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: this.RAPIDAPI_HOST,
          path: '/billboard-hot-100',
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.RAPIDAPI_KEY,
            'X-RapidAPI-Host': this.RAPIDAPI_HOST,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Billboard Hot 100');
      }

      const data: BillboardChartResponse = await response.json();
      return data.chart?.songs || [];
    } catch (error) {
      console.error('Billboard Hot 100 error:', error);
      return [];
    }
  }

  static async getGreatestHits(): Promise<BillboardGreatestHit[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: this.RAPIDAPI_HOST,
          path: '/greatest-of-all-time/hot-100-songs',
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.RAPIDAPI_KEY,
            'X-RapidAPI-Host': this.RAPIDAPI_HOST,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Billboard Greatest Hits');
      }

      const data: BillboardGreatestResponse = await response.json();
      return data.content || [];
    } catch (error) {
      console.error('Billboard Greatest Hits error:', error);
      return [];
    }
  }

  static async getBillboard200(): Promise<BillboardTrack[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: this.RAPIDAPI_HOST,
          path: '/billboard-200',
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.RAPIDAPI_KEY,
            'X-RapidAPI-Host': this.RAPIDAPI_HOST,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Billboard 200');
      }

      const data: BillboardChartResponse = await response.json();
      return data.chart?.songs || [];
    } catch (error) {
      console.error('Billboard 200 error:', error);
      return [];
    }
  }

  static async getGenreChart(genre: string): Promise<BillboardTrack[]> {
    try {
      const genreMap: Record<string, string> = {
        'hip-hop': 'hip-hop',
        'r&b': 'r-b',
        'rock': 'rock',
        'country': 'country',
        'dance': 'dance-electronic',
        'latin': 'latin',
        'christian': 'christian',
        'jazz': 'jazz',
        'blues': 'blues',
      };

      const genreSlug = genreMap[genre.toLowerCase()] || genre.toLowerCase();
      
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: this.RAPIDAPI_HOST,
          path: `/chart/${genreSlug}`,
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.RAPIDAPI_KEY,
            'X-RapidAPI-Host': this.RAPIDAPI_HOST,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${genre} chart`);
      }

      const data: BillboardChartResponse = await response.json();
      return data.chart?.songs || [];
    } catch (error) {
      console.error(`Billboard ${genre} chart error:`, error);
      return [];
    }
  }

  static async searchChartsByYear(year: number): Promise<BillboardTrack[]> {
    try {
      const baseUrl = this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol: 'https',
          origin: this.RAPIDAPI_HOST,
          path: `/chart/hot-100/${year}`,
          method: 'GET',
          headers: {
            'X-RapidAPI-Key': this.RAPIDAPI_KEY,
            'X-RapidAPI-Host': this.RAPIDAPI_HOST,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${year} Billboard charts`);
      }

      const data: BillboardChartResponse = await response.json();
      return data.chart?.songs || [];
    } catch (error) {
      console.error(`Billboard ${year} charts error:`, error);
      return [];
    }
  }

  static getRandomHitsByDecade(decade: number, count: number = 10): Promise<BillboardTrack[]> {
    // For demo purposes, we'll use greatest hits and filter conceptually by decade
    // In production, you might have decade-specific endpoints
    return this.getGreatestHits()
      .then(hits => {
        const filtered = hits.filter(hit => {
          const year = hit.year ? parseInt(hit.year) : 0;
          return year >= decade && year < decade + 10;
        });
        
        // Shuffle and return requested count
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(hit => ({
          rank: hit.no,
          song: hit.title,
          artist: hit.artist,
          'peak-pos': hit.peak_position || 1,
          'wks-on-chart': hit.weeks_at_no_1 || 1,
          image: hit.image,
        }));
      });
  }
}