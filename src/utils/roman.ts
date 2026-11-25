/** Places written the old way, as on the medals: I, II, III … */
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);
