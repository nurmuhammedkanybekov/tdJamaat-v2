import { useEffect, useRef } from 'react';

// Shared behavior for full-screen dialogs:
//  - the page underneath doesn't scroll while a dialog is open (on iOS/
//    Android, scrolling a form used to drag the dashboard behind it too);
//  - Escape closes the TOP dialog only (a share sheet opened over a profile
//    closes alone, the profile stays).
const stack: symbol[] = [];
let savedOverflow = '';

export const useModal = (onClose: () => void) => {
    // Parents pass an inline arrow; keep the latest one without re-running
    // the lock/unlock effect on every render.
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const id = Symbol('modal');
        if (stack.length === 0) savedOverflow = document.body.style.overflow;
        stack.push(id);
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && stack[stack.length - 1] === id) onCloseRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            stack.splice(stack.indexOf(id), 1);
            if (stack.length === 0) document.body.style.overflow = savedOverflow;
            window.removeEventListener('keydown', onKey);
        };
    }, []);
};
