import type { Trade, ParsedCSVEntry } from '../types/trade';
import { v4 as uuidv4 } from 'uuid';

// Types for different CSV formats
export interface BalanceHistoryEntry {
  time: string;
  balanceBefore: number;
  balanceAfter: number;
  pnl: number;
  currency: string;
  action: string;
  // Parsed from action
  direction?: 'long' | 'short';
  symbol?: string;
  exchange?: string;
  exitPrice?: number;
  entryPrice?: number;
  units?: number;
}

export interface OrderLogEntry {
  time: string;
  text: string;
  // Parsed data
  orderId?: string;
  symbol?: string;
  action?: 'buy' | 'sell' | 'modify' | 'cancel' | 'execute' | 'limit';
  price?: number;
  units?: number;
  stopLoss?: number;
  takeProfit?: number;
  isEntry?: boolean;
}

export type CSVFormat = 'balance_history' | 'order_logs' | 'unknown';

// Detect CSV format type
export function detectCSVFormat(csvContent: string): CSVFormat {
  const firstLine = csvContent.trim().split('\n')[0].toLowerCase();
  
  if (firstLine.includes('balance') || firstLine.includes('pertes et profits')) {
    return 'balance_history';
  }
  
  if (firstLine.includes('heure') && firstLine.includes('texte')) {
    return 'order_logs';
  }
  
  return 'unknown';
}

// Parse balance history CSV
export function parseBalanceHistoryCSV(csvContent: string): BalanceHistoryEntry[] {
  const lines = csvContent.trim().split('\n');
  const entries: BalanceHistoryEntry[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with quoted action field
    const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),([^,]+),([^,]+),([^,]+),([^,]+),"(.+)"$/);
    
    if (match) {
      const entry: BalanceHistoryEntry = {
        time: match[1],
        balanceBefore: parseFloat(match[2]),
        balanceAfter: parseFloat(match[3]),
        pnl: parseFloat(match[4]),
        currency: match[5],
        action: match[6]
      };
      
      // Parse action string to extract trade details
      const actionMatch = entry.action.match(
        /Close (long|short) position for symbol ([A-Z]+):([A-Z]+) at price ([0-9.]+) for ([0-9.]+) units\. Position AVG Price was ([0-9.]+)/i
      );
      
      if (actionMatch) {
        entry.direction = actionMatch[1].toLowerCase() as 'long' | 'short';
        entry.exchange = actionMatch[2];
        entry.symbol = actionMatch[3];
        entry.exitPrice = parseFloat(actionMatch[4]);
        entry.units = parseFloat(actionMatch[5]);
        entry.entryPrice = parseFloat(actionMatch[6]);
      }
      
      entries.push(entry);
    }
  }
  
  return entries;
}

// Parse order logs CSV with enhanced extraction
export function parseOrderLogsCSV(csvContent: string): OrderLogEntry[] {
  const lines = csvContent.trim().split('\n');
  const entries: OrderLogEntry[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(.+)$/);
    if (match) {
      const entry: OrderLogEntry = {
        time: match[1],
        text: match[2]
      };
      
      // Parse order ID
      const orderIdMatch = entry.text.match(/Order (\d+)/);
      if (orderIdMatch) {
        entry.orderId = orderIdMatch[1];
      }
      
      // Parse symbol from various patterns
      const symbolMatch = entry.text.match(/symbol ([A-Z]+:[A-Z]+)/);
      if (symbolMatch) {
        entry.symbol = symbolMatch[1];
      }
      
      // Parse execution: "Order X for symbol Y has been executed at price Z for W units"
      const execMatch = entry.text.match(/has been executed at price ([0-9.]+) for ([0-9.]+) units/);
      if (execMatch) {
        entry.action = 'execute';
        entry.price = parseFloat(execMatch[1]);
        entry.units = parseFloat(execMatch[2]);
      }
      
      // Parse market order call with SL/TP
      const callWithSlTpMatch = entry.text.match(/Call to place market order to (buy|sell) ([0-9.]+) units of symbol ([A-Z:]+) with SL ([0-9.]+) and TP ([0-9.]+)/);
      if (callWithSlTpMatch) {
        entry.action = callWithSlTpMatch[1] as 'buy' | 'sell';
        entry.units = parseFloat(callWithSlTpMatch[2]);
        entry.symbol = callWithSlTpMatch[3];
        entry.stopLoss = parseFloat(callWithSlTpMatch[4]);
        entry.takeProfit = parseFloat(callWithSlTpMatch[5]);
        entry.isEntry = true;
      }
      
      // Parse market order call without SL/TP (could be closing order)
      const callMatch = entry.text.match(/Call to place market order to (buy|sell) ([0-9.]+) units of symbol ([A-Z:]+)(?:\s*)$/);
      if (callMatch) {
        entry.action = callMatch[1] as 'buy' | 'sell';
        entry.units = parseFloat(callMatch[2]);
        entry.symbol = callMatch[3];
        entry.isEntry = false; // Likely a closing order
      }
      
      // Parse limit order with SL/TP
      const limitMatch = entry.text.match(/Call to place limit order to (buy|sell) ([0-9.]+) units of symbol ([A-Z:]+) at price ([0-9.]+) with SL ([0-9.]+) and TP ([0-9.]+)/);
      if (limitMatch) {
        entry.action = 'limit';
        entry.units = parseFloat(limitMatch[2]);
        entry.symbol = limitMatch[3];
        entry.price = parseFloat(limitMatch[4]);
        entry.stopLoss = parseFloat(limitMatch[5]);
        entry.takeProfit = parseFloat(limitMatch[6]);
        entry.isEntry = true;
      }
      
      // Parse position modification: "Modify position for symbol X with SL Y and TP Z"
      const modifyMatch = entry.text.match(/Modify position for symbol ([A-Z:]+) with SL ([0-9.]+) and TP ([0-9.]+)/);
      if (modifyMatch) {
        entry.action = 'modify';
        entry.symbol = modifyMatch[1];
        entry.stopLoss = parseFloat(modifyMatch[2]);
        entry.takeProfit = parseFloat(modifyMatch[3]);
      }
      
      entries.push(entry);
    }
  }
  
  return entries;
}

// Build a timeline of SL/TP for each symbol
interface PositionState {
  symbol: string;
  entryTime: string;
  entryPrice: number;
  units: number;
  direction: 'long' | 'short';
  stopLoss: number | null;
  takeProfit: number | null;
  slTpHistory: Array<{ time: string; stopLoss: number; takeProfit: number }>;
}

// Merge balance history with order logs to create complete trades with SL/TP
export function mergeTradeData(
  balanceEntries: BalanceHistoryEntry[],
  orderEntries: OrderLogEntry[]
): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] {
  const trades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  // Sort entries by time (ascending)
  const sortedOrders = [...orderEntries].sort((a, b) => 
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  
  // Sort balance entries by time (descending to process oldest first when reversed)
  const sortedBalance = [...balanceEntries].sort((a, b) =>
    new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  
  // Build position tracking map: symbol -> array of position states
  const positionHistory: Map<string, PositionState[]> = new Map();
  
  // First pass: Build position history from order logs
  for (const order of sortedOrders) {
    if (!order.symbol) continue;
    
    const symbol = order.symbol;
    
    // Handle new position entries (orders with SL/TP or confirmed entries)
    if ((order.action === 'buy' || order.action === 'sell') && order.isEntry && order.stopLoss && order.takeProfit) {
      // This is an entry order with SL/TP
      // Find the corresponding execution
      const execution = sortedOrders.find(o => 
        o.action === 'execute' &&
        o.symbol === symbol &&
        o.units === order.units &&
        Math.abs(new Date(o.time).getTime() - new Date(order.time).getTime()) < 5000 // Within 5 seconds
      );
      
      const entryPrice = execution?.price || 0;
      
      const position: PositionState = {
        symbol,
        entryTime: order.time,
        entryPrice,
        units: order.units || 0,
        direction: order.action === 'buy' ? 'long' : 'short',
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        slTpHistory: [{ time: order.time, stopLoss: order.stopLoss, takeProfit: order.takeProfit }]
      };
      
      const existing = positionHistory.get(symbol) || [];
      existing.push(position);
      positionHistory.set(symbol, existing);
    }
    
    // Handle SL/TP modifications
    if (order.action === 'modify' && order.stopLoss && order.takeProfit) {
      const positions = positionHistory.get(symbol);
      if (positions && positions.length > 0) {
        // Update the most recent open position
        const lastPosition = positions[positions.length - 1];
        lastPosition.stopLoss = order.stopLoss;
        lastPosition.takeProfit = order.takeProfit;
        lastPosition.slTpHistory.push({
          time: order.time,
          stopLoss: order.stopLoss,
          takeProfit: order.takeProfit
        });
      }
    }
  }
  
  // Second pass: Match balance entries (closed trades) with position history
  for (const balance of sortedBalance) {
    if (!balance.symbol || !balance.direction || balance.entryPrice === undefined || balance.exitPrice === undefined) continue;
    
    const fullSymbol = `${balance.exchange}:${balance.symbol}`;
    const exitTime = new Date(balance.time);
    
    // Find matching position from history
    let matchedPosition: PositionState | null = null;
    let entryTime = '';
    let stopLoss: number | null = null;
    let takeProfit: number | null = null;
    
    const positions = positionHistory.get(fullSymbol) || [];
    
    // Find the best matching position:
    // - Same direction
    // - Entry price close to the balance entry price
    // - Entry time before exit time
    for (const pos of positions) {
      if (pos.direction !== balance.direction) continue;
      
      const entryDate = new Date(pos.entryTime);
      if (entryDate >= exitTime) continue;
      
      // Check if entry price matches (within 0.1% tolerance for floating point)
      const balanceEntryPrice = balance.entryPrice || 0;
      if (balanceEntryPrice === 0) continue;
      const priceDiff = Math.abs(pos.entryPrice - balanceEntryPrice) / balanceEntryPrice;
      if (priceDiff < 0.001) {
        matchedPosition = pos;
        break;
      }
      
      // If exact price match not found, accept close match with same units
      if (Math.abs((pos.units || 0) - (balance.units || 0)) < 1) {
        matchedPosition = pos;
      }
    }
    
    if (matchedPosition) {
      entryTime = matchedPosition.entryTime;
      
      // Get the last SL/TP values before exit
      const relevantHistory = matchedPosition.slTpHistory.filter(
        h => new Date(h.time) <= exitTime
      );
      
      if (relevantHistory.length > 0) {
        const lastSlTp = relevantHistory[relevantHistory.length - 1];
        stopLoss = lastSlTp.stopLoss;
        takeProfit = lastSlTp.takeProfit;
      } else {
        stopLoss = matchedPosition.stopLoss;
        takeProfit = matchedPosition.takeProfit;
      }
      
      // Remove matched position from history
      const idx = positions.indexOf(matchedPosition);
      if (idx > -1) positions.splice(idx, 1);
    } else {
      // No matching position found in order logs
      // Try to find entry by looking at executions with matching price
      const balanceEntryPriceCheck = balance.entryPrice || 0;
      const entryOrder = sortedOrders.find(o =>
        o.symbol === fullSymbol &&
        o.action === 'execute' &&
        o.price !== undefined &&
        balanceEntryPriceCheck > 0 &&
        Math.abs(o.price - balanceEntryPriceCheck) / balanceEntryPriceCheck < 0.001 &&
        new Date(o.time) < exitTime
      );
      
      if (entryOrder) {
        entryTime = entryOrder.time;
        
        // Look for SL/TP in nearby orders
        const nearbyOrders = sortedOrders.filter(o =>
          o.symbol === fullSymbol &&
          Math.abs(new Date(o.time).getTime() - new Date(entryOrder.time).getTime()) < 10000 &&
          o.stopLoss && o.takeProfit
        );
        
        if (nearbyOrders.length > 0) {
          stopLoss = nearbyOrders[0].stopLoss || null;
          takeProfit = nearbyOrders[0].takeProfit || null;
        }
        
        // Also check for modifications
        const modifications = sortedOrders.filter(o =>
          o.symbol === fullSymbol &&
          o.action === 'modify' &&
          new Date(o.time) > new Date(entryOrder.time) &&
          new Date(o.time) <= exitTime
        );
        
        if (modifications.length > 0) {
          const lastMod = modifications[modifications.length - 1];
          stopLoss = lastMod.stopLoss || stopLoss;
          takeProfit = lastMod.takeProfit || takeProfit;
        }
      } else {
        // Estimate entry time (2 hours before exit as fallback)
        entryTime = new Date(exitTime.getTime() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      }
    }
    
    // Calculate P&L percent
    const pnlPercent = balance.entryPrice > 0 
      ? (balance.pnl / (balance.entryPrice * (balance.units || 1))) * 100
      : 0;
    
    // Generate tags
    const tags: string[] = [];
    if (balance.exchange) tags.push(balance.exchange);
    if (Math.abs(balance.pnl) > 5000) tags.push('Big Trade');
    if (Math.abs(balance.pnl) > 1000) tags.push('Good Trade');
    if (balance.symbol?.includes('XAU') || balance.symbol?.includes('XAG')) tags.push('Metals');
    if (['BTC', 'ETH', 'SOL', 'XRP', 'ADA'].some(c => balance.symbol?.includes(c))) tags.push('Crypto');
    if (['JPY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'NZD'].some(c => balance.symbol?.includes(c))) {
      if (!balance.symbol?.includes('XAU') && !balance.symbol?.includes('XAG')) {
        tags.push('Forex');
      }
    }
    
    trades.push({
      symbol: balance.symbol,
      direction: balance.direction,
      entryPrice: balance.entryPrice,
      exitPrice: balance.exitPrice,
      units: balance.units || 0,
      entryTime: entryTime.includes('T') ? entryTime : entryTime.replace(' ', 'T') + 'Z',
      exitTime: balance.time.includes('T') ? balance.time : balance.time.replace(' ', 'T') + 'Z',
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      pnl: balance.pnl,
      pnlPercent: pnlPercent,
      status: 'closed',
      notes: `Balance: $${balance.balanceBefore.toFixed(2)} → $${balance.balanceAfter.toFixed(2)}`,
      tags: tags,
    });
  }
  
  // Sort trades by exit time (newest first)
  trades.sort((a, b) => new Date(b.exitTime || 0).getTime() - new Date(a.exitTime || 0).getTime());
  
  return trades;
}

// Parse balance history only (when no order logs available)
export function parseBalanceHistoryTrades(entries: BalanceHistoryEntry[]): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] {
  const trades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  for (const entry of entries) {
    if (!entry.symbol || !entry.direction || !entry.entryPrice || !entry.exitPrice) continue;
    
    const exitTime = new Date(entry.time);
    const entryTime = new Date(exitTime.getTime() - 2 * 60 * 60 * 1000); // Estimate 2 hours before
    
    const pnlPercent = entry.entryPrice > 0 
      ? (entry.pnl / (entry.entryPrice * (entry.units || 1))) * 100
      : 0;
    
    const tags: string[] = [];
    if (entry.exchange) tags.push(entry.exchange);
    if (Math.abs(entry.pnl) > 5000) tags.push('Big Trade');
    if (entry.symbol?.includes('XAU') || entry.symbol?.includes('XAG')) tags.push('Metals');
    if (['BTC', 'ETH', 'SOL'].some(c => entry.symbol?.includes(c))) tags.push('Crypto');
    if (['JPY', 'USD', 'EUR', 'GBP', 'CAD'].some(c => entry.symbol?.includes(c))) {
      if (!entry.symbol?.includes('XAU')) tags.push('Forex');
    }
    
    trades.push({
      symbol: entry.symbol,
      direction: entry.direction,
      entryPrice: entry.entryPrice,
      exitPrice: entry.exitPrice,
      units: entry.units || 0,
      entryTime: entryTime.toISOString(),
      exitTime: entry.time.replace(' ', 'T') + 'Z',
      stopLoss: null,
      takeProfit: null,
      pnl: entry.pnl,
      pnlPercent: pnlPercent,
      status: 'closed',
      notes: `Balance: $${entry.balanceBefore.toFixed(2)} → $${entry.balanceAfter.toFixed(2)}`,
      tags: tags,
    });
  }
  
  return trades;
}

// Legacy function for old format
export function parseCSV(csvContent: string): ParsedCSVEntry[] {
  const lines = csvContent.trim().split('\n');
  const entries: ParsedCSVEntry[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),(.+)$/);
    if (match) {
      entries.push({
        time: match[1],
        text: match[2]
      });
    }
  }
  
  return entries;
}

export function parseTradingViewLogs(entries: ParsedCSVEntry[]): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] {
  const orderEntries = entries.map(e => {
    const entry: OrderLogEntry = { time: e.time, text: e.text };
    
    const symbolMatch = e.text.match(/symbol ([A-Z]+:[A-Z]+)/);
    if (symbolMatch) entry.symbol = symbolMatch[1];
    
    const execMatch = e.text.match(/has been executed at price ([0-9.]+) for ([0-9.]+) units/);
    if (execMatch) {
      entry.action = 'execute';
      entry.price = parseFloat(execMatch[1]);
      entry.units = parseFloat(execMatch[2]);
    }
    
    const callMatch = e.text.match(/Call to place market order to (buy|sell) ([0-9.]+) units/);
    if (callMatch) {
      entry.action = callMatch[1] as 'buy' | 'sell';
      entry.units = parseFloat(callMatch[2]);
    }
    
    const slTpMatch = e.text.match(/with SL ([0-9.]+) and TP ([0-9.]+)/);
    if (slTpMatch) {
      entry.stopLoss = parseFloat(slTpMatch[1]);
      entry.takeProfit = parseFloat(slTpMatch[2]);
      entry.isEntry = true;
    }
    
    const modifyMatch = e.text.match(/Modify position for symbol ([A-Z:]+) with SL ([0-9.]+) and TP ([0-9.]+)/);
    if (modifyMatch) {
      entry.action = 'modify';
      entry.symbol = modifyMatch[1];
      entry.stopLoss = parseFloat(modifyMatch[2]);
      entry.takeProfit = parseFloat(modifyMatch[3]);
    }
    
    return entry;
  });
  
  return mergeTradeData([], orderEntries);
}

export function generateMockTrades(): Trade[] {
  const symbols = ['EURUSD', 'GBPJPY', 'XAUUSD', 'USDJPY', 'GBPUSD'];
  const trades: Trade[] = [];
  const now = new Date();
  
  for (let i = 0; i < 20; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const direction = Math.random() > 0.5 ? 'long' : 'short';
    const entryPrice = symbol === 'XAUUSD' ? 2000 + Math.random() * 100 : 
                       symbol.includes('JPY') ? 140 + Math.random() * 20 :
                       1 + Math.random() * 0.5;
    const pnlPercent = (Math.random() - 0.4) * 10;
    const exitPrice = entryPrice * (1 + (direction === 'long' ? pnlPercent : -pnlPercent) / 100);
    const units = symbol === 'XAUUSD' ? Math.floor(Math.random() * 500) : 
                  Math.floor(Math.random() * 1000000);
    
    const entryTime = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const exitTime = new Date(entryTime.getTime() + Math.random() * 24 * 60 * 60 * 1000);
    
    const pnl = (exitPrice - entryPrice) * units * (direction === 'long' ? 1 : -1);
    
    trades.push({
      id: uuidv4(),
      symbol,
      direction,
      entryPrice,
      exitPrice,
      units,
      entryTime: entryTime.toISOString(),
      exitTime: exitTime.toISOString(),
      stopLoss: direction === 'long' ? entryPrice * 0.99 : entryPrice * 1.01,
      takeProfit: direction === 'long' ? entryPrice * 1.02 : entryPrice * 0.98,
      pnl,
      pnlPercent,
      status: 'closed',
      notes: '',
      tags: [],
      createdAt: entryTime.toISOString(),
      updatedAt: exitTime.toISOString()
    });
  }
  
  return trades.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
}
