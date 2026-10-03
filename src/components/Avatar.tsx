import React, { useState } from 'react';
import { COLORS } from '../utils/scoring';
import type { Role } from '../types';

interface AvatarProps {
    name: string;
    role: Role;
    photoUrl?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const SIZE: Record<NonNullable<AvatarProps['size']>, { box: string; font: string }> = {
    sm: { box: '2.25rem', font: '0.78rem' },
    md: { box: '2.75rem', font: '0.9rem' },
    lg: { box: '3.5rem', font: '1.1rem' },
    xl: { box: '4.5rem', font: '1.4rem' },
    '2xl': { box: '6.5rem', font: '2rem' }
};

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();

// Photo when we have one, a colored initials circle when we don't (or when
// the photo fails to load) — so the roster looks finished either way.
export const Avatar: React.FC<AvatarProps> = ({ name, role, photoUrl, size = 'md' }) => {
    const [failed, setFailed] = useState(false);
    const s = SIZE[size];
    const box: React.CSSProperties = { width: s.box, height: s.box, boxShadow: '0 0 0 2px var(--surface)' };

    if (photoUrl && !failed) {
        return (
            <img
                src={photoUrl}
                alt={name}
                loading="lazy"
                onError={() => setFailed(true)}
                className="rounded-full object-cover flex-shrink-0"
                style={box}
            />
        );
    }

    return (
        <div
            className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 font-display"
            style={{ ...box, fontSize: s.font, background: `linear-gradient(145deg, color-mix(in oklab, ${COLORS[role]} 78%, #fff), ${COLORS[role]})`, letterSpacing: '0.02em' }}
            title={name}
            aria-hidden="true"
        >
            {initials(name)}
        </div>
    );
};
