import { chromium } from 'playwright';
import type { UnityPublisher } from './types/unityAssetStore/unityPublisher.mjs';
import type { UnityAssetData } from './types/unityAssetStore/unityAssetData.mjs';
// import path from 'path';
// import fs from 'fs';
// import https from 'https';

export async function scrapeGallery(url: string): Promise<UnityAssetData> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });
    const acceptBtn = await page.$('#onetrust-accept-btn-handler');
    if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);
    }
    const result = await page.evaluate(async () => {
        // url
        const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined;
        let slugUrl: string | undefined = undefined;
        if (canonicalUrl) {
            const m = canonicalUrl.match(/-(\d+)$/);
            if (m) {
                slugUrl = `https://assetstore.unity.com/packages/slug/${m[1]}`;
            }
        }

        // title
        const title = document.querySelector('h1')?.textContent?.trim() || undefined;

        // price
        const priceEl = document.querySelectorAll('[data-test="product-detail-price-label"] div');
        let price: string | undefined = undefined;
        if (priceEl.length > 0) {
            price = (priceEl[priceEl.length - 1] as HTMLElement).innerText.trim();
        }

        // publisher
        const publisherLink = document.querySelector<HTMLAnchorElement>('a[href*="/publishers/"]');
        const publisherNodes = document.querySelectorAll('a[href*="/publishers/"] div');
        const publisherName = publisherNodes[publisherNodes.length - 1]?.textContent || undefined;
        const publisherStyle = publisherNodes[0]?.getAttribute('style') || '';
        const iconMatch = publisherStyle.match(/url\(["']?(.*?)["']?\)/);
        let publisherIcon: string | undefined = undefined;
        if (iconMatch) {
            publisherIcon = iconMatch[1]!.startsWith('http') ? iconMatch[1] : `https:${iconMatch[1]}`;
        }
        const publisher: UnityPublisher = {
            name: publisherName,
            url: publisherLink ? publisherLink.href : undefined,
            icon: publisherIcon,
        };

        // version
        const version = document.querySelector('div.product-version div.SoNzt')?.textContent?.trim() || undefined;

        // release date
        const releaseDate = document.querySelector('div.product-date div.SoNzt')?.textContent?.trim() || undefined;

        // img and vid urls
        const urls: Set<string> = new Set();
        const vids: Set<string> = new Set();

        const gallerySelector = 'img[src*="assetstorev1"]';
        const vidSelector = 'iframe[src*="youtube"]';
        const nextBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Next slide"]');
        if (!nextBtn) {
            return { res_urls: [], res_vids: [] };
        }
        let firstSrc: string | undefined = undefined;
        for (let i = 0; i < 5; i++) {
            const img = document.querySelector<HTMLImageElement>(gallerySelector);
            if (img?.src) {
                if (!firstSrc) firstSrc = img.src;
                urls.add(img.src);
            }

            const iframe = document.querySelector<HTMLIFrameElement>(vidSelector);
            if (iframe?.src) {
                vids.add(iframe.src);
            }

            if (!nextBtn) break;

            nextBtn.click();
            await new Promise((r) => setTimeout(r, 1000));

            const currentImg = document.querySelector<HTMLImageElement>(gallerySelector);
            if (currentImg?.src && firstSrc && currentImg.src === firstSrc && urls.size > 1) {
                break;
            }
        }

        return {
            url: canonicalUrl,
            slug: slugUrl,
            title,
            price,
            publisher,
            version,
            releaseDate,
            description: '',
            images: [...urls],
            videos: [...vids],
        };
    });
    await browser.close();
    return result as UnityAssetData;
}

// Example run
scrapeGallery(
    'https://assetstore.unity.com/packages/3d/characters/humanoids/fantasy/horned-knight-rpg-dark-fantasy-modular-female-and-male-character-183453'
)
    .then((result) => {
        console.log(result);
    })
    .catch(console.error);

// async function downloadImage(url: string, folder: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         const filename = path.basename(new URL(url).pathname);
//         const filePath = path.join(folder, filename);

//         fs.mkdirSync(folder, { recursive: true });

//         const file = fs.createWriteStream(filePath);
//         https
//             .get(url, (res) => {
//                 if (res.statusCode !== 200) {
//                     reject(new Error(`Failed ${url}: ${res.statusCode}`));
//                     return;
//                 }
//                 res.pipe(file);
//                 file.on('finish', () => {
//                     file.close((err) => {
//                         if (err) return reject(err);
//                         resolve();
//                     });
//                 });
//             })
//             .on('error', reject);
//     });
// }

// async function main(): Promise<void> {
//     const url = 'https://assetstore.unity.com/packages/slug/183453';
//     const outDir = './images';

//     const result = await scrapeGallery(url, 30);
//     console.log(`Found ${result.res_urls.length} images. Downloading...`);

//     for (const imgUrl of result.res_urls) {
//         await downloadImage(imgUrl, outDir);
//         console.log(`✅ Downloaded: ${imgUrl}`);
//     }

//     console.log('🎉 All done! Images saved in ./images');
// }

// main().catch(console.error);
