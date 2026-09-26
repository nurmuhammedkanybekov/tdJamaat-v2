import { useEffect, useRef } from 'react';

// Shared behavior for full-screen dialogs:
//  - the page underneath doesn't scroll while the dialog is open (on iOS/
//    Android, scrolling a form used to drag the dashboard behind it too);
//  - Escape closes it on a keyboard.
export const useModal = (onClose: () => void) => {
    // Parents pass an inline arrow; keep the latest one without re-running
    // the lock/unlock effect on every render.
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previous;
            window.removeEventListener('keydown', onKey);
        };
    }, []);
};
