import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, CandlestickData, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { Trade } from '../types/trade';
import { Loader2, AlertCircle, TrendingUp, TrendingDown, Target, Shield, DollarSign } from 'lucide-react';

interface TradeChartProps {
  trade: Trade;
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Générer des données simulées basées sur le trade
const generateMockData = (trade: Trade): OHLCData[] => {
  const data: OHLCData[] = [];
  const entryTime = new Date(trade.entryTime).getTime();
  const exitTime = trade.exitTime ? new Date(trade.exitTime).getTime() : entryTime + 4 * 60 * 60 * 1000;
  const duration = exitTime - entryTime;
  
  // Générer des bougies de 5 minutes
  const candleInterval = 5 * 60 * 1000; // 5 minutes
  const startTime = entryTime - duration * 2;
  const endTime = exitTime + duration;
  
  const entryPrice = trade.entryPrice;
  const exitPrice = trade.exitPrice || entryPrice;
  const sl = trade.stopLoss || (trade.direction === 'long' ? entryPrice * 0.99 : entryPrice * 1.01);
  const tp = trade.takeProfit || (trade.direction === 'long' ? entryPrice * 1.02 : entryPrice * 0.98);
  
  // Prix range basé sur SL et TP
  const priceRange = Math.abs(tp - sl);
  const volatility = priceRange * 0.1;
  
  let currentPrice = trade.direction === 'long' 
    ? entryPrice - priceRange * 0.3 
    : entryPrice + priceRange * 0.3;
  
  for (let time = startTime; time <= endTime; time += candleInterval) {
    const progress = (time - startTime) / (endTime - startTime);
    
    // Simuler le mouvement du prix vers l'entrée puis vers la sortie
    let targetPrice: number;
    const entryProgress = (entryTime - startTime) / (endTime - startTime);
    const exitProgress = (exitTime - startTime) / (endTime - startTime);
    
    if (progress < entryProgress) {
      // Avant l'entrée - prix se dirige vers le prix d'entrée
      targetPrice = currentPrice + (entryPrice - currentPrice) * (progress / entryProgress) * 0.5;
    } else if (progress < exitProgress) {
      // Pendant le trade - prix se dirige vers la sortie
      const tradeProgress = (progress - entryProgress) / (exitProgress - entryProgress);
      targetPrice = entryPrice + (exitPrice - entryPrice) * tradeProgress;
    } else {
      // Après la sortie
      targetPrice = exitPrice + (Math.random() - 0.5) * volatility;
    }
    
    // Ajouter du bruit
    const noise = (Math.random() - 0.5) * volatility;
    currentPrice = targetPrice + noise;
    
    const candleVolatility = volatility * 0.5;
    const open = currentPrice + (Math.random() - 0.5) * candleVolatility * 0.5;
    const close = currentPrice + (Math.random() - 0.5) * candleVolatility * 0.5;
    const high = Math.max(open, close) + Math.random() * candleVolatility;
    const low = Math.min(open, close) - Math.random() * candleVolatility;
    
    data.push({
      time: Math.floor(time / 1000),
      open,
      high,
      low,
      close,
    });
  }
  
  return data;
};

// Calculer les pips
const calculatePips = (price1: number, price2: number, symbol: string): number => {
  const cleanSymbol = symbol.replace('OANDA:', '').toUpperCase();
  let pipValue = 0.0001;
  
  if (cleanSymbol.includes('JPY')) {
    pipValue = 0.01;
  } else if (cleanSymbol.includes('XAU') || cleanSymbol.includes('GOLD')) {
    pipValue = 0.1;
  }
  
  return Math.abs(price2 - price1) / pipValue;
};

export default function TradeChart({ trade }: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const entryPrice = trade.entryPrice;
  const exitPrice = trade.exitPrice || entryPrice;
  const stopLoss = trade.stopLoss || (trade.direction === 'long' ? entryPrice * 0.99 : entryPrice * 1.01);
  const takeProfit = trade.takeProfit || (trade.direction === 'long' ? entryPrice * 1.02 : entryPrice * 0.98);
  
  const isLong = trade.direction === 'long';
  const riskPips = calculatePips(entryPrice, stopLoss, trade.symbol);
  const rewardPips = calculatePips(entryPrice, takeProfit, trade.symbol);
  const rrRatio = riskPips > 0 ? rewardPips / riskPips : 0;
  
  const pnl = trade.pnl || 0;
  const isWin = pnl > 0;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Créer le chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a2e' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: '#2d2d44' },
        horzLines: { color: '#2d2d44' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Créer la série de chandeliers avec la nouvelle API
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Générer les données
    const mockData = generateMockData(trade);
    const chartData: CandlestickData<any>[] = mockData.map(d => ({
      time: d.time as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(chartData);

    // Ajouter les lignes de prix
    // Entry Price Line
    candlestickSeries.createPriceLine({
      price: entryPrice,
      color: '#3b82f6',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
      title: 'Entry',
    });

    // Stop Loss Line
    candlestickSeries.createPriceLine({
      price: stopLoss,
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'SL',
    });

    // Take Profit Line
    candlestickSeries.createPriceLine({
      price: takeProfit,
      color: '#22c55e',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'TP',
    });

    // Exit Price Line (if different from entry)
    if (trade.exitPrice && trade.status === 'closed') {
      candlestickSeries.createPriceLine({
        price: exitPrice,
        color: '#a855f7',
        lineWidth: 2,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'Exit',
      });
    }

    // Ajouter des marqueurs pour l'entrée et la sortie
    const markers: any[] = [];
    const entryTimeMs = Math.floor(new Date(trade.entryTime).getTime() / 1000);
    
    // Trouver la bougie la plus proche de l'entrée
    const entryCandle = chartData.reduce((prev, curr) => 
      Math.abs((curr.time as number) - entryTimeMs) < Math.abs((prev.time as number) - entryTimeMs) ? curr : prev
    );

    markers.push({
      time: entryCandle.time,
      position: isLong ? 'belowBar' : 'aboveBar',
      color: '#3b82f6',
      shape: isLong ? 'arrowUp' : 'arrowDown',
      text: `Entry @ ${entryPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}`,
    });

    if (trade.exitTime && trade.status === 'closed') {
      const exitTimeMs = Math.floor(new Date(trade.exitTime).getTime() / 1000);
      const exitCandle = chartData.reduce((prev, curr) => 
        Math.abs((curr.time as number) - exitTimeMs) < Math.abs((prev.time as number) - exitTimeMs) ? curr : prev
      );

      markers.push({
        time: exitCandle.time,
        position: isLong ? 'aboveBar' : 'belowBar',
        color: isWin ? '#22c55e' : '#ef4444',
        shape: isLong ? 'arrowDown' : 'arrowUp',
        text: `Exit @ ${exitPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}`,
      });
    }

    // Set markers using attachPrimitive or just skip if not available
    try {
      (candlestickSeries as any).setMarkers(markers);
    } catch {
      // Markers not supported in this version
      console.log('Markers set via price lines instead');
    }

    // Ajuster la vue pour montrer tout le trade
    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    setIsLoading(false);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [trade, entryPrice, exitPrice, stopLoss, takeProfit, isLong, isWin]);

  // Ignorer l'erreur pour setError car on pourrait l'utiliser plus tard
  if (error) {
    console.error(error);
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Position Tool Header */}
      <div className={`p-4 ${isLong ? 'bg-emerald-900/50' : 'bg-red-900/50'} border-b border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`}>
              {isLong ? <TrendingUp className="w-5 h-5 text-white" /> : <TrendingDown className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isLong ? 'Long Position' : 'Short Position'}
              </h3>
              <p className="text-sm text-gray-400">{trade.symbol}</p>
            </div>
          </div>
          
          {/* P&L Badge */}
          <div className={`px-4 py-2 rounded-lg ${isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            <div className="text-lg font-bold">
              {isWin ? '+' : ''}{pnl.toFixed(2)} $
            </div>
          </div>
        </div>
      </div>

      {/* Position Tool Visual */}
      <div className="p-4 bg-gray-900/50">
        <div className="relative">
          {/* Risk/Reward Visual Bar */}
          <div className="flex items-stretch h-24 rounded-lg overflow-hidden border border-gray-700">
            {/* Stop Loss Zone */}
            <div 
              className="bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center relative"
              style={{ flex: riskPips }}
            >
              <div className="text-center text-white">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium">STOP LOSS</span>
                </div>
                <div className="text-lg font-bold">{stopLoss.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}</div>
                <div className="text-xs opacity-80">-{riskPips.toFixed(1)} pips</div>
              </div>
              {/* Risk Label */}
              <div className="absolute bottom-1 left-1 bg-red-800/80 text-xs px-2 py-0.5 rounded text-red-200">
                Risk
              </div>
            </div>

            {/* Entry Point Divider */}
            <div className="w-1 bg-blue-500 relative z-10 flex items-center justify-center">
              <div className="absolute -left-16 -right-16 flex flex-col items-center">
                <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap shadow-lg">
                  Entry: {entryPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}
                </div>
              </div>
            </div>

            {/* Take Profit Zone */}
            <div 
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center relative"
              style={{ flex: rewardPips }}
            >
              <div className="text-center text-white">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4" />
                  <span className="text-xs font-medium">TAKE PROFIT</span>
                </div>
                <div className="text-lg font-bold">{takeProfit.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}</div>
                <div className="text-xs opacity-80">+{rewardPips.toFixed(1)} pips</div>
              </div>
              {/* Reward Label */}
              <div className="absolute bottom-1 right-1 bg-emerald-800/80 text-xs px-2 py-0.5 rounded text-emerald-200">
                Reward
              </div>
            </div>
          </div>

          {/* Exit Point (if closed) */}
          {trade.status === 'closed' && trade.exitPrice && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-20"
              style={{
                left: `${((exitPrice - stopLoss) / (takeProfit - stopLoss)) * 100}%`,
              }}
            >
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap">
                  Exit: {exitPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Risk/Reward</div>
            <div className={`text-xl font-bold ${rrRatio >= 2 ? 'text-emerald-400' : rrRatio >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
              1:{rrRatio.toFixed(2)}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Risk (pips)</div>
            <div className="text-xl font-bold text-red-400">-{riskPips.toFixed(1)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Reward (pips)</div>
            <div className="text-xl font-bold text-emerald-400">+{rewardPips.toFixed(1)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">Position Size</div>
            <div className="text-xl font-bold text-blue-400">{trade.units.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading chart...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-6 h-6" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div 
          ref={chartContainerRef} 
          className="w-full h-[400px]"
        />

        {/* Chart Legend */}
        <div className="absolute top-2 left-2 bg-gray-900/90 rounded-lg p-2 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-gray-300">Entry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500 border-dashed"></div>
            <span className="text-gray-300">Stop Loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-emerald-500 border-dashed"></div>
            <span className="text-gray-300">Take Profit</span>
          </div>
          {trade.status === 'closed' && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-500"></div>
              <span className="text-gray-300">Exit</span>
            </div>
          )}
        </div>
      </div>

      {/* Trade Info Footer */}
      <div className="p-4 bg-gray-900/30 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="text-gray-400">
              <span className="text-gray-500">Entry: </span>
              {new Date(trade.entryTime).toLocaleString()}
            </div>
            {trade.exitTime && (
              <div className="text-gray-400">
                <span className="text-gray-500">Exit: </span>
                {new Date(trade.exitTime).toLocaleString()}
              </div>
            )}
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            trade.status === 'closed' 
              ? isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            <DollarSign className="w-4 h-4" />
            {trade.status === 'closed' ? (isWin ? 'Winner' : 'Loser') : 'Open'}
          </div>
        </div>
      </div>
    </div>
  );
}
