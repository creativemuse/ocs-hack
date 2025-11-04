import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { spacetimeClient } from '@/lib/apis/spacetime';

/**
 * Webhook endpoint for external service integrations
 * 
 * Supports multiple webhook providers with signature verification:
 * - Coinbase Commerce (HMAC SHA-256)
 * - Stripe (HMAC SHA-256)
 * - CDP Onchain Webhooks (Coinbase Developer Platform - blockchain events)
 * - Generic webhooks with custom signature verification
 * 
 * Environment Variables Required:
 * - WEBHOOK_SECRET: Secret key for signature verification (HMAC SHA-256)
 *   For CDP: Use the secret from subscription metadata.secret
 * - WEBHOOK_PROVIDER: Provider type ('coinbase', 'stripe', 'cdp', 'generic')
 *   For CDP Onchain Webhooks: Set to 'cdp'
 */

interface WebhookEvent {
  type: string;
  data: unknown;
  timestamp?: string;
  id?: string;
  subscriptionId?: string;
  labels?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// CDP Onchain Webhook specific structure (from CDP documentation)
interface CDPOnchainEvent {
  id: string; // Event ID (e.g., "evt_1a2b3c4d5e6f")
  type: string; // 'onchain.activity.detected'
  createdAt: string; // ISO timestamp
  data: {
    subscriptionId: string;
    networkId: string; // 'base-mainnet' or 'base-sepolia'
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    logIndex: number;
    contractAddress: string;
    eventName: string;
    // Event-specific fields (decoded from contract)
    from?: string;
    to?: string;
    value?: string;
    gameId?: string;
    player?: string;
    amount?: string;
    ranking?: string;
    [key: string]: unknown; // Allow other event-specific fields
  };
}

type WebhookProvider = 'coinbase' | 'stripe' | 'cdp' | 'generic';

/**
 * Verify CDP Onchain Webhook signature using HMAC SHA-256
 * 
 * CDP uses X-Hook0-Signature header with format: t=timestamp,h=headerNames,v1=signature
 * Signed payload: timestamp.headerNames.headerValues.rawBody
 * 
 * @param payload - Raw request body as string
 * @param signatureHeader - X-Hook0-Signature header value
 * @param secret - Secret from metadata.secret in subscription creation
 * @param headers - HTTP headers from request
 * @param maxAgeMinutes - Maximum age for webhook (default: 5 minutes)
 * @returns true if signature is valid and within time window, false otherwise
 */
function verifyCDPWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  headers: Headers,
  maxAgeMinutes: number = 5
): boolean {
  try {
    if (!secret || !signatureHeader) {
      logger.warn('CDP webhook signature verification skipped: missing secret or signature');
      return false;
    }

    // Parse signature header: t=timestamp,h=headerNames,v1=signature
    const elements = signatureHeader.split(',');
    const timestampElement = elements.find(e => e.startsWith('t='));
    const headerNamesElement = elements.find(e => e.startsWith('h='));
    const signatureElement = elements.find(e => e.startsWith('v1='));

    if (!timestampElement || !headerNamesElement || !signatureElement) {
      logger.warn('CDP webhook signature header malformed');
      return false;
    }

    const timestamp = timestampElement.split('=')[1];
    const headerNames = headerNamesElement.split('=')[1];
    const providedSignature = signatureElement.split('=')[1];

    // Verify timestamp to prevent replay attacks
    const webhookTime = parseInt(timestamp) * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const ageMinutes = (currentTime - webhookTime) / (1000 * 60);

    if (ageMinutes > maxAgeMinutes) {
      logger.warn(`CDP webhook timestamp exceeds maximum age: ${ageMinutes.toFixed(1)} minutes > ${maxAgeMinutes} minutes`);
      return false;
    }

    // Build header values string
    const headerNameList = headerNames.split(' ');
    const headerValues = headerNameList
      .map(name => {
        // Get header value (headers object in Next.js uses lowercase keys)
        const headerValue = headers.get(name.toLowerCase()) || headers.get(name) || '';
        return headerValue;
      })
      .join('.');

    // Build signed payload: timestamp.headerNames.headerValues.rawBody
    const signedPayload = `${timestamp}.${headerNames}.${headerValues}.${payload}`;

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    // Compare signatures securely using timing-safe comparison
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );

    return signaturesMatch;
  } catch (error) {
    logger.error('CDP webhook signature verification error:', error);
    return false;
  }
}

/**
 * Verify webhook signature using HMAC SHA-256
 * 
 * @param payload - Raw request body as string
 * @param signature - Signature from webhook header
 * @param secret - Secret key for verification
 * @param provider - Webhook provider type (affects signature format)
 * @param headers - HTTP headers (required for CDP)
 * @returns true if signature is valid, false otherwise
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  provider: WebhookProvider = 'generic',
  headers?: Headers
): boolean {
  try {
    if (!secret || !signature) {
      logger.warn('Webhook signature verification skipped: missing secret or signature');
      return false;
    }

    // CDP uses a different verification method
    if (provider === 'cdp' && headers) {
      return verifyCDPWebhookSignature(payload, signature, secret, headers);
    }

    // Generate expected signature for other providers
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Provider-specific signature format handling
    switch (provider) {
      case 'coinbase':
        // Coinbase Commerce uses 'X-CC-Webhook-Signature' header with hex format
        // Format: sha256=<hex_signature>
        const coinbaseSig = signature.replace('sha256=', '');
        return crypto.timingSafeEqual(
          Buffer.from(coinbaseSig, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );

      case 'stripe':
        // Stripe uses 'stripe-signature' header with timestamp and signature
        // Format: t=<timestamp>,v1=<signature>
        // We'll verify the signature part (v1=)
        const stripeMatch = signature.match(/v1=([^,]+)/);
        if (!stripeMatch) return false;
        const stripeSig = stripeMatch[1];
        return crypto.timingSafeEqual(
          Buffer.from(stripeSig, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );

      case 'generic':
      default:
        // Generic format: direct hex comparison
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );
    }
  } catch (error) {
    logger.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Process webhook event based on provider and event type
 */
async function processWebhookEvent(
  event: WebhookEvent,
  provider: WebhookProvider
): Promise<{ success: boolean; message: string }> {
  try {
    logger.info(`Processing ${provider} webhook event:`, {
      type: event.type,
      id: event.id,
      timestamp: event.timestamp,
    });

    // Provider-specific event handling
    switch (provider) {
      case 'coinbase':
        return await handleCoinbaseWebhook(event);
      case 'stripe':
        return await handleStripeWebhook(event);
      case 'cdp':
        return await handleCDPWebhook(event);
      case 'generic':
      default:
        return await handleGenericWebhook(event);
    }
  } catch (error) {
    logger.error(`Error processing ${provider} webhook:`, error);
    return {
      success: false,
      message: `Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle Coinbase Commerce webhook events
 */
async function handleCoinbaseWebhook(event: WebhookEvent): Promise<{ success: boolean; message: string }> {
  const eventType = event.type;
  const eventData = event.data as Record<string, unknown>;

  switch (eventType) {
    case 'charge:confirmed':
      const pricing = (eventData.pricing as { local?: { amount?: string; currency?: string } })?.local;
      logger.info('Coinbase payment confirmed:', {
        chargeId: eventData.id,
        amount: pricing?.amount,
        currency: pricing?.currency,
      });
      // TODO: Update payment status in your database
      // Example: await updatePaymentStatus(eventData.id, 'confirmed');
      return { success: true, message: 'Payment confirmed' };

    case 'charge:failed':
      logger.warn('Coinbase payment failed:', {
        chargeId: eventData.id,
      });
      // TODO: Update payment status in your database
      return { success: true, message: 'Payment failure recorded' };

    case 'charge:created':
      logger.info('Coinbase charge created:', {
        chargeId: eventData.id,
      });
      return { success: true, message: 'Charge created' };

    default:
      logger.info(`Unhandled Coinbase webhook event type: ${eventType}`);
      return { success: true, message: `Event ${eventType} received` };
  }
}

/**
 * Handle Stripe webhook events
 */
async function handleStripeWebhook(event: WebhookEvent): Promise<{ success: boolean; message: string }> {
  const eventType = event.type;
  const eventData = event.data as Record<string, unknown>;

  switch (eventType) {
    case 'payment_intent.succeeded':
      logger.info('Stripe payment succeeded:', {
        paymentIntentId: eventData.id,
      });
      // TODO: Update payment status in your database
      return { success: true, message: 'Payment succeeded' };

    case 'payment_intent.payment_failed':
      logger.warn('Stripe payment failed:', {
        paymentIntentId: eventData.id,
      });
      // TODO: Update payment status in your database
      return { success: true, message: 'Payment failure recorded' };

    default:
      logger.info(`Unhandled Stripe webhook event type: ${eventType}`);
      return { success: true, message: `Event ${eventType} received` };
  }
}

/**
 * Handle Coinbase Developer Platform (CDP) Onchain Webhook events
 * 
 * CDP Onchain Webhooks send events with structure:
 * - id: Event ID
 * - type: 'onchain.activity.detected'
 * - createdAt: ISO timestamp
 * - data: Event data including subscriptionId, networkId, transaction details, and decoded event fields
 */
async function handleCDPWebhook(event: WebhookEvent): Promise<{ success: boolean; message: string }> {
  const eventType = event.type;
  
  // CDP Onchain Webhooks use 'onchain.activity.detected' as the event type
  if (eventType === 'onchain.activity.detected') {
    const cdpEvent = event as unknown as CDPOnchainEvent;
    const eventData = cdpEvent.data;
    
    const contractAddress = eventData.contractAddress?.toLowerCase();
    const eventName = eventData.eventName;
    const network = eventData.networkId || 'base-mainnet';
    
    logger.info('CDP onchain activity detected:', {
      eventId: cdpEvent.id,
      subscriptionId: eventData.subscriptionId,
      contractAddress,
      eventName,
      network,
      transactionHash: eventData.transactionHash,
      blockNumber: eventData.blockNumber,
    });

    // Verify this is for our TriviaBattlev4 contract
    const TRIVIA_CONTRACT = '0xd8f082fa4ef6a4c59f8366c19a196d488485682b'.toLowerCase();
    if (contractAddress !== TRIVIA_CONTRACT) {
      logger.warn('CDP webhook received for different contract:', {
        expected: TRIVIA_CONTRACT,
        received: contractAddress,
      });
      return { success: true, message: 'Event from different contract, ignoring' };
    }

    // Process contract events based on event name
    // CDP decodes event data and includes it directly in the data object
    switch (eventName) {
      case 'PrizeClaimed':
        logger.info('Prize claimed event:', {
          gameId: eventData.gameId,
          player: eventData.player,
          amount: eventData.amount,
          ranking: eventData.ranking,
          transactionHash: eventData.transactionHash,
        });
        
        // Record prize distribution in SpacetimeDB
        // This updates the player's total_earnings, making them appear on top earners board
        try {
          // Ensure SpacetimeDB connection is initialized
          await spacetimeClient.initialize();
          
          // Validate that connection is actually established
          if (!spacetimeClient.isConfigured()) {
            logger.warn('⚠️ SpacetimeDB not configured or connection failed - skipping prize distribution recording');
            return { success: true, message: 'Prize claim processed (SpacetimeDB not available)' };
          }
          
          if (eventData.player && eventData.amount && eventData.gameId && eventData.ranking) {
            const walletAddress = (eventData.player as string).toLowerCase();
            const gameId = String(eventData.gameId || '');
            const prizeAmount = Number(eventData.amount) / 1e6; // Convert from wei to USDC (6 decimals)
            const rank = Number(eventData.ranking || 0);
            
            // Ensure player exists in SpacetimeDB first
            await spacetimeClient.createPlayer(walletAddress);
            
            // Verify connection is still valid before recording prize
            if (!spacetimeClient.isConfigured()) {
              logger.warn('⚠️ SpacetimeDB connection lost after createPlayer - skipping prize recording');
              return { success: true, message: 'Prize claim processed (SpacetimeDB connection lost)' };
            }
            
            // Record the prize distribution (updates total_earnings)
            await spacetimeClient.recordPrizeDistribution(
              walletAddress,
              gameId,
              prizeAmount,
              rank
            );
            
            logger.info(`✅ Recorded prize distribution: ${prizeAmount} USDC for ${walletAddress} (rank ${rank})`);
          }
        } catch (error) {
          logger.error('❌ Failed to record prize distribution:', error);
          // Don't fail the webhook - log and continue
        }
        
        return { success: true, message: 'Prize claim processed' };
      
      case 'PrizesDistributed':
        logger.info('Prizes distributed event:', {
          sessionId: eventData.sessionId || eventData.gameId,
          winners: eventData.winners,
          amounts: eventData.amounts,
          transactionHash: eventData.transactionHash,
        });
        
        // Record prize distributions for all winners
        // This updates their total_earnings in SpacetimeDB
        try {
          // Ensure SpacetimeDB connection is initialized
          await spacetimeClient.initialize();
          
          // Validate that connection is actually established
          if (!spacetimeClient.isConfigured()) {
            logger.warn('⚠️ SpacetimeDB not configured or connection failed - skipping prizes distribution recording');
            return { success: true, message: 'Prizes distributed recorded (SpacetimeDB not available)' };
          }
          
          const sessionId = String(eventData.sessionId || eventData.gameId || '');
          const winners = eventData.winners as string[] | undefined;
          const amounts = eventData.amounts as string[] | undefined;
          
          if (winners && amounts && winners.length === amounts.length) {
            let successCount = 0;
            let failureCount = 0;
            
            for (let i = 0; i < winners.length; i++) {
              // Verify connection is still valid before processing each winner
              if (!spacetimeClient.isConfigured()) {
                logger.warn(`⚠️ SpacetimeDB connection lost during processing - processed ${successCount}/${winners.length} winners`);
                break;
              }
              
              try {
                const walletAddress = winners[i].toLowerCase();
                const prizeAmount = Number(amounts[i]) / 1e6; // Convert from wei to USDC (6 decimals)
                const rank = i + 1; // Rank is position in winners array (1-indexed)
                
                // Ensure player exists in SpacetimeDB first
                await spacetimeClient.createPlayer(walletAddress);
                
                // Verify connection is still valid after createPlayer
                if (!spacetimeClient.isConfigured()) {
                  logger.warn(`⚠️ SpacetimeDB connection lost after createPlayer for ${walletAddress}`);
                  failureCount++;
                  continue;
                }
                
                // Record the prize distribution (updates total_earnings)
                await spacetimeClient.recordPrizeDistribution(
                  walletAddress,
                  sessionId,
                  prizeAmount,
                  rank
                );
                
                successCount++;
                logger.info(`✅ Recorded prize: ${prizeAmount} USDC for ${walletAddress} (rank ${rank})`);
              } catch (error) {
                failureCount++;
                logger.error(`❌ Failed to record prize for winner ${winners[i]}:`, error);
                // Continue processing other winners
              }
            }
            
            logger.info(`📊 Prize distribution recording complete: ${successCount} succeeded, ${failureCount} failed`);
          }
        } catch (error) {
          logger.error('❌ Failed to record prizes distributed:', error);
          // Don't fail the webhook - log and continue
        }
        
        return { success: true, message: 'Prizes distributed recorded' };

      case 'PlayerEntered':
        logger.info('Player entered event:', {
          gameId: eventData.gameId,
          player: eventData.player,
          totalPlayers: eventData.value, // May be totalPlayers in decoded data
          transactionHash: eventData.transactionHash,
        });
        // TODO: Update player entry status in database
        return { success: true, message: 'Player entry recorded' };

      case 'GameCreated':
        logger.info('Game created event:', {
          gameId: eventData.gameId,
          startTime: eventData.value, // May need to check actual field names
          transactionHash: eventData.transactionHash,
        });
        // TODO: Update game session in database
        return { success: true, message: 'Game creation recorded' };

      case 'GameFinalized':
        logger.info('Game finalized event:', {
          gameId: eventData.gameId,
          prizePool: eventData.amount, // May need to check actual field names
          transactionHash: eventData.transactionHash,
        });
        // TODO: Update game finalization status
        return { success: true, message: 'Game finalization recorded' };

      case 'RankingsSubmitted':
        logger.info('Rankings submitted event:', {
          gameId: eventData.gameId,
          transactionHash: eventData.transactionHash,
        });
        // TODO: Update rankings status
        return { success: true, message: 'Rankings submission recorded' };

      default:
        logger.info(`Unhandled contract event: ${eventName}`, {
          eventData,
          transactionHash: eventData.transactionHash,
        });
        return { success: true, message: `Contract event ${eventName} received` };
    }
  }

  // Fallback for other event types
  logger.info(`Unhandled CDP webhook event type: ${eventType}`, {
    eventId: event.id,
    eventType,
  });
  return { success: true, message: `CDP event ${eventType} received` };
}

/**
 * Handle generic webhook events
 */
async function handleGenericWebhook(event: WebhookEvent): Promise<{ success: boolean; message: string }> {
  logger.info('Generic webhook event received:', {
    type: event.type,
    id: event.id,
  });

  // TODO: Implement custom webhook processing logic
  // Example: Handle Chainlink automation callbacks, custom integrations, etc.

  return { success: true, message: `Generic webhook event ${event.type} processed` };
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const provider = (process.env.WEBHOOK_PROVIDER || 'generic') as WebhookProvider;

    // Get raw body for signature verification
    const rawBody = await request.text();
    
    // Get signature from headers (provider-specific)
    let signature: string | null = null;
    
    switch (provider) {
      case 'coinbase':
        signature = request.headers.get('x-cc-webhook-signature');
        break;
      case 'stripe':
        signature = request.headers.get('stripe-signature');
        break;
      case 'cdp':
        // CDP Onchain Webhooks use 'X-Hook0-Signature' header
        // Format: t=timestamp,h=headerNames,v1=signature
        signature = request.headers.get('x-hook0-signature');
        break;
      case 'generic':
      default:
        signature = request.headers.get('x-webhook-signature') || 
                   request.headers.get('signature');
        break;
    }

    // Verify signature if secret is configured
    if (webhookSecret) {
      if (!signature) {
        logger.warn('Webhook signature missing from headers');
        return NextResponse.json(
          { error: 'Missing webhook signature' },
          { status: 401 }
        );
      }

      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret, provider, request.headers);
      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          provider,
          hasSignature: !!signature,
          signatureLength: signature?.length,
        });
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      logger.info('Webhook signature verified successfully');
    } else {
      logger.warn('Webhook secret not configured - signature verification skipped');
      // In production, you should always verify signatures
      if (process.env.NODE_ENV === 'production') {
        logger.error('Webhook secret missing in production!');
        return NextResponse.json(
          { error: 'Webhook secret not configured' },
          { status: 500 }
        );
      }
    }

    // Parse webhook payload
    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch (parseError) {
      logger.error('Failed to parse webhook payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Process webhook event
    const result = await processWebhookEvent(event, provider);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: result.message,
      eventType: event.type,
      eventId: event.id,
    }, { status: 200 });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for webhook configuration
 */
export async function GET() {
  const hasSecret = !!process.env.WEBHOOK_SECRET;
  const provider = process.env.WEBHOOK_PROVIDER || 'generic';

  return NextResponse.json({
    status: 'ok',
    webhookConfigured: hasSecret,
    provider,
    signatureVerification: hasSecret ? 'enabled' : 'disabled',
    environment: process.env.NODE_ENV || 'development',
  }, { status: 200 });
}
