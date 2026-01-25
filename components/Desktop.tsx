
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
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  
  const longPressTimer = useRef<any>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const longPressTriggered = useRef(false);
  
  // Store refs to grid items for geometric calculation
  const itemsRef = useRef<Map<number, HTMLDivElement>>(new Map());

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTriggered.current = false;

    if (isJiggleMode) {
        setActiveDragIndex(index);
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
    if (isJiggleMode && activeDragIndex !== null && touchStartPos.current) {
        if (e.cancelable) e.preventDefault();

        // Calculate visual drag offset relative to start position
        const offsetX = currentX - touchStartPos.current.x;
        const offsetY = currentY - touchStartPos.current.y;
        setDragPosition({ x: offsetX, y: offsetY });

        // --- OVERLAP SWAP LOGIC ---
        const currentSlotEl = itemsRef.current.get(activeDragIndex);
        if (currentSlotEl) {
            // Get current visual rect (includes scale transform)
            const currentRect = currentSlotEl.getBoundingClientRect();
            
            // Calculate "Base" position by subtracting the current translation (state)
            // This approximates the slot position. Note: scale effect on 'left' is minor enough to ignore for hit testing.
            const baseLeft = currentRect.left - dragPosition.x;
            const baseTop = currentRect.top - dragPosition.y;

            // Compute current Drag Rect based on latest touch offset
            const dragRect = {
                left: baseLeft + offsetX,
                top: baseTop + offsetY,
                right: baseLeft + offsetX + currentRect.width,
                bottom: baseTop + offsetY + currentRect.height,
                width: currentRect.width,
                height: currentRect.height
            };
            
            const dragArea = dragRect.width * dragRect.height;

            let maxOverlapRatio = 0;
            let bestTargetIndex = -1;

            itemsRef.current.forEach((el, index) => {
                if (index === activeDragIndex) return;
                
                const targetRect = el.getBoundingClientRect();
                
                // Calculate Intersection Rectangle
                const interLeft = Math.max(dragRect.left, targetRect.left);
                const interTop = Math.max(dragRect.top, targetRect.top);
                const interRight = Math.min(dragRect.right, targetRect.right);
                const interBottom = Math.min(dragRect.bottom, targetRect.bottom);

                // Check if they actually intersect
                if (interRight > interLeft && interBottom > interTop) {
                    const intersectionArea = (interRight - interLeft) * (interBottom - interTop);
                    const ratio = intersectionArea / dragArea;

                    if (ratio > maxOverlapRatio) {
                        maxOverlapRatio = ratio;
                        bestTargetIndex = index;
                    }
                }
            });

            // Threshold: Swap if overlap covers > 50% of the dragged icon
            if (bestTargetIndex !== -1 && maxOverlapRatio > 0.5) {
                 const targetSlotEl = itemsRef.current.get(bestTargetIndex);
                 
                 if (targetSlotEl) {
                     const targetRect = targetSlotEl.getBoundingClientRect();
                     
                     // 1. Perform Swap in Data
                     setApps(prev => {
                         const newApps = [...prev];
                         const [removed] = newApps.splice(activeDragIndex, 1);
                         newApps.splice(bestTargetIndex, 0, removed);
                         return newApps;
                     });

                     // 2. COMPENSATE OFFSET for seamless visual continuity
                     // We calculate the distance between the center of the current slot and the target slot.
                     // Dragged Item (Base) Center
                     const currentSlotCenter = {
                         x: baseLeft + currentRect.width / 2,
                         y: baseTop + currentRect.height / 2
                     };
                     
                     // Target Item Center
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
                     
                     // 3. Update State
                     // Adjust dragPosition relative to the new anchor (touchStartPos)
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
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
    // Reset drag state
    // By clearing this, the inline 'transform' style is removed.
    // The CSS 'transition-transform' class will then animate the icon 
    // from its last drag position back to (0,0) - the center of the slot.
    setActiveDragIndex(null);
    setDragPosition({ x: 0, y: 0 });
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

  const removeApp = (e: React.MouseEvent | React.TouchEvent, id: string) => {
     e.stopPropagation();
     e.preventDefault();
     setApps(prev => prev.filter(app => app.id !== id));
  };

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
          {apps.map((app, index) => {
            const isDragging = index === activeDragIndex;
            return (
              <div
                key={app.id}
                data-app-index={index}
                ref={(el) => {
                    if (el) itemsRef.current.set(index, el);
                    else itemsRef.current.delete(index);
                }}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                // Mouse event handlers for desktop testing compatibility
                onMouseDown={(e) => {
                     // Basic mouse support simulation
                     if (isJiggleMode) {
                         const mouseE = e as unknown as React.TouchEvent;
                         // Mocking touches[0]
                         (mouseE as any).touches = [{ clientX: e.clientX, clientY: e.clientY }];
                         handleTouchStart(mouseE, index);
                     }
                }}
                onClick={() => handleAppClick(app)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
                style={{ 
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    touchAction: isDragging ? 'none' : 'auto', 
                    transform: isDragging 
                        ? `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(1.15)` 
                        : 'translate(0px, 0px) scale(1)', 
                    zIndex: isDragging ? 50 : 'auto',
                    pointerEvents: isDragging ? 'none' : 'auto', // Allow hit testing through dragging element
                    // Vital: Disable transition during drag for instant response, enable on release for "Snap"
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                }}
                className={`flex flex-col items-center gap-2 group relative ${
                  isDragging ? '' : (isJiggleMode ? '' : 'hover:scale-105 active:scale-95')
                } ${app.isMock ? 'opacity-90' : ''}`}
              >
                <div 
                  className={`w-16 h-16 rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md relative ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''}`}
                  style={{ animationDelay: `${Math.random() * -0.5}s` }}
                >
                  {app.icon}
                  
                  {/* Delete Badge */}
                  {isJiggleMode && (
                     <button 
                       onClick={(e) => removeApp(e, app.id)}
                       onTouchEnd={(e) => removeApp(e, app.id)}
                       className="absolute -top-2 -left-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white border border-white z-20 hover:bg-red-500 transition-colors pointer-events-auto"
                     >
                       <span className="w-3 h-0.5 bg-white"></span>
                     </button>
                  )}
                </div>
                <span className={`text-xs font-medium ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${textColor} ${textShadow}`} style={{ animationDelay: `${Math.random() * -0.5}s` }}>{app.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dock */}
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
    