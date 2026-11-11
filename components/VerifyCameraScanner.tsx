'use client';

// ============================================================
// Camera scanner for the Verify page.
// Reads the whole camera frame two ways at once and uses
// whichever finds a MediChain QR first:
//   1. jsQR in the browser (fast, works without the ML service)
//   2. the ML scanner (/api/scan, same one Inventory Scan uses),
//      which reads small or blurry codes better
// Inventory Scan and Bulk Verify do not use this file.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { parseBatchCode } from '@/lib/batchCode';

interface Props {
    onCode: (batchId: string) => void;
    onError: (message: string) => void;
}

export function VerifyCameraScanner({ onCode, onError }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hint, setHint] = useState('Starting camera…');

    useEffect(() => {
        let stream: MediaStream | null = null;
        let timer: ReturnType<typeof setInterval> | null = null;
        let done = false, cancelled = false, mlBusy = false, mlOff = false, tick = 0;

        const finish = (id: string) => {
            if (done) return;
            done = true;
            onCode(id);
        };

        const askML = (canvas: HTMLCanvasElement) => {
            if (mlBusy || mlOff) return;
            mlBusy = true;
            canvas.toBlob(async blob => {
                try {
                    if (!blob || done) return;
                    const form = new FormData();
                    form.append('image', blob, 'frame.jpg');
                    const res = await fetch('/api/scan?mode=live', { method: 'POST', body: form });
                    if (res.status === 503) { mlOff = true; return; } // scanner service not running: jsQR alone
                    if (!res.ok) return;
                    const data = await res.json();
                    const hit = (data.codes ?? []).find((c: any) => c.batchId);
                    if (hit) finish(hit.batchId);
                } catch { /* try again on the next frame */ }
                finally { mlBusy = false; }
            }, 'image/jpeg', 0.85);
        };

        const scanFrame = () => {
            const v = videoRef.current, canvas = canvasRef.current;
            if (done || !v || !canvas || v.readyState < 2 || !v.videoWidth) return;
            const scale = Math.min(1, 1280 / v.videoWidth);
            canvas.width = Math.round(v.videoWidth * scale);
            canvas.height = Math.round(v.videoHeight * scale);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
            if (code?.data) {
                const id = parseBatchCode(code.data);
                if (id) return finish(id);
                setHint('That QR is not a MediChain code. Try another one.');
            }
            if (++tick % 4 === 0) askML(canvas); // about every second
        };

        (async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera access needs https or localhost. Open the app at http://localhost:3000.');
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });
                // closed (or remounted by React) while the camera was starting: release it
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
                const v = videoRef.current;
                if (!v) return;
                v.srcObject = stream;
                await v.play();
                setHint('Hold the QR code steady in front of the camera');
                timer = setInterval(scanFrame, 250);
            } catch (e: any) {
                if (cancelled) return;
                onError(e?.name === 'NotAllowedError'
                    ? 'Camera permission was denied. Allow camera access in the browser and try again.'
                    : e?.message || 'Could not start the camera.');
            }
        })();

        return () => {
            done = true; cancelled = true;
            if (timer) clearInterval(timer);
            stream?.getTracks().forEach(t => t.stop());
        };
    }, [onCode, onError]);

    return (
        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: 300 }}>
            <video ref={videoRef} className="w-full h-auto block" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-3/5 max-w-[320px] aspect-square rounded-xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
            </div>
            <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/90" role="status">{hint}</p>
        </div>
    );
}
