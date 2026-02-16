import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Trade } from '../types/trade';
import { cn } from '../utils/cn';
import { SymbolSearchMini } from './SymbolSearch';

interface TradeModalProps {
  trade: Trade | null;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function TradeModal({ trade, mode, onClose, onSave }: TradeModalProps) {
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    entryPrice: '',
    exitPrice: '',
    units: '',
    entryTime: '',
    exitTime: '',
    stopLoss: '',
    takeProfit: '',
    status: 'open' as 'open' | 'closed' | 'cancelled',
    currency: 'USD',
    notes: '',
    tags: [] as string[],
    strategy: '',
  });

  useEffect(() => {
    if (trade && mode === 'edit') {
      setFormData({
        symbol: trade.symbol,
        direction: trade.direction,
        entryPrice: trade.entryPrice.toString(),
        exitPrice: trade.exitPrice?.toString() || '',
        units: trade.units.toString(),
        entryTime: trade.entryTime ? new Date(trade.entryTime).toISOString().slice(0, 16) : '',
        exitTime: trade.exitTime ? new Date(trade.exitTime).toISOString().slice(0, 16) : '',
        stopLoss: trade.stopLoss?.toString() || '',
        takeProfit: trade.takeProfit?.toString() || '',
        status: trade.status,
        currency: trade.currency || 'USD',
        notes: trade.notes,
        tags: trade.tags,
        strategy: trade.strategy || '',
      });
    }
  }, [trade, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const entryPrice = parseFloat(formData.entryPrice);
    const exitPrice = formData.exitPrice ? parseFloat(formData.exitPrice) : null;
    const units = parseFloat(formData.units);
    const stopLoss = formData.stopLoss ? parseFloat(formData.stopLoss) : null;
    const takeProfit = formData.takeProfit ? parseFloat(formData.takeProfit) : null;

    let pnl = null;
    let pnlPercent = null;

    if (exitPrice !== null && formData.status === 'closed') {
      const direction = formData.direction;
      pnl = direction === 'long'
        ? (exitPrice - entryPrice) * units
        : (entryPrice - exitPrice) * units;
      pnlPercent = ((pnl / (entryPrice * units)) * 100);
    }

    onSave({
      symbol: formData.symbol.toUpperCase(),
      direction: formData.direction,
      entryPrice,
      exitPrice,
      units,
      entryTime: new Date(formData.entryTime).toISOString(),
      exitTime: formData.exitTime ? new Date(formData.exitTime).toISOString() : null,
      stopLoss,
      takeProfit,
      pnl,
      pnlPercent,
      currency: formData.currency,
      status: formData.status,
      notes: formData.notes,
      tags: formData.tags,
      strategy: formData.strategy || undefined,
    });
  };

  const isReadOnly = false;
  const title = mode === 'add' ? 'Add New Trade' : 'Edit Trade';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Symbol</label>
              {isReadOnly ? (
                <input
                  type="text"
                  value={formData.symbol}
                  readOnly
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50"
                />
              ) : (
                <SymbolSearchMini
                  value={formData.symbol}
                  onChange={(symbol) => setFormData({ ...formData, symbol })}
                />
              )}
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value as 'long' | 'short' })}
                disabled={isReadOnly}
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entry Price</label>
              <input
                type="number"
                step="any"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                readOnly={isReadOnly}
                required
                placeholder="0.00000"
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Exit Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exit Price</label>
              <input
                type="number"
                step="any"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                readOnly={isReadOnly}
                placeholder="0.00000"
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Units */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Units</label>
              <input
                type="number"
                step="any"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                readOnly={isReadOnly}
                required
                placeholder="100000"
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'closed' | 'cancelled' })}
                disabled={isReadOnly}
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Entry Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Entry Time</label>
              <input
                type="datetime-local"
                value={formData.entryTime}
                onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                readOnly={isReadOnly}
                required
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Exit Time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Exit Time</label>
              <input
                type="datetime-local"
                value={formData.exitTime}
                onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                readOnly={isReadOnly}
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                readOnly={isReadOnly}
                placeholder="0.00000"
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Take Profit</label>
              <input
                type="number"
                step="any"
                value={formData.takeProfit}
                onChange={(e) => setFormData({ ...formData, takeProfit: e.target.value })}
                readOnly={isReadOnly}
                placeholder="0.00000"
                className={cn(
                  "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                  isReadOnly && "bg-slate-50"
                )}
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={isReadOnly}
              className={cn(
                "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                isReadOnly && "bg-slate-50"
              )}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CHF">CHF</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="USC">USC (Cents)</option>
            </select>
          </div>

          {/* Strategy */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Strategy</label>
            <select
              value={formData.strategy}
              onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
              disabled={isReadOnly}
              className={cn(
                "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500",
                isReadOnly && "bg-slate-50"
              )}
            >
              <option value="">Select a strategy...</option>
              <option value="Breakout">Breakout</option>
              <option value="Trend Following">Trend Following</option>
              <option value="Mean Reversion">Mean Reversion</option>
              <option value="Scalping">Scalping</option>
              <option value="Swing Trading">Swing Trading</option>
              <option value="News Trading">News Trading</option>
              <option value="Support/Resistance">Support/Resistance</option>
              <option value="Supply/Demand">Supply/Demand</option>
              <option value="ICT">ICT</option>
              <option value="SMC">SMC</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              readOnly={isReadOnly}
              rows={4}
              placeholder="Add notes about this trade..."
              className={cn(
                "w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none",
                isReadOnly && "bg-slate-50"
              )}
            />
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                {mode === 'add' ? 'Add Trade' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
