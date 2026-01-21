import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldEntry, ThemeMode, Contact } from '../../types';
import { IconPlus, IconTrash, IconCheck, IconBook, IconX } from '../Icons';

interface WorldBookAppProps {
  entries: WorldEntry[];
  setEntries: React.Dispatch<React.SetStateAction<WorldEntry[]>>;
  contacts: Contact[];
  closeApp: () => void;
  theme?: ThemeMode;
}

const WorldBookApp: React.FC<WorldBookAppProps> = ({ 
  entries, 
  setEntries, 
  contacts,
  closeApp: _closeApp,
  theme = 'dark' 
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState('默认');
  
  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newKeywords, setNewKeywords] = useState('');
  const [newScope, setNewScope] = useState<'global' | 'character'>('global');
  const [selectedCharId, setSelectedCharId] = useState('');
  const [newContent, setNewContent] = useState('');

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/70' : 'text-slate-600';
  const textTertiary = isDark ? 'text-white/40' : 'text-slate-400';
  const bgPanel = isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200';
  const bgInput = isDark ? 'bg-black/40 placeholder-white/30 text-white' : 'bg-slate-50 placeholder-slate-400 text-slate-900 border-slate-200';
  const headerGradient = isDark 
    ? 'bg-gradient-to-r from-amber-200 to-amber-500' 
    : 'bg-gradient-to-r from-amber-600 to-amber-800';

  // Derive unique categories. Ensure '默认' is always present and first.
  const tabs = useMemo(() => {
    const cats = new Set(entries.map(e => e.category || '默认'));
    cats.add('默认');
    
    return Array.from(cats).sort((a, b) => {
        if (a === '默认') return -1;
        if (b === '默认') return 1;
        return a.localeCompare(b);
    });
  }, [entries]);

  // Derive existing categories for the form chips
  const existingCategories = useMemo(() => {
    return tabs;
  }, [tabs]);

  // Auto-fill category in form when opening edit mode in a specific tab
  useEffect(() => {
    if (isEditing) {
      setNewCategory(activeCategoryTab);
      setShowCategoryInput(false);
    }
  }, [isEditing, activeCategoryTab]);

  const addEntry = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    
    // Parse keywords
    const keywords = newKeywords.split(/[,，]/).map(k => k.trim()).filter(Boolean);

    const newEntry: WorldEntry = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      category: newCategory.trim() || '默认',
      active: true,
      triggerKeywords: keywords,
      scope: newScope,
      characterId: newScope === 'character' ? selectedCharId : undefined,
    };
    
    setEntries(prev => [...prev, newEntry]);
    
    // Reset Form
    setNewTitle('');
    setNewCategory(''); 
    setShowCategoryInput(false);
    setNewKeywords('');
    setNewContent('');
    setNewScope('global');
    setSelectedCharId('');
    setIsEditing(false);
  };

  const toggleEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Filter entries based on the active tab
  const filteredEntries = useMemo(() => {
    return entries.filter(e => (e.category || '默认') === activeCategoryTab);
  }, [entries, activeCategoryTab]);

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900/90 text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      {/* Header */}
      <div className={`p-6 pt-12 border-b-0 rounded-b-3xl shrink-0 flex flex-col z-10 sticky top-0 ${isDark ? 'glass-panel' : 'bg-white shadow-sm'}`}>
        <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className={`text-3xl font-bold bg-clip-text text-transparent ${headerGradient}`}>
                世界书
              </h1>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-slate-500'}`}>设定与上下文管理</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-3 bg-amber-500/20 text-amber-500 rounded-full hover:bg-amber-500/30 transition-colors"
              >
                {isEditing ? <IconCheck className="w-6 h-6" /> : <IconPlus className="w-6 h-6" />}
              </button>
              <button 
                 onClick={() => navigate('/')} 
                 className={`p-3 rounded-full transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                 <IconX className="w-6 h-6" />
              </button>
            </div>
        </div>

        {/* Horizontal Category List (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveCategoryTab(tab)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all ${
                   activeCategoryTab === tab 
                     ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105' 
                     : (isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                }`}
              >
                {tab}
              </button>
            ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
        
        {isEditing && (
          <div className={`${bgPanel} p-4 rounded-2xl border-amber-500/30 border animate-pop-in mb-4 space-y-3`}>
            
            {/* Title */}
            <div>
              <label className={`text-[10px] uppercase font-bold ml-1 ${textTertiary}`}>名称</label>
              <input
                type="text"
                placeholder="例如: 主角光环"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={`w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${bgInput}`}
              />
            </div>

            {/* Category */}
            <div>
              <label className={`text-[10px] uppercase font-bold ml-1 ${textTertiary}`}>分类</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mt-1">
                {/* Existing Categories Chips */}
                {existingCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setNewCategory(cat); setShowCategoryInput(false); }}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      newCategory === cat && !showCategoryInput
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : (isDark ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                
                {/* Custom Button */}
                <button
                  onClick={() => { setNewCategory(''); setShowCategoryInput(true); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                    showCategoryInput
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : (isDark ? 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                  }`}
                >
                   <IconPlus className="w-3 h-3" /> 自定义
                </button>
              </div>

              {showCategoryInput && (
                <input
                  type="text"
                  placeholder="输入新分类名称..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className={`w-full mt-2 rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 animate-fade-in ${bgInput}`}
                  autoFocus
                />
              )}
            </div>

            {/* Trigger Keywords */}
            <div>
               <label className={`text-[10px] uppercase font-bold ml-1 ${textTertiary}`}>触发词 (选填)</label>
               <input
                type="text"
                placeholder="例如: 战斗, 魔法 (以逗号分隔)"
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                className={`w-full rounded-lg p-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 ${bgInput}`}
              />
            </div>

            {/* Scope */}
            <div>
               <label className={`text-[10px] uppercase font-bold ml-1 ${textTertiary}`}>生效范围</label>
               <div className={`flex rounded-lg p-1 mt-1 ${isDark ? 'bg-black/40' : 'bg-slate-200'}`}>
                 <button 
                   onClick={() => setNewScope('global')}
                   className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${newScope === 'global' ? (isDark ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
                 >
                   全局通用
                 </button>
                 <button 
                   onClick={() => setNewScope('character')}
                   className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${newScope === 'character' ? (isDark ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
                 >
                   绑定角色
                 </button>
               </div>
               
               {newScope === 'character' && (
                 <div className="mt-2 animate-fade-in">
                    <select
                      value={selectedCharId}
                      onChange={(e) => setSelectedCharId(e.target.value)}
                      className={`w-full rounded-lg p-3 text-sm focus:outline-none border-none appearance-none ${bgInput}`}
                    >
                      <option value="" disabled>选择关联角色...</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                 </div>
               )}
            </div>

            {/* Content */}
            <div>
               <label className={`text-[10px] uppercase font-bold ml-1 ${textTertiary}`}>内容设定</label>
               <textarea
                placeholder="详细描述 (这些信息将被植入 AI 的记忆中)"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className={`w-full rounded-lg p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 ${bgInput}`}
              />
            </div>

            <button 
              onClick={addEntry}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-3 rounded-lg font-bold text-sm shadow-lg shadow-orange-500/20"
            >
              添加至知识库
            </button>
          </div>
        )}

        {filteredEntries.length === 0 && !isEditing && (
          <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-white/20' : 'text-slate-300'}`}>
            <IconBook className="w-16 h-16 mb-4" />
            <p>该分类下暂无设定</p>
          </div>
        )}

        <div className="space-y-3">
           {filteredEntries.map(entry => (
             <div 
               key={entry.id} 
               className={`group relative p-4 rounded-2xl transition-all duration-300 ${isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200'} ${entry.active ? (isDark ? 'border-amber-500/40 bg-amber-900/10' : 'border-amber-500/40 bg-amber-50') : 'opacity-60 grayscale'}`}
             >
               <div className="flex justify-between items-start mb-2">
                 <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>{entry.title}</h3>
                    <div className="flex gap-2 mt-1">
                      {/* Chips */}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-500'}`}>
                        {entry.category || '默认'}
                      </span>
                      {entry.scope === 'character' ? (
                         <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            绑定: {contacts.find(c => c.id === entry.characterId)?.name || '未知'}
                         </span>
                      ) : (
                         <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            全局
                         </span>
                      )}
                      {entry.triggerKeywords && entry.triggerKeywords.length > 0 && (
                         <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-300 border border-slate-500/30">
                            触发词: {entry.triggerKeywords.length}
                         </span>
                      )}
                    </div>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => toggleEntry(entry.id)} className={`w-4 h-4 rounded-full border ${entry.active ? 'bg-green-400 border-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : (isDark ? 'bg-transparent border-white/30' : 'bg-transparent border-slate-300')}`} />
                 </div>
               </div>
               <p className={`text-sm leading-relaxed font-light ${textSecondary}`}>{entry.content}</p>
               <button 
                 onClick={() => deleteEntry(entry.id)}
                 className="absolute bottom-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <IconTrash className="w-4 h-4" />
               </button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default WorldBookApp;