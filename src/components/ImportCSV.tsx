import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download, X, ArrowRight, Info, Trash2, LayoutTemplate } from 'lucide-react';
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
import { parseMT5Report } from '../lib/mt5Parser';
import { cn } from '../utils/cn';

interface ImportCSVProps {
  onImport: (trades: Trade[]) => void;
  onClear?: () => Promise<void>;
}

export default function ImportCSV({ onImport, onClear }: ImportCSVProps) {
  const [importMode, setImportMode] = useState<'tradingview' | 'mt5'>('tradingview');
  const [balanceFile, setBalanceFile] = useState<File | null>(null);
  const [journalFile, setJournalFile] = useState<File | null>(null);
  const [mt5File, setMt5File] = useState<File | null>(null);
  const [autoClear, setAutoClear] = useState(true);
  const [importCurrency, setImportCurrency] = useState('USD');

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

  const handleMt5File = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const trades = parseMT5Report(content);

        if (trades.length === 0) {
          setError('Aucun trade trouvé dans le rapport MT5. Assurez-vous d\'utiliser le rapport HTML standard.');
          return;
        }

        setParsedTrades(trades);
        setMt5File(file);
        setError(null);
      } catch (err) {
        setError('Erreur lors de l\'analyse du rapport MT5: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'balance' | 'journal' | 'mt5') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (type === 'mt5') {
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          handleMt5File(file);
        } else {
          setError('Veuillez déposer un fichier HTML');
        }
      } else if (file.name.endsWith('.csv')) {
        if (type === 'balance') {
          handleBalanceFile(file);
        } else {
          handleJournalFile(file);
        }
      } else {
        setError('Veuillez déposer un fichier CSV pour TradingView ou HTML pour MT5');
      }
    }
  }, [handleBalanceFile, handleJournalFile, handleMt5File]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'balance' | 'journal' | 'mt5') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'mt5') {
        handleMt5File(file);
      } else if (type === 'balance') {
        handleBalanceFile(file);
      } else {
        handleJournalFile(file);
      }
    }
  }, [handleBalanceFile, handleJournalFile, handleMt5File]);

  const handleImport = async () => {
    if (parsedTrades.length === 0) return;

    setImporting(true);

    try {
      if (autoClear && onClear) {
        await onClear();
      }

      const now = new Date().toISOString();
      const trades: Trade[] = parsedTrades.map(trade => ({
        ...trade,
        symbol: trade.symbol.substring(0, 6),
        currency: importCurrency, // Apply selected import currency
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
    setMt5File(null);
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Import réussi !</h2>
          <p className="text-slate-500 mb-8">
            {stats.total} trades ont été importés avec succès dans votre journal.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
              <div className="text-sm text-slate-500">Trades importés</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.winning}</div>
              <div className="text-sm text-slate-500">Gagnants</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <div className="text-2xl font-bold text-red-600">{stats.losing}</div>
              <div className="text-sm text-slate-500">Perdants</div>
            </div>
          </div>

          <button
            onClick={resetImport}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Import Trades</h2>
          <p className="text-slate-500">
            Importez vos trades depuis TradingView ou MetaTrader 5.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              setImportMode('tradingview');
              resetImport();
            }}
            className={cn(
              "px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors",
              importMode === 'tradingview'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
          >
            <FileText className="w-5 h-5" />
            TradingView CSV
          </button>
          <button
            onClick={() => {
              setImportMode('mt5');
              resetImport();
            }}
            className={cn(
              "px-4 py-3 rounded-lg flex items-center gap-2 font-medium transition-colors",
              importMode === 'mt5'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            )}
          >
            <LayoutTemplate className="w-5 h-5" />
            MetaTrader 5 Report
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-700 font-medium mb-1">
                {importMode === 'tradingview' ? 'Comment obtenir les fichiers CSV TradingView ?' : 'Comment obtenir le rapport MT5 ?'}
              </h4>
              <p className="text-blue-600 text-sm">
                {importMode === 'tradingview' ? (
                  <>
                    Dans TradingView, allez dans <strong>Panel de Trading</strong> → <strong>Historique</strong> →
                    Cliquez sur le bouton <strong>Exporter</strong> pour l'Historique des soldes et le Journal.
                  </>
                ) : (
                  <>
                    Dans MetaTrader 5, allez dans l'onglet <strong>Historique</strong> → Clic droit →
                    <strong>Rapport</strong> → <strong>HTML</strong> (Standard).
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-600">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {importMode === 'tradingview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Balance History File */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balanceFile ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                    <FileText className={`w-5 h-5 ${balanceFile ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Historique des Soldes</h3>
                    <p className="text-xs text-slate-500">Requis • Contient les P&L et prix</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Requis</span>
              </div>

              {balanceFile ? (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-slate-900 font-medium">{balanceFile.name}</p>
                        <p className="text-sm text-slate-500">{balanceEntries.length} trades détectés</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setBalanceFile(null);
                        setBalanceEntries([]);
                        setParsedTrades([]);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'balance')}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">Glissez-déposez votre fichier ici</p>
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">ou parcourez vos fichiers</span>
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
                className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <Download className="w-4 h-4" />
                Télécharger un exemple
              </button>
            </div>

            {/* Journal File */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${journalFile ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                    <FileText className={`w-5 h-5 ${journalFile ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Journal de Trading</h3>
                    <p className="text-xs text-slate-500">Optionnel • Contient les SL/TP</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">Optionnel</span>
              </div>

              {journalFile ? (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-slate-900 font-medium">{journalFile.name}</p>
                        <p className="text-sm text-slate-500">{journalEntries.length} entrées détectées</p>
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
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'journal')}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-amber-500 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">Glissez-déposez votre fichier ici</p>
                  <label className="cursor-pointer">
                    <span className="text-amber-600 hover:text-amber-700 font-medium">ou parcourez vos fichiers</span>
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
                className="mt-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
              >
                <Download className="w-4 h-4" />
                Télécharger un exemple
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mt5File ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                    <LayoutTemplate className={`w-5 h-5 ${mt5File ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Rapport MT5 (HTML)</h3>
                    <p className="text-xs text-slate-500">Fichier de rapport complet avec positions</p>
                  </div>
                </div>
              </div>

              {mt5File ? (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-slate-900 font-medium">{mt5File.name}</p>
                        <p className="text-sm text-slate-500">{parsedTrades.length} trades détectés</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMt5File(null);
                        setParsedTrades([]);
                      }}
                      className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'mt5')}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 mb-2">Glissez-déposez votre fichier HTML ici</p>
                  <label className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">ou parcourez vos fichiers</span>
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={(e) => handleFileSelect(e, 'mt5')}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Merge Status */}
        {importMode === 'tradingview' && balanceFile && (
          <div className={`mb-8 p-4 rounded-lg border ${journalFile
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
            }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-slate-700">{balanceEntries.length} trades</span>
              </div>

              {journalFile && (
                <>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-slate-700">{journalEntries.length} logs</span>
                  </div>
                </>
              )}

              <ArrowRight className="w-5 h-5 text-slate-400" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-slate-700">
                  {parsedTrades.length} trades avec {stats.withSlTp} SL/TP
                </span>
              </div>

              {!journalFile && (
                <span className="ml-auto text-amber-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  SL/TP manquants - ajoutez le journal
                </span>
              )}
            </div>
          </div>
        )}

        {/* Preview Table */}
        {parsedTrades.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900">Aperçu des trades ({parsedTrades.length})</h3>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-green-600 font-medium">
                  ✓ {stats.winning} gagnants
                </span>
                <span className="text-red-600 font-medium">
                  ✗ {stats.losing} perdants
                </span>
                <span className={cn("font-medium", stats.totalPnl >= 0 ? 'text-green-600' : 'text-red-600')}>
                  P&L: ${stats.totalPnl.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Symbole</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entry</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Exit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">TP</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {parsedTrades.slice(0, 50).map((trade, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(trade.exitTime || trade.entryTime).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{trade.symbol}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === 'long'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                          }`}>
                          {trade.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {trade.entryPrice?.toFixed(trade.entryPrice < 10 ? 5 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {trade.exitPrice?.toFixed(trade.exitPrice < 10 ? 5 : 2)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trade.stopLoss ? (
                          <span className="text-red-600">
                            {trade.stopLoss.toFixed(trade.stopLoss < 10 ? 5 : 2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trade.takeProfit ? (
                          <span className="text-green-600">
                            {trade.takeProfit.toFixed(trade.takeProfit < 10 ? 5 : 2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {trade.units?.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${(trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {(trade.pnl || 0) >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedTrades.length > 50 && (
                <div className="p-4 text-center text-slate-500 bg-slate-50 border-t border-slate-200">
                  + {parsedTrades.length - 50} autres trades...
                </div>
              )}
            </div>
          </div>
        )}

        {parsedTrades.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Devise du compte :</span>
              <select
                value={importCurrency}
                onChange={(e) => setImportCurrency(e.target.value)}
                className="bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block p-2"
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
              </select>
            </div>

            {onClear && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoClear}
                  onChange={(e) => setAutoClear(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-sm text-slate-700">Supprimer les données existantes avant l'import</span>
              </label>
            )}
            
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
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
