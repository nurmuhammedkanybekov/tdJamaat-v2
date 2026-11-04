import { useEffect, useState } from 'react';
import { getInitialAuthUser, subscribeToAuthChanges } from '../services/authService';
import type { AuthUser } from '../services/authService';

// Who is logged in. `checked` turns true once the stored session has been
// read, so the app never flashes the login page for someone already in.
export const useAuthUser = () => {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [checked, setChecked] = useState(false);
    useEffect(() => {
        getInitialAuthUser()
            .then(setAuthUser)
            .catch(() => setAuthUser(null))
            .finally(() => setChecked(true));
        return subscribeToAuthChanges(user => { setAuthUser(user); setChecked(true); });
    }, []);
    return { authUser, checked };
};
