import { getSiteUrl } from '@/lib/config/site';

const OG_THUMBNAIL_PATH = '/assets/BEAT_ME_thumbnail.png';

export async function GET() {
  const siteUrl = getSiteUrl();

  return Response.json({
    accountAssociation: {
      header:
        'eyJmaWQiOjc5MzUsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg3RGYyQzk0MTJiRDY3NDk3ZmVhRWY3M0M2Zjc4YUY2NzFGYWM4Njc0In0',
      payload: 'eyJkb21haW4iOiJiZWF0bWUuY3JlYXRpdmVwbGF0Zm9ybS54eXoifQ',
      signature:
        'MHg4MTc0Y2YzNjdhMjM4YTdiNThlMWI2MTU0OWVhYTAzZWViYWQxMmY5MjkxNmE5YzMzNDU0OTlkNGQyZTg0ZjYwMDY4N2EyY2JiM2RjZTZkNjA2NWZkZmY2ZDg4MWRiOGMwNzUyMjM5MjdmYzgyNWQzM2QzNmMwYjhmNDNlZGZmYzFi',
    },
    baseBuilder: {
      allowedAddresses: ['0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67'],
    },
    frame: {
      version: '1',
      name: 'BEAT ME',
      homeUrl: siteUrl,
      iconUrl: `${siteUrl}/icon.png`,
      splashImageUrl: `${siteUrl}/splash.png`,
      splashBackgroundColor: '#000000',
      webhookUrl: `${siteUrl}/api/webhook`,
      subtitle: 'Can you beat me?',
      description: 'Name that tune, win your reward.',
      screenshotUrls: [],
      primaryCategory: 'games',
      tags: ['music', 'trivia', 'earn'],
      heroImageUrl: `${siteUrl}${OG_THUMBNAIL_PATH}`,
      tagline: 'Can you beat me?',
      ogTitle: 'BEAT ME',
      ogDescription: 'Name that tune, win your reward.',
      ogImageUrl: `${siteUrl}${OG_THUMBNAIL_PATH}`,
      noindex: true,
    },
  });
}
