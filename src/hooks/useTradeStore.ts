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

      if (session) {
        const data = await supabaseApi.fetchTrades();
        setTrades(data || []);
      } else {
        // Only check localStorage if NOT logged in
        const stored = localStorage.getItem('tradezella_trades');
        if (stored) {
          try {
            const localTrades = JSON.parse(stored);
            setTrades(localTrades);
          } catch (e) {
            setTrades([]);
          }
        } else {
          setTrades([]);
        }
      }
    } catch (error) {
      console.error('Error loading trades:', error);
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
    const { data: { session } } = await supabaseApi.supabase.auth.getSession();

    if (session) {
      const newTrade = await supabaseApi.createTrade(trade);
      if (newTrade) {
        setTrades(prev => [newTrade, ...prev]);
        return newTrade;
      }
      return null;
    } else {
      // Local storage fallback
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newTrade: any = {
        ...trade,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      setTrades(prev => {
        const updated = [newTrade, ...prev];
        localStorage.setItem('tradezella_trades', JSON.stringify(updated));
        return updated;
      });
      return newTrade;
    }
  }, []);

  const updateTrade = useCallback(async (id: string, updates: Partial<Trade>) => {
    const { data: { session } } = await supabaseApi.supabase.auth.getSession();

    if (session) {
      const updatedTrade = await supabaseApi.updateTrade(id, updates);
      if (updatedTrade) {
        setTrades(prev => prev.map(trade =>
          trade.id === id ? updatedTrade : trade
        ));
      }
    } else {
      setTrades(prev => {
        const updated = prev.map(trade =>
          trade.id === id ? { ...trade, ...updates, updatedAt: new Date().toISOString() } : trade
        );
        localStorage.setItem('tradezella_trades', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    const { data: { session } } = await supabaseApi.supabase.auth.getSession();

    if (session) {
      const success = await supabaseApi.deleteTrade(id);
      if (success) {
        setTrades(prev => prev.filter(trade => trade.id !== id));
      }
    } else {
      setTrades(prev => {
        const updated = prev.filter(trade => trade.id !== id);
        localStorage.setItem('tradezella_trades', JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  const bulkAddTrades = useCallback(async (newTrades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const { data: { session } } = await supabaseApi.supabase.auth.getSession();

    if (session) {
      const addedTrades = await supabaseApi.bulkCreateTrades(newTrades);
      if (addedTrades.length > 0) {
        setTrades(prev => [...addedTrades, ...prev]);
      }
      return addedTrades;
    } else {
      const now = new Date().toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdTrades = newTrades.map(t => ({
        ...t,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      } as any));

      setTrades(prev => {
        const updated = [...createdTrades, ...prev];
        localStorage.setItem('tradezella_trades', JSON.stringify(updated));
        return updated;
      });
      return createdTrades;
    }
  }, []);

  const clearAllTrades = useCallback(async () => {
    const { data: { session } } = await supabaseApi.supabase.auth.getSession();

    if (session) {
      const success = await supabaseApi.deleteAllTrades();
      if (success) {
        setTrades([]);
      }
    } else {
      setTrades([]);
      localStorage.removeItem('tradezella_trades');
    }
  }, []);

  // Calculate statistics
  const [preferredCurrency, setPreferredCurrency] = useState('USD');

  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency') || 'USD';
    setPreferredCurrency(savedCurrency);

    // Listen for storage changes in case settings are updated in another tab/window
    const handleStorageChange = () => {
      const newCurrency = localStorage.getItem('currency') || 'USD';
      setPreferredCurrency(newCurrency);
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event listener for same-tab updates from Settings
    window.addEventListener('settings-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-changed', handleStorageChange);
    };
  }, []);

  const stats: TradeStats = calculateStats(trades, preferredCurrency);
  const dailyStats: DailyStats[] = calculateDailyStats(trades, preferredCurrency);

  return {
    trades,
    loading,
    stats,
    dailyStats,
    preferredCurrency,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkAddTrades,
    loadTrades,
    clearAllTrades,
  };
}
