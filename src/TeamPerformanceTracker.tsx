// TeamPerformanceTracker.tsx — the app shell.
// Loads data, keeps auth/theme state, routes between views (in the URL hash,
// so the phone's back button closes a profile and links can be shared), and
// owns every modal. Each view computes its own layout (src/components/views/*).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataFile, House } from './types';
import { fetchDataFile, fetchHouses } from './services/dataService';
import { getInitialAuthUser, subscribeToAuthChanges, signOut } from './services/authService';
import type { AuthUser } from './services/authService';
import { getStoredTheme, setTheme as persistTheme } from './theme';
import type { Theme } from './theme';
import { useInstallPrompt } from './pwa';
import { buildInsights, weekOf } from './utils/insights';
import { computeAwards } from './utils/badges';
import { defaultSeasonId, seasonView } from './utils/seasons';

import { AppHeader } from './components/AppHeader';
import { ViewNavigator } from './components/ViewNavigator';
import { TABS } from './components/navigation';
import type { ActiveView } from './components/navigation';
import { LoginModal } from './components/LoginModal';
import { DataEntryForm } from './components/DataEntryForm';
import { FormulaSheet } from './components/FormulaDisplay';
import { ProfileSheet } from './components/ProfileSheet';
import { ShareSheet } from './components/ShareSheet';
import type { ShareTarget } from './components/ShareSheet';
import { AdminPanel } from './components/AdminPanel';
import { HistorySheet } from './components/HistorySheet';
import { InstallSheet } from './components/InstallSheet';
import { PrayerSheet } from './components/PrayerSheet';
import { CompareSheet } from './components/CompareSheet';
import type { CompareInit } from './components/CompareSheet';
import { OverviewView, TeamsView, ProgressView, ReportsView, AwardsView } from './components/views';
import { OrnamentDivider, SunMark } from './components/Ornament';
import { LoadingScreen, StateCard } from './components/ui';

type Modal = null | 'login' | 'entry' | 'formula' | 'share' | 'admin' | 'history' | 'install' | 'prayer' | 'compare';

const VIEW_KEYS = TABS.map(t => t.key);
const parseHash = (): { view: ActiveView; memberId: string | null } => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const [path, query] = raw.split('?');
    const view = (VIEW_KEYS as string[]).includes(path) ? (path as ActiveView) : 'overview';
    return { view, memberId: new URLSearchParams(query ?? '').get('m') };
};
const hashFor = (view: ActiveView, memberId?: string | null) => `#/${view}${memberId ? `?m=${memberId}` : ''}`;

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

const TeamPerformanceTracker: React.FC = () => {
    const [allData, setAllData] = useState<DataFile | null>(null);
    const [seasonChoice, setSeasonChoice] = useState<number | null>(null);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [route, setRoute] = useState(parseHash);
    const activeView = route.view;
    // null = "follow the latest" (a new week appears → it's shown automatically)
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [modal, setModal] = useState<Modal>(null);
    // Read by the background refresh, which must not run while someone is
    // typing results (see the live refresh below).
    const modalRef = useRef<Modal>(null);
    useEffect(() => { modalRef.current = modal; }, [modal]);
    const [compareInit, setCompareInit] = useState<CompareInit>({ kind: 'person' });
    const openCompare = (init: CompareInit) => { setCompareInit(init); setModal('compare'); };
    const [dataEntryHouseId, setDataEntryHouseId] = useState<string | null>(null);
    const [shareTarget, setShareTarget] = useState<ShareTarget>({ type: 'week' });
    const pushedProfile = useRef(false);

    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        persistTheme(next);
        setThemeState(next);
    };

    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const { mode: installMode, install } = useInstallPrompt();

    // Keep state in sync with the URL (back/forward buttons, shared links).
    useEffect(() => {
        const onChange = () => {
            const next = parseHash();
            if (!next.memberId) pushedProfile.current = false;
            setRoute(next);
        };
        window.addEventListener('hashchange', onChange);
        window.addEventListener('popstate', onChange);
        return () => {
            window.removeEventListener('hashchange', onChange);
            window.removeEventListener('popstate', onChange);
        };
    }, []);

    const setActiveView = (view: ActiveView) => {
        history.replaceState(null, '', hashFor(view));
        setRoute({ view, memberId: null });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const openProfile = (memberId: string) => {
        history.pushState(null, '', hashFor(activeView, memberId));
        pushedProfile.current = true;
        setRoute({ view: activeView, memberId });
    };
    const closeProfile = () => {
        if (pushedProfile.current) { history.back(); return; }
        history.replaceState(null, '', hashFor(activeView));
        setRoute({ view: activeView, memberId: null });
    };

    // `silent`: refresh in the background (periodic refresh, after a save,
    // after the admin opens a week) without swapping the page for the
    // loading screen — which would also unmount an open form.
    const loadData = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const [df, houseList] = await Promise.all([fetchDataFile(), fetchHouses()]);
            setAllData(df);
            setHouses(houseList);
            setError(null);
        } catch (err) {
            if (!silent) setError('Маалыматтарды жүктөөдө ката кетти. Сураныч, интернет байланышын текшериңиз же кийинчерээк кайра аракет кылыңыз.');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        getInitialAuthUser().then(setAuthUser).catch(() => setAuthUser(null));
        return subscribeToAuthChanges(setAuthUser);
    }, [loadData]);

    // Live: refresh every 2 minutes while the page is visible, and right away
    // when someone comes back to the tab — so a laptop left open in a meeting
    // shows new results as leaders submit them, without a manual reload.
    useEffect(() => {
        let last = Date.now();
        const refresh = () => {
            if (document.visibilityState !== 'visible') return;
            // Not while the data entry form is open: a leader is typing, and
            // fresh numbers would only get in the way. Saving reloads the data;
            // after closing, the next refresh catches up.
            if (modalRef.current === 'entry') return;
            if (Date.now() - last < 30_000) return;
            last = Date.now();
            loadData(true);
        };
        const id = window.setInterval(refresh, 120_000);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('focus', refresh);
        };
    }, [loadData]);

    // The season on screen (default: the running one, or the latest with
    // weeks). Everything below works on that season only, numbered from 1.
    const seasonId = allData ? (seasonChoice !== null && allData.seasons.some(x => x.id === seasonChoice) ? seasonChoice : defaultSeasonId(allData)) : null;
    const data = useMemo(() => (allData && seasonId !== null ? seasonView(allData, seasonId) : null), [allData, seasonId]);
    const insights = useMemo(() => (data ? buildInsights(data) : null), [data]);
    const seasonClosed = !!allData?.seasons.find(x => x.id === seasonId && x.lastWeek !== null);
    const seasonNameForAwards = allData?.seasons.find(x => x.id === seasonId)?.name;
    const awards = useMemo(() => (data && insights ? computeAwards(data, insights, { seasonClosed, seasonName: seasonNameForAwards }) : []), [data, insights, seasonClosed, seasonNameForAwards]);
    const chooseSeason = (id: number) => { setSeasonChoice(id); setSelectedWeek(null); setSelectedPeriod(null); };

    if (loading) return <LoadingScreen />;
    if (error || !allData || !data || !insights || allData.weeks.length === 0) {
        return (
            <StateCard
                title={error ? 'Ката' : 'Маалымат жок'}
                text={error || 'Учурда маалымат базасы бош. Жаңы маалыматтарды киргизиңиз.'}
                action={error ? <button className="btn btn-primary" onClick={() => loadData()}>Кайра аракет кылуу</button> : undefined}
            />
        );
    }

    const season = allData.seasons.find(x => x.id === seasonId)!;
    const seasonPicker = allData.seasons.length > 1 ? { options: allData.seasons.map(x => ({ id: x.id, name: x.name })), selectedId: season.id, onChange: chooseSeason } : undefined;
    const authHouseName = authUser?.houseId ? houses.find(h => h.id === authUser.houseId)?.name ?? null : null;
    const latestWeekNumber = Math.max(...allData.weeks.map(w => w.globalWeek));

    // A new season that has no weeks yet: say so, and offer the last one.
    if (data.weeks.length === 0) {
        const previous = [...allData.seasons].reverse().find(x => allData.weeks.some(w => w.seasonId === x.id));
        return (
            <div className="min-h-screen" style={{ backgroundColor: 'var(--page-plane)' }}>
                <StateCard
                    title={`Сезон ${season.name}`}
                    text="Жаңы сезон даярдалууда. Админ биринчи аптаны ачканда жыйынтыктар ушул жерде чыгат."
                    action={
                        <div className="flex flex-wrap gap-2 justify-center">
                            {previous && <button className="btn btn-ghost" onClick={() => chooseSeason(previous.id)}>Сезон {previous.name}</button>}
                            {authUser?.role === 'admin' && <button className="btn btn-primary" onClick={() => setModal('admin')}>Админ панели</button>}
                            {!authUser && <button className="btn btn-ghost" onClick={() => setModal('login')}>Кирүү</button>}
                        </div>
                    }
                />
                {modal === 'login' && <LoginModal onSuccess={() => setModal(null)} onClose={() => setModal(null)} />}
                {modal === 'admin' && authUser?.role === 'admin' && <AdminPanel data={allData} onClose={() => setModal(null)} onChanged={() => loadData(true)} />}
            </div>
        );
    }

    const weekIndex = selectedWeek === null ? data.weeks.length - 1 : Math.min(selectedWeek, data.weeks.length - 1);
    const currentWeekData = data.weeks[weekIndex];
    const periodIndex = selectedPeriod === null ? Math.max(0, Math.ceil(data.weeks.length / 4) - 1) : selectedPeriod;
    const isWeekly = activeView === 'overview' || activeView === 'teams' || activeView === 'awards';

    // The monument: the week's leading house and its average (submitted houses only).
    const leader = [...insights.houses.values()].find(h => weekOf(h.weeks, weekIndex)?.rank === 1);
    const leaderWeek = leader ? weekOf(leader.weeks, weekIndex) : undefined;
    const weekPeople = [...insights.members.values()].map(m => weekOf(m.weeks, weekIndex)).filter(w => w && w.submitted);
    const submittedHouses = currentWeekData.teams.filter(t => t.submitted).length;
    const monument = activeView === 'overview' ? {
        kicker: `${currentWeekData.weekNumber}-апта · аптанын үйү`,
        title: leader?.name ?? 'Маалымат күтүлүүдө',
        value: leaderWeek ? fmt(leaderWeek.avg) : '—',
        sub: `үй рейтинги · ${weekPeople.length} адам · ${submittedHouses}/${currentWeekData.teams.length} үй киргизди`
    } : undefined;

    const profileSeries = route.memberId ? insights.members.get(route.memberId) : undefined;

    return (
        <div className="min-h-screen bottom-nav-space" style={{ backgroundColor: 'var(--page-plane)' }}>
            <AppHeader
                authUser={authUser}
                houseName={authHouseName}
                theme={theme}
                onToggleTheme={toggleTheme}
                onLogin={() => setModal('login')}
                onLogout={() => signOut()}
                onDataEntry={() => { setDataEntryHouseId(null); setModal('entry'); }}
                onFormula={() => setModal('formula')}
                onAdmin={() => setModal('admin')}
                onHistory={() => setModal('history')}
                onShare={() => { setShareTarget({ type: 'week' }); setModal('share'); }}
                onPrayer={() => setModal('prayer')}
                onCompare={() => openCompare({ kind: 'person' })}
                installMode={installMode}
                onInstall={async () => { if (installMode === 'prompt') await install(); else setModal('install'); }}
                week={isWeekly ? {
                    number: currentWeekData.weekNumber,
                    date: currentWeekData.date,
                    locked: currentWeekData.locked,
                    canPrev: weekIndex > 0,
                    canNext: weekIndex < data.weeks.length - 1,
                    onPrev: () => setSelectedWeek(Math.max(0, weekIndex - 1)),
                    onNext: () => setSelectedWeek(weekIndex + 1 >= data.weeks.length - 1 ? null : weekIndex + 1),
                    isLatest: weekIndex === data.weeks.length - 1
                } : undefined}
                seasonLabel={{ overview: undefined, teams: 'Үйлөр', progress: 'Апталык прогресс', reports: 'Отчёттор', awards: 'Сыйлыктар' }[activeView]}
                monument={monument}
                season={seasonPicker}
                seasonName={season.name}
            />

            <ViewNavigator activeView={activeView} setActiveView={setActiveView} />

            <main className="page-gutter">
                <div key={activeView} className={`app-container animate-fade-up ${activeView === 'overview' ? 'pt-0 md:pt-8' : 'pt-6 sm:pt-8'}`}>
                    {activeView === 'overview' && (
                        <OverviewView data={data} weekIndex={weekIndex} insights={insights} onOpenProfile={openProfile} showSubmission={!!authUser} />
                    )}
                    {activeView === 'teams' && (
                        <TeamsView
                            data={data}
                            weekIndex={weekIndex}
                            insights={insights}
                            initialHouseId={authUser?.houseId ?? null}
                            canEditHouse={houseId => authUser?.role === 'admin' || (!!authUser && authUser.houseId === houseId)}
                            onEditHouse={houseId => { setDataEntryHouseId(houseId); setModal('entry'); }}
                            onOpenProfile={openProfile}
                        />
                    )}
                    {activeView === 'progress' && <ProgressView data={data} insights={insights} onOpenProfile={openProfile} onCompare={kind => openCompare({ kind })} />}
                    {activeView === 'reports' && <ReportsView data={data} selectedPeriod={periodIndex} setSelectedPeriod={setSelectedPeriod} />}
                    {activeView === 'awards' && <AwardsView data={data} weekIndex={weekIndex} awards={awards} insights={insights} onOpenProfile={openProfile} />}

                    <footer className="mt-14">
                        <OrnamentDivider className="mb-5" />
                        <div className="flex items-center justify-center gap-2 pb-4">
                            <SunMark size={15} />
                            <p className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>tdJamaat</p>
                        </div>
                    </footer>
                </div>
            </main>

            {profileSeries && (
                <ProfileSheet
                    series={profileSeries}
                    data={data}
                    insights={insights}
                    awards={awards.filter(a => a.holderId === profileSeries.id)}
                    weekIndex={weekIndex}
                    seasonName={season.name}
                    seasonFinished={seasonClosed}
                    onShare={(card: 'week' | 'season') => { setShareTarget({ type: 'person', memberId: profileSeries.id, card }); setModal('share'); }}
                    onCompare={() => openCompare({ kind: 'person', a: profileSeries.id })}
                    onClose={closeProfile}
                />
            )}
            {modal === 'login' && <LoginModal onSuccess={() => setModal(null)} onClose={() => setModal(null)} />}
            {modal === 'formula' && <FormulaSheet onClose={() => setModal(null)} />}
            {modal === 'share' && (
                <ShareSheet data={data} weekIndex={weekIndex} insights={insights} awards={awards} target={shareTarget} siteTheme={theme} seasonName={season.name} seasonFinished={seasonClosed} onClose={() => setModal(null)} />
            )}
            {modal === 'install' && <InstallSheet onClose={() => setModal(null)} />}
            {modal === 'prayer' && <PrayerSheet onClose={() => setModal(null)} />}
            {modal === 'compare' && <CompareSheet data={data} insights={insights} awards={awards} weekIndex={weekIndex} init={compareInit} onClose={() => setModal(null)} />}
            {modal === 'history' && authUser && <HistorySheet authUser={authUser} data={allData} onClose={() => setModal(null)} />}
            {modal === 'admin' && authUser?.role === 'admin' && (
                <AdminPanel data={allData} onClose={() => setModal(null)} onChanged={() => loadData(true)} />
            )}
            {modal === 'entry' && authUser && (
                <DataEntryForm
                    authUser={authUser}
                    defaultWeekNumber={latestWeekNumber}
                    initialHouseId={dataEntryHouseId}
                    onClose={() => { setModal(null); setDataEntryHouseId(null); }}
                    onSuccess={() => {
                        setModal(null);
                        setDataEntryHouseId(null);
                        loadData(true);
                    }}
                    onWeeksChanged={() => loadData(true)}
                    lockedWeeks={allData.weeks.filter(w => w.locked).map(w => w.globalWeek)}
                    data={allData}
                />
            )}
        </div>
    );
};

export default TeamPerformanceTracker;
