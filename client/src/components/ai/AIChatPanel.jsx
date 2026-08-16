import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X, History, Plus, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { aiApi } from '../../services/ai';
import AIMessage from './AIMessage';
import AITypingIndicator from './AITypingIndicator';
import AIQuickActions from './AIQuickActions';
import AIConversationList from './AIConversationList';

export default function AIChatPanel({
  persona = 'citizen',
  title = 'Civic GreenNet Assistant',
  subtitle = 'Powered by Groq Intelligence',
  accentColor = 'emerald',
  complaintId = null,
  isOpen = true,
  onClose,
  fullPage = false
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

    setInputMessage('');
    setErrorMessage(null);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const response = await aiApi.sendMessage({
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
      } else {
        setErrorMessage('Sorry, I couldn\'t retrieve your complaint information right now. Please try again in a moment.');
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
        context: complaintId ? { complaintId } : {}
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
      console.error('Feedback error:', err);
    }
  };

  if (!isOpen) return null;

  const headerBgClass = {
    emerald: 'from-emerald-900/95 to-slate-950 border-emerald-700/50',
    brand: 'from-cyan-900/95 to-slate-950 border-cyan-700/50',
    indigo: 'from-indigo-900/95 to-slate-950 border-indigo-700/50'
  }[accentColor] || 'from-emerald-900/95 to-slate-950 border-emerald-700/50';

  const sendBtnBgClass = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    brand: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white'
  }[accentColor] || 'bg-emerald-600 hover:bg-emerald-500 text-white';

  return (
    <div
      style={{ zIndex: 9999 }}
      className={`${
        fullPage
          ? 'w-full h-[calc(100vh-5rem)] rounded-2xl shadow-2xl overflow-hidden border border-slate-800'
          : expanded
          ? 'fixed inset-4 z-[9999] rounded-2xl shadow-2xl overflow-hidden border border-slate-800'
          : 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-[calc(100vw-2rem)] sm:w-[440px] h-[640px] max-h-[85vh] rounded-2xl shadow-2xl border border-slate-800 overflow-hidden'
      } flex flex-col bg-slate-950 font-sans transition-all duration-200`}
    >
      {/* Top Header */}
      <div className={`p-4 bg-gradient-to-r ${headerBgClass} border-b flex items-center justify-between shadow-md relative z-10`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800/90 text-cyan-400 border border-slate-700/60 shadow-inner">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>{title}</span>
              {complaintId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  #CGN-{String(complaintId).padStart(5, '0')}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Chat History"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>

          {!fullPage && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition hidden sm:block"
              title={expanded ? 'Minimize window' : 'Expand window'}
            >
              {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Body Area: Conversation Drawer + Messages */}
      <div className="flex-1 flex overflow-hidden relative">
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 top-0 bottom-0 z-20 shadow-2xl"
            >
              <AIConversationList
                conversations={conversations}
                activeId={activeConvId}
                onSelectConversation={(id) => {
                  loadConversationMessages(id);
                  setHistoryOpen(false);
                }}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={handleRenameConversation}
                onClose={() => setHistoryOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Stream */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-950">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.length === 0 && !loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 shadow-xl">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 text-sm">How can I assist you today?</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Select a suggestion below or ask a question to search live municipal data and SLAs.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <AIMessage
                  key={msg.id || idx}
                  message={msg}
                  accentColor={accentColor}
                  onFeedback={handleFeedback}
                />
              ))
            )}

            {loading && <AITypingIndicator accentColor={accentColor} />}

            {errorMessage && (
              <div className="p-3 my-2 bg-red-950/60 border border-red-800/80 rounded-xl text-red-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  className="px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-[10px] font-semibold text-white transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <AIQuickActions persona={persona} onSelectAction={(prompt) => handleSendMessage(prompt)} />

          {/* Message Input Box */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask ${title}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={loading}
              className="flex-1 bg-slate-800/90 text-slate-100 placeholder-slate-400 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700/70 focus:outline-none focus:border-cyan-500 transition shadow-inner disabled:opacity-50"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className={`p-2.5 rounded-xl font-medium transition shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${sendBtnBgClass}`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
