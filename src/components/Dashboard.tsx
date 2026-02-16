import { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Award,
  Activity,
  BarChart2,
  Zap,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { subDays, startOfYear, isAfter, parseISO } from 'date-fns';
import type { Trade } from '../types/trade';
import { cn } from '../utils/cn';
import { calculateStats, calculateDailyStats } from '../utils/tradeAnalysis';

import { convertCurrency } from '../utils/currencyConversion';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

interface DashboardProps {
  trades: Trade[];
  baseCurrency?: string;
}

type TimeRange = '7d' | '30d' | '90d' | 'ytd' | 'all';

export function Dashboard({ trades, baseCurrency = 'USD' }: DashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const filteredTrades = useMemo(() => {
    if (timeRange === 'all') return trades;

    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case '90d':
        startDate = subDays(now, 90);
        break;
      case 'ytd':
        startDate = startOfYear(now);
        break;
      default:
        return trades;
    }

    return trades.filter(trade => {
      const tradeTime = parseISO(trade.entryTime);
      return isAfter(tradeTime, startDate);
    });
  }, [trades, timeRange]);

  const stats = useMemo(() => calculateStats(filteredTrades, baseCurrency), [filteredTrades, baseCurrency]);
  const dailyStats = useMemo(() => calculateDailyStats(filteredTrades, baseCurrency), [filteredTrades, baseCurrency]);

  const recentTrades = filteredTrades.slice(0, 5);

  // Calculate cumulative P&L
  const cumulativePnl = dailyStats.reduce((acc, day, index) => {
    const prevTotal = index > 0 ? acc[index - 1].cumulative : 0;
    acc.push({
      date: day.date,
      pnl: day.pnl,
      cumulative: prevTotal + day.pnl
    });
    return acc;
  }, [] as { date: string; pnl: number; cumulative: number }[]);

  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value, baseCurrency);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getPnl = (t: Trade) => convertCurrency(t.pnl || 0, t.currency || 'USD', baseCurrency);

  const timeRangeLabels: Record<TimeRange, string> = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    'ytd': 'This Year',
    'all': 'All Time'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your trading performance</p>
        </div>

        <div className="relative inline-block text-left">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              className="appearance-none bg-transparent pr-8 focus:outline-none text-sm font-medium text-slate-700 cursor-pointer"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">This Year</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total P&L"
          value={formatCurrency(stats.totalPnl)}
          icon={DollarSign}
          trend={stats.totalPnl >= 0 ? 'up' : 'down'}
          trendValue={formatPercent((stats.totalPnl / 10000) * 100)}
          color={stats.totalPnl >= 0 ? 'emerald' : 'red'}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Target}
          trend={stats.winRate >= 50 ? 'up' : 'down'}
          trendValue={`${stats.winningTrades}W / ${stats.losingTrades}L`}
          color={stats.winRate >= 50 ? 'emerald' : 'amber'}
        />
        <StatCard
          title="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          icon={Activity}
          trend={stats.profitFactor >= 1 ? 'up' : 'down'}
          trendValue={stats.profitFactor >= 1.5 ? 'Excellent' : stats.profitFactor >= 1 ? 'Good' : 'Needs work'}
          color={stats.profitFactor >= 1.5 ? 'emerald' : stats.profitFactor >= 1 ? 'amber' : 'red'}
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades.toString()}
          icon={BarChart2}
          trend="neutral"
          trendValue={`Avg RRR: ${stats.averageRRR.toFixed(2)}`}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equity Curve */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Equity Curve</h3>
          <div className="h-64">
            {cumulativePnl.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativePnl}>
                  <defs>
                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'Cumulative P&L']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPnl)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No data for this period
              </div>
            )}
          </div>
        </div>

        {/* Daily P&L */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily P&L</h3>
          <div className="h-64">
            {dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value as number), 'P&L']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Bar
                    dataKey="pnl"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                No data for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats & Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Performance Metrics
          </h3>
          <div className="space-y-4">
            <MetricRow label="Average Win" value={formatCurrency(stats.averageWin)} color="emerald" />
            <MetricRow label="Average Loss" value={formatCurrency(stats.averageLoss)} color="red" />
            <MetricRow label="Largest Win" value={formatCurrency(stats.largestWin)} color="emerald" />
            <MetricRow label="Largest Loss" value={formatCurrency(Math.abs(stats.largestLoss))} color="red" />
            <MetricRow label="Max Consecutive Wins" value={stats.consecutiveWins.toString()} color="emerald" />
            <MetricRow label="Max Consecutive Losses" value={stats.consecutiveLosses.toString()} color="red" />
          </div>
        </div>

        {/* Recent Trades */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-500" />
            {timeRange === 'all' ? 'Recent Trades' : `Trades in ${timeRangeLabels[timeRange]}`}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Symbol</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Direction</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Entry</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase">Exit</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase">P&L</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.length > 0 ? (
                  recentTrades.map((trade) => (
                    <tr key={trade.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-2">
                        <span className="font-medium text-slate-900">{trade.symbol}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                          trade.direction === 'long'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        )}>
                          {trade.direction === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-slate-600">
                        {trade.entryPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}
                      </td>
                      <td className="py-3 px-2 text-sm text-slate-600">
                        {trade.exitPrice?.toFixed(trade.symbol.includes('JPY') ? 3 : 5) || '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn(
                          'font-semibold',
                          (getPnl(trade) || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {getPnl(trade) !== null ? formatCurrency(getPnl(trade)) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No trades found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'emerald' | 'red' | 'amber' | 'blue';
}

function StatCard({ title, value, icon: Icon, trend, trendValue, color }: StatCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
          <span className={cn(
            'text-sm',
            trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500'
          )}>
            {trendValue}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  color: 'emerald' | 'red';
}

function MetricRow({ label, value, color }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={cn(
        'font-semibold',
        color === 'emerald' ? 'text-emerald-600' : 'text-red-600'
      )}>
        {value}
      </span>
    </div>
  );
}

