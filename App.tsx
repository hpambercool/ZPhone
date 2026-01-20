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
    // Apply theme class to body/root if needed, though we use direct styles mostly
  }, [theme]);

  // Wallpaper with a fallback gradient
  const wallpaperClass = "bg-[url('https://picsum.photos/1080/1920?blur=10')] bg-cover bg-center";

  // Check valid paths for desktop blur effect
  const validAppPaths = ['/chat', '/settings', '/worldbook'];
  const isAppOpen = validAppPaths.some(path => location.pathname.startsWith(path));

  // Helper to determine if a specific app should be visible
  const isVisible = (path: string) => location.pathname.startsWith(path);

  // Common wrapper for Apps to handle the slide animation and background
  // Apps are kept MOUNTED to preserve their internal state (scroll, inputs, etc.)
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
      {/* Overlay Gradient for readability if image fails */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/10 pointer-events-none" />

      <StatusBar />

      {/* Desktop is always rendered at Z-0/Z-10 */}
      <Desktop isBlurred={isAppOpen} />

      {/* 
         PERSISTENT APP LAYOUT 
         We render ALL apps and translate them in/out. 
         This preserves scroll position and input state (Requirement 1 & 3).
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
    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/30 rounded-full z-50 cursor-pointer hover:bg-white/60 transition-colors active:scale-95 active:bg-white" 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
  ></div>
);

export default App;