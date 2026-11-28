// Choosing one's city for the prayer times: the one chosen, and under it
// the cities by country, with "my location" first (worked out on the phone).
import React, { useState } from 'react';
import { ChevronDown, LocateFixed, Loader2, MapPin } from 'lucide-react';
import type { City } from '../utils/prayer';
import { CITIES } from '../utils/prayer';
import { locate } from '../utils/city';
import { t } from '../i18n';

const GROUPS: Array<[City['region'], () => string]> = [['hu', () => t('Венгрия')], ['kg', () => t('Кыргызстан')], ['world', () => t('Башка шаарлар')]];

export const CityPicker: React.FC<{ city: City; onPick: (c: City) => void }> = ({ city, onPick }) => {
    const [open, setOpen] = useState(false);
    const [finding, setFinding] = useState(false);
    const [failed, setFailed] = useState(false);
    const here = async () => {
        setFinding(true); setFailed(false);
        const c = await locate();
        setFinding(false);
        if (c) { onPick(c); setOpen(false); } else setFailed(true);
    };
    return (
        <div className="city-pick">
            <button className="city-pick-now" onClick={() => setOpen(o => !o)} aria-expanded={open}>
                <MapPin className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-display">{city.name}</span>
                <ChevronDown className="w-4 h-4" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
            </button>
            {city.id === 'here' && <div className="city-pick-coords tabular">{city.lat.toFixed(2)}°, {city.lng.toFixed(2)}° · {city.tz}</div>}
            {open && (
                <div className="city-pick-list" role="listbox" aria-label={t('Шаар')}>
                    <button className="city-pick-here" onClick={here} disabled={finding}>
                        {finding ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                        <span>{t('Менин жайгашкан жерим')}</span>
                        <small>{t('телефондун өзү эсептейт; эч жакка жиберилбейт')}</small>
                    </button>
                    {failed && <p className="city-pick-fail">{t('Жайгашкан жерди алуу мүмкүн болгон жок. Телефондун жөндөөсүнөн бул сайтка уруксат бериңиз же шаарды тизмеден тандаңыз.')}</p>}
                    {GROUPS.map(([g, name]) => (
                        <div key={g} className="city-pick-group">
                            <div className="eyebrow">{name()}</div>
                            <div className="city-pick-cities">
                                {CITIES.filter(x => x.region === g).map(x => (
                                    <button key={x.id} role="option" aria-selected={x.id === city.id} data-on={x.id === city.id || undefined} onClick={() => { onPick(x); setOpen(false); }}>{x.name}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
