// #/jamaat — the whole jamaat, for everyone who belongs to it: what we did
// together this season, the week's pulse, the race of the houses. Captains
// and the admin see it from the results; a member gets it from
// jamaat_rows() (other houses without names — supabase/jamaat-view-2026-11.sql).
import React, { useContext, useEffect, useMemo, useState } from 'react';
import type { Theme } from '../theme';
import type { DataFile } from '../types';
import { t } from '../i18n';
import { AppFrame, Waiting } from './AppFrame';
import { AppContext } from './context';
import { useSelf } from './self';
import { useMemberData } from './memberData';
import { fetchJamaatFile } from '../services/dataService';
import { signInWithGoogle } from '../services/memberService';
import { JamaatStory } from '../components/JamaatStory';
import { buildInsights } from '../utils/insights';
import { defaultSeasonId, seasonView } from '../utils/seasons';

export const JamaatPage: React.FC<{ theme: Theme; onToggleTheme: () => void }> = ({ theme, onToggleTheme }) => {
    const ctx = useContext(AppContext);
    const { self } = useSelf();
    const staff = ctx.signedIn && (ctx.role === 'admin' || ctx.role === 'leader');
    const member = !ctx.signedIn && ctx.member?.status === 'linked';
    const full = useMemberData();
    const [mine, setMine] = useState<DataFile | null | undefined>(undefined);
    useEffect(() => { if (member) fetchJamaatFile().then(setMine).catch(() => setMine(null)); }, [member]);
    const source = staff ? full.data : member ? mine : null;

    const view = useMemo(() => {
        if (!source) return null;
        const sid = defaultSeasonId(source);
        const d = sid !== null ? seasonView(source, sid) : source;
        return { d, ins: buildInsights(d), name: source.seasons.find(s => s.id === sid)?.name ?? '' };
    }, [source]);

    return (
        <AppFrame page="today" title={t('Жамаат')} kicker={t('Бирге')} theme={theme} onToggleTheme={onToggleTheme}>
            {!staff && !member ? (
                <div className="max-w-[36rem] mx-auto text-center pt-8">
                    <p className="text-[1rem] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t('Жамааттын жыйынтыгын көрүү үчүн Google аккаунтуңуз менен кириңиз.')}</p>
                    <button className="btn btn-primary mt-6" onClick={() => { signInWithGoogle('#/jamaat').catch(() => undefined); }}>{t('Google менен кирүү')}</button>
                </div>
            ) : member && mine === null ? (
                <p className="max-w-[34rem] mx-auto text-center pt-10 text-[0.95rem]" style={{ color: 'var(--text-muted)' }}>{t('Жамааттын жыйынтыгы мүчөлөр үчүн азырынча ачыла элек. Админ supabase/jamaat-view-2026-11.sql файлын иштетиши керек.')}</p>
            ) : !view ? <Waiting /> : (
                <div className="max-w-[60rem] mx-auto pt-2">
                    <JamaatStory data={view.d} insights={view.ins} seasonName={view.name} ownHouseId={self?.houseId ?? ctx.houseId ?? null} />
                    {member && <p className="text-[0.78rem] italic text-center mt-10" style={{ color: 'var(--text-muted)' }}>{t('Башка үйлөрдүн сандары аты-жөнсүз көрсөтүлөт.')}</p>}
                </div>
            )}
        </AppFrame>
    );
};
