import { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import type { Trade } from '../types/trade';
import { cn } from '../utils/cn';
import { convertCurrency } from '../utils/currencyConversion';
import { formatCurrency as formatCurrencyUtil } from '../utils/currency';

interface CalendarProps {
  trades: Trade[];
  baseCurrency?: string;
}

export function Calendar({ trades, baseCurrency = 'USD' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Calculate daily P&L
  const dailyPnl = new Map<string, { pnl: number; trades: number; wins: number }>();

  const getPnl = (t: Trade) => convertCurrency(t.pnl || 0, t.currency || 'USD', baseCurrency);

  for (const trade of trades) {
    if (trade.status === 'closed' && trade.exitTime && trade.pnl !== null) {
      const dateKey = new Date(trade.exitTime).toISOString().split('T')[0];
      const current = dailyPnl.get(dateKey) || { pnl: 0, trades: 0, wins: 0 };
      current.pnl += getPnl(trade);
      current.trades += 1;
      if ((trade.pnl || 0) > 0) current.wins += 1;
      dailyPnl.set(dateKey, current);
    }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value, baseCurrency);
  };

  // Generate calendar days
  const calendarDays = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      day,
      dateKey,
      data: dailyPnl.get(dateKey),
    });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate monthly stats
  const monthlyTrades = trades.filter(t => {
    if (!t.exitTime) return false;
    const exitDate = new Date(t.exitTime);
    return exitDate.getMonth() === month && exitDate.getFullYear() === year;
  });

  const monthlyPnl = monthlyTrades.reduce((sum, t) => sum + getPnl(t), 0);
  const monthlyWins = monthlyTrades.filter(t => (t.pnl || 0) > 0).length;
  const monthlyWinRate = monthlyTrades.length > 0 ? (monthlyWins / monthlyTrades.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Trading Calendar</h1>
        <p className="text-slate-500">Visualize your daily trading performance</p>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Monthly P&L</p>
          <p className={cn(
            "text-2xl font-bold",
            monthlyPnl >= 0 ? "text-emerald-600" : "text-red-600"
          )}>
            {formatCurrency(monthlyPnl)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Trades</p>
          <p className="text-2xl font-bold text-slate-900">{monthlyTrades.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Win Rate</p>
          <p className={cn(
            "text-2xl font-bold",
            monthlyWinRate >= 50 ? "text-emerald-600" : "text-amber-600"
          )}>
            {monthlyWinRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Trading Days</p>
          <p className="text-2xl font-bold text-slate-900">
            {Array.from(dailyPnl.keys()).filter(key => {
              const date = new Date(key);
              return date.getMonth() === month && date.getFullYear() === year;
            }).length}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          {/* Day names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-slate-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, index) => {
              if (cell === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const isToday =
                cell.day === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              const hasTrades = cell.data && cell.data.trades > 0;
              const pnl = cell.data?.pnl || 0;
              const isProfit = pnl > 0;

              return (
                <div
                  key={cell.dateKey}
                  className={cn(
                    "aspect-square rounded-lg p-2 transition-all duration-200 cursor-pointer",
                    isToday && "ring-2 ring-emerald-500",
                    hasTrades
                      ? isProfit
                        ? "bg-emerald-50 hover:bg-emerald-100"
                        : "bg-red-50 hover:bg-red-100"
                      : "bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <div className="h-full flex flex-col">
                    <span className={cn(
                      "text-sm font-medium",
                      isToday ? "text-emerald-600" : "text-slate-700"
                    )}>
                      {cell.day}
                    </span>

                    {hasTrades && (
                      <div className="flex-1 flex flex-col justify-end">
                        <div className="flex items-center gap-1">
                          {isProfit
                            ? <TrendingUp className="w-3 h-3 text-emerald-600" />
                            : <TrendingDown className="w-3 h-3 text-red-600" />
                          }
                          <span className={cn(
                            "text-xs font-semibold",
                            isProfit ? "text-emerald-600" : "text-red-600"
                          )}>
                            {formatCurrency(pnl)}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {cell.data!.trades} trade{cell.data!.trades > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-100" />
          <span className="text-sm text-slate-600">Profitable Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-100" />
          <span className="text-sm text-slate-600">Losing Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-100" />
          <span className="text-sm text-slate-600">No Trades</span>
        </div>
      </div>
    </div>
  );
}
