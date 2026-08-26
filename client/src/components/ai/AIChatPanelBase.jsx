import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Send,
  Minimize2,
  Maximize2,
  History,
  Plus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import AIMessage from './AIMessage';
import AITypingIndicator from './AITypingIndicator';
import AIQuickActions from './AIQuickActions';
import AIConversationList from './AIConversationList';
import * as aiApi from '../../services/ai';

export default function AIChatPanelBase({
  isOpen,
  onClose,
  title = 'AI Copilot',
  subtitle = 'Operational Intelligence Assistant',
  persona = 'citizen', // 'citizen' | 'officer' | 'admin'
  accentColor = 'cyan', // 'cyan' | 'emerald' | 'amber'
  complaintId = null,
  sendMessageFn = null,
  customQuickActions = null,
  fullScreen = false
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(fullScreen);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const lastSentTextRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const data = await aiApi.getConversations({ limit: 15 });
      setConversations(data.conversations || []);
    } catch (err) {
      console.warn('Could not load chat conversations history:', err.message);
    }
  };

  const loadConversationMessages = async (convId) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await aiApi.getConversation(convId);
      setActiveConvId(convId);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
      setErrorMessage('Could not load chat history for this session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setInputMessage('');
    setErrorMessage(null);
    lastSentTextRef.current = text;

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
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
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        className={`fixed z-50 flex flex-col bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl ${
          expanded
            ? 'inset-3 sm:inset-6 md:inset-10'
            : 'bottom-4 right-4 w-[calc(100vw-2rem)] sm:w-[460px] h-[640px] max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-100">{title}</h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  LIVE DB
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-[280px]">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition ${
                historyOpen ? 'bg-slate-800 text-cyan-400' : ''
              }`}
              title="Chat History"
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

        {/* Main Content Area */}
        <div className="relative flex-1 flex overflow-hidden">
          {/* History Sidebar/Drawer */}
          {historyOpen && (
            <div className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-md p-3 flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Chat Sessions</span>
                <button
                  onClick={() => setHistoryOpen(false)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Back to Chat
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
                      className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-rose-900/60 hover:bg-rose-800 border border-rose-700/60 rounded text-[11px] font-medium text-rose-100 transition cursor-pointer"
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

        {/* Quick Action Chips Bar */}
        <AIQuickActions
          persona={persona}
          onSelect={handleQuickAction}
          customActions={customQuickActions}
          loading={loading}
        />

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
              placeholder="Ask anything (e.g. priority complaints, SLA alerts, performance)..."
              disabled={loading}
              className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white rounded-xl shadow-md transition flex items-center justify-center cursor-pointer"
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
