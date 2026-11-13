import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isHope = toast.type === 'hope';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              isError
                ? 'bg-rose-50/95 border-rose-200 text-rose-900'
                : isHope
                ? 'bg-gradient-to-r from-hope-50 to-indigo-50 border-hope-200 text-hope-950'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isError && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isHope && <Sparkles className="w-5 h-5 text-hope-600 animate-pulse" />}
              {!isError && !isSuccess && !isHope && <Info className="w-5 h-5 text-slate-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && <p className="font-semibold text-sm">{toast.title}</p>}
              <p className="text-xs opacity-90 leading-relaxed mt-0.5">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-xs font-semibold text-hope-700 hover:text-hope-800 underline inline-flex items-center gap-1"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

