import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, AppConfig, WorldEntry, Contact, Conversation, ThemeMode } from '../../types';
import { IconSend, IconChat, IconUsers, IconUser, IconPlus, IconChevronLeft, IconX } from '../Icons';
import { getGeminiResponseStream } from '../../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface ChatAppProps {
  config: AppConfig;
  worldBook: WorldEntry[];
  theme?: ThemeMode;
}

// Initial Mock Data
const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'ai-assistant',
    name: 'OS 26 助手',
    avatar: 'bg-blue-600',
    bio: '官方系统智能助手',
    systemPrompt: '你是一个乐于助人、智能且冷静的 AI 助手。'
  }
];

const ChatApp: React.FC<ChatAppProps> = ({ 
  config, 
  worldBook,
  theme = 'dark'
}) => {
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  
  // Style Utilities
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/50' : 'text-slate-500';
  const textTertiary = isDark ? 'text-white/30' : 'text-slate-400';
  const bgMain = isDark ? 'bg-slate-900' : 'bg-[#F2F2F7]';
  const bgHeader = isDark ? 'bg-white/5 backdrop-blur-md border-white/5' : 'bg-white/80 backdrop-blur-md border-slate-200 shadow-sm';
  const bgItem = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-200/50';
  const bgMyMessage = 'bg-green-600 text-white';
  const bgOtherMessage = isDark ? 'bg-white text-black' : 'bg-white text-black shadow-sm';
  const bgInputArea = isDark ? 'bg-slate-800 border-white/10' : 'bg-[#F2F2F7] border-slate-200';
  const bgInputField = isDark ? 'bg-white/10 text-white placeholder-white/30' : 'bg-white text-slate-900 placeholder-slate-400';

  // --- Local Persistent State ---
  // Navigation State (UI State)
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'me'>('chats');
  
  // Data State (loaded from localStorage)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('os26_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('os26_conversations');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Chat Room Inputs
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Modal State
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPrompt, setNewContactPrompt] = useState('');

  // --- Effects ---

  // Persistence
  useEffect(() => {
    localStorage.setItem('os26_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('os26_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Scroll to bottom
  useEffect(() => {
    if (activeConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversationId, conversations]);

  const closeApp = () => navigate('/');

  // --- Logic Helpers ---

  const getConversation = (contactId: string) => {
    return conversations.find(c => c.contactId === contactId);
  };

  const startChat = (contactId: string) => {
    const existing = getConversation(contactId);
    if (existing) {
      setActiveConversationId(existing.id);
    } else {
      const newConv: Conversation = {
        id: Date.now().toString(),
        contactId,
        messages: [],
        lastMessage: '',
        timestamp: Date.now(),
        unreadCount: 0
      };
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
    }
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

  const handleSend = async () => {
    if (!input.trim() || loading || !activeConversationId) return;

    const currentConv = conversations.find(c => c.id === activeConversationId);
    if (!currentConv) return;
    
    const contact = contacts.find(c => c.id === currentConv.contactId);
    if (!contact) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    // Optimistic Update
    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
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
        text: '', // Start empty for streaming
        timestamp: Date.now(),
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return { ...c, messages: [...c.messages, modelPlaceholder] };
        }
        return c;
      }));

      const specificPrompt = contact.systemPrompt;

      const stream = await getGeminiResponseStream(
        userMsg.text,
        currentConv.messages,
        worldBook,
        config, 
        specificPrompt
      );

      let accumulatedText = '';
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          accumulatedText += text;
          // Update conversation with new chunk
          setConversations(prev => prev.map(c => {
            if (c.id === activeConversationId) {
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
        if (c.id === activeConversationId) {
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
        <span className="text-[10px]">微信</span>
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
              onClick={() => setActiveConversationId(conv.id)}
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

  const renderMe = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar p-4">
      <div className="flex items-center gap-4 mb-8 pt-4">
        <div className={`w-16 h-16 rounded-xl flex items-center justify-center border ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-sm'}`}>
          <IconUser className={`w-8 h-8 ${textSecondary}`} />
        </div>
        <div>
           <h2 className={`text-xl font-bold ${textPrimary}`}>{config.userName}</h2>
           <p className={`text-xs ${textSecondary}`}>OS 26 ID: user_001</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className={`p-4 rounded-xl flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
          <span className={textPrimary}>服务</span>
          <span className={`text-xs ${textSecondary}`}>已连接</span>
        </div>
        <div className={`p-4 rounded-xl flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
          <span className={textPrimary}>设置</span>
          <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
        </div>
      </div>
    </div>
  );

  const renderChatRoom = () => {
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return null;
    const contact = contacts.find(c => c.id === activeConv.contactId);

    return (
      <div className={`absolute inset-0 z-20 flex flex-col animate-slide-up ${bgMain}`}>
        {/* Chat Header */}
        <div className={`h-24 pt-8 px-4 flex items-center justify-between shrink-0 border-b ${bgHeader}`}>
          <button onClick={() => setActiveConversationId(null)} className={`p-2 -ml-2 ${textPrimary}`}>
            <IconChevronLeft className="w-6 h-6" />
          </button>
          <span className={`font-bold ${textPrimary}`}>{contact?.name || '未知'}</span>
          <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar ${isDark ? 'bg-black/20' : 'bg-[#E5E5EA]/20'}`}>
          {activeConv.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className={`w-8 h-8 rounded mr-2 shrink-0 ${contact?.avatar} flex items-center justify-center text-xs font-bold text-white`}>
                  {contact?.name[0]}
                </div>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? bgMyMessage
                    : bgOtherMessage
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && activeConv.messages[activeConv.messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start items-center">
                <div className={`w-8 h-8 rounded mr-2 ${contact?.avatar} opacity-50`}></div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-white/80' : 'bg-white'}`}>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-black/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={`p-3 border-t shrink-0 mb-4 ${bgInputArea}`}>
           <div className={`flex items-center gap-2 rounded-lg px-2 py-2 ${isDark ? 'bg-white/10' : 'bg-white'}`}>
             <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className={`flex-1 bg-transparent text-sm outline-none px-2 ${isDark ? 'text-white placeholder-white/30' : 'text-slate-900 placeholder-slate-400'}`}
                placeholder="发送消息..."
                disabled={loading}
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || loading}
               className={`p-1.5 rounded-md ${input.trim() ? 'bg-green-600 text-white' : (isDark ? 'bg-transparent text-white/20' : 'bg-transparent text-slate-300')}`}
             >
               <IconSend className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col relative ${bgMain} ${textPrimary}`}>
      {/* Main App Header (Hidden in ChatRoom) */}
      <div className={`h-24 pt-8 px-4 flex items-center justify-between shrink-0 z-10 border-b ${bgHeader}`}>
        <span className="font-bold text-lg ml-2">
          {activeTab === 'chats' && '微信'}
          {activeTab === 'contacts' && '通讯录'}
          {activeTab === 'me' && '我'}
        </span>
        <div className="flex gap-2">
           <button onClick={closeApp} className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>
             <IconX className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'chats' && renderChatList()}
      {activeTab === 'contacts' && renderContactsList()}
      {activeTab === 'me' && renderMe()}

      {/* Bottom Navigation */}
      {renderTabBar()}

      {/* Overlays */}
      {activeConversationId && renderChatRoom()}
    </div>
  );
};

export default ChatApp;