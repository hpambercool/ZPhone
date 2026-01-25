
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppConfig, ThemeMode, ApiPreset } from '../../types';
import { IconCpu, IconPalette, IconInfo, IconX, IconCheck, IconPlus, IconTrash } from '../Icons';
import { validateAndListModels } from '../../services/geminiService';

interface SettingsAppProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  theme: ThemeMode;
  setTheme: React.Dispatch<React.SetStateAction<ThemeMode>>;
  closeApp: () => void;
}

const SettingsApp: React.FC<SettingsAppProps> = ({ config, setConfig, theme, setTheme, closeApp: _closeApp }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'about'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';
  
  // Style Utilities
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-slate-500';
  const bgPanel = isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200';
  const bgInput = isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';
  const headerGradient = isDark 
    ? 'bg-gradient-to-r from-gray-200 to-gray-400' 
    : 'bg-gradient-to-r from-slate-800 to-slate-600';

  // Local state for API inputs
  const [inputUrl, setInputUrl] = useState(config.customApiUrl || '');
  const [inputKey, setInputKey] = useState(config.customApiKey || '');
  const [presetName, setPresetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Initialize with current model to ensure it's visible before fetching
  const [availableModels, setAvailableModels] = useState<string[]>(config.model ? [config.model] : []);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'error'>('none');
  const [statusMessage, setStatusMessage] = useState('');

  const handleTestConnection = async () => {
    if (!inputKey.trim()) {
      setConnectionStatus('error');
      setStatusMessage('请输入 API Key (密码)');
      return;
    }

    setIsLoading(true);
    setConnectionStatus('none');
    
    try {
      const models = await validateAndListModels(inputUrl, inputKey);
      setAvailableModels(models);
      setConnectionStatus('success');
      setStatusMessage(`连接成功! 获取到 ${models.length} 个模型。`);
      
      // Auto-select first model if current is invalid
      if (models.length > 0 && !models.includes(config.model)) {
         setConfig(prev => ({ ...prev, model: models[0] }));
      }
    } catch (err) {
      setConnectionStatus('error');
      setStatusMessage('连接失败: 检查 URL 或 密码');
      setAvailableModels([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
       setStatusMessage('请给预设起一个名字');
       return;
    }
    
    const newPreset: ApiPreset = {
      id: Date.now().toString(),
      name: presetName,
      apiUrl: inputUrl,
      apiKey: inputKey,
      model: config.model
    };

    setConfig(prev => ({
      ...prev,
      customApiUrl: inputUrl,
      customApiKey: inputKey,
      presets: [...(prev.presets || []), newPreset]
    }));
    
    setPresetName('');
    setStatusMessage('预设已保存');
  };

  const loadPreset = (presetId: string) => {
    if (presetId === 'default') {
      setInputUrl('');
      setInputKey('');
      setConfig(prev => ({ ...prev, customApiUrl: '', customApiKey: '', model: 'gemini-3-flash-preview' }));
      // Reset available models to default or empty, but keeping current default model visible
      setAvailableModels(['gemini-3-flash-preview']);
      return;
    }

    const preset = config.presets?.find(p => p.id === presetId);
    if (preset) {
      setInputUrl(preset.apiUrl);
      setInputKey(preset.apiKey);
      setConfig(prev => ({ 
         ...prev, 
         customApiUrl: preset.apiUrl, 
         customApiKey: preset.apiKey,
         model: preset.model
      }));
      // Ensure the preset's model is visible immediately
      setAvailableModels([preset.model]);
    }
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfig(prev => ({
      ...prev,
      presets: prev.presets.filter(p => p.id !== id)
    }));
  };

  const applyChanges = () => {
      setConfig(prev => ({
          ...prev,
          customApiUrl: inputUrl,
          customApiKey: inputKey
      }));
  };

  const handleWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setConfig(prev => ({ ...prev, wallpaper: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900/90 text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      {/* Header */}
      <div className={`p-6 pt-16 border-b-0 rounded-b-3xl shrink-0 flex justify-between items-center ${isDark ? 'glass-panel' : 'bg-white shadow-sm'}`}>
        <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${headerGradient}`}>
          设置
        </h1>
        <button 
           onClick={() => navigate('/')} 
           className={`p-2 rounded-full transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}
        >
           <IconX className={`w-5 h-5 ${textPrimary}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'general', icon: <IconCpu className="w-4 h-4" />, label: 'API / 通用' },
            { id: 'appearance', icon: <IconPalette className="w-4 h-4" />, label: '外观' },
            { id: 'about', icon: <IconInfo className="w-4 h-4" />, label: '手册' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'general' | 'appearance' | 'about')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? (isDark ? 'bg-white text-black shadow-lg' : 'bg-slate-900 text-white shadow-lg')
                  : (isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-slate-600 hover:bg-slate-100')
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-4 animate-fade-in pb-20">
          
          {activeTab === 'general' && (
            <>
              {/* Presets Section */}
              <div className={`${bgPanel} p-5 rounded-2xl`}>
                 <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>连接预设</h2>
                 <select 
                    onChange={(e) => loadPreset(e.target.value)}
                    className={`w-full rounded-lg p-3 text-sm focus:outline-none border mb-3 ${bgInput}`}
                    defaultValue=""
                 >
                    <option value="" disabled>选择预设...</option>
                    <option value="default">默认 (Env System)</option>
                    {config.presets?.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>

                 {/* List of presets with delete option */}
                 {config.presets && config.presets.length > 0 && (
                     <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
                         {config.presets.map(p => (
                             <div key={p.id} className={`flex justify-between items-center p-2 rounded text-xs ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                 <span className={textPrimary}>{p.name}</span>
                                 <button onClick={(e) => deletePreset(p.id, e)} className="text-red-400 hover:text-red-300">
                                     <IconTrash className="w-3 h-3" />
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
              </div>

              {/* API Connection Form */}
              <div className={`${bgPanel} p-5 rounded-2xl`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>自定义连接</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className={`block text-[10px] mb-1 ${textSecondary}`}>API URL (支持反代 / 可选)</label>
                        <input
                          type="text"
                          placeholder="例如: https://my-proxy.com/v1"
                          value={inputUrl}
                          onChange={(e) => setInputUrl(e.target.value)}
                          onBlur={applyChanges}
                          className={`w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border font-mono ${bgInput}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-[10px] mb-1 ${textSecondary}`}>API Key / 密码 (必填)</label>
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={inputKey}
                          onChange={(e) => setInputKey(e.target.value)}
                          onBlur={applyChanges}
                          className={`w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border font-mono ${bgInput}`}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={handleTestConnection}
                            disabled={isLoading}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                connectionStatus === 'success' 
                                ? 'bg-green-600/30 text-green-300' 
                                : (isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800')
                            }`}
                        >
                            {isLoading ? '连接中...' : connectionStatus === 'success' ? '刷新模型列表' : '拉取模型'}
                        </button>
                    </div>

                    {statusMessage && (
                        <div className={`text-xs text-center p-2 rounded ${
                            connectionStatus === 'success' ? 'bg-green-500/10 text-green-400' : 
                            connectionStatus === 'error' ? 'bg-red-500/10 text-red-400' : (isDark ? 'text-gray-400' : 'text-slate-500')
                        }`}>
                            {statusMessage}
                        </div>
                    )}
                </div>
              </div>

              {/* Model Selection (Dependent on connection) */}
              <div className={`${bgPanel} p-5 rounded-2xl transition-opacity ${connectionStatus === 'success' || availableModels.length > 0 ? 'opacity-100' : 'opacity-50'}`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>模型选择</h2>
                <div className="relative">
                    <select
                        value={availableModels.length > 0 ? config.model : ''}
                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                        className={`w-full rounded-lg p-3 text-sm focus:outline-none border appearance-none ${bgInput}`}
                    >
                        {availableModels.length > 0 ? (
                            availableModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))
                        ) : (
                            <option value="">无</option>
                        )}
                    </select>
                    <div className={`absolute right-3 top-3 pointer-events-none ${isDark ? 'text-white/50' : 'text-slate-400'}`}>▼</div>
                </div>
              </div>

              {/* Save as Preset */}
              <div className={`${bgPanel} p-5 rounded-2xl`}>
                 <div className="flex gap-2">
                     <input 
                        placeholder="新预设名称..."
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        className={`flex-1 rounded-lg p-2 text-sm focus:outline-none border ${bgInput}`}
                     />
                     <button 
                        onClick={handleSavePreset}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 rounded-lg text-sm font-medium text-white"
                     >
                        保存
                     </button>
                 </div>
              </div>

              {/* Persona Section */}
              <div className={`${bgPanel} p-5 rounded-2xl`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>全局人格设定</h2>
                <div className="space-y-3">
                  <label className={`block text-sm ${textSecondary}`}>默认系统提示词</label>
                  <textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    className={`w-full rounded-lg p-3 text-sm h-24 focus:outline-none border resize-none ${bgInput}`}
                    placeholder="设定 AI 的行为模式..."
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <div className={`${bgPanel} p-5 rounded-2xl space-y-6`}>
              {/* Theme Toggle */}
              <div>
                 <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>外观模式</h2>
                 <div className="flex items-center justify-between">
                    <span className={`text-sm ${textPrimary}`}>当前模式: {theme === 'light' ? '浅色' : '深色'}</span>
                    
                    <div 
                      onClick={(e) => { e.stopPropagation(); setTheme(theme === 'light' ? 'dark' : 'light'); }}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'}`}
                    >
                       <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                 </div>
                 <p className={`text-[10px] mt-2 ${textSecondary}`}>点击切换: 左为浅色，右为深色。</p>
              </div>

              {/* Status Bar Toggle */}
              <div>
                 <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>系统显示</h2>
                 <div className="flex items-center justify-between">
                    <span className={`text-sm ${textPrimary}`}>显示顶部状态栏 (灵动岛)</span>
                    
                    <div 
                      onClick={(e) => { e.stopPropagation(); setConfig(prev => ({ ...prev, showStatusBar: prev.showStatusBar === false ? true : false })); }}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${config.showStatusBar !== false ? 'bg-green-500' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`}
                    >
                       <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${config.showStatusBar !== false ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </div>
                 </div>
              </div>

              {/* Wallpaper Picker */}
              <div>
                 <h2 className={`text-xs font-bold uppercase tracking-wider mb-4 ${textSecondary}`}>桌面壁纸</h2>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   accept="image/*" 
                   className="hidden" 
                   onChange={handleWallpaperUpload}
                 />
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className={`w-full py-3 rounded-xl text-sm font-medium transition-colors border flex items-center justify-center gap-2 ${isDark ? 'bg-white/10 hover:bg-white/20 border-white/5' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'}`}
                 >
                   <IconPalette className="w-4 h-4" />
                   从相册选择壁纸
                 </button>
                 {config.wallpaper && (
                   <button 
                      onClick={() => setConfig(prev => ({ ...prev, wallpaper: undefined }))}
                      className="w-full mt-2 py-2 text-xs text-red-400 hover:text-red-500"
                   >
                     恢复默认壁纸
                   </button>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
               <div className={`${bgPanel} p-5 rounded-2xl text-center space-y-4`}>
                <div className="w-16 h-16 bg-white rounded-[1.5rem] mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <span className="text-2xl font-black text-black">26</span>
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${textPrimary}`}>OS 26</h3>
                  <p className={`text-xs ${textSecondary}`}>版本 1.3 (Dev)</p>
                </div>
              </div>

              <div className={`${bgPanel} p-5 rounded-2xl`}>
                <h3 className={`font-bold mb-3 border-b pb-2 ${isDark ? 'border-white/10' : 'border-slate-200 text-slate-900'}`}>使用手册</h3>
                <ul className={`space-y-3 text-sm ${textSecondary}`}>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">API 设置:</span>
                    <span className="opacity-80">在通用页面填入 URL 和密码，点击拉取模型可测试连接。</span>
                  </li>
                  <li className="flex gap-2">
                     <span className="text-amber-400 font-bold">预设:</span>
                     <span className="opacity-80">连接成功后，输入名称并保存，即可在不同环境间切换。</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsApp;
