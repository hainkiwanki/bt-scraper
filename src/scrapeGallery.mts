import path from 'path';
import { chromium } from 'playwright';
import fs from 'fs';
import https from 'https';

async function scrapeGallery(
    url: string,
    maxSlides: number = 30
): Promise<{
    res_urls: string[];
    res_vids: string[];
}> {
    const browser = await chromium.launch({ headless: true }); // set true for headless
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });
    const acceptBtn = await page.$('#onetrust-accept-btn-handler');
    if (acceptBtn) {
        await acceptBtn.click();
        // console.log('🍪 Accepted all cookies');
        await page.waitForTimeout(1000);
    }
    const result = await page.evaluate(async () => {
        const urls: Set<string> = new Set();
        const vids: Set<string> = new Set();

        const gallerySelector = 'img[src*="assetstorev1"]';
        const vidSelector = 'iframe[src*="youtube"]';
        const nextBtn = document.querySelector<HTMLButtonElement>('button[aria-label="Next slide"]');
        if (!nextBtn) {
            return { res_urls: [], res_vids: [] };
        }
        let firstSrc: string | null = null;
        for (let i = 0; i < 30; i++) {
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

        return { res_urls: [...urls], res_vids: [...vids] };
    });

    await browser.close();
    return { res_urls: result.res_urls, res_vids: result.res_vids };
}

// Example run
// scrapeGallery('https://assetstore.unity.com/packages/slug/183453')
//     .then((result) => {
//         console.log('Collected URLs:');
//         result.res_urls.forEach((u) => console.log(u));
//         console.log('Collected Vids:');
//         result.res_vids.forEach((u) => console.log(u));
//     })
//     .catch(console.error);

async function downloadImage(url: string, folder: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const filename = path.basename(new URL(url).pathname);
        const filePath = path.join(folder, filename);

        fs.mkdirSync(folder, { recursive: true });

        const file = fs.createWriteStream(filePath);
        https
            .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed ${url}: ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close((err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            })
            .on('error', reject);
    });
}

async function main(): Promise<void> {
    const url = 'https://assetstore.unity.com/packages/slug/183453';
    const outDir = './images';

    const result = await scrapeGallery(url, 30);
    console.log(`Found ${result.res_urls.length} images. Downloading...`);

    for (const imgUrl of result.res_urls) {
        await downloadImage(imgUrl, outDir);
        console.log(`✅ Downloaded: ${imgUrl}`);
    }

    console.log('🎉 All done! Images saved in ./images');
}

main().catch(console.error);
