import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import { searchTradingViewSymbols, getTypeColor, SYMBOL_TYPES, type TradingViewSymbol } from '../lib/tradingviewApi';
import { cn } from '../utils/cn';

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SymbolSearch({
  value,
  onChange,
  placeholder = 'Search symbol...',
  className,
  disabled = false,
}: SymbolSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TradingViewSymbol[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Search with debounce
  const performSearch = useCallback(async (searchQuery: string, type: string) => {
    if (searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const symbols = await searchTradingViewSymbols(searchQuery, type);
      setResults(symbols);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query, selectedType);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, selectedType, performSearch]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelect = (symbol: TradingViewSymbol) => {
    // Utiliser seulement le symbole sans l'exchange pour simplifier
    const selectedSymbol = symbol.symbol;
    setQuery(selectedSymbol);
    onChange(selectedSymbol);
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all',
            disabled && 'bg-slate-50 cursor-not-allowed',
            className
          )}
        />
        {query && !disabled && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (query.length >= 1 || results.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
          style={{ maxHeight: '400px' }}
        >
          {/* Type Filter */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="flex flex-wrap gap-1">
              {SYMBOL_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full transition-colors',
                    selectedType === type.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {loading && results.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Searching symbols...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">
                  {query.length < 1
                    ? 'Type to search symbols'
                    : 'No symbols found'}
                </p>
              </div>
            ) : (
              <ul>
                {results.map((symbol, index) => (
                  <li
                    key={`${symbol.fullName}-${index}`}
                    onClick={() => handleSelect(symbol)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0',
                      selectedIndex === index ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Logo or Icon */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {symbol.logo ? (
                          <img
                            src={symbol.logo}
                            alt={symbol.symbol}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <SymbolIcon type={symbol.type} />
                        )}
                      </div>

                      {/* Symbol Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {symbol.symbol}
                          </span>
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] font-medium rounded',
                            getTypeColor(symbol.type)
                          )}>
                            {symbol.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {symbol.description}
                        </p>
                        <p className="text-xs text-slate-400">
                          {symbol.exchange} {symbol.currency && `• ${symbol.currency}`}
                        </p>
                      </div>

                      {/* Full Name */}
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs text-slate-400 font-mono">
                          {symbol.fullName}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Enter</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">Esc</kbd>
                Close
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SymbolIcon({ type }: { type: string }) {
  switch (type.toLowerCase()) {
    case 'forex':
      return <span className="text-lg">💱</span>;
    case 'crypto':
      return <span className="text-lg">₿</span>;
    case 'stock':
      return <Building2 className="w-5 h-5 text-slate-400" />;
    case 'futures':
      return <TrendingUp className="w-5 h-5 text-slate-400" />;
    case 'index':
      return <span className="text-lg">📊</span>;
    case 'cfd':
      return <TrendingDown className="w-5 h-5 text-slate-400" />;
    case 'fund':
      return <span className="text-lg">📈</span>;
    default:
      return <Search className="w-5 h-5 text-slate-400" />;
  }
}

// Mini version pour les formulaires compacts
interface SymbolSearchMiniProps {
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SymbolSearchMini({
  value,
  onChange,
  className,
  disabled = false,
}: SymbolSearchMiniProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<TradingViewSymbol[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 1) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const symbols = await searchTradingViewSymbols(query);
        setResults(symbols.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelect = (symbol: TradingViewSymbol) => {
    setQuery(symbol.symbol);
    onChange(symbol.symbol);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="e.g., EURUSD"
        disabled={disabled}
        className={cn(
          'w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500',
          disabled && 'bg-slate-50',
          className
        )}
      />

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden"
        >
          <ul className="max-h-48 overflow-y-auto">
            {results.map((symbol, index) => (
              <li
                key={`${symbol.fullName}-${index}`}
                onClick={() => handleSelect(symbol)}
                className="px-3 py-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{symbol.symbol}</span>
                    <span className="text-xs text-slate-400 ml-2">{symbol.exchange}</span>
                  </div>
                  <span className={cn(
                    'px-1.5 py-0.5 text-[10px] font-medium rounded',
                    getTypeColor(symbol.type)
                  )}>
                    {symbol.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{symbol.description}</p>
              </li>
            ))}
          </ul>
          {loading && (
            <div className="px-3 py-2 text-center border-t border-slate-100">
              <Loader2 className="w-4 h-4 animate-spin inline-block text-emerald-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
