/**
 * aiExplanation.js
 *
 * Generates plain-English narrative explanations for stock movements.
 *
 * Rules:
 *  - Narrative ONLY. No financial advice, predictions, or invented news.
 *  - Uses OpenAI GPT model if OPENAI_API_KEY is configured.
 *  - Falls back to a deterministic template narrative if API key is missing or call fails.
 */

const { OpenAI } = require('openai');

let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Fallback narrative generator (used when OpenAI is unconfigured or unavailable)
 */
function generateFallbackExplanation(summary) {
  const {
    symbol,
    displayName,
    priceChangePct,
    currentPrice,
    lastSeenPrice,
    relativePerformancePct,
    impactScore,
    impactLevel,
    impactBreakdown,
  } = summary;

  const changeText = priceChangePct >= 0
    ? `increased by ${Math.abs(priceChangePct || 0).toFixed(2)}%`
    : `decreased by ${Math.abs(priceChangePct || 0).toFixed(2)}%`;

  const breakdownStr = impactBreakdown
    ? `Price Anomaly: ${impactBreakdown.priceAnomaly}/100, Volume Surge: ${impactBreakdown.volumeAnomaly}/100, Relative Perf: ${impactBreakdown.relativePerformance}/100.`
    : '';

  return `${displayName} (${symbol}) registered a ${impactLevel || 'MID'} Market Impact Score of ${impactScore || 50}/100 since your last visit on 2 Sep 2026. Price ${changeText} from ₹${lastSeenPrice || currentPrice} to ₹${currentPrice}. ${breakdownStr}`;
}

/**
 * Generate AI explanation for stock movement summary based on 7-factor Market Impact Score.
 * @param {object} summary - Structured summary from changeDetection service
 * @returns {Promise<string>} Plain-English explanation text
 */
async function generateExplanation(summary) {
  if (!summary) {
    throw new Error('Summary data is required');
  }

  if (!openai) {
    return generateFallbackExplanation(summary);
  }

  try {
    const bd = summary.impactBreakdown || {};
    const prompt = `
You are a senior financial analyst assistant for a smart market watchlist app.
Explain clearly why this stock was classified with a ${summary.impactLevel || 'MID'} Market Impact Score (${summary.impactScore || 50}/100) since the user's last login on 2 Sep 2026 (Today: 4 Sep 2026).

Facts & 7-Factor Formula Breakdown:
- Stock: ${summary.displayName} (${summary.symbol})
- Market Impact Score: ${summary.impactScore || 50} / 100 (${summary.impactLevel || 'MID'} IMPACT)
- Price Move Since 2 Sep 2026: ${summary.priceChangePct}% (Current 4 Sep: ₹${summary.currentPrice}, Baseline 2 Sep: ₹${summary.lastSeenPrice})
- Relative Performance vs NIFTY: ${summary.relativePerformancePct != null ? `${summary.relativePerformancePct} pp` : 'In-line'}
- Sub-Metric Factor Scores (0-100):
  * Price Anomaly (25% weight): ${bd.priceAnomaly || 50}/100
  * Volume Anomaly (20% weight): ${bd.volumeAnomaly || 50}/100
  * Relative Performance (15% weight): ${bd.relativePerformance || 50}/100
  * News Impact (15% weight): ${bd.newsImpact || 50}/100
  * Corporate Event (10% weight): ${bd.corporateEvent || 50}/100
  * Catalyst Proximity (10% weight): ${bd.catalystProximity || 50}/100
  * Data Confidence (5% weight): ${bd.dataConfidence || 100}/100

Instruction: Provide a crisp 2-sentence plain-English narrative summarizing why the impact score is ${summary.impactLevel || 'MID'} and what key drivers contributed to it since 2 Sep 2026. Do NOT include financial advice or buy/sell recommendations.
`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an objective financial summary assistant.' },
        { role: 'user', content: prompt.trim() },
      ],
      max_tokens: 120,
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || generateFallbackExplanation(summary);
  } catch (err) {
    console.warn('[AI] OpenAI API error, using fallback narrative:', err.message);
    return generateFallbackExplanation(summary);
  }
}

module.exports = {
  generateExplanation,
  generateFallbackExplanation,
};
