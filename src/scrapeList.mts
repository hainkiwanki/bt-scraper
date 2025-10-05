import { chromium } from 'playwright';

export async function scrapeList(url: string): Promise<string[]> {
    const browser = await chromium.launch({ headless: false, slowMo: 10000 });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle' });

    const acceptBtn = await page.$('#onetrust-accept-btn-handler');
    if (acceptBtn) {
        await acceptBtn.click();
        await page.waitForTimeout(1000);
    }

    const allEntries: Set<string> = new Set();
    while (true) {
        await page.waitForSelector('[data-test="asset-grid"]', { timeout: 10000 });
        const pageEntries = await page.evaluate(() => {
            const grid = document.querySelector('[data-test="asset-grid"]')?.firstElementChild as HTMLElement | undefined;
            if (!grid) {
                return [];
            }

            const cards = grid.querySelectorAll(':scope > div');
            const results: string[] = [];
            results.push(cards.length.toString());

            cards.forEach((card, index) => {
                const link = card.querySelector<HTMLAnchorElement>('a[href*="/packages/"]');
                const urlLink = link?.href.split('?')[0];
                if (urlLink) {
                    results.push(urlLink);
                    return;
                }
            });

            return results;
        });

        pageEntries.forEach((entry) => allEntries.add(entry));

        const nextButton = await page.$('button[label="Next"]:not([disabled])');
        if (!nextButton) break;

        await nextButton.click();
        await page.waitForTimeout(2000);
    }

    await browser.close();
    return Array.from(allEntries);
}
(async () => {
    const listUrl = 'https://assetstore.unity.com/lists/props-environment-9071908986885';
    const assetLinks = await scrapeList(listUrl);
    console.log(`Found ${assetLinks.length} assets:`);
    console.log(assetLinks);
})();
