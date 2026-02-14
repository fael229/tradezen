import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Journal } from './components/Journal';
import { Analytics } from './components/Analytics';
import ImportCSV from './components/ImportCSV';
import { Calendar } from './components/Calendar';
import { Playbook } from './components/Playbook';
import { Settings } from './components/Settings';
import { SymbolExplorer } from './components/SymbolExplorer';
import { useTradeStore } from './hooks/useTradeStore';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const {
    trades,
    loading: tradesLoading,
    stats,
    dailyStats,
    addTrade,
    updateTrade,
    deleteTrade,
    bulkAddTrades,
    clearAllTrades,
  } = useTradeStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const renderPage = () => {
    if (tradesLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading your trades...</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard trades={trades} />;
      case 'journal':
        return (
          <Journal
            trades={trades}
            onAddTrade={addTrade}
            onUpdateTrade={updateTrade}
            onDeleteTrade={deleteTrade}
          />
        );
      case 'analytics':
        return <Analytics trades={trades} stats={stats} dailyStats={dailyStats} />;
      case 'calendar':
        return <Calendar trades={trades} />;
      case 'symbols':
        return <SymbolExplorer />;
      case 'playbook':
        return <Playbook />;
      case 'import':
        return <ImportCSV onImport={bulkAddTrades} onClear={clearAllTrades} />;
      case 'settings':
        return <Settings onClearData={clearAllTrades} />;
      default:
        return <Dashboard trades={trades} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 ml-64 p-8">
        {renderPage()}
      </main>
    </div>
  );
}
