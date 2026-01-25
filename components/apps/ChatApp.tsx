
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatMessage, AppConfig, WorldEntry, Contact, Conversation, ThemeMode, UserPersona } from '../../types';
import { IconChat, IconUsers, IconUser, IconPlus, IconChevronLeft, IconX, IconCheck, IconSettings } from '../Icons';
import { getGeminiResponseStream } from '../../services/geminiService';

// --- Local Icons ---
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

const IconWallet = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

const IconMoney = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconCard = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const IconBill = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconMoments = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);

const IconCamera = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const IconHeart = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
     <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

// --- Wallet Types ---
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: number;
  title: string;
}

interface BankCard {
  id: string;
  bankName: string;
  cardType: '储蓄卡' | '信用卡';
  last4: string;
  color: string;
}

interface RelativeCard {
  id: string;
  contactId: string;
  limit: number;
  spent: number;
}

interface WalletState {
  balance: number;
  cards: BankCard[];
  relativeCards: RelativeCard[];
  transactions: Transaction[];
  isRelativeActive: boolean;
}

const DEFAULT_WALLET: WalletState = {
  balance: 0.00,
  cards: [],
  relativeCards: [],
  transactions: [],
  isRelativeActive: false
};

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
  const bgInput = isDark ? 'bg-black/40 text-white border-white/10' : 'bg-white text-black border-slate-200';
  
  // WeChat UI Colors
  const wcBg = isDark ? 'bg-[#111111]' : 'bg-[#EDEDED]';
  const wcHeaderBg = isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-[#EDEDED] border-[#DCDCDC]';
  const wcInputBg = isDark ? 'bg-[#1E1E1E] border-white/5' : 'bg-[#F7F7F7] border-[#DCDCDC]';
  const wcBubbleUser = isDark ? 'bg-[#2EA043] text-white' : 'bg-[#95EC69] text-black';
  const wcBubbleOther = isDark ? 'bg-[#2C2C2C] text-white' : 'bg-white text-black';
  const wcBlueText = isDark ? 'text-[#7D90A9]' : 'text-[#576b95]';
  
  // --- Routing Logic ---
  const pathname = location.pathname;
  const isChatRoom = pathname.startsWith('/chat/room/');
  const isWallet = pathname.startsWith('/chat/me/wallet');
  const isPersonas = pathname.startsWith('/chat/me/personas');
  const activeContactId = isChatRoom ? pathname.split('/').pop() || null : null;

  const activeTab = useMemo(() => {
    if (pathname.startsWith('/chat/contacts')) return 'contacts';
    if (pathname.startsWith('/chat/moments')) return 'moments';
    if (pathname.startsWith('/chat/me')) return 'me';
    return 'chats';
  }, [pathname]);

  // --- Local Persistent State ---
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('os26_conversations');
    return saved ? JSON.parse(saved) : [];
  });

  const [wallet, setWallet] = useState<WalletState>(() => {
    const saved = localStorage.getItem('os26_wallet');
    return saved ? JSON.parse(saved) : DEFAULT_WALLET;
  });

  // Chat Inputs
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Contact Creation State
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPrompt, setNewContactPrompt] = useState('');

  // User Persona State
  const [newPersonaName, setNewPersonaName] = useState('');
  const [showCreatePersona, setShowCreatePersona] = useState(false);

  // Moments Cover State
  const [isCoverExpanded, setIsCoverExpanded] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    localStorage.setItem('os26_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('os26_wallet', JSON.stringify(wallet));
  }, [wallet]);

  // Auto-create conversation
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

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setConfig(prev => ({ ...prev, momentsCover: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !activeContactId) return;
    let currentConv = conversations.find(c => c.contactId === activeContactId);
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
        const c = chunk as { text: string };
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

  // --- Render Wallet Components ---

  const renderWalletBalance = () => {
    const isRecharge = pathname.includes('/recharge');
    const isWithdraw = pathname.includes('/withdraw');
    const [amount, setAmount] = useState('');
    const [selectedCardId, setSelectedCardId] = useState(wallet.cards[0]?.id || '');
    const hasCards = wallet.cards.length > 0;

    const handleTransaction = () => {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) return;
      if (isWithdraw && val > wallet.balance) return alert('余额不足');
      if (!selectedCardId) return alert('请选择银行卡');

      const card = wallet.cards.find(c => c.id === selectedCardId);
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: isRecharge ? 'income' : 'expense',
        amount: val,
        date: Date.now(),
        title: isRecharge ? `充值 - ${card?.bankName}` : `提现 - ${card?.bankName}`
      };

      setWallet(prev => ({
        ...prev,
        balance: isRecharge ? prev.balance + val : prev.balance - val,
        transactions: [newTransaction, ...prev.transactions]
      }));
      navigate('/chat/me/wallet');
    };

    return (
      <div className={`flex-1 h-full flex flex-col ${bgMain} p-4`}>
        <div className="flex items-center gap-2 mb-6 pt-4">
          <button onClick={() => navigate('/chat/me/wallet')} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <IconChevronLeft className={`w-5 h-5 ${textPrimary}`} />
          </button>
          <h2 className={`text-xl font-bold ${textPrimary}`}>{isRecharge ? '充值' : '提现'}</h2>
        </div>

        {hasCards ? (
          <div className={`${bgPanel} p-6 rounded-2xl space-y-4`}>
             <div>
                <label className={`text-xs ${textSecondary}`}>金额</label>
                <div className={`flex items-baseline mt-2 border-b ${isDark ? 'border-white/20' : 'border-slate-200'} pb-2`}>
                   <span className={`text-2xl font-bold mr-2 ${textPrimary}`}>¥</span>
                   <input 
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className={`w-full bg-transparent text-4xl font-bold outline-none ${textPrimary}`}
                      placeholder="0.00"
                   />
                </div>
                {isWithdraw && <div className={`text-xs mt-2 ${textSecondary}`}>当前余额: ¥ {wallet.balance.toFixed(2)}</div>}
             </div>

             <div>
                <label className={`text-xs ${textSecondary}`}>选择银行卡</label>
                <select 
                   value={selectedCardId}
                   onChange={e => setSelectedCardId(e.target.value)}
                   className={`w-full mt-2 p-3 rounded-xl border outline-none ${bgInput}`}
                >
                   {wallet.cards.map(c => (
                     <option key={c.id} value={c.id}>{c.bankName} ({c.cardType}) - {c.last4}</option>
                   ))}
                </select>
             </div>

             <button 
               onClick={handleTransaction}
               disabled={!amount || parseFloat(amount) <= 0}
               className={`w-full py-3 rounded-xl font-bold mt-4 ${isRecharge ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
             >
                确认{isRecharge ? '充值' : '提现'}
             </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
             <p className={`${textSecondary} mb-4`}>请先绑定银行卡</p>
             <button onClick={() => navigate('/chat/me/wallet/cards')} className="text-blue-500">去绑定</button>
          </div>
        )}
      </div>
    );
  };

  const renderWalletCards = () => {
    const [isAdding, setIsAdding] = useState(false);
    const [bankName, setBankName] = useState('招商银行');
    const [cardType, setCardType] = useState<'储蓄卡' | '信用卡'>('储蓄卡');
    const [number, setNumber] = useState('');

    const addCard = () => {
       if (number.length < 4) return;
       const newCard: BankCard = {
         id: Date.now().toString(),
         bankName,
         cardType,
         last4: number.slice(-4),
         color: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-indigo-500'][Math.floor(Math.random()*4)]
       };
       setWallet(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
       setIsAdding(false);
       setNumber('');
    };

    return (
      <div className={`flex-1 h-full flex flex-col ${bgMain} p-4`}>
         <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/chat/me/wallet')} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
              <IconChevronLeft className={`w-5 h-5 ${textPrimary}`} />
            </button>
            <h2 className={`text-xl font-bold ${textPrimary}`}>银行卡</h2>
          </div>
          <button onClick={() => setIsAdding(true)} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
             <IconPlus className={`w-5 h-5 ${textPrimary}`} />
          </button>
        </div>

        <div className="space-y-4">
           {wallet.cards.map(card => (
             <div key={card.id} className={`p-5 rounded-2xl text-white relative overflow-hidden ${card.color} shadow-lg`}>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                         {card.bankName[0]}
                      </div>
                      <div>
                         <div className="font-bold">{card.bankName}</div>
                         <div className="text-xs opacity-80">{card.cardType}</div>
                      </div>
                   </div>
                </div>
                <div className="mt-6 text-xl font-mono tracking-widest">
                   **** **** **** {card.last4}
                </div>
             </div>
           ))}
           {wallet.cards.length === 0 && !isAdding && (
              <div className={`text-center py-10 ${textSecondary}`}>暂无银行卡</div>
           )}
        </div>

        {isAdding && (
           <div className={`absolute inset-0 z-50 p-6 flex items-center justify-center ${isDark ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md`}>
              <div className={`${bgPanel} w-full max-w-sm p-6 rounded-2xl space-y-4`}>
                 <h3 className={`text-lg font-bold ${textPrimary}`}>添加银行卡</h3>
                 <select value={bankName} onChange={e => setBankName(e.target.value)} className={`w-full p-3 rounded-lg border ${bgInput}`}>
                    {['招商银行', '建设银行', '工商银行', '中国银行', '农业银行'].map(b => <option key={b} value={b}>{b}</option>)}
                 </select>
                 <select value={cardType} onChange={e => setCardType(e.target.value as any)} className={`w-full p-3 rounded-lg border ${bgInput}`}>
                    <option value="储蓄卡">储蓄卡</option>
                    <option value="信用卡">信用卡</option>
                 </select>
                 <input 
                   placeholder="卡号" 
                   value={number}
                   onChange={e => setNumber(e.target.value)}
                   className={`w-full p-3 rounded-lg border ${bgInput}`}
                 />
                 <div className="flex gap-2">
                    <button onClick={() => setIsAdding(false)} className={`flex-1 py-3 rounded-lg ${isDark ? 'bg-white/10 text-white' : 'bg-slate-200 text-black'}`}>取消</button>
                    <button onClick={addCard} className="flex-1 py-3 rounded-lg bg-blue-600 text-white">添加</button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderWalletRelative = () => {
    const [pressTimer, setPressTimer] = useState<any>(null);
    const [progress, setProgress] = useState(0);
    const [showContactSelect, setShowContactSelect] = useState(false);

    const handlePressStart = () => {
       if (wallet.isRelativeActive) return;
       setProgress(0);
       const start = Date.now();
       const timer = setInterval(() => {
          const p = Math.min(((Date.now() - start) / 2000) * 100, 100);
          setProgress(p);
          if (p >= 100) {
             clearInterval(timer);
             setWallet(prev => ({ ...prev, isRelativeActive: true }));
          }
       }, 16);
       setPressTimer(timer);
    };

    const handlePressEnd = () => {
       if (pressTimer) clearInterval(pressTimer);
       setPressTimer(null);
       if (!wallet.isRelativeActive) setProgress(0);
    };

    const giftCard = (contactId: string) => {
       if (wallet.relativeCards.length >= 10) return alert('最多赠送10张');
       const newCard: RelativeCard = {
          id: Date.now().toString(),
          contactId,
          limit: 1000,
          spent: 0
       };
       setWallet(prev => ({ ...prev, relativeCards: [...prev.relativeCards, newCard] }));
       setShowContactSelect(false);
    };

    return (
      <div className={`flex-1 h-full flex flex-col ${bgMain} p-4`}>
         <div className="flex items-center gap-2 mb-6 pt-4">
          <button onClick={() => navigate('/chat/me/wallet')} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <IconChevronLeft className={`w-5 h-5 ${textPrimary}`} />
          </button>
          <h2 className={`text-xl font-bold ${textPrimary}`}>亲属卡</h2>
        </div>

        {!wallet.isRelativeActive ? (
           <div className="flex-1 flex flex-col items-center justify-center pb-20 select-none">
              <div 
                onMouseDown={handlePressStart}
                onMouseUp={handlePressEnd}
                onTouchStart={handlePressStart}
                onTouchEnd={handlePressEnd}
                className={`w-32 h-32 rounded-full flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform ${isDark ? 'bg-white/10' : 'bg-white shadow-lg'}`}
              >
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200/10" />
                    <circle cx="64" cy="64" r="60" stroke="#f97316" strokeWidth="4" fill="none" strokeDasharray="377" strokeDashoffset={377 - (377 * progress) / 100} />
                 </svg>
                 <span className={`font-bold ${textPrimary}`}>长按激活</span>
              </div>
              <p className={`mt-8 text-sm max-w-xs text-center ${textSecondary}`}>
                 激活后可赠送亲属卡给联系人，对方消费由你买单。
              </p>
           </div>
        ) : (
           <div className="space-y-4">
              <button 
                onClick={() => setShowContactSelect(true)}
                className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 ${isDark ? 'border-white/20 text-white/60' : 'border-slate-300 text-slate-500'}`}
              >
                 <IconPlus className="w-5 h-5" /> 赠送亲属卡 ({wallet.relativeCards.length}/10)
              </button>

              {wallet.relativeCards.map(card => {
                 const contact = contacts.find(c => c.id === card.contactId);
                 return (
                    <div key={card.id} className={`p-4 rounded-xl flex items-center gap-4 ${isDark ? 'bg-orange-500/20 border-orange-500/30 border' : 'bg-orange-50 border-orange-200 border'}`}>
                       <div className={`w-12 h-12 rounded-full ${contact?.avatar || 'bg-gray-500'} flex items-center justify-center text-white font-bold`}>
                          {contact?.name[0]}
                       </div>
                       <div className="flex-1">
                          <h3 className={`font-bold ${textPrimary}`}>赠送给: {contact?.name}</h3>
                          <div className={`text-xs ${textSecondary}`}>月限额: ¥ {card.limit}</div>
                       </div>
                    </div>
                 );
              })}
           </div>
        )}

        {showContactSelect && (
           <div className={`absolute inset-0 z-50 p-6 flex flex-col ${bgMain}`}>
              <div className="flex items-center gap-2 mb-4">
                 <button onClick={() => setShowContactSelect(false)}><IconX className={`w-6 h-6 ${textPrimary}`} /></button>
                 <h3 className={`text-lg font-bold ${textPrimary}`}>选择联系人</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                 {contacts.map(c => (
                    <div key={c.id} onClick={() => giftCard(c.id)} className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer ${bgItem}`}>
                       <div className={`w-10 h-10 rounded-full ${c.avatar} flex items-center justify-center text-white`}>{c.name[0]}</div>
                       <span className={textPrimary}>{c.name}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>
    );
  };

  const renderWalletBills = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const filtered = wallet.transactions.filter(t => {
       const d = new Date(t.date);
       return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });

    const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    return (
      <div className={`flex-1 h-full flex flex-col ${bgMain} p-4`}>
         <div className="flex items-center gap-2 mb-6 pt-4">
          <button onClick={() => navigate('/chat/me/wallet')} className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
            <IconChevronLeft className={`w-5 h-5 ${textPrimary}`} />
          </button>
          <h2 className={`text-xl font-bold ${textPrimary}`}>账单</h2>
        </div>

        <div className={`flex justify-between items-center mb-4 ${textSecondary} text-sm`}>
           <div className="flex gap-2">
              <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={`bg-transparent outline-none ${textPrimary}`}>
                 {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
              <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className={`bg-transparent outline-none ${textPrimary}`}>
                 {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>{m}月</option>)}
              </select>
           </div>
           <div className="text-xs">
              收 ¥{income.toFixed(2)} / 支 ¥{expense.toFixed(2)}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
           {filtered.length > 0 ? filtered.sort((a,b) => b.date - a.date).map(t => (
              <div key={t.id} className={`p-4 rounded-xl flex justify-between items-center ${bgPanel}`}>
                 <div>
                    <div className={`font-bold ${textPrimary}`}>{t.title}</div>
                    <div className={`text-xs ${textSecondary}`}>{new Date(t.date).toLocaleString()}</div>
                 </div>
                 <div className={`font-bold ${t.type === 'income' ? 'text-green-500' : 'text-black dark:text-white'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(2)}
                 </div>
              </div>
           )) : (
              <div className={`text-center py-10 ${textSecondary}`}>本月无交易记录</div>
           )}
        </div>
      </div>
    );
  };

  const renderWalletRoot = () => (
    <div className={`flex-1 h-full flex flex-col ${bgMain}`}>
       <div className={`h-24 pt-8 px-4 flex items-center gap-2 shrink-0 z-10 ${bgHeader}`}>
         <button 
           onClick={() => navigate('/chat/me')}
           className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}
         >
           <IconChevronLeft className={`w-5 h-5 ${textPrimary}`} />
         </button>
         <h2 className={`text-xl font-bold ${textPrimary}`}>钱包</h2>
       </div>

       <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            {/* Balance Card */}
            <div className={`p-6 rounded-3xl mb-4 relative overflow-hidden ${isDark ? 'bg-green-600' : 'bg-green-500'} text-white shadow-lg`}>
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <IconMoney className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 opacity-90">
                        <IconMoney className="w-5 h-5" />
                        <span className="text-sm font-medium">零钱</span>
                    </div>
                    <div className="text-4xl font-bold mb-4">¥ {wallet.balance.toFixed(2)}</div>
                    <div className="flex gap-3">
                       <button onClick={() => navigate('/chat/me/wallet/recharge')} className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors">充值</button>
                       <button onClick={() => navigate('/chat/me/wallet/withdraw')} className="flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors">提现</button>
                    </div>
                </div>
            </div>

            {/* Grid for other items */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: '银行卡', icon: <IconCard className="w-6 h-6" />, color: 'bg-blue-500', path: '/cards' },
                    { label: '亲属卡', icon: <IconUsers className="w-6 h-6" />, color: 'bg-orange-500', path: '/relative' },
                    { label: '账单', icon: <IconBill className="w-6 h-6" />, color: 'bg-purple-500', path: '/bills' },
                ].map((item) => (
                    <div 
                      key={item.label} 
                      onClick={() => navigate('/chat/me/wallet' + item.path)}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm border border-slate-100 hover:bg-slate-50'}`}
                    >
                        <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center text-white`}>
                            {item.icon}
                        </div>
                        <span className={`text-sm font-medium ${textPrimary}`}>{item.label}</span>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );

  const renderWallet = () => {
     if (pathname.includes('/recharge') || pathname.includes('/withdraw')) return renderWalletBalance();
     if (pathname.includes('/cards')) return renderWalletCards();
     if (pathname.includes('/relative')) return renderWalletRelative();
     if (pathname.includes('/bills')) return renderWalletBills();
     return renderWalletRoot();
  };

  const renderMe = () => {
    const activePersona = config.userPersonas?.find(p => p.id === config.currentPersonaId);
    const activeAvatar = activePersona?.avatar || 'bg-gradient-to-br from-indigo-500 to-purple-600';

    return (
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="flex items-center gap-4 mb-8 pt-4">
          <div 
            onClick={() => navigate('/chat/me/personas')}
            className={`w-16 h-16 rounded-xl flex items-center justify-center border cursor-pointer hover:scale-105 active:scale-95 transition-transform ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200 shadow-sm'} ${activeAvatar}`}
          >
             <span className="text-2xl font-bold text-white drop-shadow-md">{config.userName[0]}</span>
          </div>
          <div onClick={() => navigate('/chat/me/personas')} className="cursor-pointer">
             <div className="flex items-center gap-2">
                 <h2 className={`text-xl font-bold ${textPrimary}`}>{config.userName}</h2>
                 <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
             </div>
             <p className={`text-xs ${textSecondary}`}>OS 26 ID: {config.currentPersonaId?.slice(-6) || 'user_001'}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Wallet */}
          <div 
            onClick={() => navigate('/chat/me/wallet')}
            className={`p-4 rounded-xl flex justify-between items-center cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-white shadow-sm hover:bg-slate-50'}`}
          >
            <div className="flex items-center gap-3">
                <IconWallet className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-900'}`} />
                <span className={textPrimary}>钱包</span>
            </div>
            <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
          </div>

          {/* Stickers */}
          <div className={`p-4 rounded-xl flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
             <div className="flex items-center gap-3">
                <IconFace className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-900'}`} />
                <span className={textPrimary}>表情</span>
             </div>
             <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
          </div>

          {/* Settings */}
          <div className={`p-4 rounded-xl flex justify-between items-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
             <div className="flex items-center gap-3">
                <IconSettings className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-900'}`} />
                <span className={textPrimary}>设置</span>
             </div>
            <IconChevronLeft className={`w-4 h-4 rotate-180 ${textSecondary}`} />
          </div>
        </div>
      </div>
    );
  };

  const renderPersonaSelector = () => (
      <div className={`flex-1 h-full flex flex-col ${bgMain}`}>
          <div className={`h-24 pt-8 px-4 flex items-center gap-2 shrink-0 z-10 ${bgHeader}`}>
              <button 
                onClick={() => navigate('/chat/me')}
                className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}
              >
                  <IconChevronLeft className={`w-6 h-6 ${textPrimary}`} />
              </button>
              <h2 className={`text-xl font-bold ${textPrimary}`}>切换身份</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar pt-4">
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

  const renderMoments = () => (
      <div className={`flex-1 overflow-y-auto no-scrollbar relative -mt-0 ${bgMain}`}> 
          {/* Custom Header Overlay for Moments */}
          <div className="absolute top-0 left-0 right-0 h-24 pt-8 px-4 flex justify-between items-center z-20 pointer-events-none">
              <div className="pointer-events-auto">
                 <button onClick={() => navigate('/chat')} className="p-2 -ml-2 rounded-full bg-black/10 backdrop-blur-sm text-white opacity-80 hover:opacity-100">
                    <IconChevronLeft className="w-5 h-5" />
                 </button>
              </div>
              <div className="pointer-events-auto">
                 <button className="p-2 rounded-full bg-black/10 backdrop-blur-sm text-white opacity-80 hover:opacity-100">
                    <IconCamera className="w-6 h-6" />
                 </button>
              </div>
          </div>

          {/* Cover Image Area */}
          <div className="h-80 w-full relative group">
              <div 
                 className="w-full h-full bg-cover bg-center cursor-pointer transition-opacity hover:opacity-90" 
                 onClick={() => setIsCoverExpanded(true)}
                 style={{ backgroundImage: `url(${config.momentsCover || config.wallpaper || 'https://i.postimg.cc/sxDg8hrz/dmitrii-shirnin-mq-EKg5D6ln-E-unsplash.jpg'})`, backgroundColor: '#333' }}
              ></div>
              <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
              
              {/* User Info on Cover */}
              <div className="absolute bottom-[-30px] right-4 flex items-end gap-3 z-10 pointer-events-none">
                  <span className="text-white font-bold text-lg mb-10 drop-shadow-md shadow-black">{config.userName}</span>
                  <div className={`w-20 h-20 rounded-xl border-2 border-white/10 shadow-lg overflow-hidden ${config.userPersonas?.find(p=>p.id===config.currentPersonaId)?.avatar || 'bg-gray-500'}`}>
                       {/* Avatar content */}
                       <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                           {config.userName[0]}
                       </div>
                  </div>
              </div>
          </div>

          {/* Content List */}
          <div className={`pt-16 pb-20 px-4 min-h-screen ${bgMain}`}>
             {[
               {
                  id: 1,
                  name: 'ski小助手',
                  avatar: 'bg-blue-600',
                  content: '欢迎来到 OS 26！这里是你的智能生活中心。今天天气不错，适合写代码。 🤖 ✨',
                  images: ['bg-gradient-to-tr from-blue-400 to-purple-500'],
                  time: '1小时前',
                  likes: ['User', 'CyberBartender'],
                  comments: [{ user: 'CyberBartender', text: 'Cheers! 🍸' }]
               },
               {
                  id: 2,
                  name: 'CyberBartender',
                  avatar: 'bg-pink-600',
                  content: '调制了一杯新的“数据流”，口感像跳跳糖。有人想尝试吗？',
                  images: ['bg-pink-400', 'bg-purple-900', 'bg-blue-900'],
                  time: '3小时前',
                  likes: ['ski小助手'],
                  comments: []
               },
               {
                  id: 3,
                  name: 'System',
                  avatar: 'bg-gray-700',
                  content: '系统更新日志 v1.3：\n- 新增朋友圈功能\n- 优化了聊天体验\n- 修复了一些已知的 bug',
                  images: [],
                  time: '昨天',
                  likes: [],
                  comments: []
               }
             ].map(post => (
                 <div key={post.id} className={`flex gap-3 py-6 border-b ${isDark ? 'border-white/5' : 'border-slate-200/60'}`}>
                     <div className={`w-10 h-10 rounded-lg shrink-0 ${post.avatar} flex items-center justify-center text-white font-bold shadow-sm`}>
                        {post.name[0]}
                     </div>
                     <div className="flex-1">
                        <h4 className={`${wcBlueText} font-bold text-base leading-tight mb-1`}>{post.name}</h4>
                        <p className={`text-[15px] leading-relaxed mb-2 ${textPrimary} whitespace-pre-line`}>{post.content}</p>
                        
                        {/* Images Grid */}
                        {post.images.length > 0 && (
                           <div className={`grid gap-1 mb-2 ${post.images.length === 1 ? 'grid-cols-2' : 'grid-cols-3'} w-full max-w-[80%]`}>
                              {post.images.map((imgClass, idx) => (
                                 <div key={idx} className={`aspect-square ${imgClass} ${post.images.length === 1 ? 'h-32 w-full' : ''}`}></div>
                              ))}
                           </div>
                        )}
                        
                        {/* Footer */}
                        <div className="flex justify-between items-center mt-2">
                            <span className={`text-xs ${textSecondary}`}>{post.time}</span>
                            <button className={`px-2 py-1 rounded text-xs font-bold tracking-widest ${isDark ? 'bg-white/5 text-[#576b95]' : 'bg-slate-100 text-[#576b95]'}`}>
                               ••
                            </button>
                        </div>
                        
                        {/* Likes/Comments Area */}
                        {(post.likes.length > 0 || post.comments.length > 0) && (
                            <div className={`mt-3 rounded p-3 text-[13px] relative ${isDark ? 'bg-white/5' : 'bg-[#F7F7F7]'}`}>
                                {/* Triangle pointer */}
                                <div className={`absolute top-[-6px] left-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] ${isDark ? 'border-b-white/5' : 'border-b-[#F7F7F7]'}`}></div>
                                
                                {post.likes.length > 0 && (
                                   <div className={`${wcBlueText} font-medium mb-1 flex items-center gap-1 leading-5 ${post.comments.length > 0 ? `border-b pb-1 ${isDark ? 'border-white/5' : 'border-gray-200/50'}` : ''}`}>
                                      <IconHeart className="w-3 h-3 stroke-current" /> 
                                      {post.likes.join(', ')}
                                   </div>
                                )}
                                
                                {post.comments.map((comment, cIdx) => (
                                   <div key={cIdx} className={`leading-5 mt-0.5 ${textPrimary}`}>
                                      <span className={`${wcBlueText} font-medium`}>{comment.user}:</span> {comment.text}
                                   </div>
                                ))}
                            </div>
                        )}
                     </div>
                 </div>
             ))}
          </div>

          {/* Expanded Cover Modal */}
          {isCoverExpanded && (
            <div 
              className="fixed inset-0 z-[100] bg-black flex flex-col justify-center items-center animate-fade-in"
              onClick={() => setIsCoverExpanded(false)}
            >
                <img 
                    src={config.momentsCover || config.wallpaper || 'https://i.postimg.cc/sxDg8hrz/dmitrii-shirnin-mq-EKg5D6ln-E-unsplash.jpg'} 
                    className="w-full h-auto max-h-screen object-contain"
                    alt="cover"
                />
                <div 
                    className="absolute bottom-8 right-6 bg-[#2C2C2C]/80 backdrop-blur-md px-4 py-2 rounded text-white text-sm font-medium cursor-pointer border border-white/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        coverInputRef.current?.click();
                    }}
                >
                    更换封面
                </div>
                <input 
                    type="file" 
                    ref={coverInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    onClick={(e) => e.stopPropagation()} 
                />
            </div>
          )}
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

  const renderTabBar = () => (
    <div className={`h-16 border-t shrink-0 flex justify-around items-center px-2 pb-2 ${isDark ? 'glass-panel border-white/10' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
      <button 
        onClick={() => navigate('/chat')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'chats' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconChat className="w-6 h-6" />
        <span className="text-[10px]">聊天</span>
      </button>
      <button 
        onClick={() => navigate('/chat/contacts')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'contacts' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconUsers className="w-6 h-6" />
        <span className="text-[10px]">通讯录</span>
      </button>
      <button 
        onClick={() => navigate('/chat/moments')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'moments' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconMoments className="w-6 h-6" />
        <span className="text-[10px]">动态</span>
      </button>
      <button 
        onClick={() => navigate('/chat/me')}
        className={`flex flex-col items-center gap-1 p-2 ${activeTab === 'me' ? 'text-green-500' : (isDark ? 'text-white/40' : 'text-slate-400')}`}
      >
        <IconUser className="w-6 h-6" />
        <span className="text-[10px]">我</span>
      </button>
    </div>
  );

  const renderChatRoom = () => {
    const contact = contacts.find(c => c.id === activeContactId);
    if (!contact) return (
       <div className={`flex flex-col items-center justify-center h-full ${textPrimary}`}>
         <p>联系人不存在</p>
         <button onClick={() => navigate('/chat')} className="mt-4 text-blue-500">返回</button>
       </div>
    );
    
    let activeConv = conversations.find(c => c.contactId === activeContactId);
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
        <div className={`h-[50px] pt-[env(safe-area-inset-top)] px-4 flex items-center justify-between shrink-0 border-b z-10 ${wcHeaderBg}`}>
          <button onClick={() => navigate('/chat')} className={`p-2 -ml-2 ${textPrimary}`}>
            <IconChevronLeft className="w-6 h-6" />
          </button>
          <span className={`font-medium text-[17px] ${textPrimary}`}>{contact?.name || '未知'}</span>
          <button className={`p-2 -mr-2 ${textPrimary}`}>
            <IconMoreHorizontal className="w-6 h-6" />
          </button>
        </div>

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

  if (isChatRoom) return renderChatRoom();
  if (isWallet) return renderWallet();
  if (isPersonas) return renderPersonaSelector();

  return (
    <div className={`h-full flex flex-col relative ${bgMain} ${textPrimary}`}>
      {/* Hide standard header for Moments to allow full cover image */}
      {activeTab !== 'moments' && (
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
      )}

      {activeTab === 'chats' && renderChatList()}
      {activeTab === 'contacts' && renderContactsList()}
      {activeTab === 'moments' && renderMoments()}
      {activeTab === 'me' && renderMe()}
      {renderTabBar()}
    </div>
  );
};

export default ChatApp;
