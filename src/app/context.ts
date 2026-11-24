import { createContext } from 'react';
import type { DataFile } from '../types';

/** What the everyday pages know about who is using them. */
export interface AppCtx {
    signedIn: boolean;
    role?: 'admin' | 'leader' | 'inspector' | 'member';
    houseId?: string | null;
    houseName?: string | null;
    /** The results, when signed in and loaded (for the jamaat lines on Today). */
    data?: DataFile | null;
}
export const AppContext = createContext<AppCtx>({ signedIn: false });
