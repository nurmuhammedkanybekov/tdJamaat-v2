import { afterEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { EN } from './en';
import { __setLangForTests, ordinalSuffix, placeSuffix, t } from './index';

// Every t('…') text in the app, read straight from the source files.
const keysInSource = (): Map<string, string> => {
    const out = new Map<string, string>();
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) { walk(path); continue; }
            if (!/\.tsx?$/.test(name) || /\.test\./.test(name) || path.includes('i18n')) continue;
            const src = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, name.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
            const visit = (n: ts.Node) => {
                if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't' && n.arguments.length) {
                    const a = n.arguments[0];
                    if (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a)) out.set(a.text, path);
                    else out.set(`<not a plain string: ${a.getText()}>`, path);
                }
                ts.forEachChild(n, visit);
            };
            visit(src);
        }
    };
    walk(join(__dirname, '..'));
    return out;
};

const indexes = (s: string) => new Set([...s.matchAll(/\{(\d+)[:|}]/g)].map(m => m[1]));

describe('English texts', () => {
    afterEach(() => __setLangForTests('ky'));
    const keys = keysInSource();

    it('finds the texts in the code', () => {
        expect(keys.size).toBeGreaterThan(400);
    });

    it('every t() text has an English version', () => {
        const missing = [...keys].filter(([k]) => !(k in EN)).map(([k, file]) => `${file}: ${k}`);
        expect(missing).toEqual([]);
    });

    it('no English version is left over from removed texts', () => {
        expect(Object.keys(EN).filter(k => !keys.has(k))).toEqual([]);
    });

    it('English versions use only the placeholders the Kyrgyz text has', () => {
        const bad = Object.entries(EN).filter(([ky, en]) => [...indexes(en)].some(i => !indexes(ky).has(i)));
        expect(bad).toEqual([]);
    });

    it('no Cyrillic left in the English texts', () => {
        // The install hints quote Russian menu names on purpose.
        const bad = Object.entries(EN).filter(([, en]) => /[а-яёңөү]/i.test(en) && !/Домой|Добавить|Установить/.test(en));
        expect(bad).toEqual([]);
    });

    it('fills placeholders, ordinals and plurals', () => {
        __setLangForTests('en');
        expect(t('{0}-апта', 6)).toBe('Week 6');
        expect(t('{0}-орун', 1)).toBe('1st place');
        expect(t('{0}-орун', 12)).toBe('12th place');
        expect(t('{0}-орун', 23)).toBe('23rd place');
        expect(t('{0} апта', 1)).toBe('1 week');
        expect(t('{0} апта', 4)).toBe('4 weeks');
        expect(placeSuffix(2)).toBe('nd');
        expect(t('Бул текст котормосуз')).toBe('Бул текст котормосуз');
    });

    it('Kyrgyz stays exactly as written', () => {
        __setLangForTests('ky');
        expect(t('{0}-апта', 6)).toBe('6-апта');
        expect(t('{0}-орун', 1)).toBe('1-орун');
        expect(t('{0} апта', 4)).toBe('4 апта');
        expect(placeSuffix(2)).toBe('-орун');
    });

    it('ordinal suffixes', () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(n => `${n}${ordinalSuffix(n)}`))
            .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '101st', '111th']);
    });
});
