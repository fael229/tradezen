import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';
import type { Trade, TradeStats, DailyStats } from '../types/trade';
import { convertCurrency } from '../utils/currencyConversion';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';
import { cn } from '../utils/cn';

interface AnalyticsProps {
  trades: Trade[];
  stats: TradeStats;
  dailyStats: DailyStats[];
  baseCurrency?: string;
}

export function Analytics({ trades, stats, baseCurrency = 'USD' }: AnalyticsProps) {
  const closedTrades = trades.filter(t => t.status === 'closed' && t.pnl !== null);

  const getPnl = (t: Trade) => convertCurrency(t.pnl || 0, t.currency || 'USD', baseCurrency);

  // Win/Loss pie chart data
  const winLossData = [
    { name: 'Wins', value: stats.winningTrades, color: '#10b981' },
    { name: 'Losses', value: stats.losingTrades, color: '#ef4444' },
  ];

  // Direction analysis
  const longTrades = closedTrades.filter(t => t.direction === 'long');
  const shortTrades = closedTrades.filter(t => t.direction === 'short');

  const directionData = [
    {
      name: 'Long',
      trades: longTrades.length,
      winRate: longTrades.length > 0
        ? (longTrades.filter(t => (t.pnl || 0) > 0).length / longTrades.length) * 100
        : 0,
      pnl: longTrades.reduce((sum, t) => sum + getPnl(t), 0),
    },
    {
      name: 'Short',
      trades: shortTrades.length,
      winRate: shortTrades.length > 0
        ? (shortTrades.filter(t => (t.pnl || 0) > 0).length / shortTrades.length) * 100
        : 0,
      pnl: shortTrades.reduce((sum, t) => sum + getPnl(t), 0),
    },
  ];

  // Symbol performance
  const symbolMap = new Map<string, { trades: number; wins: number; pnl: number }>();
  for (const trade of closedTrades) {
    const current = symbolMap.get(trade.symbol) || { trades: 0, wins: 0, pnl: 0 };
    current.trades += 1;
    if ((trade.pnl || 0) > 0) current.wins += 1;
    current.pnl += getPnl(trade);
    symbolMap.set(trade.symbol, current);
  }

  const symbolData = Array.from(symbolMap.entries())
    .map(([symbol, data]) => ({
      symbol,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // Day of week analysis
  const dayOfWeekMap = new Map<number, { trades: number; wins: number; pnl: number }>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const trade of closedTrades) {
    const day = new Date(trade.entryTime).getDay();
    const current = dayOfWeekMap.get(day) || { trades: 0, wins: 0, pnl: 0 };
    current.trades += 1;
    if ((trade.pnl || 0) > 0) current.wins += 1;
    current.pnl += getPnl(trade);
    dayOfWeekMap.set(day, current);
  }

  const dayOfWeekData = [1, 2, 3, 4, 5].map(day => ({
    day: dayNames[day],
    trades: dayOfWeekMap.get(day)?.trades || 0,
    winRate: dayOfWeekMap.get(day)
      ? ((dayOfWeekMap.get(day)!.wins / dayOfWeekMap.get(day)!.trades) * 100)
      : 0,
    pnl: dayOfWeekMap.get(day)?.pnl || 0,
  }));

  // Hour of day analysis
  const hourMap = new Map<number, { trades: number; wins: number; pnl: number }>();

  for (const trade of closedTrades) {
    const hour = new Date(trade.entryTime).getHours();
    const current = hourMap.get(hour) || { trades: 0, wins: 0, pnl: 0 };
    current.trades += 1;
    if ((trade.pnl || 0) > 0) current.wins += 1;
    current.pnl += getPnl(trade);
    hourMap.set(hour, current);
  }

  const hourData = Array.from(hourMap.entries())
    .map(([hour, data]) => ({
      hour: `${hour}:00`,
      trades: data.trades,
      winRate: (data.wins / data.trades) * 100,
      pnl: data.pnl,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value, baseCurrency);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500">Deep dive into your trading performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Basic Stats */}
        <SummaryCard
          title="Best Symbol"
          value={symbolData[0]?.symbol || '-'}
          subtitle={symbolData[0] ? formatCurrency(symbolData[0].pnl) : '-'}
          color="emerald"
        />
        <SummaryCard
          title="Best Day"
          value={dayOfWeekData.sort((a, b) => b.pnl - a.pnl)[0]?.day || '-'}
          subtitle={`${dayOfWeekData.sort((a, b) => b.pnl - a.pnl)[0]?.winRate.toFixed(1)}% win rate`}
          color="blue"
        />
        <SummaryCard
          title="Avg Trade Duration"
          value={stats.averageHoldingTime < 1 ? `${(stats.averageHoldingTime * 60).toFixed(0)} min` : `${stats.averageHoldingTime.toFixed(1)} hours`}
          subtitle="per trade"
          color="amber"
        />
        <SummaryCard
          title="Expectancy"
          value={formatCurrency(stats.expectancy)}
          subtitle="per trade"
          color={stats.expectancy >= 0 ? "emerald" : "red"}
        />

        {/* Advanced Stats */}
        <SummaryCard
          title="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          subtitle="Gross Profit / Gross Loss"
          color={stats.profitFactor >= 1.5 ? "emerald" : stats.profitFactor >= 1 ? "amber" : "red"}
        />
        <SummaryCard
          title="Max Drawdown"
          value={formatCurrency(stats.maxDrawdown)}
          subtitle={`${stats.maxDrawdownPercent.toFixed(2)}% of peak equity`}
          color="red"
        />
        <SummaryCard
          title="System Quality (SQN)"
          value={stats.sqn.toFixed(2)}
          subtitle={getSqnRating(stats.sqn)}
          color={stats.sqn >= 2.5 ? "emerald" : stats.sqn >= 1.6 ? "blue" : stats.sqn >= 0.6 ? "amber" : "red"}
        />
        <SummaryCard
          title="Sharpe / Sortino"
          value={`${stats.sharpeRatio.toFixed(2)} / ${stats.sortinoRatio.toFixed(2)}`}
          subtitle="Risk-adjusted Return"
          color="purple"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Win/Loss Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {stats.totalTrades > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400">No data available</p>
            )}
          </div>
          <div className="flex justify-center gap-8 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.winRate.toFixed(1)}%</p>
              <p className="text-sm text-slate-500">Win Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}</p>
              <p className="text-sm text-slate-500">Profit Factor</p>
            </div>
          </div>
        </div>

        {/* Direction Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Direction Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={directionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="pnl" fill="#10b981" radius={[4, 4, 0, 0]} name="P&L" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {directionData.map((d) => (
              <div key={d.name} className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-500">{d.name}</p>
                <p className="text-lg font-semibold text-slate-900">{d.winRate.toFixed(1)}% WR</p>
                <p className="text-xs text-slate-400">{d.trades} trades</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symbol Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Symbol Performance</h3>
          <div className="space-y-3">
            {symbolData.slice(0, 5).map((symbol) => (
              <div key={symbol.symbol} className="flex items-center gap-4">
                <div className="w-20">
                  <span className="font-semibold text-slate-900">{symbol.symbol}</span>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        symbol.pnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                      )}
                      style={{
                        width: `${Math.min(Math.abs(symbol.pnl) / (Math.max(...symbolData.map(s => Math.abs(s.pnl))) || 1) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className={cn(
                    "font-semibold",
                    symbol.pnl >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {formatCurrency(symbol.pnl)}
                  </span>
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm text-slate-500">{symbol.winRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
            {symbolData.length === 0 && (
              <p className="text-slate-400 text-center py-8">No trades to analyze</p>
            )}
          </div>
        </div>

        {/* Day of Week Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Day of Week Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="pnl" fill="#3b82f6" radius={[4, 4, 0, 0]} name="P&L" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hour of Day Performance */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Trading Hours Analysis</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981' }}
                name="Win Rate %"
              />
              <Line
                type="monotone"
                dataKey="trades"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6' }}
                name="Trades"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
}

function SummaryCard({ title, value, subtitle, color }: SummaryCardProps) {
  const colorClasses = {
    emerald: 'border-l-emerald-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
    amber: 'border-l-amber-500',
    red: 'border-l-red-500',
  };

  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 p-4",
      colorClasses[color]
    )}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function getSqnRating(sqn: number): string {
  if (sqn >= 7.0) return "Holy Grail";
  if (sqn >= 5.0) return "Excellent";
  if (sqn >= 2.5) return "Great";
  if (sqn >= 2.0) return "Good";
  if (sqn >= 1.6) return "Average";
  return "Poor";
}
