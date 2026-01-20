import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StatusBar from './components/StatusBar';
import Desktop from './components/Desktop';
import ChatApp from './components/apps/ChatApp';
import SettingsApp from './components/apps/SettingsApp';
import WorldBookApp from './components/apps/WorldBookApp';
import { AppConfig, WorldEntry, ThemeMode } from './types';

// Default Configurations
const DEFAULT_CONFIG: AppConfig = {
  model: 'gemini-3-flash-preview',
  userName: 'User',
  systemPrompt: '你是一个集成在 OS 26 中的高级 AI 助手。你的回答简洁、智能且乐于助人。',
};

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // -- Global State with Persistence --
  
  // Config State
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('os26_config');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  // WorldBook State (Shared Data)
  const [worldBook, setWorldBook] = useState<WorldEntry[]>(() => {
    const saved = localStorage.getItem('os26_worldbook');
    return saved ? JSON.parse(saved) : [];
  });

  // Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('os26_theme') as ThemeMode) || 'dark';
  });

  // -- Persistence Effects --
  useEffect(() => {
    localStorage.setItem('os26_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('os26_worldbook', JSON.stringify(worldBook));
  }, [worldBook]);

  useEffect(() => {
    localStorage.setItem('os26_theme', theme);
  }, [theme]);

  // iOS 26 Abstract Wallpaper
  const wallpaperClass = "bg-[radial-gradient(circle_at_50%_120%,#3b0764, #1e1b4b 40%, #020617 80%)]";

  // Check valid paths for desktop blur effect
  const validAppPaths = ['/chat', '/settings', '/worldbook'];
  const isAppOpen = validAppPaths.some(path => location.pathname.startsWith(path));

  // Helper to determine if a specific app should be visible
  const isVisible = (path: string) => location.pathname.startsWith(path);

  // Common wrapper for Apps to handle the slide animation and background
  const AppWindow = ({ show, children }: { show: boolean, children: React.ReactNode }) => (
    <div 
      className={`absolute inset-0 z-20 flex flex-col bg-black transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) will-change-transform ${
        show ? 'translate-y-0' : 'translate-y-full pointer-events-none'
      }`}
    >
      {children}
      <HomeIndicator onClick={() => navigate('/')} />
    </div>
  );

  const noopClose = () => {};

  return (
    <div className={`w-full h-full relative overflow-hidden bg-slate-900 ${wallpaperClass}`}>
      {/* Overlay Noise Texture for realism */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      <StatusBar />

      {/* Desktop is always rendered at Z-0/Z-10 */}
      <Desktop isBlurred={isAppOpen} />

      {/* 
         PERSISTENT APP LAYOUT 
      */}

      {/* Chat App Window */}
      <AppWindow show={isVisible('/chat')}>
        <ChatApp 
          config={config} 
          worldBook={worldBook}
        />
      </AppWindow>

      {/* WorldBook App Window */}
      <AppWindow show={isVisible('/worldbook')}>
        <WorldBookApp 
          entries={worldBook} 
          setEntries={setWorldBook} 
          closeApp={noopClose}
        />
      </AppWindow>

      {/* Settings App Window */}
      <AppWindow show={isVisible('/settings')}>
        <SettingsApp 
          config={config} 
          setConfig={setConfig} 
          theme={theme} 
          setTheme={setTheme} 
          closeApp={noopClose}
        />
      </AppWindow>
    </div>
  );
};

// Helper component for the gesture bar
const HomeIndicator = ({ onClick }: { onClick: () => void }) => (
  <div 
    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1 bg-white/40 rounded-full z-50 cursor-pointer hover:bg-white/60 transition-all active:scale-95 active:bg-white active:w-32" 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
  ></div>
);

export default App;