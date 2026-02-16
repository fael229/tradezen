// Currency conversion utilities

export interface ExchangeRates {
    [key: string]: number; // Rate to USD
}

// Exchange rates (to USD as base)
// These should ideally be fetched from an API like exchangerate-api.io
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    JPY: 0.0067,
    CHF: 1.13,
    CAD: 0.74,
    AUD: 0.65,
    NZD: 0.60,
    USDC: 1,
    USDT: 1,
    BTC: 50000, // Approximate
    ETH: 3000,  // Approximate
    USC: 0.01,  // US Cents (100 USC = 1 USD)
};

export function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = rates[fromCurrency.toUpperCase()] || 1;
    const toRate = rates[toCurrency.toUpperCase()] || 1;

    // Convert to USD first, then to target currency
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;

    return convertedAmount;
}

export function getConversionRate(
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates = DEFAULT_EXCHANGE_RATES
): number {
    if (fromCurrency === toCurrency) return 1;

    const fromRate = rates[fromCurrency.toUpperCase()] || 1;
    const toRate = rates[toCurrency.toUpperCase()] || 1;

    return toRate / fromRate;
}

// Get user's preferred display currency from localStorage
export function getPreferredCurrency(): string {
    return localStorage.getItem('preferred_currency') || 'USD';
}

// Set user's preferred display currency
export function setPreferredCurrency(currency: string): void {
    localStorage.setItem('preferred_currency', currency.toUpperCase());
}
