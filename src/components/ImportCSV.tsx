import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, X, ArrowRight, Info, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Trade } from '../types/trade';
import {
  parseBalanceHistoryCSV,
  parseOrderLogsCSV,
  mergeTradeData,
  parseBalanceHistoryTrades,
  BalanceHistoryEntry,
  OrderLogEntry
} from '../lib/csvParser';

interface ImportCSVProps {
  onImport: (trades: Trade[]) => void;
}

export default function ImportCSV({ onImport }: ImportCSVProps) {
  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [journalFile, setJournalFile] = useState<File | null>(null);
  const [balanceEntries, setBalanceEntries] = useState<BalanceHistoryEntry[]>([]);
  const [journalEntries, setJournalEntries] = useState<OrderLogEntry[]>([]);
  const [parsedTrades, setParsedTrades] = useState<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

  const handleBalanceFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const entries = parseBalanceHistoryCSV(content);
        
        if (entries.length === 0) {
          setError('Aucun trade trouvé dans le fichier historique des soldes');
          return;
        }
        
        setBalanceEntries(entries);
        setBalanceFile(file);
        setError(null);
        
        // If we already have journal entries, merge them
        if (journalEntries.length > 0) {
          const trades = mergeTradeData(entries, journalEntries);
          setParsedTrades(trades);
        } else {
          // Parse without journal (no SL/TP)
          const trades = parseBalanceHistoryTrades(entries);
          setParsedTrades(trades);
        }
      } catch (err) {
        setError('Erreur lors de la lecture du fichier: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, [journalEntries]);

  const handleJournalFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const entries = parseOrderLogsCSV(content);
        
        if (entries.length === 0) {
          setError('Aucune entrée trouvée dans le journal de trading');
          return;
        }
        
        setJournalEntries(entries);
        setJournalFile(file);
        setError(null);
        
        // If we already have balance entries, merge them
        if (balanceEntries.length > 0) {
          const trades = mergeTradeData(balanceEntries, entries);
          setParsedTrades(trades);
        }
      } catch (err) {
        setError('Erreur lors de la lecture du fichier journal: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, [balanceEntries]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'balance' | 'journal') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      if (type === 'balance') {
        handleBalanceFile(file);
      } else {
        handleJournalFile(file);
      }
    } else {
      setError('Veuillez déposer un fichier CSV');
    }
  }, [handleBalanceFile, handleJournalFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'balance' | 'journal') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'balance') {
        handleBalanceFile(file);
      } else {
        handleJournalFile(file);
      }
    }
  }, [handleBalanceFile, handleJournalFile]);

  const handleImport = async () => {
    if (parsedTrades.length === 0) return;
    
    setImporting(true);
    
    try {
      const now = new Date().toISOString();
      const trades: Trade[] = parsedTrades.map(trade => ({
        ...trade,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      }));
      
      onImport(trades);
      setStep('complete');
    } catch (err) {
      setError('Erreur lors de l\'import: ' + (err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setBalanceFile(null);
    setJournalFile(null);
    setBalanceEntries([]);
    setJournalEntries([]);
    setParsedTrades([]);
    setError(null);
    setStep('upload');
  };

  const downloadSampleBalance = () => {
    const sample = `Heure,Balance avant,Balance après,Pertes et profits réalisés (valeur),Pertes et profits réalisés (devise),Action
2026-02-11 13:31:49,133009.73388878,137127.38028878,4117.646399999998,USD,"Close short position for symbol OANDA:EURUSD at price 1.19018 for 2941176 units. Position AVG Price was 1.191580, currency: USD, rate: 1.000000, point value: 1.000000"
2026-02-11 10:52:06,126489.21388877608,133009.73388877604,6520.51999999996,USD,"Close long position for symbol OANDA:XAUUSD at price 5063.050 for 446 units. Position AVG Price was 5048.430000, currency: USD, rate: 1.000000, point value: 1.000000"
2026-02-11 05:49:48,125665.37428877641,129916.4138887764,4251.039599999989,USD,"Close short position for symbol OANDA:GBPJPY at price 209.576 for 200000 units. Position AVG Price was 212.837000, currency: JPY, rate: 0.006518, point value: 1.000000"`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historique_soldes_exemple.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleJournal = () => {
    const sample = `Heure,Texte
2026-02-11 13:31:49,Order 2748525624 for symbol OANDA:EURUSD has been executed at price 1.19018 for 2941176 units
2026-02-11 13:31:49,Order 2748525624 successfully placed
2026-02-11 13:31:49,Call to place market order to buy 2941176 units of symbol OANDA:EURUSD 
2026-02-11 12:03:17,Order 2748283431 for symbol OANDA:EURUSD has been executed at price 1.19158 for 2941176 units
2026-02-11 12:03:17,Order 2748283431 successfully placed
2026-02-11 12:03:17,Call to place market order to sell 2941176 units of symbol OANDA:EURUSD with SL 1.19278 and TP 1.18972
2026-02-11 09:32:59,Call to place market order to buy 446 units of symbol OANDA:XAUUSD with SL 5041.184 and TP 5073.841
2026-02-11 08:58:36,Modify position for symbol OANDA:GBPJPY with SL 212.890 and TP 207.978`;
    
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal_trading_exemple.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate stats
  const stats = {
    total: parsedTrades.length,
    winning: parsedTrades.filter(t => (t.pnl || 0) > 0).length,
    losing: parsedTrades.filter(t => (t.pnl || 0) < 0).length,
    totalPnl: parsedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    withSlTp: parsedTrades.filter(t => t.stopLoss && t.takeProfit).length,
    withoutSlTp: parsedTrades.filter(t => !t.stopLoss || !t.takeProfit).length
  };

  if (step === 'complete') {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Import réussi !</h2>
          <p className="text-gray-400 mb-8">
            {stats.total} trades ont été importés avec succès dans votre journal.
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Trades importés</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-500">{stats.winning}</div>
              <div className="text-sm text-gray-400">Gagnants</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-500">{stats.losing}</div>
              <div className="text-sm text-gray-400">Perdants</div>
            </div>
          </div>
          
          <button
            onClick={resetImport}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            Importer d'autres trades
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Import CSV TradingView</h2>
          <p className="text-gray-400">
            Importez vos trades depuis TradingView en utilisant les fichiers d'export CSV.
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-400 font-medium mb-1">Comment obtenir ces fichiers ?</h4>
              <p className="text-gray-400 text-sm">
                Dans TradingView, allez dans <strong>Panel de Trading</strong> → <strong>Historique</strong> → 
                Cliquez sur le bouton <strong>Exporter</strong> pour chaque onglet.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Balance History File */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  balanceFile ? 'bg-green-500/20' : 'bg-blue-500/20'
                }`}>
                  <FileText className={`w-5 h-5 ${balanceFile ? 'text-green-400' : 'text-blue-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Historique des Soldes</h3>
                  <p className="text-xs text-gray-400">Requis • Contient les P&L et prix</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Requis</span>
            </div>

            {balanceFile ? (
              <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-white font-medium">{balanceFile.name}</p>
                      <p className="text-sm text-gray-400">{balanceEntries.length} trades détectés</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setBalanceFile(null);
                      setBalanceEntries([]);
                      setParsedTrades([]);
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'balance')}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Glissez-déposez votre fichier ici</p>
                <label className="cursor-pointer">
                  <span className="text-blue-400 hover:text-blue-300">ou parcourez vos fichiers</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileSelect(e, 'balance')}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <button
              onClick={downloadSampleBalance}
              className="mt-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <Download className="w-4 h-4" />
              Télécharger un exemple
            </button>
          </div>

          {/* Journal File */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  journalFile ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  <FileText className={`w-5 h-5 ${journalFile ? 'text-green-400' : 'text-yellow-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Journal de Trading</h3>
                  <p className="text-xs text-gray-400">Optionnel • Contient les SL/TP</p>
                </div>
              </div>
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Optionnel</span>
            </div>

            {journalFile ? (
              <div className="border border-green-500/30 bg-green-500/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-white font-medium">{journalFile.name}</p>
                      <p className="text-sm text-gray-400">{journalEntries.length} entrées détectées</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setJournalFile(null);
                      setJournalEntries([]);
                      // Re-parse without journal
                      if (balanceEntries.length > 0) {
                        const trades = parseBalanceHistoryTrades(balanceEntries);
                        setParsedTrades(trades);
                      }
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'journal')}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-yellow-500/50 transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Glissez-déposez votre fichier ici</p>
                <label className="cursor-pointer">
                  <span className="text-yellow-400 hover:text-yellow-300">ou parcourez vos fichiers</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileSelect(e, 'journal')}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <button
              onClick={downloadSampleJournal}
              className="mt-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <Download className="w-4 h-4" />
              Télécharger un exemple
            </button>
          </div>
        </div>

        {/* Merge Status */}
        {balanceFile && (
          <div className={`mb-8 p-4 rounded-lg border ${
            journalFile 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-white">{balanceEntries.length} trades</span>
              </div>
              
              {journalFile && (
                <>
                  <ArrowRight className="w-5 h-5 text-gray-500" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-white">{journalEntries.length} logs</span>
                  </div>
                </>
              )}
              
              <ArrowRight className="w-5 h-5 text-gray-500" />
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-white">
                  {parsedTrades.length} trades avec {stats.withSlTp} SL/TP
                </span>
              </div>
              
              {!journalFile && (
                <span className="ml-auto text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  SL/TP manquants - ajoutez le journal
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedTrades.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">Aperçu des trades ({parsedTrades.length})</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-400">
                  ✓ {stats.winning} gagnants
                </span>
                <span className="text-red-400">
                  ✗ {stats.losing} perdants
                </span>
                <span className={stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                  P&L: ${stats.totalPnl.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-900 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Symbole</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Entry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Exit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">SL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">TP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Units</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {parsedTrades.slice(0, 50).map((trade, index) => (
                    <tr key={index} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(trade.exitTime || '').toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{trade.symbol}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trade.direction === 'long' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {trade.entryPrice?.toFixed(trade.entryPrice < 10 ? 5 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {trade.exitPrice?.toFixed(trade.exitPrice < 10 ? 5 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trade.stopLoss ? (
                          <span className="text-red-400">
                            {trade.stopLoss.toFixed(trade.stopLoss < 10 ? 5 : 2)}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trade.takeProfit ? (
                          <span className="text-green-400">
                            {trade.takeProfit.toFixed(trade.takeProfit < 10 ? 5 : 2)}
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {trade.units?.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {(trade.pnl || 0) >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedTrades.length > 50 && (
                <div className="p-4 text-center text-gray-400 bg-gray-900">
                  + {parsedTrades.length - 50} autres trades...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Button */}
        {parsedTrades.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
            >
              {importing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Importer {parsedTrades.length} trades
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
