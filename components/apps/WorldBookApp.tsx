import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldEntry, ThemeMode } from '../../types';
import { IconPlus, IconTrash, IconCheck, IconBook, IconX } from '../Icons';

interface WorldBookAppProps {
  entries: WorldEntry[];
  setEntries: React.Dispatch<React.SetStateAction<WorldEntry[]>>;
  closeApp: () => void;
  theme?: ThemeMode;
}

const WorldBookApp: React.FC<WorldBookAppProps> = ({ 
  entries, 
  setEntries, 
  closeApp: _closeApp,
  theme = 'dark' 
}) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const isDark = theme === 'dark';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/70' : 'text-slate-600';
  const bgPanel = isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200';
  const bgInput = isDark ? 'bg-black/40 placeholder-white/30 text-white' : 'bg-slate-50 placeholder-slate-400 text-slate-900 border-slate-200';
  const headerGradient = isDark 
    ? 'bg-gradient-to-r from-amber-200 to-amber-500' 
    : 'bg-gradient-to-r from-amber-600 to-amber-800';

  const addEntry = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newEntry: WorldEntry = {
      id: Date.now().toString(),
      title: newTitle,
      content: newContent,
      active: true,
    };
    setEntries(prev => [...prev, newEntry]);
    setNewTitle('');
    setNewContent('');
    setIsEditing(false);
  };

  const toggleEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, active: !e.active } : e));
  };

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900/90 text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      {/* Header */}
      <div className={`p-6 pt-12 border-b-0 rounded-b-3xl shrink-0 flex justify-between items-center z-10 sticky top-0 ${isDark ? 'glass-panel' : 'bg-white shadow-sm'}`}>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
        
        {isEditing && (
          <div className={`${bgPanel} p-4 rounded-2xl border-amber-500/30 border animate-pop-in`}>
            <input
              type="text"
              placeholder="主题 (例如: '角色设定', '世界观')"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className={`w-full rounded-lg p-3 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-amber-500 ${bgInput}`}
            />
            <textarea
              placeholder="详细描述 (这些信息将被植入 AI 的记忆中)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className={`w-full rounded-lg p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 ${bgInput}`}
            />
            <button 
              onClick={addEntry}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-2 rounded-lg font-medium text-sm"
            >
              添加至知识库
            </button>
          </div>
        )}

        {entries.length === 0 && !isEditing && (
          <div className={`flex flex-col items-center justify-center h-64 ${isDark ? 'text-white/20' : 'text-slate-300'}`}>
            <IconBook className="w-16 h-16 mb-4" />
            <p>暂无世界书设定</p>
          </div>
        )}

        {entries.map(entry => (
          <div 
            key={entry.id} 
            className={`group relative p-4 rounded-2xl transition-all duration-300 ${isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200'} ${entry.active ? (isDark ? 'border-amber-500/40 bg-amber-900/10' : 'border-amber-500/40 bg-amber-50') : 'opacity-60 grayscale'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className={`font-bold text-lg ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>{entry.title}</h3>
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
  );
};

export default WorldBookApp;