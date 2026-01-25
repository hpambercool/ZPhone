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
  const [activeDragIndex, setActiveDragIndex] = useState<string | null>(null); // App ID
  const [dragSource, setDragSource] = useState<'desktop' | 'dock' | null>(null);

  // Physics System
  const springSystem = useRef({
    x: 0, y: 0,          // Current visual offset
    vx: 0, vy: 0,        // Velocity
    scale: 1, vScale: 0, // Scale physics
    targetX: 0, targetY: 0, targetScale: 1, // Targets
    isDragging: false,   // Mode
    active: false        // Loop active
  });
  
  const rafId = useRef<number | null>(null);
  
  // Refs
  const longPressTimer = useRef<any>(null);
  const touchStartPos = useRef<{x: number, y: number} | null>(null);
  const longPressTriggered = useRef(false);
  const itemsRef = useRef<Map<string, HTMLDivElement>>(new Map()); // Map by App ID
  const dockRef = useRef<HTMLDivElement>(null); 
  
  // Optimization: Cache rects to avoid reflows during drag
  const cachedRects = useRef<Map<string, DOMRect>>(new Map());

  // Velocity Tracking Ref (Instantaneous velocity for throw)
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

  // Physics Constants
  const SPRING_STIFFNESS = 220; // Stiffer for snappier return
  const SPRING_DAMPING = 20;
  const SPRING_MASS = 1;
  const DT = 1 / 60; // Standard 60fps step

  // Clean up
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // --- Physics Loop (Run only when released or animating scale) ---
  const runSpringSimulation = () => {
    const state = springSystem.current;

    // If active and dragging, we only animate SCALE in the loop (lifting effect)
    // Position is handled directly in touchMove for zero latency
    if (activeDragIndex && state.active) {
        
        // --- SCALE PHYSICS (Always runs if active) ---
        const fScale = -SPRING_STIFFNESS * (state.scale - state.targetScale) - SPRING_DAMPING * state.vScale;
        const aScale = fScale / SPRING_MASS;
        state.vScale += aScale * DT;
        state.scale += state.vScale * DT;

        // --- POSITION PHYSICS (Only if NOT dragging) ---
        if (!state.isDragging) {
            const fx = -SPRING_STIFFNESS * (state.x - state.targetX) - SPRING_DAMPING * state.vx;
            const fy = -SPRING_STIFFNESS * (state.y - state.targetY) - SPRING_DAMPING * state.vy;
            const ax = fx / SPRING_MASS;
            const ay = fy / SPRING_MASS;

            state.vx += ax * DT;
            state.vy += ay * DT;
            state.x += state.vx * DT;
            state.y += state.vy * DT;
        }

        // Apply Transform
        const el = itemsRef.current.get(activeDragIndex);
        if (el) {
            // If dragging, X/Y are updated by touchMove directly. 
            // However, to keep scale animation smooth, we apply it here.
            // But touchMove might have set a more recent X/Y. 
            // To avoid conflict:
            // 1. If dragging, we read current X/Y (which are set by touchMove) and just apply scale.
            // 2. If not dragging, we apply the spring X/Y.
            
            // Actually, for pure 1:1, touchMove handles the transform. 
            // We only need this loop for 'Settling' (finger up) OR 'Scaling' (pick up).
            
            // If dragging, let touchMove handle the Translation, this loop handles Scale?
            // CSS Transform takes one string. We can't update separately.
            // Strategy: touchMove updates state.x/y AND applies transform.
            // This loop updates state.scale AND applies transform (using latest state.x/y).
            // Since RAF and touchMove are async, it might be fine.
            
            el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
            el.style.zIndex = "100";
            el.style.transition = "none";
        }

        // Settle Check
        const isPosSettled = Math.abs(state.x) < 0.5 && Math.abs(state.y) < 0.5 && Math.abs(state.vx) < 1 && Math.abs(state.vy) < 1;
        const isScaleSettled = Math.abs(state.scale - state.targetScale) < 0.005 && Math.abs(state.vScale) < 0.05;

        if (!state.isDragging && isPosSettled && isScaleSettled) {
            // Snap to finish
            state.x = 0; state.y = 0; state.vx = 0; state.vy = 0;
            state.scale = 1; state.vScale = 0;
            state.active = false;
            
            // Reset style to rely on CSS layout
            if (el) {
               el.style.transform = "";
               el.style.zIndex = "";
            }
            
            setActiveDragIndex(null); 
            rafId.current = null;
            return;
        }
        
        rafId.current = requestAnimationFrame(runSpringSimulation);
    } else {
        state.active = false;
        if (rafId.current) {
            cancelAnimationFrame(rafId.current);
            rafId.current = null;
        }
    }
  };

  const startSpringLoop = () => {
      if (!rafId.current) {
          springSystem.current.active = true;
          runSpringSimulation();
      }
  };

  const updateCachedRects = () => {
    itemsRef.current.forEach((el, id) => {
        cachedRects.current.set(id, el.getBoundingClientRect());
    });
  };

  const handleTouchStart = (e: React.TouchEvent, app: AppItem, source: 'desktop' | 'dock') => {
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
        // Cache layout immediately before dragging starts
        updateCachedRects();

        setActiveDragIndex(app.id);
        setDragSource(source);

        const state = springSystem.current;
        state.isDragging = true;
        state.active = true;
        state.targetScale = 1.15; // Lift up effect
        
        // Keep current visual position if it was already moving (rare), or start at 0
        // Usually start at 0 relative to slot
        state.scale = state.scale || 1; 
        
        startSpringLoop();
    } else {
        longPressTimer.current = setTimeout(() => {
            longPressTriggered.current = true;
            setIsJiggleMode(true);
            if (navigator.vibrate) navigator.vibrate(50);
            
            // If user holds without moving, enter drag mode under finger immediately?
            // iOS style: yes.
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
        const vx = (dx / dt) * 60; 
        const vy = (dy / dt) * 60;
        velocityRef.current.vx = vx * 0.4 + velocityRef.current.vx * 0.6;
        velocityRef.current.vy = vy * 0.4 + velocityRef.current.vy * 0.6;
    }
    velocityRef.current.lastX = currentX;
    velocityRef.current.lastY = currentY;
    velocityRef.current.lastTime = now;

    // Check movement to cancel long press
    if (longPressTimer.current && touchStartPos.current && !isJiggleMode) {
        const dx = currentX - touchStartPos.current.x;
        const dy = currentY - touchStartPos.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }

    // Drag Logic
    if (isJiggleMode && activeDragIndex && dragSource && touchStartPos.current) {
        if (e.cancelable) e.preventDefault();

        // 1. Direct Mapping (No Physics Lag)
        const offsetX = currentX - touchStartPos.current.x;
        const offsetY = currentY - touchStartPos.current.y;
        
        springSystem.current.x = offsetX;
        springSystem.current.y = offsetY;
        
        // DIRECT DOM UPDATE
        const el = itemsRef.current.get(activeDragIndex);
        if (el) {
            // Apply transform immediately, bypassing RAF loop for position
            el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${springSystem.current.scale})`;
            el.style.zIndex = "100";
            el.style.transition = "none";
        }

        // --- DOCK DETECTION ---
        // Use cached rect for Dock if possible, or just bounds
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            if (currentX > dockRect.left && currentX < dockRect.right && currentY > dockRect.top && currentY < dockRect.bottom) {
                isOverDock = true;
            }
        }

        if (isOverDock) return;

        // --- SWAP LOGIC ---
        if (dragSource === 'desktop') {
            const currentIndex = apps.findIndex(a => a.id === activeDragIndex);
            if (currentIndex === -1) return;
            
            // Get current drag rect based on cache + offset
            const currentSlotRect = cachedRects.current.get(activeDragIndex);
            if (!currentSlotRect) return;

            // Approximate visual center of dragged item
            const dragCenterX = currentSlotRect.left + (currentSlotRect.width / 2) + offsetX;
            const dragCenterY = currentSlotRect.top + (currentSlotRect.height / 2) + offsetY;

            let maxScore = 0;
            let bestTargetIndex = -1;

            // Iterate apps to check intersection
            // OPTIMIZATION: Use cachedRects instead of getBoundingClientRect()
            apps.forEach((app, index) => {
                if (app.id === activeDragIndex) return;
                
                const targetRect = cachedRects.current.get(app.id);
                if (!targetRect) return;

                // Simple point-in-rect check for cursor/center
                // Or use intersection area
                const isInside = 
                   dragCenterX > targetRect.left && 
                   dragCenterX < targetRect.right && 
                   dragCenterY > targetRect.top && 
                   dragCenterY < targetRect.bottom;
                
                // Distance based score to find closest center if multiple overlap
                if (isInside) {
                     const targetCenterX = targetRect.left + targetRect.width / 2;
                     const targetCenterY = targetRect.top + targetRect.height / 2;
                     const dist = Math.hypot(dragCenterX - targetCenterX, dragCenterY - targetCenterY);
                     // Score is inverse of distance
                     const score = 1000 - dist; 
                     
                     if (score > maxScore) {
                         maxScore = score;
                         bestTargetIndex = index;
                     }
                }
            });

            if (bestTargetIndex !== -1) {
                 const targetAppId = apps[bestTargetIndex].id;
                 const targetRect = cachedRects.current.get(targetAppId);
                 const oldRect = cachedRects.current.get(activeDragIndex);

                 if (targetRect && oldRect) {
                     setApps(prev => {
                         const newApps = [...prev];
                         const [removed] = newApps.splice(currentIndex, 1);
                         newApps.splice(bestTargetIndex, 0, removed);
                         return newApps;
                     });
                     
                     // UPDATE CACHE MANUALLY
                     // We swapped App A and App B. 
                     // App A is now in Slot B. App B is in Slot A.
                     // The cachedRect for App A should become Slot B's rect.
                     cachedRects.current.set(activeDragIndex, targetRect);
                     cachedRects.current.set(targetAppId, oldRect);

                     // COMPENSATE FOR LAYOUT SHIFT
                     // NewOffset = OldOffset - (NewSlotPos - OldSlotPos)
                     const deltaX = targetRect.left - oldRect.left;
                     const deltaY = targetRect.top - oldRect.top;
                     
                     springSystem.current.x -= deltaX;
                     springSystem.current.y -= deltaY;
                     touchStartPos.current.x += deltaX;
                     touchStartPos.current.y += deltaY;
                     
                     // Force immediate update to prevent flicker
                     if (el) {
                         el.style.transform = `translate3d(${springSystem.current.x}px, ${springSystem.current.y}px, 0) scale(${springSystem.current.scale})`;
                     }
                     
                     if (navigator.vibrate) navigator.vibrate(10);
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

    if (isJiggleMode && activeDragIndex && dragSource && touchStartPos.current) {
        const touch = e.changedTouches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        
        // --- DROP LOGIC ---
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            if (currentX >= dockRect.left && currentX <= dockRect.right &&
                currentY >= dockRect.top - 20 && currentY <= dockRect.bottom + 20) {
                isOverDock = true;
            }
        }

        // 1. Desktop -> Dock
        if (dragSource === 'desktop' && isOverDock) {
            if (dockApps.length < 4) {
                const appIndex = apps.findIndex(a => a.id === activeDragIndex);
                if (appIndex !== -1) {
                    const appToMove = apps[appIndex];
                    setApps(prev => prev.filter(a => a.id !== activeDragIndex));
                    setDockApps(prev => [...prev, appToMove]);
                    if (navigator.vibrate) navigator.vibrate(20);
                }
            }
        }
        // 2. Dock -> Desktop
        else if (dragSource === 'dock' && !isOverDock) {
            const appIndex = dockApps.findIndex(a => a.id === activeDragIndex);
            if (appIndex !== -1) {
                const appToMove = dockApps[appIndex];
                setDockApps(prev => prev.filter(a => a.id !== activeDragIndex));
                setApps(prev => [...prev, appToMove]); 
                if (navigator.vibrate) navigator.vibrate(20);
            }
        }

        // --- PHYSICS TAKEOVER (Phase 3) ---
        const state = springSystem.current;
        state.isDragging = false;
        state.targetX = 0;
        state.targetY = 0;
        state.targetScale = 1;
        
        // Inject Throw Velocity
        state.vx = velocityRef.current.vx;
        state.vy = velocityRef.current.vy;

        // Start Physics
        startSpringLoop();
    }

    setDragSource(null);
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

  // Generalized Render Function
  const renderAppIcon = (app: AppItem, index: number, isDock: boolean) => {
    const isDragging = app.id === activeDragIndex;
    
    const style: React.CSSProperties = {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        // Critical: When dragging, we use direct manipulation (no transition).
        // When settling (after drag), the Spring Loop handles it (no transition).
        // Only other items get the CSS grid transition.
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: isDragging ? 100 : 'auto',
        transform: isDragging ? undefined : 'translate(0,0) scale(1)', 
        touchAction: isDragging ? 'none' : 'auto',
    };

    return (
        <div
            key={app.id}
            data-app-id={app.id}
            ref={(el) => {
                if (el) itemsRef.current.set(app.id, el);
                else itemsRef.current.delete(app.id);
            }}
            onTouchStart={(e) => handleTouchStart(e, app, isDock ? 'dock' : 'desktop')}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => {
                    if (isJiggleMode) {
                        const mouseE = e as unknown as React.TouchEvent;
                        (mouseE as any).touches = [{ clientX: e.clientX, clientY: e.clientY }];
                        handleTouchStart(mouseE, app, isDock ? 'dock' : 'desktop');
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
                style={{ animationDelay: `${(index * 0.1) % 1}s` }}
            >
                <div className={isDock ? "scale-90" : ""}>{app.icon}</div>
                
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
                <span className={`text-xs font-medium ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${textColor} ${textShadow}`} style={{ animationDelay: `${(index * 0.1) % 1}s` }}>{app.label}</span>
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
         {dockApps.map((app, index) => renderAppIcon(app, index, true))}
         
         {dockApps.length === 0 && !isJiggleMode && (
             <div className="text-white/20 text-xs">Dock 空空如也</div>
         )}
      </div>
    </>
  );
};

export default Desktop;