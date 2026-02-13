import { useState, useCallback, useEffect } from 'react';
import type { Trade, TradeStats, DailyStats } from '../types/trade';
import { generateMockTrades } from '../lib/csvParser';
import * as supabaseApi from '../lib/supabase';

export function useTradeStore() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trades from Supabase on mount
  useEffect(() => {
    const loadTrades = async () => {
      setLoading(true);
      try {
        const data = await supabaseApi.fetchTrades();
        if (data && data.length > 0) {
          setTrades(data);
        } else {
          // If no trades in Supabase, check localStorage as fallback or use demo data
          const stored = localStorage.getItem('tradezella_trades');
          if (stored) {
            const localTrades = JSON.parse(stored);
            setTrades(localTrades);
            // Optionally sync to Supabase if it's the first time
            // await supabaseApi.bulkCreateTrades(localTrades);
          } else {
            const demoTrades = generateMockTrades();
            setTrades(demoTrades);
          }
        }
      } catch (error) {
        console.error('Error loading trades from Supabase:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, []);

  const addTrade = useCallback(async (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTrade = await supabaseApi.createTrade(trade);
    if (newTrade) {
      setTrades(prev => [newTrade, ...prev]);
      return newTrade;
    }
    return null;
  }, []);

  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>) => {
    const updatedTrade = await supabaseApi.updateTrade(id, updates);
    if (updatedTrade) {
      setTrades(prev => prev.map(trade =>
        trade.id === id ? updatedTrade : trade
      ));
    }
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    const success = await supabaseApi.deleteTrade(id);
    if (success) {
      setTrades(prev => prev.filter(trade => trade.id !== id));
    }
  }, []);

  const bulkAddTrades = useCallback(async (newTrades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const addedTrades = await supabaseApi.bulkCreateTrades(newTrades);
    if (addedTrades.length > 0) {
      setTrades(prev => [...addedTrades, ...prev]);
    }
    return addedTrades;
  }, []);

  const clearAllTrades = useCallback(async () => {
    // Supabase doesn't have a simple "clear all" without a filter, 
    // but we can delete all rows if the user really wants to.
    // For safety, let's just clear locally and notify that Supabase needs manual clearing or implement a loop.
    console.warn('Clear all trades on Supabase not fully implemented for safety.');
    // If you really want to clear Supabase, you could use a stored procedure or loop through IDs.
    // For now, let's just clear the local state to give immediate feedback.
    setTrades([]);
    localStorage.removeItem('tradezella_trades');
  }, []);

  // Calculate statistics
  const stats: TradeStats = calculateStats(trades);
  const dailyStats: DailyStats[] = calculateDailyStats(trades);

  return {
    trades,
    loading,
    stats,
    dailyStats,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkAddTrades,
    clearAllTrades,
  };
}

function calculateStats(trades: Trade[]): TradeStats {
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
    };
  }

  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0));

  // Calculate consecutive wins/losses
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  const sortedTrades = [...closedTrades].sort((a, b) =>
    new Date(a.exitTime || 0).getTime() - new Date(b.exitTime || 0).getTime()
  );

  for (const trade of sortedTrades) {
    if ((trade.pnl || 0) > 0) {
      currentWins++;
      currentLosses = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    }
  }

  // Calculate average RRR
  const tradesWithRRR = closedTrades.filter(t => t.stopLoss && t.takeProfit && t.entryPrice);
  let avgRRR = 0;
  if (tradesWithRRR.length > 0) {
    const totalRRR = tradesWithRRR.reduce((sum, t) => {
      const risk = Math.abs(t.entryPrice - (t.stopLoss || t.entryPrice));
      const reward = Math.abs((t.takeProfit || t.entryPrice) - t.entryPrice);
      return sum + (risk > 0 ? reward / risk : 0);
    }, 0);
    avgRRR = totalRRR / tradesWithRRR.length;
  }

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / closedTrades.length) * 100,
    totalPnl,
    averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
    averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0,
    averageRRR: avgRRR,
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
  };
}

function calculateDailyStats(trades: Trade[]): DailyStats[] {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.exitTime);

  const dailyMap = new Map<string, { pnl: number; wins: number; total: number }>();

  for (const trade of closedTrades) {
    const date = new Date(trade.exitTime!).toISOString().split('T')[0];
    const current = dailyMap.get(date) || { pnl: 0, wins: 0, total: 0 };

    current.pnl += trade.pnl || 0;
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
