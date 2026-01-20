import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage, AppConfig, WorldEntry, Contact, Conversation } from '../../types';
import { IconSend, IconChat, IconUsers, IconUser, IconPlus, IconChevronLeft, IconX } from '../Icons';
import { getGeminiResponseStream } from '../../services/geminiService';
import { GenerateContentResponse } from '@google/genai';

interface ChatAppProps {
  config: AppConfig;
  worldBook: WorldEntry[];
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
  worldBook
}) => {
  const navigate = useNavigate();
  
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
        config.model,
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
    <div className="h-16 glass-panel border-t border-white/10 shrink-0 flex justify-around items-center px-2 pb-2">
      <button 
        onClick={() => setActiveTab('chats')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'chats' ? 'text-green-400' : 'text-white/40'}`}
      >
        <IconChat className="w-6 h-6" />
        <span className="text-[10px]">微信</span>
      </button>
      <button 
        onClick={() => setActiveTab('contacts')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'contacts' ? 'text-green-400' : 'text-white/40'}`}
      >
        <IconUsers className="w-6 h-6" />
        <span className="text-[10px]">通讯录</span>
      </button>
      <button 
        onClick={() => setActiveTab('me')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'me' ? 'text-green-400' : 'text-white/40'}`}
      >
        <IconUser className="w-6 h-6" />
        <span className="text-[10px]">我</span>
      </button>
    </div>
  );

  const renderChatList = () => (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white/30">
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
              className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-lg ${contact.avatar} flex items-center justify-center text-lg font-bold text-white shadow-lg`}>
                 {contact.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-white font-medium truncate">{contact.name}</h3>
                  <span className="text-[10px] text-white/30">
                    {new Date(conv.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <p className="text-white/50 text-sm truncate">{conv.lastMessage || '...'}</p>
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
        className="flex items-center gap-3 p-3 mx-4 mt-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
      >
        <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
          <IconPlus className="w-6 h-6 text-white" />
        </div>
        <span className="text-white font-medium">新的朋友 (创建角色)</span>
      </div>

      <div className="px-4 py-2 text-xs text-white/30 font-medium">联系人</div>
      
      {contacts.map(contact => (
        <div 
          key={contact.id}
          onClick={() => startChat(contact.id)}
          className="flex items-center gap-3 p-3 mx-4 mb-2 bg-black/20 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-white/5"
        >
          <div className={`w-10 h-10 rounded-lg ${contact.avatar} flex items-center justify-center font-bold text-white`}>
            {contact.name[0]}
          </div>
          <div className="flex-1">
             <h3 className="text-white font-medium">{contact.name}</h3>
             <p className="text-xs text-white/40 truncate">{contact.bio}</p>
          </div>
        </div>
      ))}

      {/* Create Contact Modal */}
      {showCreateContact && (
        <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-white">创建角色</h3>
             <button onClick={() => setShowCreateContact(false)} className="p-2 bg-white/10 rounded-full">
               <IconX className="w-5 h-5 text-white" />
             </button>
          </div>
          <input 
            className="w-full bg-black/40 p-4 rounded-xl text-white mb-4 border border-white/10 focus:border-green-500 outline-none"
            placeholder="名字 (例如: 赛博朋克酒保)"
            value={newContactName}
            onChange={e => setNewContactName(e.target.value)}
          />
          <textarea 
            className="w-full bg-black/40 p-4 rounded-xl text-white mb-4 border border-white/10 focus:border-green-500 outline-none h-40 resize-none"
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
        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
          <IconUser className="w-8 h-8 text-white/50" />
        </div>
        <div>
           <h2 className="text-xl font-bold text-white">{config.userName}</h2>
           <p className="text-xs text-white/50">OS 26 ID: user_001</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
          <span className="text-white">服务</span>
          <span className="text-white/30 text-xs">已连接</span>
        </div>
        <div className="p-4 bg-white/5 rounded-xl flex justify-between items-center">
          <span className="text-white">设置</span>
          <IconChevronLeft className="w-4 h-4 text-white/30 rotate-180" />
        </div>
      </div>
    </div>
  );

  const renderChatRoom = () => {
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (!activeConv) return null;
    const contact = contacts.find(c => c.id === activeConv.contactId);

    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-slate-900 animate-slide-up">
        {/* Chat Header */}
        <div className="h-24 pt-8 px-4 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/5 shrink-0">
          <button onClick={() => setActiveConversationId(null)} className="p-2 -ml-2 text-white">
            <IconChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-bold text-white">{contact?.name || '未知'}</span>
          <div className="w-8"></div> {/* Spacer */}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-black/20">
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
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-black'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && activeConv.messages[activeConv.messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start items-center">
                <div className={`w-8 h-8 rounded mr-2 ${contact?.avatar} opacity-50`}></div>
                <div className="bg-white/80 p-3 rounded-lg">
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
        <div className="p-3 bg-slate-800 border-t border-white/10 shrink-0 mb-4">
           <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-2">
             <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-transparent text-white placeholder-white/30 text-sm outline-none px-2"
                placeholder="发送消息..."
                disabled={loading}
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim() || loading}
               className={`p-1.5 rounded-md ${input.trim() ? 'bg-green-600 text-white' : 'bg-transparent text-white/20'}`}
             >
               <IconSend className="w-5 h-5" />
             </button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white relative">
      {/* Main App Header (Hidden in ChatRoom) */}
      <div className="h-24 pt-8 px-4 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
        <span className="font-bold text-lg ml-2">
          {activeTab === 'chats' && '微信'}
          {activeTab === 'contacts' && '通讯录'}
          {activeTab === 'me' && '我'}
        </span>
        <div className="flex gap-2">
           <button onClick={closeApp} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
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