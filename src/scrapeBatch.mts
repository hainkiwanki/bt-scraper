import { scrapeUnityAsset } from './scrapeUnityAsset.mjs';
import type { UnityAssetData } from './unityAssetData.mjs';

export async function scrapeMultipleAssets(urls: string[]): Promise<UnityAssetData[]> {
    const results: UnityAssetData[] = [];

    for (const url of urls) {
        try {
            console.log(`Scraping: ${url}`);
            const data = await scrapeUnityAsset(url);
            results.push(data);
        } catch (err) {
            console.error(`Failed to scrape ${url}`, err);
        }
    }

    return results;
}
