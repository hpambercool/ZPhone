
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChat, IconSettings, IconBook, IconX } from './Icons';
import { ThemeMode, AppItem } from '../types';

interface DesktopProps {
  isBlurred: boolean;
  theme: ThemeMode;
}

const Desktop: React.FC<DesktopProps> = ({ isBlurred, theme }) => {
  const navigate = useNavigate();
  const [isJiggleMode, setIsJiggleMode] = useState(false);
  
  // Drag State
  const [activeDragIndex, setActiveDragIndex] = useState<string | null>(null); // App ID
  const [dragSource, setDragSource] = useState<'desktop' | 'dock' | null>(null);
  
  // Folder Logic State
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null); // The app ID we are hovering over to merge
  const [openedFolderId, setOpenedFolderId] = useState<string | null>(null); // Currently open folder
  const mergeTimerRef = useRef<any>(null);
  const MERGE_THRESHOLD_MS = 600; // Time to trigger merge state
  const MERGE_DISTANCE_THRESHOLD = 40; // Pixels from center to trigger merge hover

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
      type: 'app',
      icon: <IconChat className="w-8 h-8 text-white" /> 
    },
    { 
      id: 'worldbook', 
      path: '/worldbook', 
      label: '世界书', 
      color: 'bg-amber-700/60', 
      type: 'app',
      icon: <IconBook className="w-8 h-8 text-amber-200" /> 
    },
    { 
      id: 'settings', 
      path: '/settings', 
      label: '设置', 
      color: 'bg-slate-600/60', 
      type: 'app',
      icon: <IconSettings className="w-8 h-8 text-gray-200" /> 
    },
    { 
      id: 'music', 
      path: '', 
      label: '音乐', 
      color: 'bg-indigo-500/40', 
      type: 'app',
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
      if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  // --- Physics Loop ---
  const runSpringSimulation = () => {
    const state = springSystem.current;

    if (activeDragIndex && state.active) {
        
        // --- SCALE PHYSICS ---
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
            el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
            el.style.zIndex = "100";
            el.style.transition = "none";
        }

        // Settle Check
        const isPosSettled = Math.abs(state.x) < 0.5 && Math.abs(state.y) < 0.5 && Math.abs(state.vx) < 1 && Math.abs(state.vy) < 1;
        const isScaleSettled = Math.abs(state.scale - state.targetScale) < 0.005 && Math.abs(state.vScale) < 0.05;

        if (!state.isDragging && isPosSettled && isScaleSettled) {
            state.x = 0; state.y = 0; state.vx = 0; state.vy = 0;
            state.scale = 1; state.vScale = 0;
            state.active = false;
            
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
        updateCachedRects();
        setActiveDragIndex(app.id);
        setDragSource(source);

        const state = springSystem.current;
        state.isDragging = true;
        state.active = true;
        state.targetScale = 1.15; // Lift up effect
        state.scale = state.scale || 1; 
        
        startSpringLoop();
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

    // Velocity logic
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

    if (longPressTimer.current && touchStartPos.current && !isJiggleMode) {
        const dx = currentX - touchStartPos.current.x;
        const dy = currentY - touchStartPos.current.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }

    if (isJiggleMode && activeDragIndex && dragSource && touchStartPos.current) {
        if (e.cancelable) e.preventDefault();

        const offsetX = currentX - touchStartPos.current.x;
        const offsetY = currentY - touchStartPos.current.y;
        
        springSystem.current.x = offsetX;
        springSystem.current.y = offsetY;
        
        const el = itemsRef.current.get(activeDragIndex);
        if (el) {
            el.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${springSystem.current.scale})`;
            el.style.zIndex = "100";
            el.style.transition = "none";
        }

        // Dock detection
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            if (currentX > dockRect.left && currentX < dockRect.right && currentY > dockRect.top && currentY < dockRect.bottom) {
                isOverDock = true;
            }
        }
        if (isOverDock) {
            // Clear merge targeting if moved to dock
            if (mergeTargetId) {
                setMergeTargetId(null);
                if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
            }
            return;
        }

        // --- MERGE / SWAP LOGIC ---
        if (dragSource === 'desktop') {
            const currentIndex = apps.findIndex(a => a.id === activeDragIndex);
            if (currentIndex === -1) return;
            
            const currentSlotRect = cachedRects.current.get(activeDragIndex);
            if (!currentSlotRect) return;

            const dragCenterX = currentSlotRect.left + (currentSlotRect.width / 2) + offsetX;
            const dragCenterY = currentSlotRect.top + (currentSlotRect.height / 2) + offsetY;

            // Find best target
            let bestTargetIndex = -1;
            let minDist = Infinity;

            apps.forEach((app, index) => {
                if (app.id === activeDragIndex) return;
                const targetRect = cachedRects.current.get(app.id);
                if (!targetRect) return;
                
                const targetCenterX = targetRect.left + targetRect.width / 2;
                const targetCenterY = targetRect.top + targetRect.height / 2;
                const dist = Math.hypot(dragCenterX - targetCenterX, dragCenterY - targetCenterY);

                if (dist < minDist) {
                    minDist = dist;
                    bestTargetIndex = index;
                }
            });

            // If close enough to a target
            if (bestTargetIndex !== -1 && minDist < 80) { // Broad range check
                const targetApp = apps[bestTargetIndex];
                
                // --- MERGE LOGIC CHECK ---
                // If extremely close to center, consider it a HOVER for MERGE
                if (minDist < MERGE_DISTANCE_THRESHOLD) {
                    
                    if (mergeTargetId !== targetApp.id) {
                         // Reset timer if we switched targets
                         if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
                         
                         // Start counting
                         mergeTimerRef.current = setTimeout(() => {
                             setMergeTargetId(targetApp.id);
                             if (navigator.vibrate) navigator.vibrate(20);
                         }, MERGE_THRESHOLD_MS);
                    }
                    // **CRITICAL**: If hovering for merge, DO NOT SWAP.
                    // Just return and let the icon float on top.
                    return; 
                } else {
                    // Moved away from center? Clear merge logic.
                    if (mergeTimerRef.current) {
                         clearTimeout(mergeTimerRef.current);
                         mergeTimerRef.current = null;
                    }
                    if (mergeTargetId) setMergeTargetId(null);
                }

                // --- SWAP LOGIC ---
                // Only swap if we aren't "locked" in a merge visual state
                // and if we are close enough to the slot center but NOT holding for a folder
                const targetRect = cachedRects.current.get(targetApp.id);
                const oldRect = cachedRects.current.get(activeDragIndex);

                if (targetRect && oldRect) {
                     setApps(prev => {
                         const newApps = [...prev];
                         const [removed] = newApps.splice(currentIndex, 1);
                         newApps.splice(bestTargetIndex, 0, removed);
                         return newApps;
                     });
                     
                     cachedRects.current.set(activeDragIndex, targetRect);
                     cachedRects.current.set(targetApp.id, oldRect);

                     const deltaX = targetRect.left - oldRect.left;
                     const deltaY = targetRect.top - oldRect.top;
                     
                     springSystem.current.x -= deltaX;
                     springSystem.current.y -= deltaY;
                     touchStartPos.current.x += deltaX;
                     touchStartPos.current.y += deltaY;
                     
                     if (el) {
                         el.style.transform = `translate3d(${springSystem.current.x}px, ${springSystem.current.y}px, 0) scale(${springSystem.current.scale})`;
                     }
                     if (navigator.vibrate) navigator.vibrate(10);
                }
            } else {
                // Too far from anything
                if (mergeTimerRef.current) {
                    clearTimeout(mergeTimerRef.current);
                    mergeTimerRef.current = null;
                }
                setMergeTargetId(null);
            }
        }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
    if (mergeTimerRef.current) {
        clearTimeout(mergeTimerRef.current);
        mergeTimerRef.current = null;
    }

    if (isJiggleMode && activeDragIndex && dragSource && touchStartPos.current) {
        const touch = e.changedTouches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        
        // --- MERGE EXECUTION ---
        if (mergeTargetId && dragSource === 'desktop') {
             const draggedApp = apps.find(a => a.id === activeDragIndex);
             const targetApp = apps.find(a => a.id === mergeTargetId);
             
             if (draggedApp && targetApp) {
                 // Create Folder
                 const newFolder: AppItem = {
                     id: `folder-${Date.now()}`,
                     type: 'folder',
                     label: '文件夹',
                     path: '',
                     color: 'bg-white/20', // Glass folder
                     icon: null,
                     items: [
                         targetApp.type === 'folder' ? targetApp : { ...targetApp },
                         draggedApp.type === 'folder' ? draggedApp : { ...draggedApp }
                     ].flatMap(item => item.type === 'folder' ? (item.items || []) : [item]) // Flatten if merging folder into folder (simple logic)
                 };

                 // Replace Target with Folder, Remove Dragged
                 setApps(prev => {
                     const newApps = [...prev];
                     const targetIndex = newApps.findIndex(a => a.id === mergeTargetId);
                     const draggedIndex = newApps.findIndex(a => a.id === activeDragIndex);
                     
                     // Handle indices shifting
                     // We prefer to keep the folder at the target's position
                     if (targetIndex !== -1 && draggedIndex !== -1) {
                         // Remove both
                         // Note: We need to be careful with indices if we remove one first
                         const tIdx = newApps.findIndex(a => a.id === mergeTargetId);
                         newApps[tIdx] = newFolder;
                         
                         const dIdx = newApps.findIndex(a => a.id === activeDragIndex);
                         if (dIdx !== -1) newApps.splice(dIdx, 1);
                     }
                     return newApps;
                 });

                 // Reset Physics & State
                 if (navigator.vibrate) navigator.vibrate([30, 30]);
                 setMergeTargetId(null);
                 setDragSource(null);
                 touchStartPos.current = null;
                 setActiveDragIndex(null);
                 springSystem.current.active = false;
                 return; // Exit early, no snap back needed
             }
        }

        // --- DOCK DROP ---
        let isOverDock = false;
        if (dockRef.current) {
            const dockRect = dockRef.current.getBoundingClientRect();
            if (currentX >= dockRect.left && currentX <= dockRect.right &&
                currentY >= dockRect.top - 20 && currentY <= dockRect.bottom + 20) {
                isOverDock = true;
            }
        }

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
        else if (dragSource === 'dock' && !isOverDock) {
            const appIndex = dockApps.findIndex(a => a.id === activeDragIndex);
            if (appIndex !== -1) {
                const appToMove = dockApps[appIndex];
                setDockApps(prev => prev.filter(a => a.id !== activeDragIndex));
                setApps(prev => [...prev, appToMove]); 
                if (navigator.vibrate) navigator.vibrate(20);
            }
        }

        // --- PHYSICS RETURN ---
        const state = springSystem.current;
        state.isDragging = false;
        state.targetX = 0;
        state.targetY = 0;
        state.targetScale = 1;
        state.vx = velocityRef.current.vx;
        state.vy = velocityRef.current.vy;

        startSpringLoop();
    }
    
    // Cleanup
    setMergeTargetId(null);
    setDragSource(null);
    touchStartPos.current = null;
  };

  const handleAppClick = (app: AppItem) => {
    if (longPressTriggered.current) {
        longPressTriggered.current = false;
        return;
    }
    if (isJiggleMode) return;
    
    if (app.type === 'folder') {
        setOpenedFolderId(app.id);
        return;
    }

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

  const renderAppIcon = (app: AppItem, index: number, isDock: boolean) => {
    const isDragging = app.id === activeDragIndex;
    const isMergeTarget = app.id === mergeTargetId;
    
    // Visual styles
    const baseStyle: React.CSSProperties = {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: isDragging ? 100 : (isMergeTarget ? 10 : 'auto'),
        transform: isDragging ? undefined : (isMergeTarget ? 'scale(1.1)' : 'translate(0,0) scale(1)'), 
        touchAction: isDragging ? 'none' : 'auto',
    };
    
    const iconSizeClass = isDock ? 'w-14 h-14' : 'w-16 h-16';

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
            style={baseStyle}
            className={`flex flex-col items-center gap-2 group relative ${
                isDragging ? '' : (isJiggleMode ? '' : 'hover:scale-105 active:scale-95')
            } ${app.isMock ? 'opacity-90' : ''}`}
        >
            <div 
                className={`${iconSizeClass} rounded-[1.2rem] ${app.type === 'folder' ? 'bg-white/20 backdrop-blur-md p-[6px]' : app.color} flex items-center justify-center shadow-lg border border-white/10 relative ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${isMergeTarget ? 'ring-2 ring-white/50' : ''}`}
                style={{ animationDelay: `${(index * 0.1) % 1}s` }}
            >
                {app.type === 'folder' ? (
                    // Folder Grid View
                    <div className="grid grid-cols-3 gap-[2px] w-full h-full">
                        {app.items?.slice(0, 9).map((subApp, idx) => (
                            <div key={idx} className={`w-full h-full rounded-[2px] ${subApp.color}`}></div>
                        ))}
                    </div>
                ) : (
                    <div className={isDock ? "scale-90" : ""}>{app.icon}</div>
                )}
                
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
                <span className={`text-xs font-medium ${isJiggleMode && !isDragging ? 'animate-jiggle' : ''} ${textColor} ${textShadow}`} style={{ animationDelay: `${(index * 0.1) % 1}s` }}>
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

  // --- Folder Modal ---
  const renderFolderModal = () => {
      if (!openedFolderId) return null;
      // Find the folder either in desktop or dock
      const folder = apps.find(a => a.id === openedFolderId) || dockApps.find(a => a.id === openedFolderId);
      if (!folder || !folder.items) return null;

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
              {/* Backdrop */}
              <div 
                  className="absolute inset-0 bg-black/30 backdrop-blur-xl"
                  onClick={() => setOpenedFolderId(null)}
              ></div>
              
              <div className="relative z-60 w-[80%] max-w-sm">
                   <h2 className="text-white text-center mb-6 text-xl font-medium tracking-wide">{folder.label}</h2>
                   <div className="bg-white/20 backdrop-blur-2xl rounded-[2.5rem] p-6 grid grid-cols-3 gap-6 border border-white/20 shadow-2xl">
                       {folder.items.map((item, idx) => (
                           <div 
                              key={item.id} 
                              onClick={() => {
                                  if (!item.isMock && item.path) {
                                      setOpenedFolderId(null);
                                      navigate(item.path);
                                  }
                              }}
                              className="flex flex-col items-center gap-2"
                           >
                               <div className={`w-14 h-14 rounded-[1.2rem] ${item.color} flex items-center justify-center shadow-lg border border-white/10 hover:scale-105 active:scale-95 transition-transform cursor-pointer`}>
                                   {item.icon}
                               </div>
                               <span className="text-white text-xs font-medium">{item.label}</span>
                           </div>
                       ))}
                   </div>
              </div>
          </div>
      );
  };

  return (
    <>
      {isJiggleMode && (
        <div 
           className="absolute inset-0 z-0" 
           onClick={() => setIsJiggleMode(false)}
        ></div>
      )}

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

      <div className={`absolute inset-0 pt-20 px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isBlurred ? 'scale-90 opacity-0 pointer-events-none blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
        <div className={`mt-8 mb-12 text-center transition-opacity ${isJiggleMode ? 'opacity-40' : 'opacity-100'}`}>
           <h1 className={`text-7xl font-thin tracking-tighter select-none ${textColor} ${textShadow}`}>
             {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
           </h1>
           <p className={`text-lg font-light mt-2 tracking-wide select-none ${textSubColor}`}>
             {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>

        <div className="grid grid-cols-4 gap-6 px-2 relative z-10 select-none">
          {apps.map((app, index) => renderAppIcon(app, index, false))}
        </div>
      </div>

      <div 
        ref={dockRef}
        className={`absolute bottom-6 left-4 right-4 h-24 glass-panel rounded-[2.5rem] flex items-center justify-around px-4 z-20 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isBlurred ? 'scale-90 opacity-0 pointer-events-none blur-sm' : 'scale-100 opacity-100 blur-0'}`}
      >
         {dockApps.map((app, index) => renderAppIcon(app, index, true))}
         
         {dockApps.length === 0 && !isJiggleMode && (
             <div className="text-white/20 text-xs">Dock 空空如也</div>
         )}
      </div>

      {renderFolderModal()}
    </>
  );
};

export default Desktop;
