import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Sparkles, ThumbsUp, ThumbsDown, Copy, Check, ExternalLink, MapPin, AlertTriangle, ArrowRight } from 'lucide-react';

export default function AIMessage({ message, accentColor = 'emerald', onFeedback }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(null);

  const isUser = message.role === 'user';

  const userBgClass = {
    emerald: 'bg-emerald-600 text-white',
    brand: 'bg-cyan-600 text-white',
    indigo: 'bg-indigo-600 text-white'
  }[accentColor] || 'bg-emerald-600 text-white';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = (value) => {
    setRating(value);
    if (onFeedback && message.id) {
      onFeedback(message.id, value);
    }
  };

  // Helper to parse markdown headings, bold text, and CGN badges cleanly
  const renderFormattedMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      let trimmed = line.trim();

      // Heading 3 ###
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="font-bold text-sm sm:text-base text-slate-100 mt-3 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-cyan-400 rounded-full inline-block"></span>
            {trimmed.replace(/^###\s+/, '')}
          </h3>
        );
      }

      // Heading 2 ##
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="font-extrabold text-base text-slate-50 mt-3.5 mb-2 border-b border-slate-700/60 pb-1">
            {trimmed.replace(/^##\s+/, '')}
          </h2>
        );
      }

      // Bullet lists (- or •)
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ');
      if (isBullet) {
        trimmed = trimmed.replace(/^[-•]\s+/, '');
      }

      // Parse inline bold and CGN-XXXXX buttons
      const cgnRegex = /(#?CGN-\d{3,6})/gi;
      const parts = trimmed.split(cgnRegex);

      const parsedLine = parts.map((part, pIdx) => {
        if (part.match(cgnRegex)) {
          const numId = parseInt(part.replace(/[^0-9]/g, ''), 10);
          return (
            <button
              key={pIdx}
              onClick={() => navigate(`/complaints/${numId}`)}
              className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/70 hover:bg-cyan-900 transition shadow-sm"
              title={`View Complaint details ${part}`}
            >
              <span>{part.startsWith('#') ? part : `#${part}`}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-200 my-1 leading-relaxed">
            {parsedLine}
          </li>
        );
      }

      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="mb-1.5 last:mb-0 leading-relaxed text-slate-200">
          {parsedLine}
        </p>
      );
    });
  };

  const cards = message.cards || [];

  return (
    <div className={`flex gap-3 my-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar Icon */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs shadow-md ${
          isUser
            ? 'bg-slate-700 text-slate-200'
            : 'bg-slate-800 text-cyan-400 border border-cyan-500/40'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 animate-pulse" />}
      </div>

      {/* Bubble Container */}
      <div className={`group relative max-w-[88%] sm:max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm shadow-md ${
            isUser
              ? `${userBgClass} rounded-tr-xs`
              : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-tl-xs backdrop-blur-sm'
          }`}
        >
          {renderFormattedMarkdown(message.content)}

          {/* Interactive Complaint Cards */}
          {cards.length > 0 && (
            <div className="mt-3.5 space-y-2.5">
              {cards.map((c, idx) => (
                <div
                  key={c.id || idx}
                  className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 hover:border-cyan-700/60 transition shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-extrabold text-cyan-300 text-xs tracking-wide">{c.id}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        c.priority === 'high' || c.priority === 'urgent' || c.priority === 'critical'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {c.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-cyan-200 capitalize">
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-100 text-xs sm:text-sm mb-1">{c.title}</h4>
                  
                  {c.address && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
                      <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}

                  {c.isOverdue && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-rose-400 mb-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>SLA Breached / Overdue</span>
                    </div>
                  )}

                  {/* Card Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => navigate(`/complaints/${c.rawId}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-200 border border-cyan-700/50 rounded-lg text-[11px] font-semibold transition"
                    >
                      <span>View Complaint</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                    {c.location && (
                      <button
                        onClick={() => navigate(`/map?lat=${c.location.lat}&lng=${c.location.lng}`)}
                        className="flex items-center justify-center gap-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition"
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>Map</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Footer / Actions for Assistant */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-slate-400">
            <span>{new Date(message.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

            <button
              onClick={handleCopy}
              className="hover:text-slate-200 p-0.5 rounded transition"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            <button
              onClick={() => handleRate('helpful')}
              className={`p-0.5 rounded hover:text-emerald-400 transition ${rating === 'helpful' ? 'text-emerald-400' : ''}`}
              title="Helpful"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleRate('not_helpful')}
              className={`p-0.5 rounded hover:text-red-400 transition ${rating === 'not_helpful' ? 'text-red-400' : ''}`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
