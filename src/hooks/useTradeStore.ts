import { useState, useCallback, useEffect } from 'react';
import type { Trade, TradeStats, DailyStats } from '../types/trade';
import { calculateStats, calculateDailyStats } from '../utils/tradeAnalysis';
import * as supabaseApi from '../lib/supabase';

export function useTradeStore() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabaseApi.supabase.auth.getSession();

      if (!session) {
        setTrades([]);
        setLoading(false);
        return;
      }

      const data = await supabaseApi.fetchTrades();
      if (data && data.length > 0) {
        setTrades(data);
      } else {
        // Only check localStorage if no trades in Supabase
        const stored = localStorage.getItem('tradezella_trades');
        if (stored) {
          try {
            const localTrades = JSON.parse(stored);
            setTrades(localTrades);
          } catch (e) {
            setTrades([]);
          }
        } else {
          // If a new user with no trades anywhere, we could show demo data or empty
          // For a clean personal journal, empty is better.
          setTrades([]);
        }
      }
    } catch (error) {
      console.error('Error loading trades from Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trades on mount and sign in
  useEffect(() => {
    loadTrades();

    const { data: { subscription } } = supabaseApi.supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadTrades();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadTrades]);

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
    console.warn('Clear all trades on Supabase not fully implemented for safety.');
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
