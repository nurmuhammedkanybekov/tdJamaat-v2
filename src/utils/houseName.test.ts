import { describe, expect, it } from 'vitest';
import { houseDisplayName } from './houseName';

describe('house names in Latin letters', () => {
    it('keeps Latin names exactly as stored', () => {
        expect(['Mester', 'Damjanich', 'Pannonia', 'Baksai', 'Dobozy', 'Győr'].map(houseDisplayName))
            .toEqual(['Mester', 'Damjanich', 'Pannonia', 'Baksai', 'Dobozy', 'Győr']);
    });
    it('uses the Hungarian spelling of known names', () => {
        expect(['Местер', 'Дамянич', 'ПАННОНИЯ', 'Дебрецен', ' Сегед '].map(houseDisplayName))
            .toEqual(['Mester', 'Damjanich', 'Pannonia', 'Debrecen', 'Szeged']);
    });
    it('transliterates other Cyrillic names letter by letter', () => {
        expect(houseDisplayName('Жаңы үй')).toBe('Jangy üy');
        expect(houseDisplayName('Ала-Тоо')).toBe('Ala-Too');
    });
});
