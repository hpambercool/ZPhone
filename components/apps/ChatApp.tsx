import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatMessage, AppConfig, WorldEntry, Contact, Conversation, ThemeMode, UserPersona } from '../../types';
import { IconChat, IconUsers, IconUser, IconPlus, IconChevronLeft, IconX, IconCheck } from '../Icons';
import { getGeminiResponseStream } from '../../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

// --- Local Icons for WeChat UI ---
const IconMic = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const IconFace = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const IconAddCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const IconMoreHorizontal = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

interface ChatAppProps {
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  worldBook: WorldEntry[];
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  theme?: ThemeMode;
}

const ChatApp: React.FC<ChatAppProps> = ({ 
  config, 
  setConfig,
  worldBook,
  contacts,
  setContacts,
  theme = 'dark'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === 'dark';
  
  // Style Utilities
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/50' : 'text-slate-500';
  const textTertiary = isDark ? 'text-white/30' : 'text-slate-400';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-[#F2F2F7]';
  const bgHeader = isDark ? 'bg-white/5 backdrop-blur-md border-white/5' : 'bg-white/80 backdrop-blur-md border-slate-200 shadow-sm';
  const bgItem = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-200/50';
  const bgPanel = isDark ? 'glass-panel' : 'bg-white shadow-sm border border-slate-200';
  
  // WeChat UI Colors
  const wcBg = isDark ? 'bg-[#111111]' : 'bg-[#EDEDED]';
  const wcHeaderBg = isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-[#EDEDED] border-[#DCDCDC]';
  const wcInputBg = isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-[#F7F7F7] border-[#DCDCDC]';
  const wcBubbleUser = isDark ? 'bg-[#2EA043] text-white' : 'bg-[#95EC69] text-black';
  const wcBubbleOther = isDark ? 'bg-[#2C2C2C] text-white' : 'bg-white text-black';
  
  // --- Routing Logic ---
  const isChatRoom = location.pathname.startsWith('/chat/room/');
  // Use contactId from URL
  const activeContactId = isChatRoom ? location.pathname.split('/').pop() || null : null;

  // --- Local Persistent State ---
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'me'>('chats');
  
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('os26_conversations');
    return saved ? JSON.parse(saved) : [];
  });

  // Chat Room Inputs
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Contact Creation State
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPrompt, setNewContactPrompt] = useState('');

  // User Persona State
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [showCreatePersona, setShowCreatePersona] = useState(false);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('os26_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Auto-create conversation if missing when visiting a room
  useEffect(() => {
    if (activeContactId && contacts.find(c => c.id === activeContactId)) {
        const exists = conversations.some(c => c.contactId === activeContactId);
        if (!exists) {
             const newConv: Conversation = {
                id: Date.now().toString(),
                contactId: activeContactId,
                messages: [],
                lastMessage: '',
                timestamp: Date.now(),
                unreadCount: 0
             };
             setConversations(prev => [newConv, ...prev]);
        }
    }
  }, [activeContactId, conversations, contacts]);

  // Scroll to bottom
  useEffect(() => {
    if (activeContactId) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [activeContactId, conversations]);

  const closeApp = () => navigate('/');

  // --- Logic Helpers ---

  const startChat = (contactId: string) => {
    navigate(`/chat/room/${contactId}`);
  };

  const createContact = () => {
    if (!newContactName.trim()) return;
    const newContact: Contact = {
      id: Date.now().toString(),
      name: newContactName,
      avatar: `bg-gradient-to-br from-${['red', 'green', 'purple', 'yellow', 'pink'][Math.floor(Math.random()*5)]}-500 to-gray-700`,
      bio: '自定义角色',
      systemPrompt: newContactPrompt || '你是一个友好的聊天伙伴。'
    };
    setContacts(prev => [...prev, newContact]);
    setShowCreateContact(false);
    setNewContactName('');
    setNewContactPrompt('');
  };

  const handleCreatePersona = () => {
    if (!newPersonaName.trim()) return;
    const colors = ['blue', 'indigo', 'purple', 'pink', 'rose', 'orange', 'amber', 'emerald'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = Date.now().toString();
    
    const newPersona: UserPersona = {
        id: newId,
        name: newPersonaName,
        avatar: `bg-gradient-to-br from-${randomColor}-500 to-${randomColor}-700`
    };

    setConfig(prev => ({
        ...prev,
        userPersonas: [...(prev.userPersonas || []), newPersona],
        currentPersonaId: newId,
        userName: newPersona.name
    }));

    setNewPersonaName('');
    setShowCreatePersona(false);
  };

  const handleSwitchPersona = (persona: UserPersona) => {
    setConfig(prev => ({
        ...prev,
        currentPersonaId: persona.id,
        userName: persona.name
    }));
  };

  const handleDeletePersona = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setConfig(prev => {
          const newPersonas = prev.userPersonas?.filter(p => p.id !== id) || [];
          let newCurrentId = prev.currentPersonaId;
          let newName = prev.userName;

          if (id === prev.currentPersonaId) {
             const fallback = newPersonas.length > 0 ? newPersonas[0] : { id: 'default', name: 'User', avatar: 'bg-gray-500' };
             newCurrentId = fallback.id;
             newName = fallback.name;
          }

          return {
              ...prev,
              userPersonas: newPersonas,
              currentPersonaId: newCurrentId,
              userName: newName
          };
      });
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !activeContactId) return;

    let currentConv = conversations.find(c => c.contactId === activeContactId);
    
    // Safety check: if conversation doesn't exist yet (very rare if effect works), we might skip or handle
    if (!currentConv) return;
    
    const contact = contacts.find(c => c.id === currentConv.contactId);
    if (!contact) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setConversations(prev => prev.map(c => {
      if (c.contactId === activeContactId) {
        return {
          ...c,
          messages: [...c.messages, userMsg],
          lastMessage: userMsg.text,
          timestamp: Date.now()
        };
      }
      return c;
    }));

    setInput('');
    setLoading(true);

    try {
      const modelMsgId = (Date.now() + 1).toString();
      const modelPlaceholder: ChatMessage = {
        id: modelMsgId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
      };

      setConversations(prev => prev.map(c => {
        if (c.contactId === activeContactId) {
          return { ...c, messages: [...c.messages, modelPlaceholder] };
        }
        return c;
      }));

      const specificPrompt = contact.systemPrompt;
      const relevantWorldBook = worldBook.filter(entry => {
        if (!entry.active) return false;
        if (entry.scope === 'character' && entry.characterId !== contact.id) return false;
        if (entry.triggerKeywords && entry.triggerKeywords.length > 0) {
           const textToCheck = userMsg.text.toLowerCase();
           const hasMatch = entry.triggerKeywords.some(kw => textToCheck.includes(kw.toLowerCase()));
           if (!hasMatch) return false;
        }
        return true;
      });

      const stream = await getGeminiResponseStream(
        userMsg.text,
        currentConv.messages,
        relevantWorldBook,
        config, 
        specificPrompt
      );

      let accumulatedText = '';
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          accumulatedText += text;
          setConversations(prev => prev.map(c => {
            if (c.contactId === activeContactId) {
              const updatedMsgs = c.messages.map(m => 
                m.id === modelMsgId ? { ...m, text: accumulatedText } : m
              );
              return {
                ...c,
                messages: updatedMsgs,
                lastMessage: accumulatedText,
                timestamp: Date.now()
              };
            }
            return c;
          }));
        }
      }

    } catch (error) {
      setConversations(prev => prev.map(c => {
        if (c.contactId === activeContactId) {
          const errMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'model',
            text: '连接失败: ' + (error instanceof Error ? error.message : '未知错误'),
            timestamp: Date.now()
          };
          return {
            ...c,
            messages: [...c.messages, errMsg],
            lastMessage: '[错误]',
            timestamp: Date.now()
          };
        }
        return c;
      }));
    } finally {
      setLoading(false);
    }
  };

  // --- Renders ---

  const renderTabBar = () => (
    <div className={`h-16 border-t shrink-0 flex justify-around items-center px-2 pb-2 ${isDark ? 'glass-panel border-white/10' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
      <button 
        onClick={() => setActiveTab('chats')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'chats' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconChat className="w-6 h-6" />
        <span className="text-[10px]">聊天</span>
      </button>
      <button 
        onClick={() => setActiveTab('contacts')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'contacts' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconUsers className="w-6 h-6" />
        <span className="text-[10px]">通讯录</span>
      </button>
      <button 
        onClick={() => setActiveTab('me')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'me' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconUser className="w-6 h-6" />
        <span className="text-[10px]">我</span>
      </button>
    </div>
  );

  const renderChatList = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {conversations.length === 0 ? (
        <div className={`flex flex-col items-center justify-center h-full ${textTertiary}`}>
          <IconChat className="w-12 h-12 mb-2" />
          <p className="text-sm">暂无消息</p>
          <p className="text-xs mt-1">去通讯录发起聊天吧</p>
        </div>
      ) : (
        conversations.sort((a,b) => b.timestamp - a.timestamp).map(conv => {
          const contact = contacts.find(c => c.id === conv.contactId);
          if (!contact) return null;
          return (
            <div 
              key={conv.id}
              onClick={() => navigate(`/chat/room/${contact.id}`)}
              className={`flex items-center gap-3 p-4 transition-colors border-b cursor-pointer ${bgItem} ${isDark ? 'border-white/5' : 'border-slate-100'}`}
            >
              <div className={`w-12 h-12 rounded-lg ${contact.avatar} flex items-center justify-center text-lg font-bold text-white shadow-lg`}>
                 {contact.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`${textPrimary} font-medium truncate`}>{contact.name}</h3>
                  <span className={`text-[10px] ${textTertiary}`}>
                    {new Date(conv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className={`${textSecondary} text-sm truncate`}>{conv.lastMessage || '...'}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderContactsList = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar relative">
      <div 
        onClick={() => setShowCreateContact(true)}
        className={`flex items-center gap-3 p-3 mx-4 mt-2 rounded-xl transition-colors cursor-pointer ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm hover:bg-slate-50'}`}
      >
        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
          <IconPlus className="w-6 h-6 text-white" />
        </div>
        <span className={`${textPrimary} font-medium`}>新的朋友 (创建角色)</span>
      </div>

      <div className={`px-4 py-2 text-xs font-medium ${textTertiary}`}>联系人</div>
      
      {contacts.map(contact => (
        <div 
          key={contact.id}
          onClick={() => startChat(contact.id)}
          className={`flex items-center gap-3 p-3 mx-4 mb-2 rounded-xl transition-colors cursor-pointer border ${isDark ? 'bg-black/20 border-white/5 hover:bg-white/5' : 'bg-white border-slate-100 shadow-sm hover:bg-slate-50'}`}
        >
          <div className={`w-10 h-10 rounded-lg ${contact.avatar} flex items-center justify-center font-bold text-white`}>
            {contact.name[0]}
          </div>
          <div className="flex-1">
             <h3 className={`${textPrimary} font-medium`}>{contact.name}</h3>
             <p className={`text-xs truncate ${textSecondary}`}>{contact.bio}</p>
          </div>
        </div>
      ))}

      {/* Create Contact Modal */}
      {showCreateContact && (
        <div className={`absolute inset-0 z-50 p-6 flex flex-col animate-fade-in ${isDark ? 'bg-slate-900/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl'}`}>
          <div className="flex justify-between items-center mb-6">
             <h3 className={`text-lg font-bold ${textPrimary}`}>创建角色</h3>
             <button onClick={() => setShowCreateContact(false)} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
               <IconX className={`w-5 h-5 ${textPrimary}`} />
             </button>
          </div>
          <input 
            className={`w-full p-4 rounded-xl mb-4 border outline-none ${isDark ? 'bg-black/40 text-white border-white/10 focus:border-green-500' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-green-500'}`}
            placeholder="名字 (例如: 赛博朋克酒保)"
            value={newContactName}
            onChange={e => setNewContactName(e.target.value)}
          />
          <textarea 
            className={`w-full p-4 rounded-xl mb-4 border outline-none h-40 resize-none ${isDark ? 'bg-black/40 text-white border-white/10 focus:border-green-500' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-green-500'}`}
            placeholder="角色设定/提示词 (例如: 你是一个冷酷的酒保，说话喜欢带哲理...)"
            value={newContactPrompt}
            onChange={e => setNewContactPrompt(e.target.value)}
          />
          <button 
            onClick={createContact}
            disabled={!newContactName.trim()}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            保存并添加
          </button>
        </div>
      )}
    </div>
  );

  const renderPersonaSelector = () => (
      <div className={`absolute inset-0 z-50 flex flex-col animate-slide-up ${isDark ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-3xl`}>
          <div className="flex items-center justify-between p-6">
              <h2 className={`text-2xl font-bold ${textPrimary}`}>切换身份</h2>
              <button 
                onClick={() => setShowPersonaModal(false)}
                className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
              >
                  <IconX className={`w-6 h-6 ${textPrimary}`} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setShowCreatePersona(true)}
                    className={`aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isDark ? 'border-white/20 hover:border-white/40 hover:bg-white/5' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
                  >
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                          <IconPlus className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${textPrimary}`}>新建人设</span>
                  </button>

                  {config.userPersonas?.map(persona => {
                      const isActive = config.currentPersonaId === persona.id;
                      return (
                          <div 
                              key={persona.id}
                              onClick={() => handleSwitchPersona(persona)}
                              className={`aspect-square rounded-3xl relative overflow-hidden p-4 flex flex-col justify-between transition-all cursor-pointer border ${isActive ? 'border-green-500 bg-green-500/10' : (isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-white shadow-sm hover:shadow-md')}`}
                          >
                              {isActive && (
                                  <div className="absolute top-3 right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                      <IconCheck className="w-3 h-3 text-white" />
                                  </div>
                              )}
                              
                              <div className={`w-14 h-14 rounded-2xl ${persona.avatar} shadow-lg`} />
                              
                              <div>
                                  <h3 className={`font-bold truncate ${textPrimary}`}>{persona.name}</h3>
                                  <p className={`text-xs ${textTertiary}`}>User ID: {persona.id.slice(-4)}</p>
                              </div>
                              {config.userPersonas && config.userPersonas.length > 1 && !isActive && (
                                  <button 
                                    onClick={(e) => handleDeletePersona(e, persona.id)}
                                    className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-red-500/20 text-transparent hover:text-red-500 transition-all"
                                  >
                                      <IconX className="w-4 h-4" />
                                  </button>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>

          {showCreatePersona && (
              <div className={`absolute inset-0 z-[60] flex items-end sm:items-center justify-center p-4 ${isDark ? 'bg-black/60' : 'bg-slate-900/20'} backdrop-blur-sm`}>
                  <div className={`w-full max-w-sm p-6 rounded-3xl animate-pop-in shadow-2xl ${bgPanel}`}>
                      <h3 className={`text-lg font-bold mb-4 ${textPrimary}`}>创建新人设</h3>
                      <input 
                        value={newPersonaName}
                        onChange={(e) => setNewPersonaName(e.target.value)}
                        placeholder="输入名称..."
                        className={`w-full p-4 rounded-xl mb-4 border outline-none ${isDark ? 'bg-black/40 text-white border-white/10 focus:border-green-500' : 'bg-slate-50 text-slate-900 border-slate-200 focus:border-green-500'}`}
                        autoFocus
                      />
                      <div className="flex gap-3">
                          <button 
                            onClick={() => setShowCreatePersona(false)}
                            className={`flex-1 py-3 rounded-xl font-bold ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}
                          >
                              取消
                          </button>
                          <button 
                            onClick={handleCreatePersona}
                            disabled={!newPersonaName.trim()}
                            className="flex-1 py-3 rounded-xl font-bold bg-green-500 text-white disabled:opacity-50"
                          >
                              创建
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderMe = () => {
    const activePersona = config.userPersonas?.find(p => p.id === config.currentPersonaId);
    const activeAvatar = activePersona?.avatar || 'bg-gradient-to-br from-indigo-500 to-purple-600';

    return (
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="flex items-center gap-4 mb-8 pt-4">
          <div 
            onClick={() => setShowPersonaModal(true)}
            className={`w-16 h-16 rounded-xl flex items-center justify-center border cursor-pointer hover:scale-105 active:scale-95 transition-transform ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-sm'} ${activeAvatar}`}
          >
             <span className="text-2xl font-bold text-white drop-shadow-md">{config.userName[0]}</span>
          </div>
          <div onClick={() => setShowPersonaModal(true)} className="cursor-pointer">
             <div className="flex items-center gap-2">
                 <h2 className={`text-xl font-bold ${textPrimary}`}>{config.userName}</h2>
                 <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
             </div>
             <p className={`text-xs ${textSecondary}`}>OS 26 ID: {config.currentPersonaId?.slice(-6) || 'user_001'}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className={`p-4 rounded-xl flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
            <span className={textPrimary}>设置</span>
            <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
          </div>
        </div>
      </div>
    );
  };

  const renderChatRoom = () => {
    const contact = contacts.find(c => c.id === activeContactId);
    
    // Fallback if contact not found (route invalid)
    if (!contact) return (
       <div className={`flex flex-col items-center justify-center h-full ${textPrimary}`}>
         <p>联系人不存在</p>
         <button onClick={() => navigate('/chat')} className="mt-4 text-blue-500">返回</button>
       </div>
    );
    
    let activeConv = conversations.find(c => c.contactId === activeContactId);
    
    // Virtual conversation object to prevent rendering blank or error if state hasn't updated yet
    if (!activeConv) {
        activeConv = {
            id: 'temp-' + contact.id,
            contactId: contact.id,
            messages: [],
            lastMessage: '',
            timestamp: Date.now(),
            unreadCount: 0
        };
    }

    return (
      <div className={`flex flex-col h-full w-full ${wcBg}`}>
        {/* WeChat Header */}
        <div className={`h-[50px] pt-[env(safe-area-inset-top)] px-4 flex items-center justify-between shrink-0 border-b z-10 ${wcHeaderBg}`}>
          <button onClick={() => navigate('/chat')} className={`p-2 -ml-2 ${textPrimary}`}>
            <IconChevronLeft className="w-6 h-6" />
          </button>
          <span className={`font-medium text-[17px] ${textPrimary}`}>{contact?.name || '未知'}</span>
          <button className={`p-2 -mr-2 ${textPrimary}`}>
            <IconMoreHorizontal className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar`}>
          {activeConv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className={`w-10 h-10 rounded mr-2 shrink-0 ${contact?.avatar} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
                  {contact?.name[0]}
                </div>
              )}
              <div
                className={`max-w-[70%] p-2.5 rounded-lg text-[15px] leading-relaxed relative break-words ${
                  msg.role === 'user' ? wcBubbleUser : wcBubbleOther
                }`}
              >
                {msg.text}
              </div>
              {/* User Avatar in Chat */}
              {msg.role === 'user' && (
                  <div className={`w-10 h-10 rounded ml-2 shrink-0 ${config.userPersonas?.find(p => p.id === config.currentPersonaId)?.avatar || 'bg-gray-500'} flex items-center justify-center text-sm font-bold text-white shadow-sm hidden sm:flex`}>
                      {config.userName[0]}
                  </div>
              )}
            </div>
          ))}
          {loading && activeConv.messages[activeConv.messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start items-center">
                <div className={`w-10 h-10 rounded mr-2 ${contact?.avatar} opacity-50`}></div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-white/10' : 'bg-white'}`}>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* WeChat Input Area */}
        <div className={`px-2 py-2 shrink-0 border-t ${wcInputBg} pb-[calc(8px+env(safe-area-inset-bottom))]`}>
           <div className="flex items-end gap-2">
             <button className={`p-2 mb-0.5 ${textSecondary}`}>
                <IconMic className="w-7 h-7" />
             </button>
             <div className={`flex-1 min-h-[40px] rounded-lg px-2 py-2 ${isDark ? 'bg-[#2C2C2C]' : 'bg-white'}`}>
               <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className={`w-full bg-transparent text-[16px] outline-none ${isDark ? 'text-white' : 'text-black'}`}
                  disabled={loading}
               />
             </div>
             <button className={`p-2 mb-0.5 ${textSecondary}`}>
                <IconFace className="w-7 h-7" />
             </button>
             {input.trim() ? (
                <button 
                  onClick={handleSend} 
                  disabled={loading}
                  className="mb-1 px-4 py-1.5 bg-[#95EC69] text-black font-medium rounded-md text-sm whitespace-nowrap"
                >
                  发送
                </button>
             ) : (
                <button className={`p-2 mb-0.5 ${textSecondary}`}>
                   <IconAddCircle className="w-7 h-7" />
                </button>
             )}
           </div>
        </div>
      </div>
    );
  };

  if (activeContactId) {
     return renderChatRoom();
  }

  return (
    <div className={`h-full flex flex-col relative ${bgMain} ${textPrimary}`}>
      {/* Main App Header */}
      <div className={`h-24 pt-8 px-4 flex items-center justify-between shrink-0 z-10 border-b ${bgHeader}`}>
        <span className="font-bold text-lg ml-2">
          {activeTab === 'chats' && '聊天'}
          {activeTab === 'contacts' && '通讯录'}
          {activeTab === 'me' && '我'}
        </span>
        <div className="flex gap-2">
           <button onClick={closeApp} className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>
             <IconX className="w-4 h-4" />
           </button>
        </div>
      </div>

      {activeTab === 'chats' && renderChatList()}
      {activeTab === 'contacts' && renderContactsList()}
      {activeTab === 'me' && renderMe()}
      {renderTabBar()}
      {showPersonaModal && renderPersonaSelector()}
    </div>
  );
};

export default ChatApp;