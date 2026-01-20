import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChat, IconSettings, IconBook } from './Icons';

interface DesktopProps {
  isBlurred: boolean;
}

const Desktop: React.FC<DesktopProps> = ({ isBlurred }) => {
  const navigate = useNavigate();

  const renderAppIcon = (path: string, icon: React.ReactNode, label: string, color: string) => (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center gap-2 group transition-transform duration-200 active:scale-90"
    >
      <div className={`w-16 h-16 rounded-[1.2rem] ${color} flex items-center justify-center shadow-lg group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all border border-white/10 backdrop-blur-md`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-white shadow-black drop-shadow-md">{label}</span>
    </button>
  );

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
           <h1 className="text-7xl font-thin text-white tracking-tighter drop-shadow-lg">
             {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
           </h1>
           <p className="text-lg text-white/80 font-light mt-2 tracking-wide">
             {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-6 px-2">
          {renderAppIcon('/chat', <IconChat className="w-8 h-8 text-white" />, '聊天', 'bg-blue-600/60')}
          {renderAppIcon('/worldbook', <IconBook className="w-8 h-8 text-amber-200" />, '世界书', 'bg-amber-700/60')}
          {renderAppIcon('/settings', <IconSettings className="w-8 h-8 text-gray-200" />, '设置', 'bg-slate-600/60')}
          
          {/* Mock Apps for visuals */}
          <div className="flex flex-col items-center gap-2 opacity-50 grayscale">
             <div className="w-16 h-16 rounded-[1.2rem] bg-indigo-500/40 flex items-center justify-center border border-white/5">
                <div className="w-8 h-8 rounded-full bg-white/20"></div>
             </div>
             <span className="text-xs text-white">音乐</span>
          </div>
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