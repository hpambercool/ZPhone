import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldEntry } from '../../types';
import { IconPlus, IconTrash, IconCheck, IconBook, IconX } from '../Icons';

interface WorldBookAppProps {
  entries: WorldEntry[];
  setEntries: React.Dispatch<React.SetStateAction<WorldEntry[]>>;
  closeApp: () => void;
}

const WorldBookApp: React.FC<WorldBookAppProps> = ({ entries, setEntries, closeApp: _closeApp }) => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

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
    <div className="h-full flex flex-col bg-slate-900/90 text-white">
      {/* Header */}
      <div className="p-6 pt-12 glass-panel border-b-0 rounded-b-3xl shrink-0 flex justify-between items-center z-10 sticky top-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500">
            世界书
          </h1>
          <p className="text-white/50 text-xs">设定与上下文管理</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="p-3 bg-amber-500/20 text-amber-300 rounded-full hover:bg-amber-500/30 transition-colors"
          >
            {isEditing ? <IconCheck className="w-6 h-6" /> : <IconPlus className="w-6 h-6" />}
          </button>
          <button 
             onClick={() => navigate('/')} 
             className="p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
          >
             <IconX className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-20">
        
        {isEditing && (
          <div className="glass-panel p-4 rounded-2xl border-amber-500/30 border animate-pop-in">
            <input
              type="text"
              placeholder="主题 (例如: '角色设定', '世界观')"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-black/40 rounded-lg p-3 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-white/30 text-white"
            />
            <textarea
              placeholder="详细描述 (这些信息将被植入 AI 的记忆中)"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-black/40 rounded-lg p-3 text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder-white/30 text-white"
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
          <div className="flex flex-col items-center justify-center h-64 text-white/20">
            <IconBook className="w-16 h-16 mb-4" />
            <p>暂无世界书设定</p>
          </div>
        )}

        {entries.map(entry => (
          <div 
            key={entry.id} 
            className={`group relative glass-panel p-4 rounded-2xl transition-all duration-300 ${entry.active ? 'border-amber-500/40 bg-amber-900/10' : 'opacity-60 grayscale'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-lg text-amber-100">{entry.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => toggleEntry(entry.id)} className={`w-4 h-4 rounded-full border ${entry.active ? 'bg-green-400 border-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-transparent border-white/30'}`} />
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed font-light">{entry.content}</p>
            <button 
              onClick={() => deleteEntry(entry.id)}
              className="absolute bottom-4 right-4 p-2 bg-red-500/20 text-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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