import Fastify from 'fastify';
import cors from '@fastify/cors';

const server = Fastify();

await server.register(cors, {
    origin: true,
});

server.post('/api/scrape', async (req, reply) => {
    const body = (await req.body) as { urls: string[] };
    if (!Array.isArray(body.urls)) {
        return reply.code(400).send({ error: 'Invalid input' });
    }

    const results = [];
    for (const url of body.urls) {
        try {
            // const data = await scrapeUnityAsset(url);
            // results.push(data);
        } catch (err) {
            console.error('Failed to scrape URL:', url);
            console.error(err); // ✅ log full error
            results.push({ url, error: (err as Error).message });
        }
    }

    reply.send(results);
});

server.listen({ port: 4000, host: '0.0.0.0' }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Scraper API listening on http://localhost:4000');
});
