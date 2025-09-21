import Fastify from 'fastify';
import cors from '@fastify/cors';
import { scrapeMultipleAssets } from './scrapeBatch.mjs';
import type { UnityAssetData } from './types/unityAssetStore/unityAssetData.mjs';

const server = Fastify();

await server.register(cors, {
    origin: true,
});

server.post('/api/scrape', async (req, reply) => {
    const body = (await req.body) as { urls: string[] };
    if (!Array.isArray(body.urls)) {
        return reply.code(400).send({ error: 'Invalid input' });
    }

    let results = await scrapeMultipleAssets(body.urls);
    reply.send(results);
});

server.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Scraper API listening on http://localhost:4000');
});
