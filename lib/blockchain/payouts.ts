import { TriviaContract, ENTRY_FEE_USDC, TRIAL_ENTRY_FEE_USDC } from './contracts';
import { spacetimeClient } from '@/lib/apis/spacetime';

export interface PayoutDistribution {
  first: number;    // 50%
  second: number;   // 30% 
  third: number;    // 15%
  participation: number; // 5%
}

export interface GameResult {
  gameId: string;
  playerAddress: string;
  playerName?: string;
  finalScore: number;
  rank: number;
  timeCompleted: number;
  answersSubmitted: number;
  totalQuestions: number;
  isTrialPlayer: boolean; // New field to track trial players
  sessionId?: string; // For trial players without wallet
}

export class PayoutSystem {
  private static readonly PAYOUT_PERCENTAGES: PayoutDistribution = {
    first: 0.50,
    second: 0.30,
    third: 0.15,
    participation: 0.05,
  };

  /**
   * Process entry fee payment when player joins battle (for paid players)
   */
  static async processEntryFee(): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      console.log(`💰 Processing 1 USDC entry fee payment...`);
      
      const transaction = TriviaContract.createJoinBattleTransaction();
      
      // Note: In a real implementation, you would use useSendTransaction hook
      // This is a simplified version for demonstration
      console.log('✅ Entry fee transaction prepared:', transaction);
      
      return {
        success: true,
        transactionHash: 'mock-transaction-hash',
      };
    } catch (error) {
      console.error('❌ Entry fee payment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Process trial player entry (no fee required)
   */
  static async processTrialEntry(sessionId: string): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      console.log(`🎮 Processing trial player entry for session: ${sessionId}`);
      
      const transaction = TriviaContract.createJoinTrialBattleTransaction(sessionId);
      
      console.log('✅ Trial entry transaction prepared:', transaction);
      
      return {
        success: true,
        transactionHash: 'mock-trial-transaction-hash',
      };
    } catch (error) {
      console.error('❌ Trial entry failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Trial entry failed',
      };
    }
  }

  /**
   * Submit game score to blockchain
   */
  static async submitGameScore(
    gameId: string,
    finalScore: number,
    answers: Array<{
      questionId: string;
      selectedAnswer: number;
      isCorrect: boolean;
    }>,
    isTrialPlayer: boolean = false,
    sessionId?: string
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    error?: string;
  }> {
    try {
      console.log(`📊 Submitting game score: ${finalScore} (Trial: ${isTrialPlayer})`);

      // Create answer hashes for commitment
      const answerHashes = answers.map(answer =>
        TriviaContract.hashAnswer(
          answer.questionId,
          answer.selectedAnswer,
          Date.now().toString()
        )
      );

      const transaction = TriviaContract.createSubmitScoreTransaction(
        gameId,
        finalScore,
        answerHashes
      );

      console.log('✅ Score transaction prepared:', transaction);
      
      return {
        success: true,
        transactionHash: 'mock-transaction-hash',
      };
    } catch (error) {
      console.error('❌ Score submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Score submission failed',
      };
    }
  }

  /**
   * Calculate payout amounts based on prize pool
   */
  static calculatePayouts(totalPrizePool: number): {
    first: number;
    second: number;
    third: number;
    participation: number;
  } {
    return {
      first: totalPrizePool * this.PAYOUT_PERCENTAGES.first,
      second: totalPrizePool * this.PAYOUT_PERCENTAGES.second,
      third: totalPrizePool * this.PAYOUT_PERCENTAGES.third,
      participation: totalPrizePool * this.PAYOUT_PERCENTAGES.participation,
    };
  }

  /**
   * Distribute prizes to winners (called by game admin)
   * Trial players and paid players compete equally for prizes
   */
  static async distributePrizes(
    gameId: string,
    results: GameResult[]
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    payouts: Array<{
      address: string;
      amount: number;
      rank: number;
      isTrialPlayer: boolean;
      sessionId?: string;
    }>;
    error?: string;
  }> {
    try {
      console.log(`🏆 Distributing prizes for game ${gameId}`);

      // Sort results by score (highest first) - trial and paid players compete equally
      const sortedResults = [...results].sort((a, b) => b.finalScore - a.finalScore);

      const prizePool = await TriviaContract.getPrizePool();
      const totalPrizeUsdc = TriviaContract.usdcWeiToUsdc(prizePool);
      const payouts = this.calculatePayouts(totalPrizeUsdc);

      const prizeDistribution = sortedResults.map((result, index) => {
        let amount = 0;
        
        if (index === 0) amount = payouts.first;           // 1st place
        else if (index === 1) amount = payouts.second;     // 2nd place  
        else if (index === 2) amount = payouts.third;      // 3rd place
        else amount = payouts.participation / Math.max(sortedResults.length - 3, 1); // Participation split
        
        return {
          address: result.playerAddress,
          amount,
          rank: index + 1,
          isTrialPlayer: result.isTrialPlayer,
          sessionId: result.sessionId,
        };
      });

      // Execute smart contract prize distribution
      const transaction = TriviaContract.createDistributePrizesTransaction(gameId);
      
      console.log('✅ Prize distribution transaction prepared:', transaction);
      console.log('💸 Prize breakdown:', prizeDistribution);
      console.log('🎮 Trial players in top ranks:', prizeDistribution.filter(p => p.isTrialPlayer).length);

      // Sync winnings to SpaceTimeDB for leaderboard tracking
      try {
        await spacetimeClient.initialize();
        for (const payout of prizeDistribution) {
          // Only record prizes for paid players with actual winnings
          if (payout.amount > 0 && !payout.isTrialPlayer) {
            await spacetimeClient.recordPrizeDistribution(
              payout.address,
              payout.sessionId || gameId,
              payout.amount,
              payout.rank
            );
          }
        }
        console.log('✅ Prize distribution synced to SpaceTimeDB');
      } catch (syncError) {
        console.error('⚠️ Failed to sync prize distribution to SpaceTimeDB:', syncError);
        // Don't fail the entire distribution if sync fails
      }

      return {
        success: true,
        transactionHash: 'mock-transaction-hash',
        payouts: prizeDistribution,
      };
    } catch (error) {
      console.error('❌ Prize distribution failed:', error);
      return {
        success: false,
        payouts: [],
        error: error instanceof Error ? error.message : 'Prize distribution failed',
      };
    }
  }

  /**
   * Get real-time prize pool information
   */
  static async getPrizePoolInfo(): Promise<{
    totalAmount: number;
    entryFee: number;
    participants: number;
    trialParticipants: number;
    distribution: {
      first: number;
      second: number;
      third: number;
      participation: number;
    };
  }> {
    try {
      // Check if contract is deployed first
      const isDeployed = await TriviaContract.isContractDeployed();
      
      if (!isDeployed) {
        console.warn('Smart contract not deployed, using demo mode with mock data');
        return {
          totalAmount: 1.0, // 1 USDC
          entryFee: 1.0, // 1 USDC
          participants: 1,
          trialParticipants: 0,
          distribution: {
            first: 0.5, // 0.5 USDC
            second: 0.3, // 0.3 USDC
            third: 0.15, // 0.15 USDC
            participation: 0.05, // 0.05 USDC
          },
        };
      }

      const prizePool = await TriviaContract.getPrizePool();
      const playerCount = await TriviaContract.getPlayerCount();
      const trialPlayerCount = await TriviaContract.getTrialPlayerCount();
      
      const totalAmount = TriviaContract.usdcWeiToUsdc(prizePool);
      const entryFee = TriviaContract.usdcWeiToUsdc(BigInt(ENTRY_FEE_USDC));
      
      const distribution = this.calculatePayouts(totalAmount);

      return {
        totalAmount,
        entryFee,
        participants: playerCount,
        trialParticipants: trialPlayerCount,
        distribution,
      };
    } catch (error) {
      console.error('Error fetching prize pool info:', error);
      // Fallback to mock data for development
      return {
        totalAmount: 1.0, // 1 USDC
        entryFee: 1.0, // 1 USDC
        participants: 1,
        trialParticipants: 0,
        distribution: {
          first: 0.5, // 0.5 USDC
          second: 0.3, // 0.3 USDC
          third: 0.15, // 0.15 USDC
          participation: 0.05, // 0.05 USDC
        },
      };
    }
  }

  /**
   * Estimate gas costs for transactions
   */
  static async estimateGasCosts(): Promise<{
    joinBattle: string;
    joinTrialBattle: string;
    submitScore: string;
    distributePrizes: string;
  }> {
    // Rough estimates for Base Sepolia (very cheap)
    return {
      joinBattle: '0.0001 ETH',    // ~$0.0002 (gas for USDC transfer)
      joinTrialBattle: '0.00005 ETH', // ~$0.0001 (cheaper for trial players)
      submitScore: '0.0002 ETH',   // ~$0.0004
      distributePrizes: '0.0005 ETH', // ~$0.001
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: 'USDC' | 'USD' = 'USDC'): string {
    if (currency === 'USDC') {
      return `${amount.toFixed(2)} USDC`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Check if player can afford entry fee (mock implementation)
   */
  static async canAffordEntry(): Promise<boolean> {
    try {
      // In a real implementation, you would check the user's USDC balance
      // For now, return true for demo purposes
      return true;
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }
}