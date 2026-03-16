// ── Emissionsnyheter – RSS-aggregator ────────────────────────────────────────
// Hämtar nyheter från Cision RSS-feed var 15:e minut.
// Keyword-baserad kategorisering (ingen AI-kostnad för MVP).
// In-memory lagring (max 500 nyheter, äldst kastas).

const RSSParser = require('rss-parser');
const cron = require('node-cron');

let nyheter = [];
const seenUrls = new Set();
const parser = new RSSParser({ timeout: 10000 });

const FEEDS = [
  {
    url: 'https://www.di.se/rss',
    source: 'Dagens Industri',
  },
  {
    url: 'https://www.fi.se/sv/om-fi/nyheter/rss/',
    source: 'Finansinspektionen',
  },
];

function kategorisera(title = '', content = '') {
  const text = (title + ' ' + content).toLowerCase();
  if (/nyemission|företrädesemission|ipo|emission|teckn|kapitalanskaffning/.test(text)) return 'emission';
  if (/prospekt|regelverk|finansinspektionen|\bmar\b|listing act|eudr|ftf/.test(text)) return 'regelverk';
  if (/konvertibel|\blån\b|bridge|finansiering|kredit/.test(text)) return 'finansiering';
  if (/listning|first north|spotlight|nasdaq|nge|aktietorget/.test(text)) return 'listning';
  return 'övrigt';
}

function tidSedanLabel(isoDate) {
  if (!isoDate) return '';
  const diff = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min sedan`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} tim sedan`;
  return `${Math.floor(h / 24)} dagar sedan`;
}

async function fetchFeed({ url, source }) {
  const feed = await parser.parseURL(url);
  let added = 0;
  for (const item of feed.items) {
    const link = item.link || item.guid;
    if (!link || seenUrls.has(link)) continue;
    seenUrls.add(link);
    const publishedAt = item.isoDate || new Date().toISOString();
    nyheter.unshift({
      id: Buffer.from(link).toString('base64').slice(0, 20),
      title: item.title || '',
      content: (item.contentSnippet || item.summary || '').slice(0, 500),
      link,
      source,
      category: kategorisera(item.title, item.contentSnippet || item.summary),
      publishedAt,
      tidSedan: tidSedanLabel(publishedAt),
      fetchedAt: new Date().toISOString(),
    });
    added++;
  }
  // Begränsa till 500 nyheter
  if (nyheter.length > 500) nyheter = nyheter.slice(0, 500);
  console.log(`📰 [Emissionsnyheter] ${source}: +${added} nyheter (totalt ${nyheter.length})`);
  return added;
}

async function fetchAll() {
  for (const feed of FEEDS) {
    try {
      await fetchFeed(feed);
    } catch (e) {
      console.error(`📰 [Emissionsnyheter] RSS-fel (${feed.source}):`, e.message);
    }
  }
  // Uppdatera tidSedan-labels vid varje fetch
  nyheter = nyheter.map(n => ({ ...n, tidSedan: tidSedanLabel(n.publishedAt) }));
}

module.exports = {
  start() {
    fetchAll();
    cron.schedule('*/15 * * * *', fetchAll);
    console.log('📰 [Emissionsnyheter] Aggregator startad (uppdaterar var 15:e minut)');
  },

  getNyheter(category, limit = 50, skip = 0) {
    const filtered = category && category !== 'alla'
      ? nyheter.filter(n => n.category === category)
      : nyheter;
    return {
      news: filtered.slice(skip, skip + limit),
      total: filtered.length,
      hasMore: skip + limit < filtered.length,
    };
  },

  search(q) {
    if (!q) return [];
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return nyheter.filter(n => re.test(n.title) || re.test(n.content)).slice(0, 50);
  },
};
