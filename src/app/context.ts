import { createContext } from 'react';
import type { DataFile } from '../types';
import type { MemberState } from './useMember';

/** What the everyday pages know about who is using them. */
export interface AppCtx {
    signedIn: boolean;
    role?: 'admin' | 'leader' | 'inspector' | 'member';
    houseId?: string | null;
    houseName?: string | null;
    /** The results, when signed in and loaded (for the jamaat lines on Today). */
    data?: DataFile | null;
    /** A member signed in with Google (or not). */
    member?: MemberState;
}
export const AppContext = createContext<AppCtx>({ signedIn: false });
