import { useState, useMemo } from 'react';
import { Search, TrendingUp, TrendingDown, Star, StarOff, ExternalLink, LayoutGrid } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { SymbolSearch } from './SymbolSearch';
import { searchTradingViewSymbols, getTypeColor, type TradingViewSymbol } from '../lib/tradingviewApi';
import { cn } from '../utils/cn';
import { TradingViewWidget } from './TradingViewWidget';

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = 'tradezella_watchlist';

const DEFAULT_LAYOUTS = {
  lg: [
    { i: '5m', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: '15m', x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: '1h', x: 8, y: 0, w: 4, h: 4, minW: 2, minH: 3 }
  ],
  md: [
    { i: '5m', x: 0, y: 0, w: 5, h: 4, minW: 2, minH: 3 },
    { i: '15m', x: 5, y: 0, w: 5, h: 4, minW: 2, minH: 3 },
    { i: '1h', x: 0, y: 4, w: 10, h: 4, minW: 2, minH: 3 }
  ],
  sm: [
    { i: '5m', x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 3 },
    { i: '15m', x: 0, y: 4, w: 6, h: 4, minW: 2, minH: 3 },
    { i: '1h', x: 0, y: 8, w: 6, h: 4, minW: 2, minH: 3 }
  ]
};

export function SymbolExplorer() {
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [symbolDetails, setSymbolDetails] = useState<TradingViewSymbol | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : ['EURUSD', 'GBPJPY', 'XAUUSD', 'BTCUSD'];
  });
  
  // Grid layout state
  const [layouts, setLayouts] = useState(DEFAULT_LAYOUTS);

  const handleSymbolChange = async (symbol: string) => {
    setSelectedSymbol(symbol);
    
    if (symbol.length >= 1) {
      setLoading(true);
      try {
        const results = await searchTradingViewSymbols(symbol);
        if (results.length > 0) {
          setSymbolDetails(results[0]);
        } else {
          setSymbolDetails(null);
        }
      } catch {
        setSymbolDetails(null);
      } finally {
        setLoading(false);
      }
    } else {
      setSymbolDetails(null);
    }
  };

  const toggleWatchlist = (symbol: string) => {
    const newWatchlist = watchlist.includes(symbol)
      ? watchlist.filter((s) => s !== symbol)
      : [...watchlist, symbol];
    
    setWatchlist(newWatchlist);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWatchlist));
  };

  const isInWatchlist = (symbol: string) => watchlist.includes(symbol);

  const openOnTradingView = (symbol: TradingViewSymbol) => {
    const url = `https://www.tradingview.com/chart/?symbol=${symbol.fullName}`;
    window.open(url, '_blank');
  };

  const handleLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Symbol Explorer</h1>
        <p className="text-slate-500">Search and explore trading symbols from TradingView</p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-emerald-500" />
          Search Symbols
        </h2>
        
        <SymbolSearch
          value={selectedSymbol}
          onChange={handleSymbolChange}
          placeholder="Search for stocks, forex, crypto, futures..."
        />
        
        {/* Symbol Details */}
        {loading && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        )}
        
        {symbolDetails && !loading && (
          <div className="mt-4">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50 rounded-lg border border-emerald-100 mb-6">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center overflow-hidden border border-slate-100">
                  {symbolDetails.logo ? (
                    <img
                      src={symbolDetails.logo}
                      alt={symbolDetails.symbol}
                      className="w-8 h-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">
                      {symbolDetails.symbol.charAt(0)}
                    </span>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-slate-900">{symbolDetails.symbol}</h3>
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded',
                      getTypeColor(symbolDetails.type)
                    )}>
                      {symbolDetails.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{symbolDetails.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">{symbolDetails.exchange}</span>
                    {symbolDetails.currency && (
                      <span className="text-xs text-slate-400">Currency: {symbolDetails.currency}</span>
                    )}
                    <span className="text-xs font-mono text-slate-400">{symbolDetails.fullName}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleWatchlist(symbolDetails.symbol)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isInWatchlist(symbolDetails.symbol)
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    )}
                  >
                    {isInWatchlist(symbolDetails.symbol) ? (
                      <>
                        <Star className="w-4 h-4 fill-current" />
                        In Watchlist
                      </>
                    ) : (
                      <>
                        <StarOff className="w-4 h-4" />
                        Add to Watchlist
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => openOnTradingView(symbolDetails)}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in TV
                  </button>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-emerald-500" />
                    Chart Analysis
                  </h3>
                  <p className="text-sm text-slate-500">Drag to reorder • Resize from bottom-right</p>
                </div>
                
                <div className="bg-slate-100 rounded-xl p-2 min-h-[600px] border border-slate-200">
                  <ResponsiveGridLayout
                    className="layout"
                    layouts={layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={100}
                    onLayoutChange={handleLayoutChange}
                    draggableHandle=".drag-handle"
                  >
                    <div key="5m" className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                      <div className="drag-handle bg-slate-50 border-b border-slate-100 p-2 flex items-center justify-between cursor-move hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-semibold text-slate-600">5 Minutes</span>
                        <LayoutGrid className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="flex-1 relative">
                        <TradingViewWidget 
                          symbol={symbolDetails.symbol} 
                          interval="5" 
                          containerId={`tv-widget-5m-${symbolDetails.symbol}`}
                        />
                      </div>
                    </div>
                    <div key="15m" className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                      <div className="drag-handle bg-slate-50 border-b border-slate-100 p-2 flex items-center justify-between cursor-move hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-semibold text-slate-600">15 Minutes</span>
                        <LayoutGrid className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="flex-1 relative">
                        <TradingViewWidget 
                          symbol={symbolDetails.symbol} 
                          interval="15" 
                          containerId={`tv-widget-15m-${symbolDetails.symbol}`}
                        />
                      </div>
                    </div>
                    <div key="1h" className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                      <div className="drag-handle bg-slate-50 border-b border-slate-100 p-2 flex items-center justify-between cursor-move hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-semibold text-slate-600">1 Hour</span>
                        <LayoutGrid className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="flex-1 relative">
                        <TradingViewWidget 
                          symbol={symbolDetails.symbol} 
                          interval="60" 
                          containerId={`tv-widget-1h-${symbolDetails.symbol}`}
                        />
                      </div>
                    </div>
                  </ResponsiveGridLayout>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Watchlist */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Watchlist
          </h2>
          <span className="text-sm text-slate-500">{watchlist.length} symbols</span>
        </div>

        {watchlist.length === 0 ? (
          <p className="text-center text-slate-400 py-8">
            Your watchlist is empty. Search and add symbols above.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {watchlist.map((symbol) => (
              <WatchlistItem
                key={symbol}
                symbol={symbol}
                onRemove={() => toggleWatchlist(symbol)}
                onSelect={() => handleSymbolChange(symbol)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popular Symbols */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Popular Symbols
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PopularCategory
            title="Forex Majors"
            symbols={['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD']}
            onSelect={handleSymbolChange}
          />
          <PopularCategory
            title="Forex Crosses"
            symbols={['GBPJPY', 'EURJPY', 'EURGBP', 'AUDNZD', 'CADJPY', 'CHFJPY']}
            onSelect={handleSymbolChange}
          />
          <PopularCategory
            title="Commodities"
            symbols={['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS', 'COPPER']}
            onSelect={handleSymbolChange}
          />
          <PopularCategory
            title="Crypto"
            symbols={['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOTUSD']}
            onSelect={handleSymbolChange}
          />
          <PopularCategory
            title="US Indices"
            symbols={['SPX', 'NDX', 'DJI', 'VIX', 'RUT', 'SOX']}
            onSelect={handleSymbolChange}
          />
          <PopularCategory
            title="Top Stocks"
            symbols={['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA']}
            onSelect={handleSymbolChange}
          />
        </div>
      </div>
    </div>
  );
}

interface WatchlistItemProps {
  symbol: string;
  onRemove: () => void;
  onSelect: () => void;
}

function WatchlistItem({ symbol, onRemove, onSelect }: WatchlistItemProps) {
  return (
    <div className="group relative bg-slate-50 hover:bg-emerald-50 rounded-lg p-3 cursor-pointer transition-colors border border-slate-100 hover:border-emerald-200">
      <button onClick={onSelect} className="w-full text-left">
        <span className="font-semibold text-slate-900">{symbol}</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
      >
        <TrendingDown className="w-3 h-3 text-red-500" />
      </button>
    </div>
  );
}

interface PopularCategoryProps {
  title: string;
  symbols: string[];
  onSelect: (symbol: string) => void;
}

function PopularCategory({ title, symbols, onSelect }: PopularCategoryProps) {
  return (
    <div className="bg-slate-50 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => onSelect(symbol)}
            className="px-2 py-1 bg-white text-slate-700 text-sm rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
