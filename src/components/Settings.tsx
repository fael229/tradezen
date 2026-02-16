import { useState, useEffect } from 'react';
import { Save, Database, Key, Globe, Bell, Shield, CheckCircle, Trash2 } from 'lucide-react';
import { CREATE_TABLE_SQL } from '../lib/supabase';

interface SettingsProps {
  onClearData?: () => void;
}

export function Settings({ onClearData }: SettingsProps) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [notifications, setNotifications] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [showSQL, setShowSQL] = useState(false);

  useEffect(() => {
    // Load saved settings
    const savedUrl = localStorage.getItem('supabase_url') || '';
    const savedKey = localStorage.getItem('supabase_key') || '';
    const savedCurrency = localStorage.getItem('currency') || 'USD';
    const savedTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const savedNotifications = localStorage.getItem('notifications') !== 'false';

    setSupabaseUrl(savedUrl);
    setSupabaseKey(savedKey);
    setCurrency(savedCurrency);
    setTimezone(savedTimezone);
    setNotifications(savedNotifications);
  }, []);

  const handleSave = () => {
    localStorage.setItem('supabase_url', supabaseUrl);
    localStorage.setItem('supabase_key', supabaseKey);
    localStorage.setItem('currency', currency);
    localStorage.setItem('timezone', timezone);
    localStorage.setItem('notifications', String(notifications));

    // Dispatch event to update other components
    window.dispatchEvent(new Event('settings-changed'));

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Australia/Sydney',
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'USDC', 'USDT', 'USC'];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure your trading journal</p>
      </div>

      {/* Success Message */}
      {showSaved && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-emerald-700">Settings saved successfully!</p>
        </div>
      )}

      {/* Database Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Database Connection</h2>
              <p className="text-sm text-slate-500">Connect to Supabase for cloud storage</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Supabase URL
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Anon Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="your-anon-key"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowSQL(!showSQL)}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {showSQL ? 'Hide' : 'Show'} SQL setup script
            </button>

            {showSQL && (
              <div className="mt-3 p-4 bg-slate-900 rounded-lg overflow-x-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                  {CREATE_TABLE_SQL}
                </pre>
              </div>
            )}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Currently using local storage. Configure Supabase credentials above and run the SQL script in your Supabase dashboard to enable cloud storage.
            </p>
          </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
              <p className="text-sm text-slate-500">Customize your experience</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Base Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">Notifications</p>
                <p className="text-sm text-slate-500">Receive trading reminders</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'left-7' : 'left-1'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Data Management</h2>
              <p className="text-sm text-slate-500">Export and backup your data</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportData()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Export All Data
            </button>
            <button
              onClick={() => exportTrades()}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Export Trades (CSV)
            </button>
          </div>

          {onClearData && (
            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  if (window.confirm('Etes-vous sûr de vouloir supprimer TOUS les trades ? Cette action est irréversible.')) {
                    onClearData();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer tous les trades
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function exportData() {
  const data = {
    trades: JSON.parse(localStorage.getItem('tradezella_trades') || '[]'),
    playbook: JSON.parse(localStorage.getItem('tradezella_playbook') || '[]'),
    settings: {
      currency: localStorage.getItem('currency'),
      timezone: localStorage.getItem('timezone'),
    },
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradezen_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportTrades() {
  const trades = JSON.parse(localStorage.getItem('tradezella_trades') || '[]');

  if (trades.length === 0) {
    alert('No trades to export');
    return;
  }

  const headers = ['Symbol', 'Direction', 'Entry Price', 'Exit Price', 'Units', 'Entry Time', 'Exit Time', 'Stop Loss', 'Take Profit', 'P&L', 'Status', 'Notes'];
  const rows = trades.map((t: Record<string, unknown>) => [
    t.symbol,
    t.direction,
    t.entryPrice,
    t.exitPrice || '',
    t.units,
    t.entryTime,
    t.exitTime || '',
    t.stopLoss || '',
    t.takeProfit || '',
    t.pnl || '',
    t.status,
    (t.notes as string || '').replace(/,/g, ';'),
  ].join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
