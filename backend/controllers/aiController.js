const aiService = require('../services/aiExplanation');
const upstox   = require('../services/upstoxMarketData');

function getCorporateEventsForSymbol(symbol) {
  const sym = symbol.toUpperCase();
  const events = {
    RELIANCE: [
      {
        type: 'FMCG & CONSUMER EXPANSION',
        title: 'Reliance Consumer Products Entry into Ice Cream Segment & Retail Expansion',
        date: '3 Sep 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
      {
        type: 'BOARD DISCLOSURE',
        title: 'Q2 Order Depth & Institutional Trade Settlement Disclosures',
        date: '2 Sep 2026',
        impact: 'Catalyst Proximity (+10% Weight)',
      },
    ],
    TATAMOTORS: [
      {
        type: 'COMMERCIAL ORDER',
        title: '₹100 Crore PV Auto Component Order & Passenger Vehicle Registrations',
        date: '3 Sep 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
      {
        type: 'SALES UPDATE',
        title: 'August 2026 Commercial Vehicle Dispatch & EV Sales Disclosure',
        date: '1 Sep 2026',
        impact: 'Catalyst Proximity (+10% Weight)',
      },
    ],
    HDFCBANK: [
      {
        type: 'LEADERSHIP DISCLOSURE',
        title: 'MD & CEO Transition Notice & NCLT Appeal Filing',
        date: '31 Aug 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
    ],
    MARUTI: [
      {
        type: 'VEHICLE DISPATCH',
        title: 'August 2026 Auto Sales Figures & Suburban Dealer Volume Report',
        date: '1 Sep 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
    ],
    ADANIENT: [
      {
        type: 'CAPITAL ALLOCATION',
        title: 'Adani Infrastructure & Airport Sector Capital Deployment Notice',
        date: '2 Sep 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
    ],
    APOLLOHOSP: [
      {
        type: 'HEALTHCARE EXPANSION',
        title: 'Regional Pharmacy Network Expansion & Occupancy Rate Disclosure',
        date: '2 Sep 2026',
        impact: 'Corporate Event (+10% Weight)',
      },
    ],
  };

  return events[sym] || [
    {
      type: 'BOARD DISCLOSURE',
      title: `${symbol} Exchange Compliance Filing & Quarterly Catalyst Review`,
      date: '2 Sep 2026',
      impact: 'Corporate Event (+10% Weight)',
    },
  ];
}

/**
 * POST /api/ai/explain
 * Body: { summary: { symbol, displayName, currentPrice, lastSeenPrice, ... } }
 */
async function explainStockMovement(req, res, next) {
  try {
    const { summary } = req.body;
    if (!summary || !summary.symbol) {
      return res.status(400).json({ error: 'Missing stock summary payload' });
    }

    const explanation = await aiService.generateExplanation(summary);
    const relatedNews = await upstox.getNewsForSymbols([summary.symbol]);
    const corporateEvents = getCorporateEventsForSymbol(summary.symbol);

    return res.json({
      symbol: summary.symbol,
      explanation,
      relatedNews: relatedNews.slice(0, 3),
      corporateEvents,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  explainStockMovement,
};
