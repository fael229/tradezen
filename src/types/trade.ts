export interface Trade {
  id: string;
  userId?: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number | null;
  units: number;
  entryTime: string;
  exitTime: string | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: 'open' | 'closed' | 'cancelled';
  notes: string;
  tags: string[];
  strategy?: string;
  screenshots?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  averageRRR: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  expectancy: number;
  averageHoldingTime: number; // in hours
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sqn: number;
}

export interface DailyStats {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export interface ParsedCSVEntry {
  time: string;
  text: string;
}
