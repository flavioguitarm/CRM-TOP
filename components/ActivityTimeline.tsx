
import React, { useState } from 'react';
import {
  MessageSquare, Phone, Mail, Users, ArrowRight, DollarSign,
  FileText, Send
} from 'lucide-react';
import { Activity, ProjectActivity, User } from '../types';

type Entry = Activity | ProjectActivity;

interface Props {
  entries: Entry[];
  users?: User[];
  onAddNote?: (text: string, type?: Activity['type']) => void;
  isReadOnly?: boolean;
  maxVisible?: number;
}

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  note:    { icon: <MessageSquare size={14} />, label: 'Nota',         color: 'bg-slate-100 text-slate-600' },
  call:    { icon: <Phone size={14} />,         label: 'Ligação',      color: 'bg-amber-100 text-amber-700' },
  email:   { icon: <Mail size={14} />,          label: 'E-mail',       color: 'bg-blue-100 text-blue-700' },
  meeting: { icon: <Users size={14} />,         label: 'Reunião',      color: 'bg-violet-100 text-violet-700' },
  move:    { icon: <ArrowRight size={14} />,    label: 'Movimentação', color: 'bg-sky-100 text-sky-700' },
  sale:    { icon: <DollarSign size={14} />,    label: 'Venda',        color: 'bg-emerald-100 text-emerald-700' },
};

function meta(type: string) {
  return TYPE_META[type] ?? TYPE_META['note'];
}

function formatTimestamp(ts: string): string {
  if (!ts) return '';
  // ISO → localeDateString
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  } catch {/* ignore */}
  return ts;
}

const ActivityTimeline: React.FC<Props> = ({
  entries,
  users = [],
  onAddNote,
  isReadOnly = false,
  maxVisible,
}) => {
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<Activity['type']>('note');
  const [showAll, setShowAll] = useState(false);

  const sorted = [...entries].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const visible = maxVisible && !showAll ? sorted.slice(0, maxVisible) : sorted;
  const hasMore = maxVisible ? sorted.length > maxVisible : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !onAddNote) return;
    onAddNote(noteText.trim(), noteType);
    setNoteText('');
  };

  return (
    <div className="space-y-4">
      {/* Entrada de nova nota */}
      {!isReadOnly && onAddNote && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-[1.5rem] border border-slate-200 p-5 space-y-3">
          <textarea
            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[80px] shadow-inner resize-none"
            placeholder="Registrar uma nota, ligação, e-mail..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <select
              className="text-[10px] font-black uppercase border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
              value={noteType}
              onChange={e => setNoteType(e.target.value as Activity['type'])}
            >
              <option value="note">Nota Interna</option>
              <option value="call">Ligação</option>
              <option value="email">E-mail</option>
              <option value="meeting">Reunião</option>
            </select>
            <button
              type="submit"
              disabled={!noteText.trim()}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 disabled:opacity-40"
            >
              <Send size={13} /> Registrar
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {visible.length === 0 ? (
        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-8">
          Nenhuma atividade registrada.
        </p>
      ) : (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100" />

          <div className="space-y-4">
            {visible.map((entry, idx) => {
              const m = meta(entry.type);
              const user = 'userId' in entry && entry.userId
                ? users.find(u => u.id === entry.userId)
                : undefined;

              return (
                <div key={entry.id} className="relative flex gap-4 pl-12">
                  {/* Bullet */}
                  <div className={`absolute left-2.5 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10 ${m.color}`}>
                    {m.icon}
                  </div>

                  <div className="flex-1 bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm hover:border-amber-200 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${m.color}`}>
                          {m.label}
                        </span>
                        {user && (
                          <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                            <FileText size={10} className="text-slate-400" />
                            {user.name}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap shrink-0">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {entry.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ver mais / menos */}
      {hasMore && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full text-center text-[10px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-widest py-2"
        >
          {showAll ? 'Mostrar menos' : `Ver todas (${sorted.length})`}
        </button>
      )}
    </div>
  );
};

export default ActivityTimeline;
