import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChat, IconSettings, IconBook } from './Icons';
import { ThemeMode } from '../types';

interface DesktopProps {
  isBlurred: boolean;
  theme: ThemeMode;
}

interface AppItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  isMock?: boolean;
}

// --- Physics Constants ---
const SPRING_CONFIG = { stiffness: 300, damping: 30 };
const SWAP_THRESHOLD = 0.5; // Over-half swap
const FOLDER_HOVER_DELAY = 600; // ms to trigger folder detection
const EDGE_SCROLL_ZONE = 100; // px
const TRAJECTORY_LOOKAHEAD = 100; // ms of velocity to project

const Desktop: React.FC<DesktopProps> = ({ isBlurred, theme }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // -- State --
  const [apps, setApps] = useState<AppItem[]>([
    { 
      id: 'chat', 
      path: '/chat', 
      label: '聊天', 
      color: 'bg-blue-600/60', 
      icon: <IconChat className="w-8 h-8 text-white" /> 
    },
    { 
      id: 'worldbook', 
      path: '/worldbook', 
      label: '世界书', 
      color: 'bg-amber-700/60', 
      icon: <IconBook className="w-8 h-8 text-amber-200" /> 
    },
    { 
      id: 'settings', 
      path: '/settings', 
      label: '设置', 
      color: 'bg-slate-600/60', 
      icon: <IconSettings className="w-8 h-8 text-gray-200" /> 
    },
    { 
      id: 'music', 
      path: '', 
      label: '音乐', 
      color: 'bg-indigo-500/40', 
      icon: <div className="w-8 h-8 rounded-full bg-white/20"></div>, 
      isMock: true 
    }
  ]);

  const [isJiggleMode, setIsJiggleMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // -- Physics Refs (Mutable for 60fps performance) --
  const dragState = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    velocityX: 0,
    velocityY: 0,
    lastTime: 0,
    initialIndex: -1,
    folderTimer: null as NodeJS.Timeout | null,
    folderTargetId: null as string | null,
  });

  const [visualDragPos, setVisualDragPos] = useState({ x: 0, y: 0 }); // React state for render
  const [folderTargetId, setFolderTargetId] = useState<string | null>(null); // For visual scaling

  // -- Layout Calculations --
  const getGridMetrics = () => {
    if (!containerRef.current) return { colWidth: 90, rowHeight: 110, cols: 4 };
    const width = containerRef.current.clientWidth;
    const cols = 4;
    const colWidth = width / cols;
    const rowHeight = colWidth * 1.25;
    return { colWidth, rowHeight, cols };
  };

  const getPositionAtIndex = (index: number) => {
    const { colWidth, rowHeight, cols } = getGridMetrics();
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: col * colWidth, y: row * rowHeight };
  };

  // -- Haptic Patterns --
  const triggerHaptic = (type: 'pickup' | 'swap' | 'drop' | 'folder' | 'jiggle') => {
    if (!navigator.vibrate) return;
    switch (type) {
        case 'pickup': navigator.vibrate(15); break;
        case 'swap': navigator.vibrate(10); break;
        case 'drop': navigator.vibrate(12); break;
        case 'folder': navigator.vibrate([5, 10, 15]); break;
        case 'jiggle': navigator.vibrate(50); break;
    }
  };

  // -- Event Handlers --

  const handlePointerDown = (e: React.PointerEvent, app: AppItem, index: number) => {
    // Only left click or touch
    if (e.button !== 0) return;
    
    const { clientX, clientY } = e;
    
    // Setup Drag State
    dragState.current.startX = clientX;
    dragState.current.startY = clientY;
    dragState.current.currentX = clientX;
    dragState.current.currentY = clientY;
    dragState.current.lastTime = Date.now();
    dragState.current.velocityX = 0;
    dragState.current.velocityY = 0;
    dragState.current.initialIndex = index;
    
    // Long Press Logic for Jiggle Mode
    if (!isJiggleMode) {
        const timer = setTimeout(() => {
            setIsJiggleMode(true);
            setActiveDragId(app.id);
            triggerHaptic('jiggle');
        }, 500);
        
        // Store cancel function on element or ref implies complexity, 
        // simplifying by assuming move cancels standard click, timer activates jiggle.
        dragState.current.folderTimer = timer; 
    } else {
        setActiveDragId(app.id);
        triggerHaptic('pickup');
    }

    // Capture pointer
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { clientX, clientY } = e;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;

    // Cancel long press if moved significantly
    if (dragState.current.folderTimer && !isJiggleMode && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        clearTimeout(dragState.current.folderTimer);
        dragState.current.folderTimer = null;
    }

    if (activeDragId) {
        // 1. Calculate Velocity (Velocity Differentiation)
        const now = Date.now();
        const dt = now - dragState.current.lastTime;
        if (dt > 0) {
            const vx = (clientX - dragState.current.currentX) / dt;
            const vy = (clientY - dragState.current.currentY) / dt;
            // Smooth velocity
            dragState.current.velocityX = vx * 0.8 + dragState.current.velocityX * 0.2;
            dragState.current.velocityY = vy * 0.8 + dragState.current.velocityY * 0.2;
        }
        dragState.current.currentX = clientX;
        dragState.current.currentY = clientY;
        dragState.current.lastTime = now;

        // 2. Update Visual Position
        setVisualDragPos({ x: dx, y: dy });

        // 3. Edge Scroll
        const winH = window.innerHeight;
        if (clientY < EDGE_SCROLL_ZONE) {
            window.scrollBy(0, -5);
        } else if (clientY > winH - EDGE_SCROLL_ZONE) {
            window.scrollBy(0, 5);
        }

        // 4. Swap Logic (Trajectory-Aware & Over-half)
        performSwapCheck(activeDragId, dx, dy);
    }
  };

  const performSwapCheck = (dragId: string, dx: number, dy: number) => {
    const { colWidth, rowHeight, cols } = getGridMetrics();
    const currentIndex = apps.findIndex(a => a.id === dragId);
    if (currentIndex === -1) return;

    const currentOrigin = getPositionAtIndex(currentIndex);
    
    // Trajectory Projection
    const projectedX = currentOrigin.x + dx + (dragState.current.velocityX * TRAJECTORY_LOOKAHEAD);
    const projectedY = currentOrigin.y + dy + (dragState.current.velocityY * TRAJECTORY_LOOKAHEAD);

    // Find Target Cell based on geometry
    // Center point of the dragging item
    const centerX = projectedX + colWidth / 2;
    const centerY = projectedY + rowHeight / 2;

    const targetCol = Math.floor(centerX / colWidth);
    const targetRow = Math.floor(centerY / rowHeight);
    const targetIndex = targetRow * cols + targetCol;

    // Bounds Check
    if (targetIndex >= 0 && targetIndex < apps.length && targetIndex !== currentIndex) {
        
        // Over-half Logic: Distance Check
        const targetOrigin = getPositionAtIndex(targetIndex);
        const overlapX = Math.abs(centerX - (targetOrigin.x + colWidth / 2));
        const overlapY = Math.abs(centerY - (targetOrigin.y + rowHeight / 2));
        
        // If overlap is significant (close to center) OR velocity is high towards it
        const isSwapThreshold = (overlapX < colWidth * SWAP_THRESHOLD) && (overlapY < rowHeight * SWAP_THRESHOLD);
        
        if (isSwapThreshold) {
             // Reset folder detection if we are swapping
             if (dragState.current.folderTimer && isJiggleMode) {
                 clearTimeout(dragState.current.folderTimer);
                 dragState.current.folderTimer = null;
                 setFolderTargetId(null);
             }

             // Execute Swap
             const newApps = [...apps];
             const [movedItem] = newApps.splice(currentIndex, 1);
             newApps.splice(targetIndex, 0, movedItem);
             setApps(newApps);
             
             // Haptic
             triggerHaptic('swap');

             // Adjust start pos so the icon doesn't jump visually under the cursor
             // The new visual origin changed, so we subtract that change from our drag offset
             const newOrigin = getPositionAtIndex(targetIndex);
             dragState.current.startX += (newOrigin.x - currentOrigin.x);
             dragState.current.startY += (newOrigin.y - currentOrigin.y);
             
             // Recalculate visual pos immediately
             const newDx = dragState.current.currentX - dragState.current.startX;
             const newDy = dragState.current.currentY - dragState.current.startY;
             setVisualDragPos({ x: newDx, y: newDy });
        } else {
             // Folder Detection Logic (Multi-layout flow pause)
             // If we are hovering STABLY over another item (not swapping yet)
             if (!dragState.current.folderTimer && isJiggleMode) {
                 dragState.current.folderTimer = setTimeout(() => {
                     // Trigger folder visual
                     setFolderTargetId(apps[targetIndex].id);
                     triggerHaptic('folder');
                 }, FOLDER_HOVER_DELAY);
                 dragState.current.folderTargetId = apps[targetIndex].id;
             } else if (dragState.current.folderTargetId !== apps[targetIndex].id) {
                 // Moved away
                 if (dragState.current.folderTimer) clearTimeout(dragState.current.folderTimer);
                 dragState.current.folderTimer = null;
                 setFolderTargetId(null);
                 dragState.current.folderTargetId = null;
             }
        }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState.current.folderTimer) {
        clearTimeout(dragState.current.folderTimer);
        dragState.current.folderTimer = null;
    }
    setFolderTargetId(null);

    if (activeDragId) {
        // Magnetic Slot: Snap to grid
        setActiveDragId(null);
        setVisualDragPos({ x: 0, y: 0 }); // Reset visual offset, CSS layout takes over
        triggerHaptic('drop');
    } else {
        // It was a click, not a drag
        const app = apps.find(a => apps.indexOf(a) === dragState.current.initialIndex);
        if (app && !isJiggleMode) {
            handleAppClick(app);
        }
    }
  };

  const handleAppClick = (app: AppItem) => {
    if (!app.isMock && app.path) {
      navigate(app.path);
    }
  };

  const removeApp = (e: React.MouseEvent | React.TouchEvent, id: string) => {
     e.stopPropagation();
     e.preventDefault();
     setApps(prev => prev.filter(app => app.id !== id));
  };

  // --- Render Helpers ---

  const isLight = theme === 'light';
  const textColor = isLight ? 'text-black' : 'text-white';
  const textSubColor = isLight ? 'text-black/80' : 'text-white/80';
  const textShadow = isLight ? '' : 'shadow-black drop-shadow-md';

  const renderDockIcon = (path: string, icon: React.ReactNode, color: string) => (
    <button
      onClick={() => {
        if (!isJiggleMode) navigate(path);
      }}
      className={`transition-transform duration-200 active:scale-90 relative ${isJiggleMode ? 'animate-jiggle' : ''}`}
      style={{ animationDelay: `${Math.random() * -0.5}s` }}
    >
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md`}>
        {icon}
      </div>
      {isJiggleMode && (
         <div className="absolute -top-2 -left-2 w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-white border border-white z-20">
            <span className="w-3 h-0.5 bg-white"></span>
         </div>
      )}
    </button>
  );

  return (
    <>
      {/* Background Tap Area to exit Jiggle Mode */}
      {isJiggleMode && (
        <div 
           className="absolute inset-0 z-0" 
           onPointerDown={() => setIsJiggleMode(false)}
        ></div>
      )}

      {/* Done Button for Jiggle Mode */}
      {isJiggleMode && (
         <div className="absolute top-14 right-6 z-50 animate-pop-in">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsJiggleMode(false); }}
              className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-sm font-medium hover:bg-white/30 transition-colors border border-white/10"
            >
              完成
            </button>
         </div>
      )}

      {/* Home Screen Content */}
      <div className={`absolute inset-0 pt-20 px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isBlurred ? 'scale-90 opacity-0 pointer-events-none blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
        
        {/* Date/Time Widget */}
        <div className={`mt-8 mb-12 text-center transition-opacity ${isJiggleMode ? 'opacity-40' : 'opacity-100'}`}>
           <h1 className={`text-7xl font-thin tracking-tighter select-none ${textColor} ${textShadow}`}>
             {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
           </h1>
           <p className={`text-lg font-light mt-2 tracking-wide select-none ${textSubColor}`}>
             {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>

        {/* App Grid - Absolute Layout */}
        <div 
            ref={containerRef}
            className="relative w-full h-[400px] select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
          {apps.map((app, index) => {
            const isDragging = app.id === activeDragId;
            const isFolderTarget = app.id === folderTargetId;
            const pos = getPositionAtIndex(index);
            
            // Layout Style
            const style: React.CSSProperties = {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '25%', // 4 cols
                height: '110px',
                transform: isDragging 
                    ? `translate3d(${pos.x + visualDragPos.x}px, ${pos.y + visualDragPos.y}px, 0) scale(1.15)`
                    : `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${isFolderTarget ? 0.9 : 1})`,
                zIndex: isDragging ? 50 : 1,
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)', // Spring-like CSS
                touchAction: 'none', // Critical for pointer events
            };

            return (
              <div
                key={app.id}
                onPointerDown={(e) => handlePointerDown(e, app, index)}
                style={style}
                className="flex flex-col items-center justify-start pt-2"
              >
                <div 
                  className={`w-16 h-16 rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md relative ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''}`}
                  style={{ animationDelay: `${(index * 0.1) % 1}s` }}
                >
                  {app.icon}
                  
                  {/* Delete Badge */}
                  {isJiggleMode && (
                     <button 
                       onPointerDown={(e) => removeApp(e, app.id)}
                       className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white border border-white z-20 hover:bg-red-500 transition-colors"
                     >
                       <span className="w-3 h-0.5 bg-white"></span>
                     </button>
                  )}
                </div>
                <span className={`text-xs font-medium mt-2 ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${textColor} ${textShadow}`}>{app.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dock (Priority Slot) */}
      <div className={`absolute bottom-6 left-4 right-4 h-24 glass-panel rounded-[2.5rem] flex items-center justify-around px-6 transition-all duration-500 transform ${isBlurred ? 'translate-y-40' : 'translate-y-0'} z-20`}>
         {renderDockIcon('/chat', <IconChat className="w-6 h-6 text-white" />, 'bg-blue-500/40')}
         {renderDockIcon('/worldbook', <IconBook className="w-6 h-6 text-amber-100" />, 'bg-amber-600/40')}
         <div className="w-[1px] h-10 bg-white/10 mx-2"></div>
         {renderDockIcon('/settings', <IconSettings className="w-6 h-6 text-gray-200" />, 'bg-slate-500/40')}
      </div>
    </>
  );
};

export default Desktop;