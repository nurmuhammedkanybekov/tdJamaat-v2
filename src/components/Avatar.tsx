import React from 'react';
import { COLORS } from '../utils/scoring';
import type { Role } from '../types';

interface AvatarProps {
    name: string;
    role: Role;
    photoUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg'
};

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();

// Photo when we have one, a colored initials circle when we don't — so the
// roster looks finished even before every member's photo is uploaded.
export const Avatar: React.FC<AvatarProps> = ({ name, role, photoUrl, size = 'md' }) => {
    const sizeClass = SIZE_CLASSES[size];

    if (photoUrl) {
        return (
            <img
                src={photoUrl}
                alt={name}
                className={`${sizeClass} rounded-full object-cover shadow-sm flex-shrink-0`}
                style={{ boxShadow: '0 0 0 2px var(--surface)' }}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0`}
            style={{ backgroundColor: COLORS[role], boxShadow: '0 0 0 2px var(--surface)' }}
            title={name}
        >
            {initials(name)}
        </div>
    );
};
