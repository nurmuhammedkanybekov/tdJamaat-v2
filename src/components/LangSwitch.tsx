// The language: Кыргызча, Русский, English. A small button with the current
// one; a tap opens the three.
import React, { useEffect, useRef, useState } from 'react';
import { LANGS, getLang, setLang } from '../i18n';

export const LangSwitch: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className = '', style }) => {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLSpanElement>(null);
    const now = LANGS.find(l => l.id === getLang()) ?? LANGS[0];
    useEffect(() => {
        if (!open) return;
        const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', off);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
    }, [open]);
    return (
        <span ref={box} className="lang-switch">
            <button type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={now.name} className={className} style={style}>{now.short}</button>
            {open && (
                <span className="lang-menu pop-in" role="menu">
                    {LANGS.map(l => (
                        <button key={l.id} type="button" role="menuitemradio" aria-checked={l.id === now.id} lang={l.id} data-on={l.id === now.id || undefined} onClick={() => { setOpen(false); setLang(l.id); }}>
                            <span className="tabular">{l.short}</span>{l.name}
                        </button>
                    ))}
                </span>
            )}
        </span>
    );
};
