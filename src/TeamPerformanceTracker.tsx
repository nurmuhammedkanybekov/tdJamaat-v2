// TeamPerformanceTracker.tsx — the app shell.
// Puts the pieces together: who is logged in (hooks/useAuthUser), the results
// and their live refresh (hooks/useResults), the view in the URL hash
// (hooks/useHashRoute), the theme, the keyboard, and every modal. Each view
// computes its own layout (src/components/views/*).
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signOut } from './services/authService';
import { useInstallPrompt, useUpdateAvailable } from './pwa';
import { buildInsights, weekComplete, weekOf } from './utils/insights';
import { computeAwards } from './utils/badges';
import { defaultSeasonId, seasonView } from './utils/seasons';
import { adminDesk, houseDesk } from './utils/desk';
import { useHashRoute } from './hooks/useHashRoute';
import { useAuthUser } from './hooks/useAuthUser';
import { useThemeState } from './hooks/useThemeState';
import { useResults } from './hooks/useResults';
import { useKeyboardNav } from './hooks/useKeyboardNav';
import { useAutoReveal } from './hooks/useReveal';
import { useSpotlight } from './hooks/useSpotlight';

import { AppHeader } from './components/AppHeader';
import { ViewNavigator } from './components/ViewNavigator';
import { TABS } from './components/navigation';
import { LoginScreen } from './components/LoginScreen';
import { PublicPages } from './public/PublicPages';
import { go, usePublicRoute } from './public/route';
import type { ShareTarget } from './components/ShareSheet';
import type { CompareInit } from './components/CompareSheet';
import { AdminDeskPanel, CaptainDesk } from './components/Desk';
import { OverviewView } from './components/views/OverviewView';
import { TeamsView } from './components/views/TeamsView';
import { AwardsView } from './components/views/AwardsView';
import { CommunityView } from './components/views/CommunityView';
import { OrnamentDivider, SunMark } from './components/Ornament';
import { LoadingScreen, StateCard } from './components/ui';
import { t } from './i18n';
import { prefetch, withReload } from './lazyLoad';

// The chart library (Recharts) is only needed by these four, so they load on
// demand: the first screen comes up without it, and the chunks are fetched
// in the background right after (see prefetchLazy), so a tap on
// Progress or a profile doesn't wait.
const loadSeason = withReload(() => import('./components/views/SeasonView'));
const loadProfile = withReload(() => import('./components/ProfileSheet'));
const loadCompare = withReload(() => import('./components/CompareSheet'));
const SeasonView = lazy(() => loadSeason().then(m => ({ default: m.SeasonView })));
const ProfileSheet = lazy(() => loadProfile().then(m => ({ default: m.ProfileSheet })));
const CompareSheet = lazy(() => loadCompare().then(m => ({ default: m.CompareSheet })));
// The sheets only open on a tap: loaded on demand too, prefetched the same way.
const loadEntry = withReload(() => import('./components/DataEntryForm'));
const loadAdmin = withReload(() => import('./components/AdminPanel'));
const loadShare = withReload(() => import('./components/ShareSheet'));
const loadHistory = withReload(() => import('./components/HistorySheet'));
const DataEntryForm = lazy(() => loadEntry().then(m => ({ default: m.DataEntryForm })));
const AdminPanel = lazy(() => loadAdmin().then(m => ({ default: m.AdminPanel })));
const ShareSheet = lazy(() => loadShare().then(m => ({ default: m.ShareSheet })));
const HistorySheet = lazy(() => loadHistory().then(m => ({ default: m.HistorySheet })));
const FormulaSheet = lazy(() => withReload(() => import('./components/FormulaDisplay'))().then(m => ({ default: m.FormulaSheet })));
const InstallSheet = lazy(() => withReload(() => import('./components/InstallSheet'))().then(m => ({ default: m.InstallSheet })));
const WeekStory = lazy(() => withReload(() => import('./components/WeekStory'))().then(m => ({ default: m.WeekStory })));
const PrayerSheet = lazy(() => withReload(() => import('./components/PrayerSheet'))().then(m => ({ default: m.PrayerSheet })));
// Prefetch uses the plain imports: a failure there must not reload the page.
const prefetchLazy = () => prefetch(
    () => import('./components/DataEntryForm'), () => import('./components/views/SeasonView'),
    () => import('./components/ProfileSheet'), () => import('./components/CompareSheet'), () => import('./components/ShareSheet'),
    () => import('./components/AdminPanel'), () => import('./components/HistorySheet')
);

/** Placeholder while a section's code arrives (normally already prefetched). */
const SectionLoading: React.FC = () => (
    <div className="py-24 flex justify-center" aria-busy="true" aria-label={t('Жүктөлүүдө')}>
        <div className="skeleton h-1 w-24" />
    </div>
);

const KNOWN_DEVICE = 'tdjamaat-known-device';
const knownDevice = () => { try { return localStorage.getItem(KNOWN_DEVICE) === '1' || !!localStorage.getItem('tdjamaat-login-house'); } catch { return false; } };

type Modal = null | 'story' | 'entry' | 'formula' | 'share' | 'admin' | 'history' | 'install' | 'prayer' | 'compare';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const clock = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const TeamPerformanceTracker: React.FC = () => {
    const { authUser, checked: authChecked } = useAuthUser();
    const { theme, toggleTheme, screen, toggleScreen } = useThemeState();
    const { route, setView: setActiveView, openProfile, closeProfile } = useHashRoute();
    const activeView = route.view;
    // The open pages (Quran, zikr, prayer times) and the captains' entrance.
    const pub = usePublicRoute();
    const openPage = !!pub && pub.page !== 'login';
    useEffect(() => { if (authUser && pub?.page === 'login') window.location.replace('#/overview'); }, [authUser, pub]);
    // A device a captain or the admin has used before opens on the login
    // screen, as it always did; everyone else is met by the front door.
    useEffect(() => { if (authUser) { try { localStorage.setItem(KNOWN_DEVICE, '1'); } catch { /* not critical */ } } }, [authUser]);

    const [modal, setModal] = useState<Modal>(null);
    // Read by the background refresh, which must not run while someone is
    // typing results.
    const modalRef = useRef<Modal>(null);
    useEffect(() => { modalRef.current = modal; }, [modal]);
    const entryOpen = useCallback(() => modalRef.current === 'entry', []);
    const { data: allData, houses, loading, error, reload: loadData, updatedAt, stale, offline } = useResults(authUser ? `${authUser.role}:${authUser.houseId ?? ''}` : null, authChecked, entryOpen);
    // Logged out: close whatever was open.
    useEffect(() => { if (!authUser) setModal(null); }, [authUser]);

    const [seasonChoice, setSeasonChoice] = useState<number | null>(null);
    // null = "follow the latest" (a new week appears → it's shown automatically)
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
    const [compareInit, setCompareInit] = useState<CompareInit>({ kind: 'person' });
    const openCompare = (init: CompareInit) => { setCompareInit(init); setModal('compare'); };
    // The data entry form: which house and week it opens on (null = defaults).
    const [entry, setEntry] = useState<{ houseId: string | null; week: number | null }>({ houseId: null, week: null });
    const openEntry = (houseId: string | null = null, week: number | null = null) => { setEntry({ houseId, week }); setModal('entry'); };
    const [shareTarget, setShareTarget] = useState<ShareTarget>({ type: 'week' });

    const { mode: installMode, install } = useInstallPrompt();
    const updateAvailable = useUpdateAvailable();
    const [updateDismissed, setUpdateDismissed] = useState(false);

    // The season on screen (default: the running one, or the latest with
    // weeks). Everything below works on that season only, numbered from 1.
    const seasonId = allData ? (seasonChoice !== null && allData.seasons.some(x => x.id === seasonChoice) ? seasonChoice : defaultSeasonId(allData)) : null;
    const data = useMemo(() => (allData && seasonId !== null ? seasonView(allData, seasonId) : null), [allData, seasonId]);
    const insights = useMemo(() => (data ? buildInsights(data) : null), [data]);
    const seasonClosed = !!allData?.seasons.find(x => x.id === seasonId && x.lastWeek !== null);
    const seasonNameForAwards = allData?.seasons.find(x => x.id === seasonId)?.name;
    const awards = useMemo(() => (data && insights ? computeAwards(data, insights, { seasonClosed, seasonName: seasonNameForAwards }) : []), [data, insights, seasonClosed, seasonNameForAwards]);
    const chooseSeason = (id: number) => { setSeasonChoice(id); setSelectedWeek(null); setSelectedPeriod(null); };

    // The week on screen, and the keys/tab title that follow it. (Computed
    // before the early returns below: hooks must always run.)
    const weekCount = data?.weeks.length ?? 0;
    const weekIndex = selectedWeek === null ? weekCount - 1 : Math.min(selectedWeek, weekCount - 1);
    const isWeekly = activeView === 'overview' || activeView === 'teams' || activeView === 'awards';
    const goWeek = (i: number) => setSelectedWeek(i >= weekCount - 1 ? null : Math.max(0, i));
    useKeyboardNav(!!data && weekCount > 0 && modal === null && !route.memberId && !openPage, {
        prev: isWeekly && weekIndex > 0 ? () => goWeek(weekIndex - 1) : undefined,
        next: isWeekly && weekIndex < weekCount - 1 ? () => goWeek(weekIndex + 1) : undefined,
        tab: i => { if (TABS[i]) setActiveView(TABS[i].key); }
    });
    // Sections below the screen rise into view as they are scrolled to.
    const viewRef = useRef<HTMLDivElement>(null);
    useSpotlight();
    useAutoReveal(viewRef, `${activeView}|${!!allData}`);
    // Once the results are on screen, fetch the on-demand code in the background.
    const hasData = !!allData;
    useEffect(() => {
        if (!hasData) return;
        const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
        idle(() => prefetchLazy());
    }, [hasData]);
    useEffect(() => {
        if (openPage) return;
        const tab = TABS.find(it => it.key === activeView);
        document.title = authUser && tab && activeView !== 'overview' ? `${tab.label} · tdJamaat` : 'tdJamaat';
    }, [activeView, authUser, openPage]);

    // Open to everyone, signed in or not — and shown without waiting for the login check.
    if (openPage) return <PublicPages route={pub} theme={theme} onToggleTheme={toggleTheme} signedIn={!!authUser} />;
    if (!authChecked) return <LoadingScreen />;
    if (!authUser) return pub?.page === 'login' || (!pub && knownDevice())
        ? <LoginScreen theme={theme} onToggleTheme={toggleTheme} onBack={() => go('#/home')} />
        : <PublicPages route={null} theme={theme} onToggleTheme={toggleTheme} signedIn={false} />;
    if (loading) return <LoadingScreen />;
    if (error || !allData || !data || !insights || allData.weeks.length === 0) {
        return (
            <StateCard
                title={error ? t('Ката') : t('Маалымат жок')}
                text={error || t('Азырынча база бош. Маалымат киргизиңиз.')}
                action={error ? <button className="btn btn-primary" onClick={() => loadData()}>{t('Кайра аракет кылуу')}</button> : undefined}
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
                    title={t('Сезон {0}', season.name)}
                    text={t('Жаңы сезон даярдалууда. Админ биринчи аптаны ачканда, жыйынтыктар ушул жерде чыгат.')}
                    action={
                        <div className="flex flex-wrap gap-2 justify-center">
                            {previous && <button className="btn btn-ghost" onClick={() => chooseSeason(previous.id)}>{t('Сезон {0}', previous.name)}</button>}
                            {authUser?.role === 'admin' && <button className="btn btn-primary" onClick={() => setModal('admin')}>{t('Админ панели')}</button>}
                        </div>
                    }
                />
                {modal === 'admin' && authUser?.role === 'admin' && <Suspense fallback={null}><AdminPanel data={allData} onClose={() => setModal(null)} onChanged={() => loadData(true)} /></Suspense>}
            </div>
        );
    }

    const currentWeekData = data.weeks[weekIndex];
    const periodIndex = selectedPeriod === null ? Math.max(0, Math.ceil(data.weeks.length / 4) - 1) : selectedPeriod;

    // The monument: the week's leading house and its average (submitted houses only).
    const leader = [...insights.houses.values()].find(h => weekOf(h.weeks, weekIndex)?.rank === 1);
    const leaderWeek = leader ? weekOf(leader.weeks, weekIndex) : undefined;
    const runnerUp = [...insights.houses.values()]
        .map(h => ({ name: h.name, w: weekOf(h.weeks, weekIndex) }))
        .filter(x => x.w?.submitted && x.w.rank !== null && x.name !== leader?.name)
        .sort((a, b) => b.w!.avg - a.w!.avg)
        .map(x => ({ name: x.name, avg: x.w!.avg }))[0];
    const weekPeople = [...insights.members.values()].map(m => weekOf(m.weeks, weekIndex)).filter(w => w && w.submitted);
    const submittedHouses = currentWeekData.teams.filter(it => it.submitted).length;
    const monument = activeView === 'overview' ? {
        // Until every house has entered (or the week is locked) the leader is
        // only provisional: say so instead of crowning a "house of the week".
        kicker: weekComplete(currentWeekData)
            ? t('{0}-апта · аптанын үйү', currentWeekData.weekNumber)
            : t('{0}-апта · азырынча алдыда', currentWeekData.weekNumber),
        title: leader?.name ?? t('Маалымат күтүлүүдө'),
        value: leaderWeek ? fmt(leaderWeek.avg) : '—',
        sub: t('үй рейтинги · {0} адам · {1}/{2} үй киргизди', weekPeople.length, submittedHouses, currentWeekData.teams.length),
        // The drama of the week: by how much, and over whom.
        lead: leaderWeek && runnerUp ? t('{0} упай алдыда · {1}', fmt(leaderWeek.avg - runnerUp.avg), runnerUp.name) : undefined,
        // Every house has entered (or the week is locked): a moment of celebration.
        complete: weekComplete(currentWeekData) && !!leaderWeek
    } : undefined;

    const weekControl = {
        number: currentWeekData.weekNumber,
        locked: currentWeekData.locked,
        canPrev: weekIndex > 0,
        canNext: weekIndex < data.weeks.length - 1,
        onPrev: () => goWeek(weekIndex - 1),
        onNext: () => goWeek(weekIndex + 1)
    };

    const profileSeries = route.memberId ? insights.members.get(route.memberId) : undefined;

    // The desk: a captain's own house this week, or (admin) who is still missing.
    const ownDesk = authUser.role === 'leader' && authUser.houseId ? houseDesk(data, insights, authUser.houseId, weekIndex) : null;
    const desk = authUser.role === 'admin'
        ? <AdminDeskPanel desk={adminDesk(currentWeekData, insights, weekIndex)} onEnterFor={houseId => openEntry(houseId, currentWeekData.globalWeek)} onAdmin={() => setModal('admin')} />
        : ownDesk && (
            <CaptainDesk
                desk={ownDesk}
                canEdit={!ownDesk.locked}
                onEnter={() => openEntry(ownDesk.houseId, ownDesk.globalWeek)}
                onOpenHouse={() => setActiveView('teams')}
                onOpenPerson={openProfile}
            />
        );

    return (
        <div className="min-h-screen bottom-nav-space" style={{ backgroundColor: 'var(--page-plane)' }}>
            <AppHeader
                authUser={authUser}
                houseName={authHouseName}
                theme={theme}
                onToggleTheme={toggleTheme}
                screen={screen}
                onToggleScreen={toggleScreen}
                onLogin={() => undefined}
                onLogout={() => signOut()}
                onDataEntry={() => openEntry()}
                onFormula={() => setModal('formula')}
                onAdmin={() => setModal('admin')}
                onHistory={() => setModal('history')}
                onShare={() => { setShareTarget({ type: 'week' }); setModal('share'); }}
                onPrayer={() => setModal('prayer')}
                onCompare={() => openCompare({ kind: 'person' })}
                installMode={installMode}
                onInstall={async () => { if (installMode === 'prompt') await install(); else setModal('install'); }}
                week={isWeekly ? { ...weekControl, date: currentWeekData.date, isLatest: weekIndex === data.weeks.length - 1 } : undefined}
                seasonLabel={{ overview: undefined, teams: t('Үйлөр'), season: t('Сезон {0}', season.name), awards: t('Сыйлыктар'), community: t('Жамаат') }[activeView]}
                kicker={activeView === 'season' ? t('{0} апта', data.weeks.length) : undefined}
                monument={monument}
                onStory={activeView === 'overview' && leaderWeek ? () => setModal('story') : undefined}
                season={seasonPicker}
                seasonName={season.name}
            />

            <ViewNavigator activeView={activeView} setActiveView={setActiveView} />

            {stale && (
                <div role="status" className="page-gutter py-2.5 text-[0.85rem] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--danger)' }} aria-hidden="true" />
                    {offline ? t('Интернет жок.') : t('Жаңы маалымат жүктөлгөн жок.')}
                    {updatedAt && <span style={{ color: 'var(--text-muted)' }}>{t('Көрсөтүлгөнү {0} абалында.', clock(updatedAt))}</span>}
                    {!offline && <button className="underline underline-offset-2 hover:text-[var(--gold)]" onClick={() => loadData(true)}>{t('Кайра аракет кылуу')}</button>}
                </div>
            )}

            <main className="page-gutter">
                <div key={activeView} ref={viewRef} className={`app-container animate-view-in ${activeView === 'overview' ? 'pt-0 md:pt-8' : 'pt-6 sm:pt-8'}`}>
                    {activeView === 'overview' && (
                        <OverviewView data={data} weekIndex={weekIndex} insights={insights} onOpenProfile={openProfile} desk={desk || undefined} />
                    )}
                    {activeView === 'teams' && (
                        <TeamsView
                            data={data}
                            weekIndex={weekIndex}
                            insights={insights}
                            initialHouseId={authUser?.houseId ?? null}
                            canEditHouse={houseId => authUser?.role === 'admin' || (!!authUser && authUser.houseId === houseId)}
                            onEditHouse={houseId => openEntry(houseId)}
                            onOpenProfile={openProfile}
                        />
                    )}
                    <Suspense fallback={<SectionLoading />}>
                        {activeView === 'season' && <SeasonView data={data} insights={insights} selectedPeriod={periodIndex} setSelectedPeriod={setSelectedPeriod} onOpenProfile={openProfile} onCompare={kind => openCompare({ kind })} />}
                    </Suspense>
                    {activeView === 'awards' && <AwardsView data={data} weekIndex={weekIndex} awards={awards} insights={insights} onOpenProfile={openProfile} />}
                    {activeView === 'community' && <CommunityView data={data} allData={allData} insights={insights} awards={awards} seasonName={season.name} onOpenProfile={openProfile} onShareWeek={i => { setShareTarget({ type: 'week', card: 'jamaat', weekIndex: i }); setModal('share'); }} onShareSeason={() => { setShareTarget({ type: 'week', card: 'jamaat-season' }); setModal('share'); }} />}

                    <footer className="mt-14">
                        <OrnamentDivider className="mb-5" />
                        <div className="flex items-center justify-center gap-2 pb-4">
                            <SunMark size={15} />
                            <p className="text-[0.75rem] italic" style={{ color: 'var(--text-muted)' }}>
                                tdJamaat{updatedAt && <> · {t('жаңыртылды {0}', clock(updatedAt))}</>}
                            </p>
                        </div>
                        {/* Keyboard shortcuts (hooks/useKeyboardNav), for the laptop in meetings. */}
                        <p className="hidden lg:block text-center text-[0.72rem] pb-4 -mt-2" style={{ color: 'var(--text-muted)' }}>
                            <kbd className="kbd">←</kbd> <kbd className="kbd">→</kbd> {t('апта')} · <kbd className="kbd">1</kbd>–<kbd className="kbd">{TABS.length}</kbd> {t('бөлүмдөр')}
                        </p>
                    </footer>
                </div>
            </main>

            <Suspense fallback={null}>
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
            </Suspense>
            {modal === 'formula' && <Suspense fallback={null}><FormulaSheet onClose={() => setModal(null)} /></Suspense>}
            <Suspense fallback={null}>
            {modal === 'share' && (
                <ShareSheet data={data} weekIndex={weekIndex} insights={insights} awards={awards} target={shareTarget} siteTheme={theme} seasonName={season.name} seasonFinished={seasonClosed} onClose={() => setModal(null)} />
            )}
            </Suspense>
            {modal === 'install' && <Suspense fallback={null}><InstallSheet onClose={() => setModal(null)} /></Suspense>}
            {updateAvailable && !updateDismissed && (
                <div role="status" className="update-bar fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md flex items-center gap-3 px-4 py-3 animate-fade-up" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--gold)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lift)' }}>
                    <span className="flex-1 text-[0.9rem]" style={{ color: 'var(--text-primary)' }}>{t('Сайттын жаңы версиясы чыкты.')}</span>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>{t('Жаңыртуу')}</button>
                    <button onClick={() => setUpdateDismissed(true)} aria-label={t('Кийинчерээк')} className="w-8 h-8 inline-flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>×</button>
                </div>
            )}
            {modal === 'story' && <Suspense fallback={null}><WeekStory data={data} weekIndex={weekIndex} insights={insights} awards={awards} onShare={() => { setShareTarget({ type: 'week' }); setModal('share'); }} onClose={() => setModal(null)} /></Suspense>}
            {modal === 'prayer' && <Suspense fallback={null}><PrayerSheet onClose={() => setModal(null)} /></Suspense>}
            {modal === 'compare' && <Suspense fallback={null}><CompareSheet data={data} insights={insights} awards={awards} weekIndex={weekIndex} init={compareInit} onClose={() => setModal(null)} /></Suspense>}
            {modal === 'history' && authUser && <Suspense fallback={null}><HistorySheet authUser={authUser} data={allData} onClose={() => setModal(null)} /></Suspense>}
            <Suspense fallback={null}>
            {modal === 'admin' && authUser?.role === 'admin' && (
                <AdminPanel data={allData} onClose={() => setModal(null)} onChanged={() => loadData(true)} />
            )}
            </Suspense>
            <Suspense fallback={null}>
            {modal === 'entry' && authUser && (
                <DataEntryForm
                    authUser={authUser}
                    defaultWeekNumber={entry.week ?? latestWeekNumber}
                    initialHouseId={entry.houseId}
                    onClose={() => setModal(null)}
                    onSuccess={() => {
                        setModal(null);
                        loadData(true);
                    }}
                    onWeeksChanged={() => loadData(true)}
                    lockedWeeks={allData.weeks.filter(w => w.locked).map(w => w.globalWeek)}
                    data={allData}
                />
            )}
            </Suspense>
        </div>
    );
};

export default TeamPerformanceTracker;
