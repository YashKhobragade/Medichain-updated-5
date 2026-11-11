/**
 * QRCodeAPI.io Service
 * Handles QR code generation using the QRCodeAPI.io API
 */

export interface QRCodeAPIOptions {
    data: string;
    size?: number;
    format?: 'png' | 'svg' | 'jpg';
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRCodeAPIResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

/**
 * Generate QR code using QRCodeAPI.io
 * @param options QR code generation options
 * @returns Promise with image URL or error
 */
export async function generateQRCodeImage(
    options: QRCodeAPIOptions
): Promise<QRCodeAPIResponse> {
    const apiKey = process.env.NEXT_PUBLIC_QRCODE_API_KEY;

    if (!apiKey) {
        console.warn('QRCodeAPI.io API key not found, will use fallback');
        return {
            success: false,
            error: 'API key not configured',
        };
    }

    const {
        data,
        size = 512,
        format = 'png',
        errorCorrection = 'H',
    } = options;

    try {
        // Encode the data for URL
        const encodedData = encodeURIComponent(data);

        // Construct API URL
        const apiUrl = `https://api.qrcodeapi.io/v1/create?data=${encodedData}&size=${size}&format=${format}&errorCorrection=${errorCorrection}&apikey=${apiKey}`;

        // Make API request
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': `image/${format}`,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        // Get the image as blob
        const blob = await response.blob();

        // Create object URL for the image
        const imageUrl = URL.createObjectURL(blob);

        return {
            success: true,
            imageUrl,
        };
    } catch (error: any) {
        console.error('Failed to generate QR code via API:', error);
        return {
            success: false,
            error: error.message || 'Failed to generate QR code',
        };
    }
}

/**
 * Download QR code image
 * @param imageUrl URL of the QR code image
 * @param filename Filename for the download
 */
export function downloadQRCodeImage(imageUrl: string, filename: string): void {
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

/**
 * Cleanup object URL to prevent memory leaks
 * @param imageUrl URL to revoke
 */
export function cleanupImageUrl(imageUrl: string): void {
    if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
    }
}
