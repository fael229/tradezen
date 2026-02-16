// Currency formatting utilities

export const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF ',
    CAD: 'CA$',
    AUD: 'A$',
    NZD: 'NZ$',
    USDC: 'USDC ',
    USDT: 'USDT ',
    BTC: '₿',
    ETH: 'Ξ',
};

export function formatCurrency(value: number, currency: string = 'USD'): string {
    const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency + ' ';
    const absValue = Math.abs(value);

    let formatted: string;

    // For JPY and similar currencies with no decimals
    if (currency === 'JPY') {
        formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(absValue);
    }
    // For crypto with more decimals
    else if (['BTC', 'ETH'].includes(currency.toUpperCase())) {
        formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6
        }).format(absValue);
    }
    // Default for most fiat currencies
    else {
        formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(absValue);
    }

    const sign = value < 0 ? '-' : '';

    // For currencies with symbol at the end
    if (['CHF', 'USDC', 'USDT'].includes(currency.toUpperCase())) {
        return `${sign}${formatted} ${currency}`;
    }

    return `${sign}${symbol}${formatted}`;
}

export function getCurrencySymbol(currency: string = 'USD'): string {
    return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}
