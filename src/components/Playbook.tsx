import { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, BookOpen, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface Strategy {
  id: string;
  name: string;
  description: string;
  rules: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: string;
  timeframe: string;
  pairs: string[];
  notes: string;
}

const STORAGE_KEY = 'tradezella_playbook';

export function Playbook() {
  const [strategies, setStrategies] = useState<Strategy[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return [
      {
        id: '1',
        name: 'Breakout Strategy',
        description: 'Trading breakouts from key support/resistance levels',
        rules: [
          'Wait for price to consolidate near S/R level',
          'Look for volume confirmation on breakout',
          'Entry on retest of broken level',
        ],
        entryConditions: [
          'Price breaks key S/R with momentum',
          'Volume above 20-period average',
          'RSI not in overbought/oversold',
        ],
        exitConditions: [
          'Take profit at 2R',
          'Trail stop after 1R',
          'Exit on reversal signal',
        ],
        riskManagement: '1% risk per trade, max 3 trades per day',
        timeframe: 'H1, H4',
        pairs: ['EURUSD', 'GBPJPY', 'XAUUSD'],
        notes: 'Best during London/NY session overlap',
      },
    ];
  });

  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const saveStrategies = (newStrategies: Strategy[]) => {
    setStrategies(newStrategies);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStrategies));
  };

  const handleAddStrategy = () => {
    setEditingStrategy({
      id: Date.now().toString(),
      name: '',
      description: '',
      rules: [''],
      entryConditions: [''],
      exitConditions: [''],
      riskManagement: '',
      timeframe: '',
      pairs: [],
      notes: '',
    });
    setIsAddingNew(true);
  };

  const handleSaveStrategy = () => {
    if (!editingStrategy) return;

    if (isAddingNew) {
      saveStrategies([...strategies, editingStrategy]);
    } else {
      saveStrategies(
        strategies.map((s) => (s.id === editingStrategy.id ? editingStrategy : s))
      );
    }
    setEditingStrategy(null);
    setIsAddingNew(false);
  };

  const handleDeleteStrategy = (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      saveStrategies(strategies.filter((s) => s.id !== id));
    }
  };

  const handleCancel = () => {
    setEditingStrategy(null);
    setIsAddingNew(false);
  };

  const updateField = (field: keyof Strategy, value: string | string[]) => {
    if (!editingStrategy) return;
    setEditingStrategy({ ...editingStrategy, [field]: value });
  };

  const addListItem = (field: 'rules' | 'entryConditions' | 'exitConditions') => {
    if (!editingStrategy) return;
    setEditingStrategy({
      ...editingStrategy,
      [field]: [...editingStrategy[field], ''],
    });
  };

  const updateListItem = (
    field: 'rules' | 'entryConditions' | 'exitConditions',
    index: number,
    value: string
  ) => {
    if (!editingStrategy) return;
    const newList = [...editingStrategy[field]];
    newList[index] = value;
    setEditingStrategy({ ...editingStrategy, [field]: newList });
  };

  const removeListItem = (
    field: 'rules' | 'entryConditions' | 'exitConditions',
    index: number
  ) => {
    if (!editingStrategy) return;
    const newList = editingStrategy[field].filter((_, i) => i !== index);
    setEditingStrategy({ ...editingStrategy, [field]: newList });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Playbook</h1>
          <p className="text-slate-500">Document your trading strategies</p>
        </div>
        <button
          onClick={handleAddStrategy}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Add Strategy
        </button>
      </div>

      {/* Strategy Editor Modal */}
      {editingStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {isAddingNew ? 'New Strategy' : 'Edit Strategy'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Strategy Name
                  </label>
                  <input
                    type="text"
                    value={editingStrategy.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="e.g., Breakout Strategy"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timeframe
                  </label>
                  <input
                    type="text"
                    value={editingStrategy.timeframe}
                    onChange={(e) => updateField('timeframe', e.target.value)}
                    placeholder="e.g., H1, H4"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingStrategy.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={2}
                  placeholder="Brief description of the strategy..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Trading Rules */}
              <ListEditor
                title="Trading Rules"
                icon={<BookOpen className="w-5 h-5 text-blue-600" />}
                items={editingStrategy.rules}
                onAdd={() => addListItem('rules')}
                onUpdate={(index, value) => updateListItem('rules', index, value)}
                onRemove={(index) => removeListItem('rules', index)}
                placeholder="Add a trading rule..."
              />

              {/* Entry Conditions */}
              <ListEditor
                title="Entry Conditions"
                icon={<Target className="w-5 h-5 text-emerald-600" />}
                items={editingStrategy.entryConditions}
                onAdd={() => addListItem('entryConditions')}
                onUpdate={(index, value) => updateListItem('entryConditions', index, value)}
                onRemove={(index) => removeListItem('entryConditions', index)}
                placeholder="Add an entry condition..."
              />

              {/* Exit Conditions */}
              <ListEditor
                title="Exit Conditions"
                icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
                items={editingStrategy.exitConditions}
                onAdd={() => addListItem('exitConditions')}
                onUpdate={(index, value) => updateListItem('exitConditions', index, value)}
                onRemove={(index) => removeListItem('exitConditions', index)}
                placeholder="Add an exit condition..."
              />

              {/* Risk Management */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Risk Management
                </label>
                <textarea
                  value={editingStrategy.riskManagement}
                  onChange={(e) => updateField('riskManagement', e.target.value)}
                  rows={2}
                  placeholder="Describe your risk management rules..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={editingStrategy.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStrategy}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <Save className="w-4 h-4" />
                Save Strategy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategies List */}
      {strategies.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Strategies Yet</h3>
          <p className="text-slate-500 mb-4">
            Create your first trading strategy to start building your playbook.
          </p>
          <button
            onClick={handleAddStrategy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Strategy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{strategy.name}</h3>
                    <p className="text-sm text-slate-500">{strategy.timeframe}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingStrategy(strategy)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteStrategy(strategy.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-600 mb-4">{strategy.description}</p>

                <div className="space-y-4">
                  {/* Entry Conditions */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-600" />
                      Entry Conditions
                    </h4>
                    <ul className="space-y-1">
                      {strategy.entryConditions.filter(c => c).map((condition, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exit Conditions */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Exit Conditions
                    </h4>
                    <ul className="space-y-1">
                      {strategy.exitConditions.filter(c => c).map((condition, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          {condition}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Risk Management */}
                  {strategy.riskManagement && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-700 mb-1">Risk Management</h4>
                      <p className="text-sm text-slate-600">{strategy.riskManagement}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ListEditorProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}

function ListEditor({ title, icon, items, onAdd, onUpdate, onRemove, placeholder }: ListEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon}
          {title}
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
              placeholder={placeholder}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                items.length > 1 ? "hover:bg-red-50 text-red-500" : "text-slate-300 cursor-not-allowed"
              )}
              disabled={items.length <= 1}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
