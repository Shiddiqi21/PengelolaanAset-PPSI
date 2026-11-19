import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';

/**
 * Komponen QR Code Resmi & 100% Bisa Discan Kamera HP / Barcode Scanner.
 * Menggunakan library standar ISO/IEC 'qrcode'.
 */
export default function QrCode({ value = '', size = 80, className = '' }) {
    const [dataUrl, setDataUrl] = useState('');

    useEffect(() => {
        let aktif = true;
        const teks = String(value || 'FTI-UNAND');

        QRCode.toDataURL(
            teks,
            {
                errorCorrectionLevel: 'M',
                margin: 1,
                width: Math.max(size * 2, 200), // Resolusi tajam 2x untuk layar & cetak printer
                color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                },
            },
            (err, url) => {
                if (!err && aktif) {
                    setDataUrl(url);
                }
            }
        );

        return () => {
            aktif = false;
        };
    }, [value, size]);

    if (!dataUrl) {
        return (
            <div
                style={{ width: `${size}px`, height: `${size}px` }}
                className={`flex items-center justify-center rounded bg-surface text-[10px] text-ink-400 font-mono ${className}`}
            >
                QR...
            </div>
        );
    }

    return (
        <img
            src={dataUrl}
            alt={`QR Code ${value}`}
            width={size}
            height={size}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                minWidth: `${size}px`,
                minHeight: `${size}px`,
            }}
            className={`block select-none ${className}`}
        />
    );
}
