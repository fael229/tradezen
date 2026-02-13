// TradingView Symbol Search API
export interface TradingViewSymbol {
  symbol: string;
  description: string;
  type: string;
  exchange: string;
  currency: string;
  provider_id?: string;
  source?: string;
  fullName: string;
  logo?: string;
}

export interface SearchResult {
  symbols: TradingViewSymbol[];
  loading: boolean;
  error: string | null;
}

// Mapping des types d'actifs
const ASSET_TYPE_MAP: Record<string, string> = {
  stock: 'Stock',
  futures: 'Futures',
  forex: 'Forex',
  cfd: 'CFD',
  crypto: 'Crypto',
  index: 'Index',
  bond: 'Bond',
  economic: 'Economic',
  fund: 'Fund',
};

// API de recherche TradingView (via leur endpoint public)
export async function searchTradingViewSymbols(
  query: string,
  type?: string
): Promise<TradingViewSymbol[]> {
  if (!query || query.length < 1) {
    return [];
  }

  try {
    // Utilisation de l'API publique de TradingView pour la recherche de symboles
    const params = new URLSearchParams({
      text: query,
      hl: 'true',
      exchange: '',
      lang: 'en',
      type: type || '',
      domain: 'production',
    });

    const response = await fetch(
      `https://symbol-search.tradingview.com/symbol_search/v3/?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Parser les résultats
    const symbols: TradingViewSymbol[] = (data.symbols || []).slice(0, 20).map((item: {
      symbol: string;
      description: string;
      type: string;
      exchange: string;
      currency_code: string;
      provider_id?: string;
      source?: string;
      logoid?: string;
    }) => ({
      symbol: item.symbol,
      description: item.description || '',
      type: ASSET_TYPE_MAP[item.type] || item.type,
      exchange: item.exchange,
      currency: item.currency_code || '',
      provider_id: item.provider_id,
      source: item.source,
      fullName: `${item.exchange}:${item.symbol}`,
      logo: item.logoid ? `https://s3-symbol-logo.tradingview.com/${item.logoid}.svg` : undefined,
    }));

    return symbols;
  } catch (error) {
    console.error('Error searching TradingView symbols:', error);
    
    // Fallback: recherche locale basique si l'API échoue
    return getLocalSymbolSuggestions(query);
  }
}

// Suggestions locales de symboles populaires (fallback)
const POPULAR_SYMBOLS = [
  { symbol: 'EURUSD', description: 'Euro / US Dollar', type: 'Forex', exchange: 'FX', currency: 'USD', fullName: 'FX:EURUSD' },
  { symbol: 'GBPUSD', description: 'British Pound / US Dollar', type: 'Forex', exchange: 'FX', currency: 'USD', fullName: 'FX:GBPUSD' },
  { symbol: 'USDJPY', description: 'US Dollar / Japanese Yen', type: 'Forex', exchange: 'FX', currency: 'JPY', fullName: 'FX:USDJPY' },
  { symbol: 'GBPJPY', description: 'British Pound / Japanese Yen', type: 'Forex', exchange: 'FX', currency: 'JPY', fullName: 'FX:GBPJPY' },
  { symbol: 'EURJPY', description: 'Euro / Japanese Yen', type: 'Forex', exchange: 'FX', currency: 'JPY', fullName: 'FX:EURJPY' },
  { symbol: 'AUDUSD', description: 'Australian Dollar / US Dollar', type: 'Forex', exchange: 'FX', currency: 'USD', fullName: 'FX:AUDUSD' },
  { symbol: 'USDCAD', description: 'US Dollar / Canadian Dollar', type: 'Forex', exchange: 'FX', currency: 'CAD', fullName: 'FX:USDCAD' },
  { symbol: 'USDCHF', description: 'US Dollar / Swiss Franc', type: 'Forex', exchange: 'FX', currency: 'CHF', fullName: 'FX:USDCHF' },
  { symbol: 'NZDUSD', description: 'New Zealand Dollar / US Dollar', type: 'Forex', exchange: 'FX', currency: 'USD', fullName: 'FX:NZDUSD' },
  { symbol: 'EURGBP', description: 'Euro / British Pound', type: 'Forex', exchange: 'FX', currency: 'GBP', fullName: 'FX:EURGBP' },
  { symbol: 'XAUUSD', description: 'Gold / US Dollar', type: 'CFD', exchange: 'OANDA', currency: 'USD', fullName: 'OANDA:XAUUSD' },
  { symbol: 'XAGUSD', description: 'Silver / US Dollar', type: 'CFD', exchange: 'OANDA', currency: 'USD', fullName: 'OANDA:XAGUSD' },
  { symbol: 'BTCUSD', description: 'Bitcoin / US Dollar', type: 'Crypto', exchange: 'BINANCE', currency: 'USD', fullName: 'BINANCE:BTCUSD' },
  { symbol: 'ETHUSD', description: 'Ethereum / US Dollar', type: 'Crypto', exchange: 'BINANCE', currency: 'USD', fullName: 'BINANCE:ETHUSD' },
  { symbol: 'AAPL', description: 'Apple Inc.', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:AAPL' },
  { symbol: 'GOOGL', description: 'Alphabet Inc.', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:GOOGL' },
  { symbol: 'MSFT', description: 'Microsoft Corporation', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:MSFT' },
  { symbol: 'AMZN', description: 'Amazon.com Inc.', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:AMZN' },
  { symbol: 'TSLA', description: 'Tesla Inc.', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:TSLA' },
  { symbol: 'META', description: 'Meta Platforms Inc.', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:META' },
  { symbol: 'NVDA', description: 'NVIDIA Corporation', type: 'Stock', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:NVDA' },
  { symbol: 'SPY', description: 'SPDR S&P 500 ETF', type: 'Fund', exchange: 'AMEX', currency: 'USD', fullName: 'AMEX:SPY' },
  { symbol: 'QQQ', description: 'Invesco QQQ Trust', type: 'Fund', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:QQQ' },
  { symbol: 'ES1!', description: 'E-mini S&P 500 Futures', type: 'Futures', exchange: 'CME', currency: 'USD', fullName: 'CME:ES1!' },
  { symbol: 'NQ1!', description: 'E-mini Nasdaq 100 Futures', type: 'Futures', exchange: 'CME', currency: 'USD', fullName: 'CME:NQ1!' },
  { symbol: 'GC1!', description: 'Gold Futures', type: 'Futures', exchange: 'COMEX', currency: 'USD', fullName: 'COMEX:GC1!' },
  { symbol: 'CL1!', description: 'Crude Oil Futures', type: 'Futures', exchange: 'NYMEX', currency: 'USD', fullName: 'NYMEX:CL1!' },
  { symbol: 'US30', description: 'Dow Jones Industrial Average', type: 'Index', exchange: 'DJ', currency: 'USD', fullName: 'DJ:DJI' },
  { symbol: 'SPX', description: 'S&P 500 Index', type: 'Index', exchange: 'SP', currency: 'USD', fullName: 'SP:SPX' },
  { symbol: 'NDX', description: 'Nasdaq 100 Index', type: 'Index', exchange: 'NASDAQ', currency: 'USD', fullName: 'NASDAQ:NDX' },
];

function getLocalSymbolSuggestions(query: string): TradingViewSymbol[] {
  const searchLower = query.toLowerCase();
  return POPULAR_SYMBOLS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchLower) ||
      s.description.toLowerCase().includes(searchLower)
  );
}

// Types de symboles disponibles pour le filtre
export const SYMBOL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'stock', label: 'Stocks' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'futures', label: 'Futures' },
  { value: 'index', label: 'Indices' },
  { value: 'cfd', label: 'CFD' },
  { value: 'fund', label: 'ETF/Funds' },
];

// Obtenir le type de couleur basé sur le type d'actif
export function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'forex':
      return 'bg-blue-100 text-blue-700';
    case 'crypto':
      return 'bg-purple-100 text-purple-700';
    case 'stock':
      return 'bg-emerald-100 text-emerald-700';
    case 'futures':
      return 'bg-amber-100 text-amber-700';
    case 'index':
      return 'bg-cyan-100 text-cyan-700';
    case 'cfd':
      return 'bg-orange-100 text-orange-700';
    case 'fund':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
