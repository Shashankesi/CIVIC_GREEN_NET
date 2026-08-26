import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, History, Plus, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { aiApi } from '../../services/ai';
import AIMessage from './AIMessage';
import AITypingIndicator from './AITypingIndicator';
import AIQuickActions from './AIQuickActions';
import AIConversationList from './AIConversationList';

export default function AIChatPanelBase({
  persona = 'citizen',
  title = 'Civic GreenNet Assistant',
  subtitle = 'Powered by Groq Intelligence',
  accentColor = 'emerald',
  complaintId = null,
  isOpen = true,
  onClose,
  fullPage = false,
  customQuickActions = null,
  sendMessageFn = null
}) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [expanded, setExpanded] = useState(fullPage);

  const messagesEndRef = useRef(null);
  const lastSentTextRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, persona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversations = async () => {
    try {
      const list = await aiApi.getConversations();
      setConversations(list || []);
      if (list && list.length > 0 && !activeConvId) {
        loadConversationMessages(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    }
  };

  const loadConversationMessages = async (convId) => {
    try {
      setLoading(true);
      setActiveConvId(convId);
      const data = await aiApi.getConversation(convId);
      setMessages(data?.messages || []);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage('Unable to load chat history right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    lastSentTextRef.current = text;
    setInputMessage('');
    setErrorMessage(null);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    // If retrying, remove the previous temp message if it had the same text
    if (textToSend) {
      setMessages((prev) => {
        const filtered = prev.filter((m) => !String(m.id).startsWith('temp-'));
        return [...filtered, tempUserMsg];
      });
    } else {
      setMessages((prev) => [...prev, tempUserMsg]);
    }
    setLoading(true);

    try {
      const sendFn = sendMessageFn || (
        persona === 'officer' 
          ? aiApi.sendOfficerMessage 
          : (persona === 'admin' ? aiApi.sendAdminMessage : aiApi.sendCitizenMessage)
      );

      const response = await sendFn({
        conversationId: activeConvId,
        message: text,
        complaintId
      });

      if (response?.conversationId && response.conversationId !== activeConvId) {
        setActiveConvId(response.conversationId);
        loadConversations();
      }

      if (response?.assistantMessage) {
        setMessages((prev) => [...prev, response.assistantMessage]);
      }
    } catch (err) {
      console.error('AI Chat send error:', err);
      if (err.response?.status === 429) {
        setErrorMessage('The AI assistant is temporarily busy. Please try again shortly.');
      } else if (err.response?.status === 403) {
        setErrorMessage('Access denied: You do not have permission to use this assistant.');
      } else {
        const serverMsg = err.response?.data?.message;
        setErrorMessage(
          serverMsg && !serverMsg.includes('internal') && !serverMsg.includes('stack')
            ? serverMsg
            : 'Sorry, I couldn\'t retrieve your information right now. Please try again in a moment.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      setLoading(true);
      const newConv = await aiApi.createConversation({
        title: 'New Chat Session',
        context: complaintId ? { lastComplaintId: complaintId } : {}
      });
      setActiveConvId(newConv.id);
      setMessages([]);
      setConversations((prev) => [newConv, ...prev]);
      setHistoryOpen(false);
    } catch (err) {
      setErrorMessage('Could not start a new chat session right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await aiApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  const handleRenameConversation = async (convId, newTitle) => {
    try {
      await aiApi.renameConversation(convId, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error('Rename conversation error:', err);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    try {
      await aiApi.sendFeedback({ messageId, rating });
    } catch (err) {
      console.error('Feedback submit error:', err);
    }
  };

  const handleQuickAction = (promptText) => {
    handleSendMessage(promptText);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 flex flex-col bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden ${
          expanded
            ? 'inset-4 sm:inset-6 md:inset-10'
            : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-inner">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-semibold tracking-wider uppercase">
                  Live DB
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ${
                historyOpen ? 'bg-slate-800 text-cyan-400' : ''
              }`}
              title="Conversation history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewConversation}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="New Chat Session"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition hidden sm:flex"
              title={expanded ? 'Minimize' : 'Expand'}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area (Messages or History Drawer) */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* History Sidebar/Drawer */}
          {historyOpen && (
            <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md p-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chat Sessions</span>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <AIConversationList
                conversations={conversations}
                activeConvId={activeConvId}
                onSelect={(id) => {
                  loadConversationMessages(id);
                  setHistoryOpen(false);
                }}
                onDelete={handleDeleteConversation}
                onRename={handleRenameConversation}
                onNew={handleNewConversation}
              />
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-3 shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm mb-1">{title}</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Ask questions about live municipal records, SLAs, and performance. All information is retrieved directly from the verified database.
                </p>

                {/* Quick Action Chips */}
                <AIQuickActions
                  persona={persona}
                  complaintId={complaintId}
                  onSelect={handleQuickAction}
                  customActions={customQuickActions}
                />
              </div>
            )}

            {messages.map((msg, idx) => (
              <AIMessage
                key={msg.id || idx}
                message={msg}
                accentColor={accentColor}
                onFeedback={handleFeedback}
              />
            ))}

            {loading && <AITypingIndicator />}

            {errorMessage && (
              <div className="p-3 my-2 bg-rose-950/80 border border-rose-800/70 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{errorMessage}</p>
                  {lastSentTextRef.current && (
                    <button
                      onClick={() => handleSendMessage(lastSentTextRef.current)}
                      className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700/60 rounded text-[11px] font-medium text-rose-100 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white rounded-xl shadow-md transition flex items-center justify-center"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
