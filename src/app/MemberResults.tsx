// On Менин күнүм: a member's latest score next to their house's, a tap from
// their full results (#/house/me, MyResults.tsx). The database only gives a
// member their own house (supabase/members-2026-11.sql).
import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useMemberData } from './memberData';
import { calculateHouseRating, calculateMemberScore } from '../utils/scoring';
import { t } from '../i18n';
import type { MemberLink } from '../services/memberService';

const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** On the first page: the member's latest score next to the house's, and the way to the house. */
export const MemberSummary: React.FC<{ link: MemberLink }> = ({ link }) => {
    const { data } = useMemberData();
    const row = useMemo(() => {
        if (!data) return null;
        for (let i = data.weeks.length - 1; i >= 0; i--) {
            const w = data.weeks[i];
            const team = w.teams.find(tm => tm.id === link.houseId);
            const me = team?.members.find(m => m.id === link.memberId);
            if (team && me) return { week: w, me: me.excused ? null : calculateMemberScore(me), house: team.submitted ? calculateHouseRating(team) : null };
        }
        return null;
    }, [data, link]);
    return (
        <button onClick={() => { window.location.hash = '#/house/me'; }} className="figs w-full items-center" style={{ gridTemplateColumns: '1fr 1fr auto', borderBottom: '1px solid var(--border)' }}>
            <span className="fig" data-first>
                <span className="block font-display tabular text-[2.4rem] sm:text-[2.9rem] leading-none" style={{ color: 'var(--gold)' }}>{row?.me == null ? '—' : fmt(row.me)}</span>
                <span className="block text-[0.66rem] tracking-[0.16em] uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{t('Менин упайым')}</span>
            </span>
            <span className="fig">
                <span className="block font-display tabular text-[2.4rem] sm:text-[2.9rem] leading-none" style={{ color: 'var(--text-primary)' }}>{row?.house == null ? '—' : fmt(row.house)}</span>
                <span className="block text-[0.66rem] tracking-[0.16em] uppercase mt-2" style={{ color: 'var(--text-muted)' }}>{link.houseName}</span>
            </span>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--gold)' }} />
        </button>
    );
};
