// Shrinks big photos in the browser before upload. The scanner reads labels
// fine at 3000 px, and hosts like Vercel reject request bodies over ~4.5 MB.
const MAX_SIDE = 3000;
const MAX_BYTES = 3 * 1024 * 1024;

export async function shrinkImage(file: Blob): Promise<Blob> {
    if (file.size <= MAX_BYTES) return file;
    try {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();
        for (const q of [0.9, 0.8, 0.7]) {
            const out: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q));
            if (out && out.size <= MAX_BYTES) return out;
        }
    } catch { /* fall back to the original file */ }
    return file;
}
