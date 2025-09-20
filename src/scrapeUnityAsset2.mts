import { chromium } from 'playwright';
import type { UnityAssetData } from './unityAssetData.mjs';

export async function scrapeUnityAsset(url: string): Promise<UnityAssetData> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    // await page.screenshot({ path: 'debug.png', fullPage: true });

    // const html = await page.content();
    // await writeFile('page.html', html);
    console.log('✅ Saved debug.png and page.html');

    const data = await page.evaluate(() => {
        function getText(selector: any) {
            const el = document.querySelector(selector);
            return el?.textContent?.trim() ?? null;
        }

        const title = getText('h1');
        const price = getText('[data-test="price"]') || getText('.price');
        const publisher = getText('[data-test="publisher-name"]') || getText('.publisher__name');
        const description = getText('[data-test="description"]') || getText('.description');
        const releaseDate = getText('[data-test="release-date"]');
        const fileSize = getText('[data-test="file-size"]');

        const images = Array.from(document.querySelectorAll('img'))
            .map((img) => img.getAttribute('src') ?? '')
            .filter((src) => src.includes('cloudfront.net'));

        const videos = Array.from(document.querySelectorAll('video source')).map((vid) => vid.getAttribute('src') ?? '');

        return {
            title,
            price,
            publisher,
            description,
            releaseDate,
            fileSize,
            images,
            videos,
        };
    });
    await browser.close();

    return {
        url,
        ...data,
    };
}

if (process.argv[1]?.endsWith('scrapeUnityAsset.mts')) {
    const result = await scrapeUnityAsset('https://assetstore.unity.com/packages/slug/183453');
    console.log(result);
}
