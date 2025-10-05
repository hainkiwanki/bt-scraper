import Fastify from 'fastify';
import cors from '@fastify/cors';
import { scrapeMultipleAssets } from './scrapeBatch.mjs';
import { scrapeList } from './scrapeList.mjs';

process.on('unhandledRejection', (err) => console.error('Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));

const server = Fastify({
    logger: true, // enable built-in Fastify logs
});

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

server.post('/api/scrape/list', async (req, reply) => {
    const body = (await req.body) as { url: string };
    if (!body.url || typeof body.url !== 'string') {
        return reply.code(400).send({ error: 'Invalid input' });
    }
    let assetUrls = await scrapeList(body.url);
    reply.send(assetUrls);
});

await server.listen({ port: 4000, host: '0.0.0.0' });
console.log('✅ Scraper API running on http://localhost:4000');
