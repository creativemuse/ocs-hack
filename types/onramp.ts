/**
 * TypeScript types for Coinbase Onramp One-Click-Buy integration
 */

export interface BuyQuoteRequest {
  walletAddress: string;
  purchaseCurrency: string;
  purchaseNetwork: string;
  paymentAmount: string;
  paymentCurrency: string;
  paymentMethod: string;
  country: string;
  subdivision?: string;
}

export interface MoneyAmount {
  amount: string;
  currency: string;
}

export interface BuyQuoteResponse {
  onrampUrl: string;
  quoteId: string;
  purchaseAmount: MoneyAmount;
  paymentTotal: MoneyAmount;
  paymentSubtotal?: MoneyAmount;
  coinbaseFee?: MoneyAmount;
  networkFee?: MoneyAmount;
}

export interface OneClickBuyOptions {
  paymentAmount?: string;
  paymentCurrency?: string;
  purchaseCurrency?: string;
  purchaseNetwork?: string;
  paymentMethod?: string;
  country?: string;
  subdivision?: string;
}

export interface OneClickBuyResult {
  url: string;
  quoteId: string;
  quote?: BuyQuoteResponse;
}

