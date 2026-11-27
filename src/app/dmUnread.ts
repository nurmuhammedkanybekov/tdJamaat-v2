// How many private messages wait unread for this account (0 until the SQL
// has run, or for an account with none).
import { useEffect, useState } from 'react';
import { countDmUnread, watchDms } from '../services/dmService';
import { myUserId } from '../services/jamaatChatService';

export const useDmUnread = (on: boolean) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!on) return;
        let alive = true;
        const run = () => { myUserId().then(me => (me ? countDmUnread(me) : 0)).then(x => { if (alive) setN(x); }).catch(() => undefined); };
        run();
        const stop = watchDms(run);
        return () => { alive = false; stop(); };
    }, [on]);
    return n;
};
