import type { Trade } from '../types/trade';

export function parseMT5Report(htmlContent: string): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const trades: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] = [];

    // Find the Positions table header
    // Searching for <b>Positions</b> inside a div inside a th
    const headers = Array.from(doc.querySelectorAll('tr > th'));
    const positionsHeaderIdx = headers.findIndex(h => h.textContent?.includes('Positions'));

    if (positionsHeaderIdx === -1) {
        throw new Error('Table "Positions" non trouvée dans le rapport MT5');
    }

    const positionsHeader = headers[positionsHeaderIdx];
    const titleRow = positionsHeader.closest('tr');
    if (!titleRow) return [];

    // The next row is the column headers
    const headerRow = titleRow.nextElementSibling;
    if (!headerRow) return [];

    // Iterate over data rows
    let currentRow = headerRow.nextElementSibling;

    while (currentRow) {
        // Stop if we hit another header or spacer (look for 'th' or specific row style)
        if (currentRow.querySelector('th') || (currentRow as HTMLTableRowElement).cells.length < 5) {
            break;
        }

        const cells = Array.from(currentRow.children) as HTMLElement[];

        // MT5 Standard Report "Positions" Table Structure:
        // 0: Time (Entry)
        // 1: Position (Ticket)
        // 2: Symbol
        // 3: Type (buy/sell)
        // 4: Hidden cell (colspan?)
        // 5: Volume
        // 6: Price (Entry)
        // 7: S/L
        // 8: T/P
        // 9: Time (Exit)
        // 10: Price (Exit)
        // 11: Commission
        // 12: Swap
        // 13: Profit

        if (cells.length >= 14) {
            const type = cells[3].textContent?.trim().toLowerCase();

            if (type === 'buy' || type === 'sell') {
                const entryTimeStr = cells[0].textContent?.trim();
                const symbol = cells[2].textContent?.trim();
                const volume = parseFloat(cells[5].textContent?.trim() || '0');
                const entryPrice = parseFloat(cells[6].textContent?.trim() || '0');

                // SL/TP might be empty
                const slText = cells[7].textContent?.trim();
                const sl = slText ? parseFloat(slText) : null;

                const tpText = cells[8].textContent?.trim();
                const tp = tpText ? parseFloat(tpText) : null;

                const exitTimeStr = cells[9].textContent?.trim();
                const exitPrice = parseFloat(cells[10].textContent?.trim() || '0');

                const commission = parseFloat(cells[11].textContent?.trim() || '0');
                const swap = parseFloat(cells[12].textContent?.trim() || '0');
                const profit = parseFloat(cells[13].textContent?.trim() || '0');

                // Calculate Net PnL
                // In MT5 reports, Profit is usually gross profit of the trade (Entry vs Exit)
                // Commission and Swap are separate charge columns.
                // Total PnL = Profit + Commission + Swap
                const pnl = profit + commission + swap;

                if (entryTimeStr && symbol) {
                    trades.push({
                        symbol: symbol,
                        direction: type === 'buy' ? 'long' : 'short',
                        entryPrice: entryPrice,
                        exitPrice: exitPrice,
                        units: volume,
                        entryTime: formatMT5Date(entryTimeStr),
                        exitTime: exitTimeStr ? formatMT5Date(exitTimeStr) : null,
                        stopLoss: sl,
                        takeProfit: tp,
                        pnl: pnl,
                        pnlPercent: null, // to be calculated if needed
                        status: 'closed',
                        notes: `Import MT5 #${cells[1].textContent?.trim()}`,
                        tags: ['MT5', 'Imported'],
                    });
                }
            }
        }

        currentRow = currentRow.nextElementSibling;
    }

    return trades;
}

function formatMT5Date(dateStr: string): string {
    // Format: 2026.02.14 15:34:03 -> 2026-02-14T15:34:03
    return dateStr.replace(/\./g, '-').replace(' ', 'T');
}
