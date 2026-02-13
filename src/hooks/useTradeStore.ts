import { useState, useCallback, useEffect } from 'react';
import type { Trade, TradeStats, DailyStats } from '../types/trade';
import { generateMockTrades } from '../lib/csvParser';
import { v4 as uuidv4 } from 'uuid';

// Local storage key
const STORAGE_KEY = 'tradezella_trades';

export function useTradeStore() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [useLocalStorage, setUseLocalStorage] = useState(true);

  // Load trades from localStorage on mount
  useEffect(() => {
    const loadTrades = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTrades(JSON.parse(stored));
        } else {
          // Load demo data for first time users
          const demoTrades = generateMockTrades();
          setTrades(demoTrades);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demoTrades));
        }
      } catch (error) {
        console.error('Error loading trades:', error);
        setTrades([]);
      }
      setLoading(false);
    };

    loadTrades();
  }, []);

  // Save to localStorage whenever trades change
  useEffect(() => {
    if (!loading && useLocalStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    }
  }, [trades, loading, useLocalStorage]);

  const addTrade = useCallback((trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTrade: Trade = {
      ...trade,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setTrades(prev => [newTrade, ...prev]);
    return newTrade;
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setTrades(prev => prev.map(trade => 
      trade.id === id 
        ? { ...trade, ...updates, updatedAt: new Date().toISOString() }
        : trade
    ));
  }, []);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => prev.filter(trade => trade.id !== id));
  }, []);

  const bulkAddTrades = useCallback((newTrades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = new Date().toISOString();
    const tradesToAdd: Trade[] = newTrades.map(trade => ({
      ...trade,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }));
    setTrades(prev => [...tradesToAdd, ...prev]);
    return tradesToAdd;
  }, []);

  const clearAllTrades = useCallback(() => {
    setTrades([]);
    localStorage.removeItem(STORAGE_KEY);
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
    useLocalStorage,
    setUseLocalStorage,
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
