import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        TradingView: any;
    }
}

interface TradingViewWidgetProps {
    symbol: string;
    interval: string;
    theme?: 'light' | 'dark';
    containerId: string;
}

export function TradingViewWidget({ symbol, interval, theme = 'light', containerId }: TradingViewWidgetProps) {
    const container = useRef<HTMLDivElement>(null);
    const scriptRef = useRef<HTMLScriptElement | null>(null);

    useEffect(() => {
        // Function to initialize widget
        const initWidget = () => {
            if (window.TradingView && container.current) {
                // Clear previous content just in case
                container.current.innerHTML = '';

                new window.TradingView.widget({
                    autosize: true,
                    symbol: symbol,
                    interval: interval,
                    timezone: "Etc/UTC",
                    theme: theme,
                    style: "1",
                    locale: "en",
                    toolbar_bg: "#f1f3f6",
                    enable_publishing: false,
                    allow_symbol_change: true,
                    container_id: containerId,
                    hide_side_toolbar: false,
                    studies: [
                        "RSI@tv-basicstudies",
                        "MASimple@tv-basicstudies"
                    ]
                });
            }
        };

        // If script already exists, just init
        if (document.getElementById('tradingview-widget-script')) {
            if (window.TradingView) {
                initWidget();
            } else {
                // Script exists but not loaded, wait for it
                const existingScript = document.getElementById('tradingview-widget-script') as HTMLScriptElement;
                existingScript.addEventListener('load', initWidget);
                return () => existingScript.removeEventListener('load', initWidget);
            }
        } else {
            // Load script
            const script = document.createElement('script');
            script.id = 'tradingview-widget-script';
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = initWidget;
            document.head.appendChild(script);
            scriptRef.current = script;
        }

        return () => {
            // Cleanup if needed
            // We don't remove the script to cache it
        };
    }, [symbol, interval, theme, containerId]);

    return (
        <div className="w-full h-full relative" style={{ minHeight: '300px' }}>
            <div id={containerId} ref={container} className="tradingview-widget-container h-full w-full absolute inset-0" />
        </div>
    );
}
