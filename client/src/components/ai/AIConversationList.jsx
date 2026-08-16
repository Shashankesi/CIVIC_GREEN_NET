import React, { useState } from 'react';
import { Plus, MessageSquare, Trash2, Edit2, Search, X, Check } from 'lucide-react';

export default function AIConversationList({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onClose
}) {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter(c =>
    (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (convId, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(convId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 text-slate-200 w-64 md:w-72">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Chat History</span>
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action & Search */}
      <div className="p-3 space-y-2 border-b border-slate-800/80">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg shadow-sm transition active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat Session</span>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 text-xs text-slate-100 placeholder-slate-400 rounded-md border border-slate-700/60 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Conversation Item List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No chat history found
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === activeId;
            const isEditing = c.id === editingId;

            return (
              <div
                key={c.id}
                onClick={() => !isEditing && onSelectConversation(c.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-cyan-950/70 border border-cyan-700/60 text-cyan-200 font-medium'
                    : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden pr-12">
                  <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === 'Enter' && saveRename(c.id, e)}
                      className="bg-slate-800 text-slate-100 border border-cyan-500 rounded px-1 py-0.5 w-full outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{c.title || 'Conversation'}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {isEditing ? (
                    <button
                      onClick={(e) => saveRename(c.id, e)}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(c, e)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
