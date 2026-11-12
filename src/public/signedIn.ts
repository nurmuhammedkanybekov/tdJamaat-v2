import { createContext, useContext } from 'react';

/** Whether a captain or the admin is signed in (decides where "home" and the entrance lead). */
export const SignedInContext = createContext(false);
/** Where "back to the start" leads: the results for someone signed in, the front door otherwise. */
export const useHome = () => (useContext(SignedInContext) ? '#/overview' : '#/home');
