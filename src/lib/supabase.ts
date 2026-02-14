import { createClient } from '@supabase/supabase-js';
import type { Trade } from '../types/trade';

// Configuration Supabase - à remplacer par vos propres clés
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fonctions pour gérer les trades
export async function fetchTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('entry_time', { ascending: false });

  if (error) {
    console.error('Error fetching trades:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

export async function createTrade(trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('trades')
    .insert([mapTradeToDb(trade)])
    .select()
    .single();

  if (error) {
    console.error('Error creating trade:', error);
    return null;
  }

  return mapDbToTrade(data);
}

export async function updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('trades')
    .update(mapTradeToDb(updates))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating trade:', error);
    return null;
  }

  return mapDbToTrade(data);
}

export async function deleteTrade(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting trade:', error);
    return false;
  }

  return true;
}

export async function deleteAllTrades(): Promise<boolean> {
  const { error } = await supabase
    .from('trades')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (RLS will filter by user)

  if (error) {
    console.error('Error deleting all trades:', error);
    return false;
  }

  return true;
}

export async function bulkCreateTrades(trades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .insert(trades.map(mapTradeToDb))
    .select();

  if (error) {
    console.error('Error bulk creating trades:', error);
    return [];
  }

  return (data || []).map(mapDbToTrade);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToTrade(data: any): Trade {
  return {
    id: data.id,
    userId: data.user_id,
    symbol: data.symbol,
    direction: data.direction,
    entryPrice: data.entry_price,
    exitPrice: data.exit_price,
    units: data.units,
    entryTime: data.entry_time,
    exitTime: data.exit_time,
    stopLoss: data.stop_loss,
    takeProfit: data.take_profit,
    pnl: data.pnl,
    pnlPercent: data.pnl_percent,
    status: data.status,
    notes: data.notes || '',
    tags: data.tags || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTradeToDb(trade: Partial<Trade>): any {
  const dbTrade: Record<string, unknown> = {};

  if (trade.userId !== undefined) dbTrade.user_id = trade.userId;
  if (trade.symbol !== undefined) dbTrade.symbol = trade.symbol;
  if (trade.direction !== undefined) dbTrade.direction = trade.direction;
  if (trade.entryPrice !== undefined) dbTrade.entry_price = trade.entryPrice;
  if (trade.exitPrice !== undefined) dbTrade.exit_price = trade.exitPrice;
  if (trade.units !== undefined) dbTrade.units = trade.units;
  if (trade.entryTime !== undefined) dbTrade.entry_time = trade.entryTime;
  if (trade.exitTime !== undefined) dbTrade.exit_time = trade.exitTime;
  if (trade.stopLoss !== undefined) dbTrade.stop_loss = trade.stopLoss;
  if (trade.takeProfit !== undefined) dbTrade.take_profit = trade.takeProfit;
  if (trade.pnl !== undefined) dbTrade.pnl = trade.pnl;
  if (trade.pnlPercent !== undefined) dbTrade.pnl_percent = trade.pnlPercent;
  if (trade.status !== undefined) dbTrade.status = trade.status;
  if (trade.notes !== undefined) dbTrade.notes = trade.notes;
  if (trade.tags !== undefined) dbTrade.tags = trade.tags;

  return dbTrade;
}

// SQL pour créer la table avec RLS dans Supabase
export const CREATE_TABLE_SQL = `
-- 1. Créer la table avec la colonne user_id
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  symbol VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price DECIMAL(20, 6) NOT NULL,
  exit_price DECIMAL(20, 6),
  units DECIMAL(20, 6) NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ,
  stop_loss DECIMAL(20, 6),
  take_profit DECIMAL(20, 6),
  pnl DECIMAL(20, 6),
  pnl_percent DECIMAL(10, 4),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer la RLS (Row Level Security)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques d'accès
CREATE POLICY "Users can view their own trades" 
ON trades FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" 
ON trades FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
ON trades FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" 
ON trades FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
`;
