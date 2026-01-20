import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppConfig, ThemeMode } from '../../types';
import { IconCpu, IconPalette, IconInfo, IconX } from '../Icons';

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

  const isKeyPresent = !!process.env.API_KEY;

  return (
    <div className="h-full flex flex-col bg-slate-900/90 text-white">
      {/* Header */}
      <div className="p-6 pt-12 glass-panel border-b-0 rounded-b-3xl shrink-0 flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
          设置
        </h1>
        <button 
           onClick={() => navigate('/')} 
           className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
           <IconX className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'general', icon: <IconCpu className="w-4 h-4" />, label: '通用' },
            { id: 'appearance', icon: <IconPalette className="w-4 h-4" />, label: '外观' },
            { id: 'about', icon: <IconInfo className="w-4 h-4" />, label: '手册' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-white/10 text-white hover:bg-white/20'
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
              {/* API Status Section */}
              <div className="glass-panel p-5 rounded-2xl">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">神经引擎配置 (API)</h2>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-sm text-gray-300">API 接入点 (URL)</label>
                    </div>
                    <input
                      type="text"
                      value={config.customApiUrl || ''}
                      onChange={(e) => setConfig({ ...config, customApiUrl: e.target.value })}
                      placeholder="默认 (Google GenAI)"
                      className="w-full bg-black/40 rounded-lg p-3 text-sm focus:outline-none border border-white/10 text-white placeholder-white/20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <label className="text-sm text-gray-300">API 密钥 (Password)</label>
                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${isKeyPresent ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                         {isKeyPresent ? '系统内置已激活' : '系统内置缺失'}
                       </span>
                    </div>
                    <input
                      type="password"
                      value={config.customApiKey || ''}
                      onChange={(e) => setConfig({ ...config, customApiKey: e.target.value })}
                      placeholder="自定义密钥 (覆盖系统默认)"
                      className="w-full bg-black/40 rounded-lg p-3 text-sm focus:outline-none border border-white/10 text-white placeholder-white/20"
                    />
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <label className="block text-sm text-gray-300 mb-2">活跃模型</label>
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="w-full bg-black/40 rounded-lg p-3 text-sm focus:outline-none border border-white/10 text-white"
                    >
                      <option value="gemini-3-flash-preview">Gemini 3.0 Flash (高速)</option>
                      <option value="gemini-3-pro-preview">Gemini 3.0 Pro (智能)</option>
                      <option value="gemini-2.5-flash-latest">Gemini 2.5 Flash</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Persona Section */}
              <div className="glass-panel p-5 rounded-2xl">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">全局人格设定</h2>
                <div className="space-y-3">
                  <label className="block text-sm text-gray-300">默认系统提示词</label>
                  <textarea
                    value={config.systemPrompt}
                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                    className="w-full bg-black/40 rounded-lg p-3 text-sm h-24 focus:outline-none border border-white/10 resize-none text-white placeholder-white/30"
                    placeholder="设定 AI 的行为模式..."
                  />
                  <p className="text-[10px] text-gray-500">
                    此提示词将作为基础设定，与“世界书”条目组合使用。
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'appearance' && (
            <div className="glass-panel p-5 rounded-2xl">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">显示与壁纸</h2>
              <div className="flex items-center justify-between mb-4">
                 <span>深色模式</span>
                 <div className="px-3 py-1 bg-white/10 rounded text-xs text-white/50">始终开启</div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-300 mb-2">壁纸风格</label>
                <div className="grid grid-cols-3 gap-2">
                   {['bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900', 
                     'bg-gradient-to-tr from-slate-900 via-gray-800 to-black', 
                     'bg-gradient-to-bl from-blue-900 via-teal-900 to-emerald-900'].map((bgClass, idx) => (
                      <button 
                        key={idx}
                        className={`h-16 rounded-lg ${bgClass} border-2 ${idx === 0 ? 'border-white' : 'border-transparent'}`} 
                      />
                   ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-4">
               <div className="glass-panel p-5 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-[1.5rem] mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                  <span className="text-2xl font-black text-black">26</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">OS 26</h3>
                  <p className="text-xs text-gray-400">版本 1.1 (Beta CN)</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl">
                <h3 className="font-bold mb-3 border-b border-white/10 pb-2">使用手册</h3>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">1. 聊天 (微信):</span>
                    <span className="opacity-80">点击下方通讯录创建新的角色。点击角色开始对话。</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-400 font-bold">2. 世界书:</span>
                    <span className="opacity-80">添加 AI 共享的背景设定知识。</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400 font-bold">3. 自定义 API:</span>
                    <span className="opacity-80">在设置的通用选项卡中，您可以填写自定义的 API URL 和 密钥。</span>
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