/**
 * @file AIChatInterface.tsx
 * @description مكون واجهة الدردشة الذكية لتطبيق Car History
 * يوفر واجهة دردشة تفاعلية مع مساعد ذكي متقدم
 * يتضمن إدارة المحادثات والنسخ وتصغير النافذة
 */

// استيراد المكتبات والمكونات اللازمة
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronLeft,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/aiService';
import { useAuthStore } from '@/store/authStore';

/**
 * @interface Message
 * @description بنية بيانات الرسالة
 * @property {string} id - معرف فريد للرسالة
 * @property {'user' | 'ai'} type - نوع الرسالة (مستخدم أو ذكاء اصطناعي)
 * @property {string} content - محتوى الرسالة
 * @property {Date} timestamp - وقت إرسال الرسالة
 */
interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

/**
 * @interface Conversation
 * @description بنية بيانات المحادثة
 * @property {string} id - معرف فريد للمحادثة
 * @property {string} title - عنوان المحادثة
 * @property {Message[]} messages - قائمة الرسائل في المحادثة
 * @property {Date} createdAt - وقت إنشاء المحادثة
 */
interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

/**
 * @function AIChatInterface
 * @description واجهة الدردشة الذكية الرئيسية
 * يدير المحادثات والرسائل وتفاعلات المستخدم
 * @returns {JSX.Element} واجهة الدردشة المعروضة
 */
export default function AIChatInterface() {
  // إدارة حالة الواجهة
  const [isOpen, setIsOpen] = useState(false); // حالة فتح النافذة
  const [isMinimized, setIsMinimized] = useState(false); // حالة التصغير
  const [showSidebar, setShowSidebar] = useState(true); // حالة عرض الشريط الجانبي
  
  // إدارة المحادثات
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1', // معرف المحادثة
      title: 'محادثة أولى', // عنوان المحادثة
      messages: [
        {
          id: '1', // معرف الرسالة
          type: 'ai', // نوع الرسالة
          content: 'مرحباً! أنا مساعدك الذكي في Car History. كيف يمكنني مساعدتك اليوم؟', // محتوى الرسالة
          timestamp: new Date(), // وقت الإرسال
        },
      ],
      createdAt: new Date(), // وقت الإنشاء
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const { isAuthenticated } = useAuthStore();

  // حفظ محادثات الضيوف في sessionStorage
  useEffect(() => {
    const isGuest = !isAuthenticated; // استخدام حالة المصادقة من الستور
    if (isGuest && conversations.length > 0) {
      sessionStorage.setItem('guest_chat_history', JSON.stringify(conversations));
    }
  }, [conversations, isAuthenticated]);

  // جلب المحادثات عند الفتح أو عند تغيير حالة المصادقة
  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, isAuthenticated]);

  const loadSessions = async () => {
    try {
      const result = await aiService.getSessions();
      if (result.success) {
        if (result.data?.sessions && result.data.sessions.length > 0) {
          const formattedSessions: Conversation[] = result.data.sessions.map((s: any) => ({
            id: s.id, // استخدام id بدلاً من session_id
            title: s.title || `محادثة ${s.id.substring(0, 8)}`,
            messages: [],
            createdAt: new Date(s.created_at),
          }));
          setConversations(formattedSessions);
          // جلب رسائل المحادثة الأولى تلقائياً عند الفتح
          const firstId = formattedSessions[0].id;
          setCurrentConversationId(firstId);
          await loadMessages(firstId);
        } else {
          // جلب محادثات الضيف من التخزين المؤقت إذا لم يوجد جلسات في الباك إند
          const guestData = sessionStorage.getItem('guest_chat_history');
          if (guestData) {
            const parsed = JSON.parse(guestData);
            const formatted = parsed.map((c: any) => ({
              ...c,
              createdAt: new Date(c.createdAt),
              messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
            }));
            setConversations(formatted);
            if (formatted.length > 0) {
              setCurrentConversationId(formatted[0].id);
            }
          } else {
            // لا توجد محادثات - إنشاء محادثة ترحيبية تلقائياً
            const welcomeConv: Conversation = {
              id: 'welcome',
              title: 'محادثة جديدة',
              messages: [{ id: 'w1', type: 'ai', content: 'مرحباً! أنا مساعدك الذكي في Car History. كيف يمكنني مساعدتك اليوم؟', timestamp: new Date() }],
              createdAt: new Date(),
            };
            setConversations([welcomeConv]);
            setCurrentConversationId('welcome');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const result = await aiService.getSessionMessages(sessionId);
      if (result.success) {
        // الباك إند يُرجع { data: { messages: [...] } }
        const rawMessages = result.data?.messages || result.data || [];
        const formattedMessages: Message[] = rawMessages.map((m: any) => ({
          id: m.id?.toString() || Date.now().toString(),
          // التوافق مع role أو message_type
          type: (m.role === 'user' || m.message_type === 'user') ? 'user' : 'ai',
          content: m.content,
          timestamp: new Date(m.timestamp || m.created_at || Date.now()),
        }));
        setConversations(prev => prev.map(c => 
          c.id === sessionId ? { ...c, messages: formattedMessages } : c
        ));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  useEffect(() => {
    if (currentConversationId) {
      const conv = conversations.find(c => c.id === currentConversationId);
      if (conv && conv.messages.length === 0) {
        loadMessages(currentConversationId);
      }
    }
  }, [currentConversationId]);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const tempId = Date.now().toString();
    const userMessage: Message = {
      id: tempId,
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    if (!currentConversationId) {
      const newConv: Conversation = {
        id: tempId,
        title: inputValue.length > 30 ? inputValue.substring(0, 30) + '...' : inputValue,
        messages: [userMessage],
        createdAt: new Date(),
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(tempId);
    } else {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === currentConversationId) {
            // تحديث العنوان إذا كانت هذه أول رسالة للمستخدم
            const isFirstUserMessage = conv.messages.filter(m => m.type === 'user').length === 0;
            return { 
              ...conv, 
              messages: [...conv.messages, userMessage],
              title: isFirstUserMessage ? (inputValue.length > 30 ? inputValue.substring(0, 30) + '...' : inputValue) : conv.title
            };
          }
          return conv;
        })
      );
    }
    
    const messageToSend = inputValue;
    const sessionToUse = currentConversationId?.startsWith('temp_') ? null : currentConversationId;
    setInputValue('');
    setIsLoading(true);

    try {
      const result = await aiService.sendMessage(messageToSend, sessionToUse);
      if (result.success) {
        const aiMessage: Message = {
          id: result.data.message_id?.toString() || (Date.now() + 1).toString(),
          type: 'ai',
          content: result.data.response,
          timestamp: new Date(),
        };

        // تحديث معرف الجلسة إذا كانت جديدة أو مؤقتة
        if ((!currentConversationId || currentConversationId === tempId) && result.data.session_id) {
          const realSessionId = result.data.session_id;
          setCurrentConversationId(realSessionId);
          setConversations(prev => prev.map(c => 
            c.id === tempId ? { ...c, id: realSessionId, messages: [...c.messages, aiMessage] } : c
          ));
          loadSessions(); // تحديث القائمة كاملة من الباك إند
        } else {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === currentConversationId
                ? { ...conv, messages: [...conv.messages, aiMessage] }
                : conv
            )
          );
        }
      } else {
        toast.error('نعتذر، واجه المساعد الذكي صعوبة في معالجة طلبك حالياً. يرجى المحاولة مرة أخرى أو صياغة سؤالك بشكل مختلف.');
      }
    } catch (err) {
      toast.error('تعذر الاتصال بخادم المساعد الذكي. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newId = `temp_${Date.now()}`;
    const newConversation: Conversation = {
      id: newId,
      title: `محادثة جديدة - ${new Date().toLocaleDateString('ar-SA')}`,
      messages: [
        {
          id: '1',
          type: 'ai',
          content: 'مرحباً! أنا مساعدك الذكي في Car History. كيف يمكنني مساعدتك اليوم؟',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      // إذا كانت المحادثة محلية، نقوم بحذفها مباشرة
      const isLocalOnly = id.startsWith('temp_') || id === 'welcome' || id === '1' || !isAuthenticated;
      
      if (!isLocalOnly) {
        const result = await aiService.deleteSession(id);
        if (!result.success) {
          toast.error('نعتذر، لم نتمكن من حذف هذه المحادثة من الخادم حالياً. يرجى المحاولة مرة أخرى لاحقاً.');
          return;
        }
      }

      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        // تحديث التخزين المؤقت للضيوف
        if (!isAuthenticated) {
          sessionStorage.setItem('guest_chat_history', JSON.stringify(updated));
        }
        return updated;
      });

      if (currentConversationId === id) {
        const nextConv = conversations.filter(c => c.id !== id)[0];
        setCurrentConversationId(nextConv ? nextConv.id : null);
      }
      toast.success('تم حذف المحادثة بنجاح لتنظيم قائمة محادثاتك.');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('حدث خطأ غير متوقع أثناء محاولة حذف المحادثة. يرجى التحقق من اتصالك بالإنترنت.');
    }
  };

  const handleCopyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('تم نسخ نص الرسالة إلى الحافظة بنجاح.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  const formatConversationTime = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    } else {
      return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <>
      {/* Chat Button - Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#0066cc] to-[#004da6] shadow-[0_8px_32px_-8px_rgba(0,102,204,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(0,102,204,0.6)] flex items-center justify-center text-white transition-all group"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-[#0066cc] opacity-20"
            />
            <MessageCircle size={24} className="relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`fixed z-50 ${
              isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 flex'
            } ${!isMinimized && showSidebar ? 'w-[900px] h-[520px]' : !isMinimized ? 'w-96 h-[520px]' : ''} rounded-2xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/[0.12]`}
          >
            {/* Sidebar - Conversations History */}
            {!isMinimized && showSidebar && (
              <div className="w-64 bg-gradient-to-b from-[#001a3d]/95 to-[#0a1628]/95 border-l border-white/[0.08] flex flex-col overflow-hidden">
                {/* Sidebar Header */}
                <div className="px-4 py-4 border-b border-white/[0.08]">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleNewConversation}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0066cc] to-[#004da6] text-white px-4 py-2.5 rounded-xl font-semibold hover:from-[#0077ee] hover:to-[#0066cc] transition-all shadow-lg text-sm"
                  >
                    <Plus size={18} />
                    محادثة جديدة
                  </motion.button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto space-y-2 p-3">
                  {conversations.map((conv) => (
                    <motion.button
                      key={conv.id}
                      whileHover={{ x: -4 }}
                      onClick={() => setCurrentConversationId(conv.id)}
                      className={`w-full text-right px-3 py-3 rounded-xl transition-all group relative ${
                        currentConversationId === conv.id
                          ? 'bg-white/[0.12] border border-white/[0.2]'
                          : 'hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {conv.title}
                          </p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <Clock size={12} />
                            {formatConversationTime(conv.createdAt)}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Header - Premium Glassmorphism */}
              <div className="relative bg-gradient-to-r from-[#001a3d] via-[#002f6c] to-[#001a3d] px-6 py-4 border-b border-white/[0.08]">
                {/* Background decorative elements */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px',
                  }}
                />

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0066cc] to-[#004da6] flex items-center justify-center shadow-lg">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">مساعد Car History الذكي</h3>
                      <p className="text-[11px] text-slate-400">متاح 24/7</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isMinimized && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors text-slate-300 hover:text-white"
                        title={showSidebar ? 'إخفاء السجل' : 'عرض السجل'}
                      >
                        <ChevronLeft size={18} className={showSidebar ? '' : 'rotate-180'} />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors text-slate-300 hover:text-white"
                    >
                      {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/[0.1] rounded-lg transition-colors text-slate-300 hover:text-white"
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              {!isMinimized && (
                <>
                  <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0a1628]/50 to-[#001a3d]/30 p-4 space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs group ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-[#0066cc] to-[#004da6] text-white rounded-2xl rounded-tr-none'
                              : 'bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-slate-100 rounded-2xl rounded-tl-none'
                          } px-4 py-3 shadow-lg`}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="text-[10px] opacity-70">{formatTime(message.timestamp)}</span>
                            {message.type === 'ai' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/[0.1] rounded transition-colors"
                              >
                                {copiedId === message.id ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">جاري الكتابة...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <form
                    onSubmit={handleSendMessage}
                    className="bg-gradient-to-t from-[#001a3d]/80 to-[#0a1628]/50 border-t border-white/[0.08] p-4 backdrop-blur-md"
                  >
                    <div className="flex items-end gap-2">
                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder="اكتب سؤالك هنا..."
                        className="flex-1 bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc]/40 focus:border-[#0066cc]/40 transition-all text-sm resize-none min-h-[46px] max-h-[150px] overflow-y-auto"
                      />
                      <motion.button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-r from-[#0066cc] to-[#004da6] text-white p-3 rounded-xl hover:from-[#0077ee] hover:to-[#0066cc] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[0_8px_24px_-6px_rgba(0,102,204,0.4)]"
                      >
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Send size={18} />
                        )}
                      </motion.button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
