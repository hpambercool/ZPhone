import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChat, IconSettings, IconBook } from './Icons';

interface DesktopProps {
  isBlurred: boolean;
}

interface AppItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  isMock?: boolean;
}

const Desktop: React.FC<DesktopProps> = ({ isBlurred }) => {
  const navigate = useNavigate();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.target instanceof HTMLElement) {
       e.target.style.opacity = '0.5';
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    if (e.target instanceof HTMLElement) {
       e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newApps = [...apps];
    const draggedItem = newApps[draggedIndex];
    newApps.splice(draggedIndex, 1);
    newApps.splice(index, 0, draggedItem);
    
    setApps(newApps);
    setDraggedIndex(index);
  };

  const handleAppClick = (app: AppItem) => {
    if (!app.isMock && app.path) {
      navigate(app.path);
    }
  };

  const renderDockIcon = (path: string, icon: React.ReactNode, color: string) => (
    <button
      onClick={() => navigate(path)}
      className="transition-transform duration-200 active:scale-90"
    >
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg border border-white/10 backdrop-blur-md`}>
        {icon}
      </div>
    </button>
  );

  return (
    <>
      {/* Home Screen Content */}
      <div className={`absolute inset-0 pt-20 px-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isBlurred ? 'scale-90 opacity-0 pointer-events-none blur-sm' : 'scale-100 opacity-100 blur-0'}`}>
        
        {/* Date/Time Widget */}
        <div className="mt-8 mb-12 text-center">
           <h1 className="text-7xl font-thin text-white tracking-tighter drop-shadow-lg select-none">
             {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
           </h1>
           <p className="text-lg text-white/80 font-light mt-2 tracking-wide select-none">
             {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-6 px-2">
          {apps.map((app, index) => (
            <div
              key={app.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleAppClick(app)}
              className={`flex flex-col items-center gap-2 group transition-all duration-200 cursor-pointer ${
                draggedIndex === index ? 'scale-110' : 'hover:scale-105 active:scale-95'
              } ${app.isMock ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}
            >
              <div className={`w-16 h-16 rounded-[1.2rem] ${app.color} flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all border border-white/10 backdrop-blur-md select-none`}>
                {app.icon}
              </div>
              <span className="text-xs font-medium text-white shadow-black drop-shadow-md select-none">{app.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dock */}
      <div className={`absolute bottom-6 left-4 right-4 h-24 glass-panel rounded-[2.5rem] flex items-center justify-around px-6 transition-all duration-500 transform ${isBlurred ? 'translate-y-40' : 'translate-y-0'}`}>
         {renderDockIcon('/chat', <IconChat className="w-6 h-6 text-white" />, 'bg-blue-500/40')}
         {renderDockIcon('/worldbook', <IconBook className="w-6 h-6 text-amber-100" />, 'bg-amber-600/40')}
         <div className="w-[1px] h-10 bg-white/10 mx-2"></div>
         {renderDockIcon('/settings', <IconSettings className="w-6 h-6 text-gray-200" />, 'bg-slate-500/40')}
      </div>
    </>
  );
};

export default Desktop;