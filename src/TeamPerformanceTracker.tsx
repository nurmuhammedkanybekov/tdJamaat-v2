// TeamPerformanceTracker.tsx — orchestrator only.
// Each view now owns its own layout/computation (src/components/views/*);
// this file just handles data loading, auth state, theme, and which view is active.
import React, { useEffect, useState, useCallback } from 'react';
import type { DataFile, House } from './types';
import { fetchDataFile, fetchHouses } from './services/dataService';
import { getInitialAuthUser, subscribeToAuthChanges, signOut } from './services/authService';
import type { AuthUser } from './services/authService';
import { getStoredTheme, setTheme as persistTheme } from './theme';
import type { Theme } from './theme';

import { Header } from './components/Header';
import { WeekSelector } from './components/WeekSelector';
import { FormulaDisplay } from './components/FormulaDisplay';
import { ViewNavigator } from './components/ViewNavigator';
import { FourWeekPeriodSelector } from './components/FourWeekPeriodSelector';
import { LoginModal } from './components/LoginModal';
import { DataEntryForm } from './components/DataEntryForm';
import { OverviewView, TeamsView, ProgressView, FourWeekReportView, TotalRatingsView } from './components/views';
import { OrnamentDivider, SunMark } from './components/Ornament';

type ActiveView = 'overview' | 'teams' | 'progress' | 'fourweekreport' | 'totalratings';

const TeamPerformanceTracker: React.FC = () => {
    const [data, setData] = useState<DataFile | null>(null);
    const [houses, setHouses] = useState<House[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeView, setActiveView] = useState<ActiveView>('overview');
    const [selectedWeek, setSelectedWeek] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState(0);
    const [showFormula, setShowFormula] = useState(false);

    const [theme, setThemeState] = useState<Theme>(() => getStoredTheme() ?? (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    const isDark = theme === 'dark';
    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        persistTheme(next);
        setThemeState(next);
    };

    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [showLogin, setShowLogin] = useState(false);
    const [showDataEntry, setShowDataEntry] = useState(false);
    const [dataEntryHouseId, setDataEntryHouseId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [df, houseList] = await Promise.all([fetchDataFile(), fetchHouses()]);
            setData(df);
            setHouses(houseList);
            if (df.weeks.length > 0) {
                setSelectedWeek(df.weeks.length - 1);
                setSelectedPeriod(Math.max(0, Math.ceil(df.weeks.length / 4) - 1));
            }
            setError(null);
        } catch (err) {
            setError('Маалыматтарды жүктөөдө ката кетти. Сураныч, интернет байланышын текшериңиз же кийинчерээк кайра аракет кылыңыз.');
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        getInitialAuthUser().then(setAuthUser).catch(() => setAuthUser(null));
        const unsubscribe = subscribeToAuthChanges(setAuthUser);
        return unsubscribe;
    }, [loadData]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--page-plane)' }}>
                <div className="font-serif text-xl" style={{ color: 'var(--text-muted)' }}>Жүктөлүүдө&hellip;</div>
            </div>
        );
    }

    if (error || !data || data.weeks.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--page-plane)' }}>
                <div className="p-8 max-w-md" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '3px' }}>
                    <h2 className="font-serif text-2xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>{error ? 'Ката' : 'Маалымат жок'}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>{error || 'Учурда маалымат базасы бош. Жаңы маалыматтарды киргизиңиз.'}</p>
                </div>
            </div>
        );
    }

    const currentWeekData = data.weeks[selectedWeek];
    const authHouseName = authUser?.houseId ? houses.find(h => h.id === authUser.houseId)?.name ?? null : null;
    const nextWeekNumber = Math.max(...data.weeks.map(w => w.weekNumber)) + 1;

    return (
        <div className="min-h-screen px-5 py-8 md:px-10 md:py-10 transition-colors" style={{ backgroundColor: 'var(--page-plane)' }}>
            <div className="max-w-6xl mx-auto">
                <Header
                    showFormula={showFormula}
                    setShowFormula={setShowFormula}
                    authUser={authUser}
                    houseName={authHouseName}
                    onLoginClick={() => setShowLogin(true)}
                    onDataEntryClick={() => { setDataEntryHouseId(null); setShowDataEntry(true); }}
                    onLogout={() => signOut()}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                />

                {activeView === 'fourweekreport' ? (
                    <FourWeekPeriodSelector data={data} selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod} />
                ) : (
                    <WeekSelector data={data} selectedWeek={selectedWeek} setSelectedWeek={setSelectedWeek} />
                )}

                <FormulaDisplay showFormula={showFormula} />

                <ViewNavigator activeView={activeView} setActiveView={setActiveView} />

                {activeView === 'overview' && <OverviewView currentWeekData={currentWeekData} isDark={isDark} />}
                {activeView === 'teams' && (
                    <TeamsView
                        currentWeekData={currentWeekData}
                        canEdit={!!authUser}
                        onEditHouse={(houseId) => { setDataEntryHouseId(houseId); setShowDataEntry(true); }}
                        isDark={isDark}
                    />
                )}
                {activeView === 'progress' && <ProgressView data={data} currentTeams={currentWeekData.teams} isDark={isDark} />}
                {activeView === 'fourweekreport' && <FourWeekReportView data={data} selectedPeriod={selectedPeriod} isDark={isDark} />}
                {activeView === 'totalratings' && <TotalRatingsView data={data} />}

                <footer className="mt-12">
                    <OrnamentDivider className="mb-5" />
                    <div className="flex items-center justify-center gap-2 pb-2">
                        <SunMark size={15} />
                        <p className="text-[11.5px] italic" style={{ color: 'var(--text-muted)' }}>
                            tdJamaat
                        </p>
                    </div>
                </footer>
            </div>

            {showLogin && (
                <LoginModal
                    onSuccess={() => setShowLogin(false)}
                    onClose={() => setShowLogin(false)}
                />
            )}

            {showDataEntry && authUser && (
                <DataEntryForm
                    authUser={authUser}
                    defaultWeekNumber={nextWeekNumber}
                    initialHouseId={dataEntryHouseId}
                    onClose={() => { setShowDataEntry(false); setDataEntryHouseId(null); }}
                    onSuccess={() => {
                        setShowDataEntry(false);
                        setDataEntryHouseId(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

export default TeamPerformanceTracker;
