// The results a member may read (their own house only — the database decides),
// loaded once and shared by the member's pages.
import { useEffect, useState } from 'react';
import { fetchDataFile } from '../services/dataService';
import type { DataFile } from '../types';

let cache: Promise<DataFile> | null = null;
export const loadMemberData = (fresh = false) => {
    if (!cache || fresh) cache = fetchDataFile().catch(e => { cache = null; throw e; });
    return cache;
};

export const useMemberData = () => {
    const [data, setData] = useState<DataFile | null>(null);
    const [failed, setFailed] = useState(false);
    const [tick, setTick] = useState(0);
    useEffect(() => {
        let alive = true;
        loadMemberData(tick > 0).then(d => { if (alive) setData(d); }).catch(() => { if (alive) setFailed(true); });
        return () => { alive = false; };
    }, [tick]);
    return { data, failed, reload: () => setTick(n => n + 1) };
};
