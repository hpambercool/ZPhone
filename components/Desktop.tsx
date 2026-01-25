import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const Desktop: React.FC<DesktopProps> = ({ isBlurred, theme }) => {
  const navigate = useNavigate();
  const [isJiggleMode, setIsJiggleMode] = useState(false);
  
  // Physics & Interaction State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [folderTargetId, setFolderTargetId] = useState<string | null>(null);
  const [dockHovered, setDockHovered] = useState(false);
  
  // Apps Data
  const [desktopApps, setDesktopApps] = useState<AppItem[]>([
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

  // Start with empty dock as requested
  const [dockApps, setDockApps] = useState<AppItem[]>([]);

  // Refs for logic
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dockRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const folderTimer = useRef<any>(null);
  const lastPointerPos = useRef({ x: 0, y: 0, time: 0 });
  const velocity = useRef({ x: 0, y: 0 }); // px/ms

  // Clean up timers
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (folderTimer.current) clearTimeout(folderTimer.current);
    };
  }, []);

  // -- Physics Helpers --

  const vibrate = (pattern: number | number[]) => {
    if (navigator.vibrate) navigator.vibrate(pattern);
  };

  const getOverlap = (rect1: DOMRect, rect2: DOMRect) => {
    const xOverlap = Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left));
    const yOverlap = Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top));
    return (xOverlap * yOverlap) / (rect1.width * rect1.height);
  };

  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
     return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // -- Event Handlers --

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent, app: AppItem, source: 'desktop' | 'dock') => {
    // Only support left click or touch
    if ('button' in e && e.button !== 0) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartPos.current = { x: clientX, y: clientY };
    lastPointerPos.current = { x: clientX, y: clientY, time: Date.now() };
    velocity.current = { x: 0, y: 0 };

    if (isJiggleMode) {
        startDrag(app.id, clientX, clientY);
    } else {
        longPressTimer.current = setTimeout(() => {
            setIsJiggleMode(true);
            vibrate(50); // Haptic: Enter Jiggle
            startDrag(app.id, clientX, clientY);
        }, 500);
    }
  };

  const startDrag = (id: string, x: number, y: number) => {
      setActiveDragId(id);
      dragStartPos.current = { x, y };
      setDragOffset({ x: 0, y: 0 });
  };

  // Global pointer move for dragging
  useEffect(() => {
    const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
        if (!activeDragId) return;
        if (e.cancelable) e.preventDefault(); // Prevent scrolling

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // Velocity Calc
        const now = Date.now();
        const dt = now - lastPointerPos.current.time;
        if (dt > 0) {
            velocity.current = {
                x: (clientX - lastPointerPos.current.x) / dt,
                y: (clientY - lastPointerPos.current.y) / dt
            };
        }
        lastPointerPos.current = { x: clientX, y: clientY, time: now };

        const deltaX = clientX - dragStartPos.current.x;
        const deltaY = clientY - dragStartPos.current.y;
        setDragOffset({ x: deltaX, y: deltaY });

        // -- Logic: Swapping & Folder Detection --
        const draggedEl = itemRefs.current.get(activeDragId);
        if (!draggedEl) return;
        const draggedRect = draggedEl.getBoundingClientRect();
        // Virtual rect based on drag offset (since the element moves with transform)
        // Actually, since we render using transform, getBoundingClientRect returns the moved position.
        
        // 1. Check Dock Interaction
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            if (getOverlap(draggedRect, dockRect) > 0.3) {
                isOverDock = true;
            }
        }
        setDockHovered(isOverDock);

        // 2. Desktop Grid Interactions
        if (!isOverDock) {
             const currentIndex = desktopApps.findIndex(a => a.id === activeDragId);
             if (currentIndex !== -1) {
                 // Check overlaps with other desktop apps
                 let potentialSwapIndex = -1;
                 let potentialFolder = null;

                 desktopApps.forEach((targetApp, idx) => {
                     if (targetApp.id === activeDragId) return;
                     const targetEl = itemRefs.current.get(targetApp.id);
                     if (!targetEl) return;
                     const targetRect = targetEl.getBoundingClientRect();

                     const overlap = getOverlap(draggedRect, targetRect);
                     const dist = getDistance(
                         draggedRect.left + draggedRect.width/2, draggedRect.top + draggedRect.height/2,
                         targetRect.left + targetRect.width/2, targetRect.top + targetRect.height/2
                     );

                     // Folder Drop Detection (Stationary hover)
                     if (dist < 20) { // Very close center-to-center
                         potentialFolder = targetApp.id;
                     }

                     // Over-half Swap / Trajectory Aware
                     // If moving fast towards a slot, we might swap earlier, but standard "over half" is robust.
                     if (overlap > 0.5) {
                         potentialSwapIndex = idx;
                     }
                 });

                 // Folder Logic
                 if (potentialFolder) {
                     if (folderTargetId !== potentialFolder) {
                         // Debounce folder entry
                         if (folderTimer.current) clearTimeout(folderTimer.current);
                         folderTimer.current = setTimeout(() => {
                             setFolderTargetId(potentialFolder);
                             vibrate(15); // Haptic: Folder Ready
                         }, 300);
                     }
                 } else {
                     if (folderTimer.current) clearTimeout(folderTimer.current);
                     setFolderTargetId(null);
                 }

                 // Swap Logic (Priority over folder if moving fast)
                 const speed = Math.sqrt(velocity.current.x**2 + velocity.current.y**2);
                 if (potentialSwapIndex !== -1 && potentialSwapIndex !== currentIndex && !folderTargetId && speed > 0.1) {
                      // Perform Swap
                      const newApps = [...desktopApps];
                      const [removed] = newApps.splice(currentIndex, 1);
                      newApps.splice(potentialSwapIndex, 0, removed);
                      setDesktopApps(newApps);
                      vibrate(10); // Haptic: Swap Tick
                 }
             }
        } else {
            // Dragging over Dock
             const currentIndex = dockApps.findIndex(a => a.id === activeDragId);
             if (currentIndex !== -1) {
                 // Dock Reordering logic could go here
                 dockApps.forEach((targetApp, idx) => {
                     if (targetApp.id === activeDragId) return;
                     const targetEl = itemRefs.current.get(targetApp.id);
                     if (!targetEl) return;
                     const overlap = getOverlap(draggedRect, targetEl.getBoundingClientRect());
                     if (overlap > 0.5) {
                          const newDock = [...dockApps];
                          const [removed] = newDock.splice(currentIndex, 1);
                          newDock.splice(idx, 0, removed);
                          setDockApps(newDock);
                          vibrate(10);
                     }
                 });
             }
        }
    };

    const handleGlobalUp = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (folderTimer.current) clearTimeout(folderTimer.current);
        
        if (activeDragId) {
             // -- Drop Logic --
             
             // Check if dropping into Dock
             if (dockHovered) {
                 const appInDesktopIdx = desktopApps.findIndex(a => a.id === activeDragId);
                 if (appInDesktopIdx !== -1) {
                     // Move Desktop -> Dock
                     if (dockApps.length < 4) { // Limit dock size
                         const app = desktopApps[appInDesktopIdx];
                         setDesktopApps(prev => prev.filter(a => a.id !== activeDragId));
                         setDockApps(prev => [...prev, app]);
                         vibrate(20); // Haptic: Drop Success
                     } else {
                         // Dock full, spring back (handled by state reset)
                     }
                 }
             } else {
                 // Check if dropping into Desktop (from Dock)
                 const appInDockIdx = dockApps.findIndex(a => a.id === activeDragId);
                 if (appInDockIdx !== -1) {
                     // Move Dock -> Desktop
                     // Note: We need to know WHERE to drop. For simplicity, append to end.
                     // Or logic above handles swap if we were temporarily in desktop list? 
                     // Since we didn't move it to desktop list during drag (to avoid complex state), 
                     // we do it now if valid.
                     
                     // Simple implementation: Drop to desktop if not over dock
                     const app = dockApps[appInDockIdx];
                     setDockApps(prev => prev.filter(a => a.id !== activeDragId));
                     setDesktopApps(prev => [...prev, app]);
                     vibrate(20);
                 }
             }

             // Reset Physics
             setActiveDragId(null);
             setDragOffset({ x: 0, y: 0 });
             setFolderTargetId(null);
             setDockHovered(false);
             
             // Velocity differentiation for spring
             // We just let CSS handle the spring back by removing the inline transform
        }
    };

    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);

    return () => {
        window.removeEventListener('touchmove', handleGlobalMove);
        window.removeEventListener('touchend', handleGlobalUp);
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [activeDragId, desktopApps, dockApps, dockHovered, folderTargetId]);

  // -- Render Helpers --

  const handleAppClick = (app: AppItem) => {
    if (isJiggleMode) return;
    if (!app.isMock && app.path) {
      navigate(app.path);
    }
  };

  const removeApp = (e: React.MouseEvent | React.TouchEvent, id: string, fromDock: boolean) => {
     e.stopPropagation();
     if (fromDock) {
         setDockApps(prev => prev.filter(a => a.id !== id));
     } else {
         setDesktopApps(prev => prev.filter(a => a.id !== id));
     }
  };

  const renderAppIcon = (app: AppItem, isDockItem: boolean) => {
      const isDragging = activeDragId === app.id;
      const isFolderTarget = folderTargetId === app.id;

      return (
        <div
            key={app.id}
            ref={(el) => { if (el) itemRefs.current.set(app.id, el); }}
            className={`flex flex-col items-center gap-2 relative transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isDragging ? 'z-50 cursor-grabbing' : 'z-10 cursor-pointer'
            } ${isFolderTarget ? 'scale-110' : 'scale-100'}`}
            style={{
                transform: isDragging ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(1.1)` : 'translate(0px, 0px) scale(1)',
                touchAction: 'none' // Critical for Pointer Events
            }}
            onMouseDown={(e) => handlePointerDown(e, app, isDockItem ? 'dock' : 'desktop')}
            onTouchStart={(e) => handlePointerDown(e, app, isDockItem ? 'dock' : 'desktop')}
            onClick={(e) => {
                if (activeDragId) return; // Prevent click after drag
                handleAppClick(app);
            }}
        >
            <div className={`w-16 h-16 rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md relative ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${isFolderTarget ? 'brightness-125 ring-2 ring-white/50' : ''}`}>
                {app.icon}
                {isJiggleMode && (
                    <button 
                    onClick={(e) => removeApp(e, app.id, isDockItem)}
                    onTouchEnd={(e) => removeApp(e, app.id, isDockItem)} // Better touch response
                    className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white border border-white z-20 hover:bg-red-500 transition-colors pointer-events-auto"
                    >
                    <span className="w-3 h-0.5 bg-white"></span>
                    </button>
                )}
            </div>
            {!isDockItem && (
                <span className={`text-xs font-medium ${theme === 'light' ? 'text-black' : 'text-white'} ${theme === 'dark' ? 'shadow-black drop-shadow-md' : ''} ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''}`}>
                    {app.label}
                </span>
            )}
        </div>
      );
  };

  const isLight = theme === 'light';
  const textColor = isLight ? 'text-black' : 'text-white';
  const textSubColor = isLight ? 'text-black/80' : 'text-white/80';
  const textShadow = isLight ? '' : 'shadow-black drop-shadow-md';

  return (
    <>
      {/* Jiggle Mode Background Overlay */}
      {isJiggleMode && (
        <div 
           className="absolute inset-0 z-0" 
           onClick={() => { setIsJiggleMode(false); vibrate(20); }}
        ></div>
      )}

      {/* Done Button */}
      {isJiggleMode && (
         <div className="absolute top-14 right-6 z-50 animate-pop-in pointer-events-auto">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsJiggleMode(false); vibrate(20); }}
              className="bg-white/20 backdrop-blur-md text-white px-4 py-1 rounded-full text-sm font-medium hover:bg-white/30 transition-colors border border-white/10"
            >
              完成
            </button>
         </div>
      )}

      {/* Desktop Content */}
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

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-6 px-2 relative z-10 select-none min-h-[300px]">
          {desktopApps.map(app => renderAppIcon(app, false))}
        </div>
      </div>

      {/* Dock */}
      <div 
         ref={dockRef}
         className={`absolute bottom-6 left-4 right-4 h-24 glass-panel rounded-[2.5rem] flex items-center justify-around px-6 transition-all duration-500 transform ${isBlurred ? 'translate-y-40' : 'translate-y-0'} z-20 ${dockHovered ? 'scale-105 bg-white/20' : ''}`}
      >
         {/* Dock Apps */}
         {dockApps.map(app => renderAppIcon(app, true))}
         
         {/* Empty state placeholder if needed for magnet visual, but logic handles drops */}
         {dockApps.length === 0 && isJiggleMode && (
             <div className="text-white/20 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-white/10 rounded-xl px-4 py-2">
                 Dock Zone
             </div>
         )}
      </div>
    </>
  );
};

export default Desktop;