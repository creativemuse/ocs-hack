function withValidProperties(properties: Record<string, undefined | string | string[]>) {
    return Object.fromEntries(
        Object.entries(properties).filter(([_, value]) => (Array.isArray(value) ? value.length > 0 : !!value))
    );
    }
    
    export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL as string;
    return Response.json({
        "accountAssociation": {
        "header": "eyJmaWQiOjc5MzUsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg3RGYyQzk0MTJiRDY3NDk3ZmVhRWY3M0M2Zjc4YUY2NzFGYWM4Njc0In0",
        "payload": "eyJkb21haW4iOiJiZWF0bWUuY3JlYXRpdmVwbGF0Zm9ybS54eXoifQ",
        "signature": "MHg4MTc0Y2YzNjdhMjM4YTdiNThlMWI2MTU0OWVhYTAzZWViYWQxMmY5MjkxNmE5YzMzNDU0OTlkNGQyZTg0ZjYwMDY4N2EyY2JiM2RjZTZkNjA2NWZkZmY2ZDg4MWRiOGMwNzUyMjM5MjdmYzgyNWQzM2QzNmMwYjhmNDNlZGZmYzFi"
      },
        "baseBuilder": {
          "allowedAddresses": ["0x1Fde40a4046Eda0cA0539Dd6c77ABF8933B94260", "0xc3118549B9bCd7Ed6672Ea2A5a3B26FfbE735F67"]
        },
        "frame": {
          "version": "1",
          "name": "BEAT ME",
          "homeUrl": "https://beatme.creativeplatform.xyz",
          "iconUrl": "https://beatme.creativeplatform.xyz/icon.png",
          "splashImageUrl": "https://beatme.creativeplatform.xyz/splash.png",
          "splashBackgroundColor": "#000000",
          "webhookUrl": "https://beatme.creativeplatform.xyz/api/webhook",
          "subtitle": "Can you beat me?",
          "description": "Name that tune, win your reward.",
          "screenshotUrls": [],
          "primaryCategory": "games",
          "tags": ["music", "trivia", "earn"],
          "heroImageUrl": "https://beatme.creativeplatform.xyz/assets/BEATME_hero.png",
          "tagline": "Can you beat me?",
          "ogTitle": "BEAT ME",
          "ogDescription": "Name that tune, win your reward.",
          "ogImageUrl": "https://beatme.creativeplatform.xyz/assets/BEATME_hero.png",
          "noindex": true
        }
      }); // see the next step for the manifest_json_object
    }