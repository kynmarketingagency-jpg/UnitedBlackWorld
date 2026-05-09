import { NextResponse } from 'next/server';

const EMBED_URL = process.env.LIBRARIAN_EMBED_URL || 'http://localhost:8787/embed';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MATCH_COUNT = 5;
const MATCH_THRESHOLD = 0.4;

export const runtime = 'nodejs';

// Embed via Cloudflare Workers AI when configured (production), else
// fall back to the local Python embed service (dev). Both use the same
// BAAI/bge-small-en-v1.5 model, so the 384-dim vectors are compatible
// with the `librarian_chunks.embedding` column.
async function embedQuery(text) {
    if (CF_ACCOUNT_ID && CF_API_TOKEN) {
        const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-small-en-v1.5`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${CF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
                signal: AbortSignal.timeout(8000),
            },
        );
        if (!r.ok) throw new Error(`cloudflare ai HTTP ${r.status}`);
        const data = await r.json();
        if (!data?.success) throw new Error('cloudflare ai returned success=false');
        const vector = data.result?.data?.[0];
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error('empty vector from cloudflare ai');
        }
        return vector;
    }

    const r = await fetch(EMBED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`embed HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data?.vector) || data.vector.length === 0) {
        throw new Error('empty vector from embed service');
    }
    return data.vector;
}

export async function POST(request) {
    if (!SUPABASE_URL || !SERVICE_KEY) {
        return NextResponse.json(
            { error: 'server missing supabase credentials' },
            { status: 500 },
        );
    }

    let q;
    try {
        const body = await request.json();
        q = (body?.q || '').trim();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }
    if (!q) return NextResponse.json({ passages: [] });

    // 1. Embed the user's question.
    let vector;
    try {
        vector = await embedQuery(q);
    } catch (e) {
        return NextResponse.json(
            { error: `embed service unavailable: ${e.message}` },
            { status: 503 },
        );
    }

    const vecLiteral = '[' + vector.map((v) => Number(v).toFixed(7)).join(',') + ']';

    // 2. Vector similarity search via the librarian_search RPC.
    let hits;
    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/librarian_search`, {
            method: 'POST',
            headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query_embedding: vecLiteral,
                match_count: MATCH_COUNT,
                match_threshold: MATCH_THRESHOLD,
            }),
        });
        if (!r.ok) {
            const txt = await r.text();
            throw new Error(`rpc HTTP ${r.status}: ${txt.slice(0, 200)}`);
        }
        hits = await r.json();
    } catch (e) {
        return NextResponse.json({ error: `search failed: ${e.message}` }, { status: 500 });
    }

    if (!hits || hits.length === 0) {
        return NextResponse.json({ passages: [] });
    }

    // 3. Enrich with each book's pdf_url + thumbnail so the UI can deep-link.
    const ids = [...new Set(hits.map((h) => h.resource_id))].filter(Boolean);
    let resources = [];
    if (ids.length > 0) {
        try {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/resources?id=in.(${ids.join(',')})&select=id,pdf_url,thumbnail_url`,
                {
                    headers: {
                        apikey: SERVICE_KEY,
                        Authorization: `Bearer ${SERVICE_KEY}`,
                    },
                },
            );
            if (r.ok) resources = await r.json();
        } catch {
            // fall through — passages still useful without pdf links
        }
    }

    const byId = Object.fromEntries(resources.map((r) => [r.id, r]));

    const passages = hits.map((h) => ({
        resource_id: h.resource_id,
        book_title: h.book_title,
        author: h.author,
        page_number: h.page_number,
        content: h.content,
        similarity: Number(h.similarity?.toFixed?.(3) ?? h.similarity),
        pdf_url: byId[h.resource_id]?.pdf_url ?? null,
        thumbnail_url: byId[h.resource_id]?.thumbnail_url ?? null,
    }));

    return NextResponse.json({ passages });
}
