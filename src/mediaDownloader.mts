import { mkdir } from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { request } from 'https';
import { URL } from 'url';
import { scrapeUnityAsset } from './scrapeUnityAsset.mjs';

export async function downloadImagesForAsset(assetTitle: string, imageUrls: string[], outputBaseDir = 'downloads'): Promise<void> {
    if (!imageUrls.length) return;

    const safeTitle = assetTitle?.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_') || 'unnamed_asset';
    const assetFolder = path.join(outputBaseDir, safeTitle);

    await mkdir(assetFolder, { recursive: true });

    const downloads = imageUrls.map(async (url, index) => {
        const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
        const filename = path.join(assetFolder, `image_${index + 1}${ext}`);
        return downloadFile(url, filename);
    });

    await Promise.all(downloads);
}

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(dest);
        request(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
async function main() {
    const urls: string[] = [
        'https://assetstore.unity.com/packages/slug/183453',
        'https://assetstore.unity.com/packages/3d/environments/sci-fi/bundle-5-sci-fi-heavy-station-kit-267537',
    ];

    for (const url of urls) {
        try {
            const data = await scrapeUnityAsset(url);

            console.log(`🔍 Scraped: ${data.title}`);
            console.log(`🖼 Found ${data.images.length} images`);

            await downloadImagesForAsset(data.title ?? 'unnamed', data.images);
            console.log(`✅ Downloaded images for "${data.title}"`);
        } catch (err) {
            console.error(`❌ Failed for ${url}:`, err);
        }
    }
}

main();
