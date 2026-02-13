import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trade } from '../types/trade';
import { TrendingUp, TrendingDown, ExternalLink, GripVertical, Minimize2, Maximize2 } from 'lucide-react';

interface TradingViewChartProps {
  trade: Trade;
}

declare global {
  interface Window {
    TradingView: any;
    tvWidget: any;
  }
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ trade }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setChartReady] = useState(false);
  const chartId = useRef(`tv_chart_${trade.id}_${Date.now()}`);
  
  // Draggable position tool state
  const [position, setPosition] = useState({ x: -1, y: 20 }); // -1 means right aligned
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const positionToolRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle mouse down on position tool header
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!positionToolRef.current) return;
    
    const rect = positionToolRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    e.preventDefault();
  }, []);
  
  // Handle mouse move
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!chartContainerRef.current || !positionToolRef.current) return;
      
      const containerRect = chartContainerRef.current.getBoundingClientRect();
      const toolWidth = positionToolRef.current.offsetWidth;
      const toolHeight = positionToolRef.current.offsetHeight;
      
      let newX = e.clientX - containerRect.left - dragOffset.x;
      let newY = e.clientY - containerRect.top - dragOffset.y;
      
      // Constrain to container bounds
      newX = Math.max(0, Math.min(newX, containerRect.width - toolWidth));
      newY = Math.max(0, Math.min(newY, containerRect.height - toolHeight));
      
      setPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);
  
  // Get position style
  const getPositionStyle = (): React.CSSProperties => {
    if (position.x === -1) {
      return { top: `${position.y}px`, right: '12px' };
    }
    return { top: `${position.y}px`, left: `${position.x}px` };
  };

  // Convert symbol to TradingView format
  const getTradingViewSymbol = (symbol: string): string => {
    let tvSymbol = symbol.replace('OANDA:', '');
    
    const symbolMappings: Record<string, string> = {
      'XAUUSD': 'OANDA:XAUUSD',
      'XAGUSD': 'OANDA:XAGUSD',
      'GBPJPY': 'OANDA:GBPJPY',
      'EURUSD': 'OANDA:EURUSD',
      'GBPUSD': 'OANDA:GBPUSD',
      'USDJPY': 'OANDA:USDJPY',
      'CADJPY': 'OANDA:CADJPY',
      'EURJPY': 'OANDA:EURJPY',
      'AUDUSD': 'OANDA:AUDUSD',
      'NZDUSD': 'OANDA:NZDUSD',
      'USDCAD': 'OANDA:USDCAD',
      'USDCHF': 'OANDA:USDCHF',
    };

    return symbolMappings[tvSymbol] || `OANDA:${tvSymbol}`;
  };

  // Calculate pips
  const calculatePips = (price1: number, price2: number, symbol: string): number => {
    const diff = Math.abs(price1 - price2);
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.includes('JPY')) return diff * 100;
    if (upperSymbol.includes('XAU')) return diff * 10;
    if (upperSymbol.includes('XAG')) return diff * 100;
    return diff * 10000;
  };

  const isLong = trade.direction === 'long';
  const pnl = trade.pnl || 0;
  const slPips = trade.stopLoss ? calculatePips(trade.entryPrice, trade.stopLoss, trade.symbol) : 0;
  const tpPips = trade.takeProfit ? calculatePips(trade.entryPrice, trade.takeProfit, trade.symbol) : 0;
  const rrRatio = slPips > 0 ? tpPips / slPips : 0;
  const decimals = trade.symbol.includes('JPY') ? 3 : trade.symbol.includes('XAU') ? 2 : 5;

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous chart
    const container = containerRef.current;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    
    script.onload = () => {
      if (window.TradingView && containerRef.current) {
        new window.TradingView.widget({
          autosize: true,
          symbol: getTradingViewSymbol(trade.symbol),
          interval: '5',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#0f0f1a',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: chartId.current,
          hide_side_toolbar: false,
          studies: [],
          show_popup_button: true,
          popup_width: '1200',
          popup_height: '800',
          save_image: true,
          hide_volume: true,
          backgroundColor: 'rgba(15, 15, 26, 1)',
          gridColor: 'rgba(255, 255, 255, 0.03)',
          withdateranges: true,
          range: 'D',
          details: false,
          hotlist: false,
          calendar: false,
        });
        
        setTimeout(() => setChartReady(true), 1000);
      }
    };
    
    document.head.appendChild(script);

    return () => {
      setChartReady(false);
    };
  }, [trade.symbol, trade.id]);

  // Format time
  const formatTime = (date: Date | string): string => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Format date
  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div ref={chartContainerRef} className="relative bg-[#0a0a14] rounded-xl overflow-hidden" style={{ height: '700px' }}>
      
      {/* Long/Short Position Tool - Draggable Overlay */}
      <div 
        ref={positionToolRef}
        className={`absolute z-30 select-none ${isDragging ? 'cursor-grabbing' : ''}`}
        style={{ 
          ...getPositionStyle(),
          width: isMinimized ? 'auto' : '320px',
          transition: isDragging ? 'none' : 'box-shadow 0.2s'
        }}
      >
        <div className={`rounded-lg overflow-hidden shadow-2xl backdrop-blur-sm ${
          isLong 
            ? 'bg-gradient-to-br from-green-900/95 to-green-950/98 border border-green-500/60' 
            : 'bg-gradient-to-br from-red-900/95 to-red-950/98 border border-red-500/60'
        } ${isDragging ? 'shadow-[0_0_30px_rgba(0,0,0,0.5)]' : ''}`}>
          
          {/* Draggable Header */}
          <div 
            className={`px-3 py-2 flex items-center justify-between border-b cursor-grab active:cursor-grabbing ${
              isLong ? 'border-green-500/30 hover:bg-green-800/30' : 'border-red-500/30 hover:bg-red-800/30'
            } transition-colors`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              {/* Drag Handle */}
              <GripVertical className="w-4 h-4 text-gray-400" />
              <div className={`p-1 rounded ${isLong ? 'bg-green-500' : 'bg-red-500'}`}>
                {isLong ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
              </div>
              <div>
                <span className="text-white font-bold">{isLong ? 'Long' : 'Short'} Position</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
              </div>
              {/* Minimize/Maximize Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4 text-gray-400" /> : <Minimize2 className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Visual Position Tool - Like TradingView (Collapsible) */}
          {!isMinimized && (
            <div className="p-3">
              {/* TP Line */}
              {trade.takeProfit && (
                <div className="flex items-center mb-1">
                  <div className={`flex-1 h-8 rounded-t flex items-center justify-between px-3 ${
                    isLong ? 'bg-green-500/30 border-l-4 border-green-500' : 'bg-red-500/30 border-l-4 border-red-500'
                  }`}>
                    <span className={`text-xs font-semibold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                      {isLong ? 'Take Profit' : 'Stop Loss'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm font-bold">
                        {trade.takeProfit.toFixed(decimals)}
                      </span>
                      <span className={`text-xs ${isLong ? 'text-green-400' : 'text-red-400'}`}>
                        {isLong ? `+${tpPips.toFixed(1)}p` : `-${slPips.toFixed(1)}p`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Profit Zone */}
              <div className={`h-6 ${isLong ? 'bg-green-500/10' : 'bg-red-500/10'}`} />

              {/* Entry Line */}
              <div className="flex items-center relative">
                <div className="flex-1 h-10 bg-blue-500/30 border-l-4 border-blue-500 flex items-center justify-between px-3">
                  <span className="text-xs font-semibold text-blue-400">Entry</span>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-mono text-sm font-bold">
                      {trade.entryPrice.toFixed(decimals)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {trade.units?.toLocaleString()} units
                    </span>
                  </div>
                </div>
                {/* Arrow */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                  <div className={`w-4 h-4 rotate-45 ${isLong ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
              </div>

              {/* Risk Zone */}
              <div className={`h-6 ${isLong ? 'bg-red-500/10' : 'bg-green-500/10'}`} />

              {/* SL Line */}
              {trade.stopLoss && (
                <div className="flex items-center mt-1">
                  <div className={`flex-1 h-8 rounded-b flex items-center justify-between px-3 ${
                    isLong ? 'bg-red-500/30 border-l-4 border-red-500' : 'bg-green-500/30 border-l-4 border-green-500'
                  }`}>
                    <span className={`text-xs font-semibold ${isLong ? 'text-red-400' : 'text-green-400'}`}>
                      {isLong ? 'Stop Loss' : 'Take Profit'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm font-bold">
                        {trade.stopLoss.toFixed(decimals)}
                      </span>
                      <span className={`text-xs ${isLong ? 'text-red-400' : 'text-green-400'}`}>
                        {isLong ? `-${slPips.toFixed(1)}p` : `+${tpPips.toFixed(1)}p`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Exit Price (if closed) */}
              {trade.exitPrice && (
                <div className="flex items-center mt-2 pt-2 border-t border-gray-700/50">
                  <div className="flex-1 h-8 bg-purple-500/30 border-l-4 border-purple-500 rounded flex items-center justify-between px-3">
                    <span className="text-xs font-semibold text-purple-400">Exit</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm font-bold">
                        {trade.exitPrice.toFixed(decimals)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                        pnl >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {pnl >= 0 ? 'WIN' : 'LOSS'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                <div className="bg-black/30 rounded p-1.5">
                  <div className="text-gray-500 text-[10px]">R:R</div>
                  <div className={`font-bold text-sm ${
                    rrRatio >= 2 ? 'text-green-400' : rrRatio >= 1 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    1:{rrRatio.toFixed(1)}
                  </div>
                </div>
                <div className="bg-black/30 rounded p-1.5">
                  <div className="text-gray-500 text-[10px]">Risk</div>
                  <div className="font-bold text-sm text-red-400">{slPips.toFixed(0)}p</div>
                </div>
                <div className="bg-black/30 rounded p-1.5">
                  <div className="text-gray-500 text-[10px]">Reward</div>
                  <div className="font-bold text-sm text-green-400">{tpPips.toFixed(0)}p</div>
                </div>
                <div className="bg-black/30 rounded p-1.5">
                  <div className="text-gray-500 text-[10px]">P&L %</div>
                  <div className={`font-bold text-sm ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(trade.pnlPercent || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Time Info */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{formatDate(trade.entryTime)} {formatTime(trade.entryTime)}</span>
                {trade.exitTime && (
                  <span>→ {formatTime(trade.exitTime)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price Levels on Left Side */}
      <div className="absolute left-3 top-3 z-30 space-y-1">
        {trade.takeProfit && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
            isLong ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
          }`}>
            <span className="font-bold">{isLong ? 'TP' : 'SL'}</span>
            <span>{trade.takeProfit.toFixed(decimals)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 bg-blue-500/80 px-2 py-1 rounded text-xs font-mono text-white">
          <span className="font-bold">EN</span>
          <span>{trade.entryPrice.toFixed(decimals)}</span>
        </div>
        {trade.exitPrice && (
          <div className="flex items-center gap-1 bg-purple-500/80 px-2 py-1 rounded text-xs font-mono text-white">
            <span className="font-bold">EX</span>
            <span>{trade.exitPrice.toFixed(decimals)}</span>
          </div>
        )}
        {trade.stopLoss && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
            isLong ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'
          }`}>
            <span className="font-bold">{isLong ? 'SL' : 'TP'}</span>
            <span>{trade.stopLoss.toFixed(decimals)}</span>
          </div>
        )}
      </div>

      {/* Symbol Badge */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 bg-[#1a1a2e]/90 backdrop-blur px-4 py-2 rounded-full border border-gray-700">
          <span className="text-white font-bold">{trade.symbol.replace('OANDA:', '')}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-400 text-sm">5m</span>
          <span className="text-gray-400">•</span>
          <span className={`font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
            {isLong ? 'LONG' : 'SHORT'}
          </span>
        </div>
      </div>

      {/* TradingView Link */}
      <a
        href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol(trade.symbol)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-30 flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-white text-sm transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        Open in TradingView
      </a>

      {/* TradingView Chart - Full Height */}
      <div 
        id={chartId.current}
        ref={containerRef}
        className="w-full h-full"
      />
    </div>
  );
};
