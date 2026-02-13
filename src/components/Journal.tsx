import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ChevronRight
} from 'lucide-react';
import type { Trade } from '../types/trade';
import { cn } from '../utils/cn';
import { TradeModal } from './TradeModal';
import { TradeDetails } from './TradeDetails';

interface JournalProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
}

export function Journal({ trades, onAddTrade, onUpdateTrade, onDeleteTrade }: JournalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'long' | 'short'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          trade.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDirection = filterDirection === 'all' || trade.direction === filterDirection;
    const matchesStatus = filterStatus === 'all' || trade.status === filterStatus;
    return matchesSearch && matchesDirection && matchesStatus;
  });

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAddClick = () => {
    setSelectedTrade(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  const handleEditClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setModalMode('edit');
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleViewClick = (trade: Trade) => {
    setSelectedTrade(trade);
    setShowDetails(true);
    setActiveMenu(null);
  };

  const handleRowClick = (trade: Trade, e: React.MouseEvent) => {
    // Prevent opening details when clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('.action-menu')) return;
    setSelectedTrade(trade);
    setShowDetails(true);
  };

  const handleDetailsEdit = (trade: Trade) => {
    setShowDetails(false);
    setSelectedTrade(trade);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this trade?')) {
      onDeleteTrade(id);
    }
    setActiveMenu(null);
  };

  const handleModalSave = (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (modalMode === 'add') {
      onAddTrade(trade);
    } else if (modalMode === 'edit' && selectedTrade) {
      onUpdateTrade(selectedTrade.id, trade);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Trade Journal</h1>
          <p className="text-slate-500">Track and analyze all your trades</p>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Add Trade
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by symbol or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Direction Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value as 'all' | 'long' | 'short')}
              className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Directions</option>
              <option value="long">Long Only</option>
              <option value="short">Short Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
            className="border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Symbol</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Direction</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Entry Time</th>
                <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Exit Time</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Entry Price</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Exit Price</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Units</th>
                <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase">P&L</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="text-center py-4 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No trades found. Add your first trade or import from CSV.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr 
                    key={trade.id} 
                    className="border-t border-slate-100 hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                    onClick={(e) => handleRowClick(trade, e)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{trade.symbol}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
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
                    <td className="py-4 px-4 text-sm text-slate-600">{formatDate(trade.entryTime)}</td>
                    <td className="py-4 px-4 text-sm text-slate-600">{formatDate(trade.exitTime)}</td>
                    <td className="py-4 px-4 text-right text-sm text-slate-900 font-mono">
                      {trade.entryPrice.toFixed(trade.symbol.includes('JPY') ? 3 : 5)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-900 font-mono">
                      {trade.exitPrice?.toFixed(trade.symbol.includes('JPY') ? 3 : 5) || '-'}
                    </td>
                    <td className="py-4 px-4 text-right text-sm text-slate-600">
                      {trade.units.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={cn(
                        'font-semibold',
                        (trade.pnl || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                      )}>
                        {formatCurrency(trade.pnl)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        trade.status === 'open' ? 'bg-blue-100 text-blue-700' :
                        trade.status === 'closed' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      )}>
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center relative action-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === trade.id ? null : trade.id);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      
                      {activeMenu === trade.id && (
                        <div className="absolute right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewClick(trade);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(trade);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(trade.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trade Modal */}
      {isModalOpen && (
        <TradeModal
          trade={selectedTrade}
          mode={modalMode}
          onClose={() => setIsModalOpen(false)}
          onSave={handleModalSave}
        />
      )}

      {/* Trade Details Modal */}
      {showDetails && selectedTrade && (
        <TradeDetails
          trade={selectedTrade}
          onClose={() => setShowDetails(false)}
          onEdit={handleDetailsEdit}
          onDelete={onDeleteTrade}
        />
      )}
    </div>
  );
}
