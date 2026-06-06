import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-xl font-black text-rose-900 uppercase tracking-tighter">{title}</h3>
          </div>
          <button onClick={onCancel} className="p-2 text-rose-300 hover:text-rose-900 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <p className="text-sm font-bold text-slate-600 leading-relaxed">{message}</p>
        </div>

        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200 flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
