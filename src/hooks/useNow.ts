import { useEffect, useState } from 'react';

/** Current time, refreshed every 30 s (for countdowns). */
export const useNow = (ms = 30_000) => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const id = window.setInterval(() => setNow(new Date()), ms); return () => window.clearInterval(id); }, [ms]);
    return now;
};
