import React, { useEffect, useRef, useState } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min'> {
    value: number;
    onValueChange: (value: number) => void;
}

// A whole-number box that behaves the way people expect when typing results.
//
// Why not <input type="number">, which this replaces:
//  - Clearing the box snapped straight back to "0" (the empty value was
//    turned into 0 on every keystroke), so the 0 could never be deleted.
//  - Typing "3" next to that 0 showed "03": the browser treats "03" as 3,
//    so React saw nothing to correct and left the leading zero on screen.
//  - Tap-to-select didn't stick on Safari (it drops the selection on mouse-up).
//  - A mouse wheel over a focused box silently changed the number.
//
// Here the box keeps its own text while you type: it may be empty, leading
// zeros are removed as you go ("03" → "3"), only digits are accepted, and an
// empty box turns back into "0" only when you leave it. inputMode="numeric"
// still brings up the number keypad on phones.
export const NumberInput: React.FC<NumberInputProps> = ({ value, onValueChange, readOnly, onFocus, onBlur, onMouseUp, maxLength = 6, ...rest }) => {
    const [text, setText] = useState(String(value));
    const focused = useRef(false);
    const justFocused = useRef(false);

    // Follow changes from outside (switching house or week) while not typing.
    useEffect(() => {
        if (!focused.current) setText(String(value));
    }, [value]);

    return (
        <input
            {...rest}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={maxLength}
            readOnly={readOnly}
            value={text}
            onFocus={e => {
                focused.current = true;
                if (!readOnly) {
                    justFocused.current = true;
                    e.currentTarget.select(); // typing now replaces the whole number
                }
                onFocus?.(e);
            }}
            onMouseUp={e => {
                // Keep the selection made on focus: without this, the mouse-up
                // of the same click puts the cursor back in (Safari, Chrome).
                if (justFocused.current) {
                    e.preventDefault();
                    justFocused.current = false;
                }
                onMouseUp?.(e);
            }}
            onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                setText(digits);
                onValueChange(digits === '' ? 0 : parseInt(digits, 10));
            }}
            onBlur={e => {
                focused.current = false;
                justFocused.current = false;
                if (text === '') setText('0');
                onBlur?.(e);
            }}
        />
    );
};
