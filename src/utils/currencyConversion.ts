// Currency conversion utilities

export interface ExchangeRates {
    [key: string]: number; // Rate to USD
}

// Default fallback rates
export let currentExchangeRates: ExchangeRates = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.27,
    JPY: 150.0, // Updated approx
    CHF: 0.88,
    CAD: 1.35,
    AUD: 1.53,
    NZD: 1.65,
    USDC: 1,
    USDT: 1,
    BTC: 65000, // Approximate
    ETH: 3500,  // Approximate
    USC: 0.01,  // US Cents (Fixed)
};

const CACHE_KEY = 'tradezen_exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchExchangeRates(): Promise<void> {
    try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { rates, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                console.log('Using cached exchange rates');
                currentExchangeRates = { ...currentExchangeRates, ...rates };
                // Ensure USC is set correctly as it won't be in the API
                currentExchangeRates.USC = 0.01;
                return;
            }
        }

        console.log('Fetching live exchange rates...');
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');

        if (!response.ok) {
            throw new Error('Failed to fetch rates');
        }

        const data = await response.json();

        // Update rates
        // Frankfurter returns rates relative to base (USD). 
        // Example: "EUR": 0.92 means 1 USD = 0.92 EUR.
        // Our system expects: To convert FROM EUR to USD, we divide by rate?
        // Wait, convertCurrency logic: amountInUSD = amount / fromRate.
        // If fromCurrency is EUR (rate 0.92), 1 EUR / 0.92 = 1.08 USD. Correct.

        currentExchangeRates = {
            ...currentExchangeRates,
            ...data.rates,
            USD: 1,
            USC: 0.01, // Always fixed
            USDC: 1,   // Assumed pegged
            USDT: 1    // Assumed pegged
        };

        // Cache the new rates
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            rates: currentExchangeRates,
            timestamp: Date.now()
        }));

        console.log('Exchange rates updated successfully');
        window.dispatchEvent(new Event('settings-changed'));

    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        // Fallback is already loaded in currentExchangeRates
    }
}

export function convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates = currentExchangeRates
): number {
    if (fromCurrency === toCurrency) return amount;
    if (!amount) return 0;

    const fromRate = rates[fromCurrency.toUpperCase()] || 1;
    const toRate = rates[toCurrency.toUpperCase()] || 1;

    // Convert to USD first
    // If rate is "how many units of currency per 1 USD"
    // Amount / Rate = Value in USD
    const amountInUSD = amount / fromRate;

    // Convert to target currency
    // Value in USD * Rate = Amount in Target
    const convertedAmount = amountInUSD * toRate;

    return convertedAmount;
}

export function getConversionRate(
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates = currentExchangeRates
): number {
    if (fromCurrency === toCurrency) return 1;

    const fromRate = rates[fromCurrency.toUpperCase()] || 1;
    const toRate = rates[toCurrency.toUpperCase()] || 1;

    return toRate / fromRate;
}

// Get user's preferred display currency from localStorage
export function getPreferredCurrency(): string {
    return localStorage.getItem('currency') || 'USD';
}

// Set user's preferred display currency
export function setPreferredCurrency(currency: string): void {
    localStorage.setItem('currency', currency.toUpperCase());
    window.dispatchEvent(new Event('settings-changed'));
}
