
import React, { useState, useRef, useEffect } from 'react';
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
  
  // Drag State
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [dragSource, setDragSource] = useState<'desktop' | 'dock' | null>(null); // Track where the drag started
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  
  // Refs
  const longPressTimer = useRef<any>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const longPressTriggered = useRef(false);
  const itemsRef = useRef<Map<number, HTMLDivElement>>(new Map()); // Desktop items
  const dockRef = useRef<HTMLDivElement>(null); // Dock container

  // Velocity Tracking Ref
  const velocityRef = useRef({ vx: 0, vy: 0, lastX: 0, lastY: 0, lastTime: 0 });

  // Desktop Apps
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

  // Dock Apps
  const [dockApps, setDockApps] = useState<AppItem[]>([]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent, index: number, source: 'desktop' | 'dock') => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    // Reset Velocity Tracking
    velocityRef.current = { 
        vx: 0, vy: 0, 
        lastX: touch.clientX, lastY: touch.clientY, 
        lastTime: Date.now() 
    };

    longPressTriggered.current = false;

    if (isJiggleMode) {
        setActiveDragIndex(index);
        setDragSource(source);
    } else {
        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            setIsJiggleMode(true);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    const now = Date.now();

    // Calculate Velocity
    const dt = now - velocityRef.current.lastTime;
    if (dt > 0) {
        const dx = currentX - velocityRef.current.lastX;
        const dy = currentY - velocityRef.current.lastY;
        const vx = dx / dt;
        const vy = dy / dt;
        
        // Apply simple smoothing (EMA)
        velocityRef.current.vx = vx * 0.5 + velocityRef.current.vx * 0.5;
        velocityRef.current.vy = vy * 0.5 + velocityRef.current.vy * 0.5;
    }
    velocityRef.current.lastX = currentX;
    velocityRef.current.lastY = currentY;
    velocityRef.current.lastTime = now;

    // Check movement to cancel long press if not yet in jiggle mode
    if (longPressTimer.current && touchStartPos.current && !isJiggleMode) {
        const dx = currentX - touchStartPos.current.x;
        const dy = currentY - touchStartPos.current.y;
        if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }

    // Drag Logic
    if (isJiggleMode && activeDragIndex !== null && dragSource && touchStartPos.current) {
        if (e.cancelable) e.preventDefault();

        // Calculate visual drag offset relative to start position
        const offsetX = currentX - touchStartPos.current.x;
        const offsetY = currentY - touchStartPos.current.y;
        setDragPosition({ x: offsetX, y: offsetY });

        // --- 1. DETECT DOCK OVERLAP (PRIORITY) ---
        let currentRect: DOMRect | undefined;
        
        if (dragSource === 'desktop') {
            const el = itemsRef.current.get(activeDragIndex);
            if (el) currentRect = el.getBoundingClientRect();
        } else {
             // Approximation for dock items
             currentRect = { left: 0, top: 0, width: 60, height: 60 } as DOMRect; 
        }

        let isOverDock = false;
        
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            const dragItemWidth = 64; 
            const dragItemHeight = 64;
            
            const absoluteX = touchStartPos.current.x + offsetX; 
            const absoluteY = touchStartPos.current.y + offsetY; 

            const dragRect = {
                left: absoluteX - dragItemWidth / 2,
                top: absoluteY - dragItemHeight / 2,
                right: absoluteX + dragItemWidth / 2,
                bottom: absoluteY + dragItemHeight / 2,
                width: dragItemWidth,
                height: dragItemHeight
            };

            const interLeft = Math.max(dragRect.left, dockRect.left);
            const interTop = Math.max(dragRect.top, dockRect.top);
            const interRight = Math.min(dragRect.right, dockRect.right);
            const interBottom = Math.min(dragRect.bottom, dockRect.bottom);

            if (interRight > interLeft && interBottom > interTop) {
                const intersectionArea = (interRight - interLeft) * (interBottom - interTop);
                const dragArea = dragRect.width * dragRect.height;
                if (intersectionArea / dragArea > 0.3) {
                    isOverDock = true;
                }
            }
        }

        if (isOverDock) {
            return; 
        }

        // --- 2. DESKTOP GRID SWAP LOGIC ---
        if (dragSource === 'desktop') {
            const currentSlotEl = itemsRef.current.get(activeDragIndex);
            if (currentSlotEl) {
                const currentRect = currentSlotEl.getBoundingClientRect();
                const baseLeft = currentRect.left - dragPosition.x;
                const baseTop = currentRect.top - dragPosition.y;

                const dragRect = {
                    left: baseLeft + offsetX,
                    top: baseTop + offsetY,
                    right: baseLeft + offsetX + currentRect.width,
                    bottom: baseTop + offsetY + currentRect.height,
                    width: currentRect.width,
                    height: currentRect.height
                };
                
                const dragArea = dragRect.width * dragRect.height;
                
                let maxScore = 0;
                let bestTargetIndex = -1;

                itemsRef.current.forEach((el, index) => {
                    if (index === activeDragIndex) return;
                    const targetRect = el.getBoundingClientRect();
                    const interLeft = Math.max(dragRect.left, targetRect.left);
                    const interTop = Math.max(dragRect.top, targetRect.top);
                    const interRight = Math.min(dragRect.right, targetRect.right);
                    const interBottom = Math.min(dragRect.bottom, targetRect.bottom);

                    if (interRight > interLeft && interBottom > interTop) {
                        const intersectionArea = (interRight - interLeft) * (interBottom - interTop);
                        const ratio = intersectionArea / dragArea;
                        
                        // Base Score from Overlap
                        let score = ratio;

                        // --- DIRECTIONAL INTELLIGENCE ---
                        // If we have some overlap (> 25%), check if velocity vector implies we are "throwing" 
                        // the icon into this slot.
                        if (ratio > 0.25) {
                            const dragCenter = { 
                                x: dragRect.left + dragRect.width / 2, 
                                y: dragRect.top + dragRect.height / 2 
                            };
                            const targetCenter = { 
                                x: targetRect.left + targetRect.width / 2, 
                                y: targetRect.top + targetRect.height / 2 
                            };
                            
                            const vecX = targetCenter.x - dragCenter.x;
                            const vecY = targetCenter.y - dragCenter.y;
                            const dist = Math.sqrt(vecX*vecX + vecY*vecY);
                            
                            if (dist > 0) {
                                // Normalized direction vector
                                const uX = vecX / dist;
                                const uY = vecY / dist;
                                
                                // Project velocity onto target direction
                                const vProj = velocityRef.current.vx * uX + velocityRef.current.vy * uY;
                                
                                // If moving towards target fast enough (e.g. > 0.4 px/ms)
                                if (vProj > 0.4) {
                                    score += 0.35; // Boost score significantly
                                }
                            }
                        }

                        if (score > maxScore) {
                            maxScore = score;
                            bestTargetIndex = index;
                        }
                    }
                });

                // Threshold logic: Standard > 0.5, OR boosted score > 0.5
                if (bestTargetIndex !== -1 && maxScore > 0.5) {
                     const targetSlotEl = itemsRef.current.get(bestTargetIndex);
                     if (targetSlotEl) {
                         const targetRect = targetSlotEl.getBoundingClientRect();
                         setApps(prev => {
                             const newApps = [...prev];
                             const [removed] = newApps.splice(activeDragIndex, 1);
                             newApps.splice(bestTargetIndex, 0, removed);
                             return newApps;
                         });

                         const currentSlotCenter = {
                             x: baseLeft + currentRect.width / 2,
                             y: baseTop + currentRect.height / 2
                         };
                         const targetSlotCenter = {
                             x: targetRect.left + targetRect.width / 2,
                             y: targetRect.top + targetRect.height / 2
                         };
                         const deltaX = targetSlotCenter.x - currentSlotCenter.x;
                         const deltaY = targetSlotCenter.y - currentSlotCenter.y;

                         if (touchStartPos.current) {
                            touchStartPos.current.x += deltaX;
                            touchStartPos.current.y += deltaY;
                         }
                         setDragPosition({
                            x: currentX - touchStartPos.current!.x,
                            y: currentY - touchStartPos.current!.y
                         });
                         setActiveDragIndex(bestTargetIndex);
                         if (navigator.vibrate) navigator.vibrate(10);
                     }
                }
            }
        }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }

    // --- HANDLE DROPPING LOGIC (Dock vs Desktop) ---
    if (isJiggleMode && activeDragIndex !== null && dragSource && touchStartPos.current) {
        const touch = e.changedTouches[0]; // Use changedTouches for end event
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        
        // 1. Check if dropped OVER DOCK
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            const dropX = currentX;
            const dropY = currentY;
            
            // Allow a bit of buffer around dock for "dropping"
            if (dropX >= dockRect.left && dropX <= dockRect.right &&
                dropY >= dockRect.top - 20 && dropY <= dockRect.bottom + 20) {
                isOverDock = true;
            }
        }

        // 2. Logic: Desktop -> Dock
        if (dragSource === 'desktop' && isOverDock) {
            if (dockApps.length < 4) {
                // Move from apps to dockApps
                const appToMove = apps[activeDragIndex];
                setApps(prev => prev.filter((_, i) => i !== activeDragIndex));
                setDockApps(prev => [...prev, appToMove]);
                if (navigator.vibrate) navigator.vibrate(20);
            }
        }
        // 3. Logic: Dock -> Desktop
        else if (dragSource === 'dock' && !isOverDock) {
            // Move from dockApps to apps
            const appToMove = dockApps[activeDragIndex];
            setDockApps(prev => prev.filter((_, i) => i !== activeDragIndex));
            setApps(prev => [...prev, appToMove]); // Add to end of desktop
            if (navigator.vibrate) navigator.vibrate(20);
        }
    }

    // Reset Drag State
    setActiveDragIndex(null);
    setDragSource(null);
    setDragPosition({ x: 0, y: 0 });
    touchStartPos.current = null;
  };

  const handleAppClick = (app: AppItem) => {
    if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
    }
    if (isJiggleMode) return;
    
    if (!app.isMock && app.path) {
      navigate(app.path);
    }
  };

  const removeApp = (e: React.MouseEvent | React.TouchEvent, id: string, fromDock: boolean = false) => {
     e.stopPropagation();
     e.preventDefault();
     if (fromDock) {
        setDockApps(prev => prev.filter(app => app.id !== id));
     } else {
        setApps(prev => prev.filter(app => app.id !== id));
     }
  };

  // Generalized Render Function for both Grid and Dock icons
  const renderAppIcon = (app: AppItem, index: number, isDock: boolean) => {
    const isDragging = (isDock ? dragSource === 'dock' : dragSource === 'desktop') && index === activeDragIndex;
    
    // Scale and Transform Logic
    const style: React.CSSProperties = {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: isDragging ? 'none' : 'auto', 
        transform: isDragging 
            ? `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(1.15)` 
            : 'translate(0px, 0px) scale(1)', 
        zIndex: isDragging ? 100 : 'auto', // High z-index for dragging
        pointerEvents: isDragging ? 'none' : 'auto',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
    };

    return (
        <div
            key={app.id}
            data-app-id={app.id}
            // Only attach ref for desktop items for the grid swap logic
            ref={!isDock ? (el) => {
                if (el) itemsRef.current.set(index, el);
                else itemsRef.current.delete(index);
            } : undefined}
            onTouchStart={(e) => handleTouchStart(e, index, isDock ? 'dock' : 'desktop')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => {
                    if (isJiggleMode) {
                        const mouseE = e as unknown as React.TouchEvent;
                        (mouseE as any).touches = [{ clientX: e.clientX, clientY: e.clientY }];
                        handleTouchStart(mouseE, index, isDock ? 'dock' : 'desktop');
                    }
            }}
            onClick={() => handleAppClick(app)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={style}
            className={`flex flex-col items-center gap-2 group relative ${
                isDragging ? '' : (isJiggleMode ? '' : 'hover:scale-105 active:scale-95')
            } ${app.isMock ? 'opacity-90' : ''}`}
        >
            <div 
                className={`${isDock ? 'w-14 h-14' : 'w-16 h-16'} rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md relative ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''}`}
                style={{ animationDelay: `${Math.random() * -0.5}s` }}
            >
                {/* Clone icon to adjust size if needed, or just render */}
                <div className={isDock ? "scale-90" : ""}>{app.icon}</div>
                
                {/* Delete Badge */}
                {isJiggleMode && (
                    <button 
                    onClick={(e) => removeApp(e, app.id, isDock)}
                    onTouchEnd={(e) => removeApp(e, app.id, isDock)}
                    className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white border border-white z-20 hover:bg-red-500 transition-colors pointer-events-auto"
                    >
                    <span className="w-3 h-0.5 bg-white"></span>
                    </button>
                )}
            </div>
            {!isDock && (
                <span className={`text-xs font-medium ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${textColor} ${textShadow}`} style={{ animationDelay: `${Math.random() * -0.5}s` }}>{app.label}</span>
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
      {/* Background Tap Area to exit Jiggle Mode */}
      {isJiggleMode && (
        <div 
           className="absolute inset-0 z-0" 
           onClick={() => setIsJiggleMode(false)}
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

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-6 px-2 relative z-10 select-none">
          {apps.map((app, index) => renderAppIcon(app, index, false))}
        </div>
      </div>

      {/* Dock */}
      <div 
        ref={dockRef}
        className={`absolute bottom-6 left-4 right-4 h-24 glass-panel rounded-[2.5rem] flex items-center justify-around px-4 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isBlurred ? 'scale-90 opacity-0 pointer-events-none blur-sm' : 'scale-100 opacity-100 blur-0'}`}
      >
         {/* Render Dock Apps */}
         {dockApps.map((app, index) => renderAppIcon(app, index, true))}
         
         {/* Placeholder if empty (optional aesthetic) */}
         {dockApps.length === 0 && !isJiggleMode && (
             <div className="text-white/20 text-xs">Dock 空空如也</div>
         )}
      </div>
    </>
  );
};

export default Desktop;
