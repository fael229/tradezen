import type { Trade, TradeStats, DailyStats } from '../types/trade';
import { convertCurrency } from './currencyConversion';

export function calculateStats(trades: Trade[], baseCurrency: string = 'USD'): TradeStats {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);

  if (closedTrades.length === 0) {
    return {
      totalTrades: trades.length,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0,
      averageRRR: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      expectancy: 0,
      averageHoldingTime: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sqn: 0,
    };
  }

  // Helper to get converted PnL
  const getPnl = (t: Trade) => convertCurrency(t.pnl || 0, t.currency || 'USD', baseCurrency);

  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + getPnl(t), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + getPnl(t), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + getPnl(t), 0));

  const winRate = winningTrades.length / closedTrades.length;
  const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

  // Expectancy (E = (WinRate * AvgWin) - (LossRate * AvgLoss))
  const lossRate = 1 - winRate;
  const expectancy = (winRate * averageWin) - (lossRate * averageLoss);

  // Holding Time
  let totalHoldingTimeMs = 0;
  let validHoldingTrades = 0;
  closedTrades.forEach(t => {
    if (t.entryTime && t.exitTime) {
      const duration = new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime();
      if (duration > 0) {
        totalHoldingTimeMs += duration;
        validHoldingTrades++;
      }
    }
  });
  const averageHoldingTime = validHoldingTrades > 0 ? (totalHoldingTimeMs / validHoldingTrades) / (1000 * 60 * 60) : 0; // in hours

  // Sort trades by date for time-series analysis
  const sortedTrades = [...closedTrades].sort((a, b) =>
    new Date(a.exitTime || 0).getTime() - new Date(b.exitTime || 0).getTime()
  );

  // Consecutive Wins/Losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  // Drawdown
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let currentEquity = 0; // Assuming starting at 0 for relative calculation, or we could ask for starting balance. Just PnL curve here.
  let peakEquity = 0;

  // Returns for Sharpe/Sortino
  const returns = sortedTrades.map(t => getPnl(t));
  
  // Standard Deviation
  const meanReturn = totalPnl / closedTrades.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / closedTrades.length;
  const stdDev = Math.sqrt(variance);

  // Downside Deviation (for Sortino)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / (downsideReturns.length || 1); // Using 0 as target return
  const downsideStdDev = Math.sqrt(downsideVariance);

  // Sharpe Ratio (assuming 0 risk-free rate for simplicity in a trading journal context)
  const sharpeRatio = stdDev !== 0 ? meanReturn / stdDev : 0;

  // Sortino Ratio
  const sortinoRatio = downsideStdDev !== 0 ? meanReturn / downsideStdDev : 0;

  // SQN (System Quality Number) = Root(N) * (Expectancy / StdDev)
  const sqn = stdDev !== 0 ? Math.sqrt(closedTrades.length) * (meanReturn / stdDev) : 0;

  for (const trade of sortedTrades) {
    const pnl = getPnl(trade);
    
    // Consecutive
    if (pnl > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }

    // Equity Curve & Drawdown
    currentEquity += pnl;
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    
    const drawdown = peakEquity - currentEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }

    if (peakEquity > 0) {
       const drawdownPercent = (drawdown / peakEquity) * 100;
       if (drawdownPercent > maxDrawdownPercent) {
         maxDrawdownPercent = drawdownPercent;
       }
    }
  }

  // Calculate average RRR
  const tradesWithRRR = closedTrades.filter(t => t.stopLoss && t.takeProfit && t.entryPrice);
  let avgRRR = 0;
  if (tradesWithRRR.length > 0) {
    const totalRRR = tradesWithRRR.reduce((sum, t) => {
      const risk = Math.abs((t.entryPrice || 0) - (t.stopLoss || t.entryPrice || 0));
      const reward = Math.abs((t.takeProfit || t.entryPrice || 0) - (t.entryPrice || 0));
      return sum + (risk > 0 ? reward / risk : 0);
    }, 0);
    avgRRR = totalRRR / tradesWithRRR.length;
  }

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: winRate * 100,
    totalPnl,
    averageWin,
    averageLoss,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => getPnl(t))) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => getPnl(t))) : 0,
    averageRRR: avgRRR,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    expectancy,
    averageHoldingTime,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownPercent,
    sqn
  };
}

export function calculateDailyStats(trades: Trade[], baseCurrency: string = 'USD'): DailyStats[] {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitTime);

    const dailyMap = new Map<string, { pnl: number; wins: number; total: number }>();

    for (const trade of closedTrades) {
        const date = new Date(trade.exitTime!).toISOString().split('T')[0];
        const current = dailyMap.get(date) || { pnl: 0, wins: 0, total: 0 };

        const pnl = convertCurrency(trade.pnl || 0, trade.currency || 'USD', baseCurrency);

        current.pnl += pnl;
        current.total += 1;
        if ((trade.pnl || 0) > 0) current.wins += 1;

        dailyMap.set(date, current);
    }

    return Array.from(dailyMap.entries())
        .map(([date, data]) => ({
            date,
            pnl: data.pnl,
            trades: data.total,
            winRate: (data.wins / data.total) * 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
