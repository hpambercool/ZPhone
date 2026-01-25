import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StatusBar from './components/StatusBar';
import Desktop from './components/Desktop';
import ChatApp from './components/apps/ChatApp';
import SettingsApp from './components/apps/SettingsApp';
import WorldBookApp from './components/apps/WorldBookApp';
import { AppConfig, WorldEntry, ThemeMode, Contact } from './types';

// Default Configurations
const DEFAULT_CONFIG: AppConfig = {
  model: 'gemini-3-flash-preview',
  userName: 'User',
  currentPersonaId: 'default-user',
  userPersonas: [
    { id: 'default-user', name: 'User', avatar: 'bg-gradient-to-br from-indigo-500 to-purple-600' }
  ],
  systemPrompt: '你是一个集成在 OS 26 中的高级 AI 助手。你的回答简洁、智能且乐于助人。',
  presets: [],
  customApiUrl: '',
  customApiKey: '',
  wallpaper: 'https://i.postimg.cc/sxDg8hrz/dmitrii-shirnin-mq-EKg5D6ln-E-unsplash.jpg',
  showStatusBar: false
};

const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'ai-assistant',
    name: 'ski小助手',
    avatar: 'bg-blue-600',
    bio: '官方系统智能助手',
    systemPrompt: '你是一个乐于助人、智能且冷静的 AI 助手。'
  }
];

// Helper component for the gesture bar defined outside to prevent re-renders
const HomeIndicator = ({ onClick }: { onClick: () => void }) => (
  <div 
    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-36 h-1 bg-white/40 rounded-full z-50 cursor-pointer hover:bg-white/60 transition-all active:scale-95 active:bg-white active:w-32" 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
  ></div>
);

// Common wrapper defined outside App to maintain component identity
const AppWindow = ({ show, children, theme, onClose }: { show: boolean; children?: React.ReactNode; theme: ThemeMode; onClose: () => void }) => (
  <div 
    className={`fixed inset-0 z-20 flex flex-col w-full h-[100dvh] overflow-hidden transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) will-change-transform ${
      show ? 'translate-y-0' : 'translate-y-full pointer-events-none'
    } ${theme === 'dark' ? 'bg-black' : 'bg-[#F2F2F7]'}`}
  >
    {children}
    <HomeIndicator onClick={onClose} />
  </div>
);

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // -- Global State with Persistence --
  
  // Config State
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('os26_config');
    // Merge with default to ensure new fields exist if loading old data
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure userPersonas exists for backward compatibility
      if (!parsed.userPersonas) {
        parsed.userPersonas = [{ 
          id: 'default-user', 
          name: parsed.userName || 'User', 
          avatar: 'bg-gradient-to-br from-indigo-500 to-purple-600' 
        }];
        parsed.currentPersonaId = 'default-user';
      }
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  });

  // WorldBook State (Shared Data)
  const [worldBook, setWorldBook] = useState<WorldEntry[]>(() => {
    const saved = localStorage.getItem('os26_worldbook');
    return saved ? JSON.parse(saved) : [];
  });

  // Contacts State (Shared Data)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('os26_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  // Theme State
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('os26_theme') as ThemeMode) || 'light';
  });

  // -- Persistence Effects --
  useEffect(() => {
    localStorage.setItem('os26_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('os26_worldbook', JSON.stringify(worldBook));
  }, [worldBook]);

  useEffect(() => {
    localStorage.setItem('os26_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('os26_theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  // iOS 26 Abstract Wallpaper
  const wallpaperClass = isDark 
    ? "bg-[radial-gradient(circle_at_50%_120%,#3b0764, #1e1b4b 40%, #020617 80%)]" 
    : "bg-white";
  
  const backgroundStyle = config.wallpaper 
    ? { backgroundImage: `url(${config.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  // Check valid paths for desktop blur effect
  const validAppPaths = ['/chat', '/settings', '/worldbook'];
  const isAppOpen = validAppPaths.some(path => location.pathname.startsWith(path));

  // Helper to determine if a specific app should be visible
  const isVisible = (path: string) => location.pathname.startsWith(path);

  const handleCloseApp = () => navigate('/');
  const noopClose = () => {};

  return (
    <div 
      className={`w-full h-full relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'} ${!config.wallpaper ? wallpaperClass : ''}`}
      style={backgroundStyle}
    >
      {config.showStatusBar !== false && <StatusBar />}

      {/* Desktop is always rendered at Z-0/Z-10 */}
      <Desktop isBlurred={isAppOpen} theme={theme} />

      {/* 
         PERSISTENT APP LAYOUT 
      */}

      {/* Chat App Window */}
      {isVisible('/chat') && (
       <AppWindow show={true} theme={theme} onClose={handleCloseApp}>
        <ChatApp 
          config={config} 
          setConfig={setConfig}
          worldBook={worldBook}
          contacts={contacts}
          setContacts={setContacts}
          theme={theme}
        />
      </AppWindow>
      )}

      {/* WorldBook App Window */}
      {isVisible('/worldbook') && (
       <AppWindow show={true} theme={theme} onClose={handleCloseApp}>
        <WorldBookApp 
          entries={worldBook} 
          setEntries={setWorldBook} 
          contacts={contacts}
          closeApp={noopClose}
          theme={theme}
        />
      </AppWindow>
      )}

      {/* Settings App Window */}
      {isVisible('/settings') && (
       <AppWindow show={true} theme={theme} onClose={handleCloseApp}>
        <SettingsApp 
          config={config} 
          setConfig={setConfig} 
          theme={theme} 
          setTheme={setTheme} 
          closeApp={noopClose}
        />
      </AppWindow>
      )}
    </div>
  );
};

export default App;