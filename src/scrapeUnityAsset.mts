// scrape-asset.mts
import fs from 'fs';
import { pipeline as pipelineCb } from 'stream';
import { promisify } from 'util';
import { chromium } from 'playwright';

const pipeline = promisify(pipelineCb);

export type ScrapeResult = {
    url: string;
    title: string;
    images: string[]; // absolute URLs
    videos: string[]; // absolute URLs (video src or iframe src)
};

export async function scrapeUnityAsset(url: string): Promise<ScrapeResult> {
    if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
        if (!resp || !resp.ok()) {
            console.warn(`warning: status ${resp?.status()} but continuing`);
        }

        // Title
        const title =
            (await page.$eval('meta[property="og:title"]', (el) => el.getAttribute('content')).catch(() => null)) ||
            (await page.$eval('h1', (el) => el.textContent).catch(() => null)) ||
            (await page.title());

        // Images
        const images = await page.$$eval("img, meta[property='og:image']", (els) =>
            els
                .map((el) => el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || el.getAttribute('content'))
                .filter(Boolean)
                .map((u) => new URL(u!, document.baseURI).toString())
        );

        // Videos
        const videos = await page.$$eval("video, source, iframe, meta[property='og:video']", (els) =>
            els
                .map((el) => el.getAttribute('src') || el.getAttribute('content') || '')
                .filter(Boolean)
                .map((u) => new URL(u!, document.baseURI).toString())
        );

        await browser.close();

        return { url, title: title?.trim() ?? '', images, videos };
    } catch (err) {
        await browser.close();
        throw err;
    }
}

/**
 * Helper to download a list of URLs to a directory.
 * Returns array of file paths written.
 */
export async function downloadFiles(urls: string[], outDir: string): Promise<string[]> {
    await fs.promises.mkdir(outDir, { recursive: true });
    const written: string[] = [];

    for (const u of urls) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 60_000);

            const res = await fetch(u, { signal: controller.signal });

            clearTimeout(id);
            if (!res.ok) {
                console.warn(`skipping ${u} — status ${res.status}`);
                continue;
            }
            const contentDisposition = res.headers.get('content-disposition') || '';
            const extMatch = (u.match(/\.[a-z0-9]{2,6}(\?|$)/i) || [null])[0];
            const ext = extMatch ? extMatch.replace(/[\?].*$/, '') : '';
            // try to pick filename
            let filename = decodeURIComponent(u.split('/').pop() || 'file');
            filename = filename.split('?')[0] || `file${ext}`;
            // fallback to content-disposition
            const cdMatch = contentDisposition.match(/filename="?(.+?)"?($|;)/);
            if (cdMatch) {
                filename = cdMatch[1]!;
            }
            // sanitize simple
            filename = filename.replace(/[\/\\:\*\?"<>\|]/g, '_').slice(0, 180);

            const outPath = `${outDir}/${filename}`;
            const body = res.body;
            if (!body) continue;
            await pipeline(body, fs.createWriteStream(outPath));
            written.push(outPath);
        } catch (e) {
            console.warn(`error downloading ${u}: ${(e as Error).message}`);
        }
    }

    return written;
}

/** Example usage (uncomment to run with node) */
(async () => {
    const url = 'https://assetstore.unity.com/packages/slug/183453'; // replace
    const data = await scrapeUnityAsset(url);
    console.log(data.title);
    console.log('images:', data.images);
    console.log('videos:', data.videos);
    await downloadFiles(data.images.concat(data.videos), './downloads');
})();
