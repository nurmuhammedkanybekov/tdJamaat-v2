// Said whenever something the person keeps on this device changes (zikr,
// tasbihat, Quran place, city), so a personal account can save it.
export const LOCAL_EVENT = 'tdjamaat-local';
export const localChanged = () => { try { window.dispatchEvent(new Event(LOCAL_EVENT)); } catch { /* not in a browser */ } };
