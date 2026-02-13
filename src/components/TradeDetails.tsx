import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trade } from '../types/trade';
import { TradingViewChart } from './TradingViewChart';
import { 
  X, 
  Edit2,
  Trash2,
  Tag,
  FileText,
  Image,
  MessageSquare,
  GripHorizontal,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TradeDetailsProps {
  trade: Trade;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: string) => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const TradeDetails: React.FC<TradeDetailsProps> = ({
  trade,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [size, setSize] = useState<Size>({ width: 1200, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize position to center
  useEffect(() => {
    if (typeof window !== 'undefined' && !isMaximized) {
      const initialWidth = Math.min(1200, window.innerWidth - 40);
      const initialHeight = Math.min(700, window.innerHeight - 40);
      setSize({ width: initialWidth, height: initialHeight });
      setPosition({
        x: (window.innerWidth - initialWidth) / 2,
        y: (window.innerHeight - initialHeight) / 2
      });
    }
  }, []);

  // Dragging handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position, isMaximized]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep window within bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(600, Math.min(resizeStart.width + deltaX, window.innerWidth - position.x - 20));
      const newHeight = Math.max(400, Math.min(resizeStart.height + deltaY, window.innerHeight - position.y - 20));
      
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, resizeStart, size, position]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  }, [size, isMaximized]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Toggle maximize
  const toggleMaximize = () => {
    if (isMaximized) {
      setIsMaximized(false);
    } else {
      setIsMaximized(true);
    }
  };

  // Double-click on header to maximize/restore
  const handleHeaderDoubleClick = () => {
    toggleMaximize();
  };

  const hasAdditionalInfo = (trade.tags && trade.tags.length > 0) || 
                            trade.strategy || 
                            trade.notes || 
                            (trade.screenshots && trade.screenshots.length > 0);

  const modalStyle = isMaximized 
    ? {
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }
    : {
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
      };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      onClick={(e) => {
        if (e.target === containerRef.current) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={`fixed bg-[#0f0f1a] rounded-xl overflow-hidden flex flex-col border border-gray-700 shadow-2xl ${
          isDragging ? 'cursor-grabbing' : ''
        } ${isMaximized ? 'rounded-none' : ''}`}
        style={{
          ...modalStyle,
          transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Header - Draggable area */}
        <div 
          className={`flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gradient-to-r from-[#0a0a14] to-[#12121f] select-none ${
            isMaximized ? 'cursor-default' : 'cursor-grab'
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleHeaderDoubleClick}
        >
          <div className="flex items-center gap-3">
            {/* Drag indicator */}
            <div className="text-gray-500 hover:text-gray-300 transition-colors">
              <GripHorizontal className="w-5 h-5" />
            </div>
            
            <h2 className="text-lg font-bold text-white">{trade.symbol.replace('OANDA:', '').replace('COINBASE:', '')}</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              trade.direction === 'long' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {trade.direction.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              trade.status === 'open' 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' 
                : trade.pnl && trade.pnl >= 0 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
            }`}>
              {trade.status === 'open' ? 'OPEN' : trade.pnl && trade.pnl >= 0 ? 'WIN' : 'LOSS'}
            </span>
            <span className={`text-lg font-bold ${
              trade.pnl && trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {trade.pnl && trade.pnl >= 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}$
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(trade)}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors text-sm"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this trade?')) {
                  onDelete(trade.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={toggleMaximize}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              onMouseDown={(e) => e.stopPropagation()}
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors ml-1"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chart takes most of the space */}
        <div className="flex-1 overflow-hidden relative">
          <TradingViewChart trade={trade} />
        </div>

        {/* Additional Info - Collapsible bottom bar */}
        {hasAdditionalInfo && (
          <div className="border-t border-gray-700 bg-[#0a0a14] px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              {/* Strategy */}
              {trade.strategy && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-sm">Strategy:</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-sm font-medium">
                    {trade.strategy}
                  </span>
                </div>
              )}

              {/* Tags */}
              {trade.tags && trade.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <div className="flex flex-wrap gap-1">
                    {trade.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {trade.notes && (
                <div className="flex items-center gap-2 flex-1">
                  <MessageSquare className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm truncate max-w-md" title={trade.notes}>
                    {trade.notes}
                  </span>
                </div>
              )}

              {/* Screenshots count */}
              {trade.screenshots && trade.screenshots.length > 0 && (
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-green-400" />
                  <span className="text-gray-400 text-sm">
                    {trade.screenshots.length} screenshot{trade.screenshots.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resize handle */}
        {!isMaximized && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group"
            onMouseDown={handleResizeStart}
          >
            <svg
              className="w-4 h-4 absolute bottom-1 right-1 text-gray-500 group-hover:text-gray-300 transition-colors"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
