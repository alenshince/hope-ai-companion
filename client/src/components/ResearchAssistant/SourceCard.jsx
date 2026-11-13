import React from 'react';
import { ExternalLink, Globe, BookOpen } from 'lucide-react';

export default function SourceCard({ source, index }) {
  if (!source) return null;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-3 rounded-xl bg-white border border-slate-200/90 hover:border-hope-300 hover:shadow-md hover:shadow-hope-500/10 transition-all text-left"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-5 h-5 rounded-md bg-hope-50 text-hope-700 text-[11px] font-bold flex items-center justify-center shrink-0 border border-hope-200">
            {index + 1}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 truncate flex items-center gap-1">
            <Globe className="w-3 h-3 text-slate-400" />
            {source.domain || 'web source'}
          </span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-hope-600 transition-colors shrink-0" />
      </div>

      <h4 className="text-xs font-semibold text-slate-800 group-hover:text-hope-700 line-clamp-1 mb-1 transition-colors">
        {source.title}
      </h4>

      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
        {source.snippet}
      </p>
    </a>
  );
}

