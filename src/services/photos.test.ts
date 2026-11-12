import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSignedUrls = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { storage: { from: () => ({ createSignedUrls }) } } }));
import { __clearPhotoCache, photoPath, signPhotoUrls } from './photos';

const stored = (p: string) => `https://x.supabase.co/storage/v1/object/public/member-photos/${p}?v=1`;

describe('private member photos', () => {
    beforeEach(() => { __clearPhotoCache(); createSignedUrls.mockReset(); });

    it('finds the file path in a stored URL', () => {
        expect(photoPath(stored('h1/m1.jpg'))).toBe('h1/m1.jpg');
        expect(photoPath('https://elsewhere.example/pic.jpg')).toBeNull();
    });

    it('swaps stored URLs for signed links, in order, keeping nulls', async () => {
        createSignedUrls.mockResolvedValue({ data: [{ path: 'h1/m1.jpg', signedUrl: 'signed-1' }, { path: 'h1/m2.jpg', signedUrl: 'signed-2' }] });
        expect(await signPhotoUrls([stored('h1/m1.jpg'), null, stored('h1/m2.jpg')])).toEqual(['signed-1', null, 'signed-2']);
    });

    it('reuses a link instead of signing again on every refresh', async () => {
        createSignedUrls.mockResolvedValue({ data: [{ path: 'h1/m1.jpg', signedUrl: 'signed-1' }] });
        await signPhotoUrls([stored('h1/m1.jpg')], 0);
        await signPhotoUrls([stored('h1/m1.jpg')], 3600_000);
        expect(createSignedUrls).toHaveBeenCalledTimes(1);
        await signPhotoUrls([stored('h1/m1.jpg')], 13 * 3600_000);
        expect(createSignedUrls).toHaveBeenCalledTimes(2);
    });

    it('falls back to the stored URL when signing fails', async () => {
        createSignedUrls.mockRejectedValue(new Error('offline'));
        expect(await signPhotoUrls([stored('h1/m1.jpg')])).toEqual([stored('h1/m1.jpg')]);
    });
});
