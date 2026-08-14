const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();

// Firebase Admin SDK for secure server-side Firestore writes
let adminDb = null;
try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            : null;
        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            adminDb = admin.firestore();
            console.log('[Firebase Admin] Initialized with service account.');
        } else {
            console.warn('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_JSON not set. Webhook Firestore writes disabled.');
        }
    }
} catch (e) {
    console.warn('[Firebase Admin] firebase-admin not installed. Run: npm install firebase-admin');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing (support large image payloads up to 10MB)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy endpoint for YouTube Search API
app.post('/api/youtube/search', async (req, res) => {
    try {
        const { keyword } = req.body;
        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey || apiKey === 'your_youtube_api_key_here') {
            return res.status(503).json({ 
                error: 'YouTube API key is not configured on the backend server.',
                isMockFallback: true 
            });
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=10&key=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('YouTube API Error:', errData);
            return res.status(response.status).json({ 
                error: errData.error?.message || 'YouTube API request failed',
                isMockFallback: true
            });
        }

        const data = await response.json();
        const items = data.items || [];

        const competitors = items.map(item => ({
            id: item.id.videoId,
            title: decodeHtml(item.snippet.title),
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            channel: item.snippet.channelTitle,
            publishedAtText: getRelativeTime(item.snippet.publishedAt)
        }));

        res.json({ competitors, isMockFallback: false });
    } catch (error) {
        console.error('Error in /api/youtube/search:', error);
        res.status(500).json({ error: error.message, isMockFallback: true });
    }
});

// Proxy endpoint for Gemini Vision Analysis API
app.post('/api/gemini/analyze', async (req, res) => {
    try {
        const { keyword, base64DataUrl, competitors } = req.body;

        if (!keyword || !base64DataUrl) {
            return res.status(400).json({ error: 'Keyword and image data are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'your_gemini_api_key_here') {
            return res.status(503).json({ 
                error: 'Gemini API key is not configured on the backend server.',
                isMockFallback: true 
            });
        }

        const base64String = base64DataUrl.split(',')[1] || base64DataUrl;
        const mimeTypeMatch = base64DataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

        const compListText = (competitors || []).map((c, i) => {
            return `Competitor #${i + 1}:
Title: "${c.title}"
Channel: "${c.channel}"
Description: "${c.description || ''}"`;
        }).join('\n\n');

        const promptText = `Compare this YouTube thumbnail against its top competitors in the search results for the target keyword: "${keyword}".

Look at the competitor titles and channels. Tell me specifically how this thumbnail stands out or blends in compared to what's ranking. Mention color, contrast, text size, and emotional hook compared to the competition.

Give an overall CTR potential score out of 10 (as a number in the "score" field, e.g. 8.2).

Here is the context of the top competitor videos ranking for the keyword "${keyword}":
${compListText}

You must return your feedback in a structured JSON object containing exactly four properties:
1. "score": A number from 1 to 10 representing overall CTR potential compared to competitors.
2. "working": Direct comparison of how this thumbnail stands out or performs well.
3. "hurting": Specific ways it blends in or falls short on color, contrast, text size, or emotional hook compared to competition.
4. "fix": The single most impactful adjustment to beat the competing thumbnails.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64String
                        }
                    },
                    {
                        text: promptText
                    }
                ]
            }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        score: { type: "NUMBER" },
                        working: { type: "STRING" },
                        hurting: { type: "STRING" },
                        fix: { type: "STRING" }
                    },
                    required: ["score", "working", "hurting", "fix"]
                }
            }
        };

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Gemini API Error:', errData);
            return res.status(response.status).json({ 
                error: errData.error?.message || 'Gemini API request failed',
                isMockFallback: true 
            });
        }

        const result = await response.json();
        const responseText = result.candidates[0].content.parts[0].text;
        const critique = JSON.parse(responseText);

        res.json({ critique, isMockFallback: false });

    } catch (error) {
        console.error('Error in /api/gemini/analyze:', error);
        res.status(500).json({ error: error.message, isMockFallback: true });
    }
});// --- DODO PAYMENTS ENDPOINTS ---

// 1. Create Dodo Checkout Session Endpoint
app.post('/api/checkout/create-session', async (req, res) => {
    try {
        const { plan, userId, userEmail, returnUrl: clientReturnUrl } = req.body;
        const targetPlan = plan === 'pro' ? 'pro' : 'lifetime';

        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        const isProdOrTestKey = apiKey && apiKey.trim().length > 10 && !apiKey.includes('your_key_here');

        const productId = targetPlan === 'pro'
            ? (process.env.DODO_PRODUCT_ID_PRO || 'pdt_19_pro_monthly')
            : (process.env.DODO_PRODUCT_ID_LIFETIME || 'pdt_30_lifetime_deal');

        // Dynamic return URL based on client origin or fallback to Netlify live app URL
        const returnUrl = clientReturnUrl || 'https://thumbnailspy.netlify.app/app.html?payment=success';
        const finalSuccessUrl = returnUrl.includes('?') 
            ? `${returnUrl}&payment=success&plan=${targetPlan}`
            : `${returnUrl}?payment=success&plan=${targetPlan}`;

        if (!isProdOrTestKey) {
            console.log(`[Dodo Payments Dev Simulation] Session created for user ${userId} (${targetPlan} plan).`);
            return res.json({
                url: `${finalSuccessUrl}&simulated=true`,
                isSimulated: true
            });
        }

        // Call Dodo Payments API
        const isLive = apiKey.startsWith('dodo_sk_live_') || apiKey.includes('live_');
        const primaryUrl = isLive
            ? 'https://live.dodopayments.com/checkouts'
            : 'https://test.dodopayments.com/checkouts';
        const secondaryUrl = isLive
            ? 'https://live.dodopayments.com/v1/checkout/sessions'
            : 'https://test.dodopayments.com/v1/checkout/sessions';

        console.log(`[Dodo Payments Checkout] Requesting session on ${isLive ? 'LIVE' : 'TEST'} mode for product ${productId}...`);

        const requestPayload = {
            product_cart: [{
                product_id: productId,
                quantity: 1
            }],
            product_id: productId,
            quantity: 1,
            customer: {
                email: userEmail || undefined
            },
            return_url: finalSuccessUrl,
            metadata: {
                userId: userId || '',
                plan: targetPlan
            }
        };

        const requestHeaders = {
            'Authorization': `Bearer ${apiKey}`,
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        };

        let response = await fetch(primaryUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok && response.status === 404) {
            console.log('[Dodo Payments] Primary endpoint 404, trying secondary endpoint...');
            response = await fetch(secondaryUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(requestPayload)
            });
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('Dodo Payments Session Creation Error Details:', {
                status: response.status,
                statusText: response.statusText,
                errData
            });

            return res.status(400).json({
                error: errData.message || errData.error || errData.detail || `Dodo API Error (${response.status}): Invalid API Key or Product ID (${productId})`
            });
        }

        const data = await response.json();
        const checkoutUrl = data.url || data.checkout_url || data.payment_url;
        res.json({ url: checkoutUrl, isSimulated: false });

    } catch (err) {
        console.error('Error creating Dodo checkout session:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Dodo Payments Webhook Receiver Endpoint
app.post('/api/webhooks/dodo', async (req, res) => {
    try {
        // --- SECURITY: Validate Webhook Secret ---
        const webhookSecret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET || process.env.DODO_WEBHOOK_SECRET;
        if (webhookSecret) {
            const signature = req.headers['webhook-signature'] || req.headers['x-dodo-signature'] || '';
            const bodyStr = JSON.stringify(req.body);
            const expectedSig = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
            if (signature && !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
                console.warn('[Dodo Webhook] INVALID SIGNATURE - Rejecting request.');
                return res.status(401).json({ error: 'Invalid webhook signature' });
            }
        }

        const payload = req.body;
        const eventType = payload.event_type || payload.type || 'payment.succeeded';
        const data = payload.data || payload;
        const metadata = data.metadata || payload.metadata || {};
        const userId = metadata.userId;
        const plan = metadata.plan || 'lifetime';
        const subscriptionId = data.subscription_id || payload.subscription_id || data.id || '';

        console.log(`[Dodo Webhook Received] Event: ${eventType} | SubID: ${subscriptionId} | User: ${userId}`);

        // Event: Successful Payment / Subscription Activated - Write to Firestore
        if (eventType === 'payment.succeeded' || eventType === 'subscription.active' || eventType === 'checkout.session.completed') {
            if (userId && adminDb) {
                const planData = {
                    plan: plan,
                    maxLimit: 999999,
                    updatedAt: new Date()
                };
                if (plan === 'pro') {
                    // Set expiry 30 days from now
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30);
                    planData.subscriptionExpiresAt = expiresAt;
                    planData.subscriptionId = subscriptionId;
                    planData.cancelAtPeriodEnd = false;
                } else {
                    // Lifetime - no expiry
                    planData.subscriptionExpiresAt = null;
                    planData.subscriptionId = subscriptionId;
                }
                await adminDb.collection('users').doc(userId).update(planData);
                console.log(`[Dodo Webhook] Firestore UPDATED: User ${userId} → ${plan} plan.`);
            } else if (userId) {
                console.warn(`[Dodo Webhook] Firebase Admin not configured - Firestore NOT updated for user ${userId}. Set FIREBASE_SERVICE_ACCOUNT_JSON.`);
            }
        }

        // Event: Subscription Cancelled / Expired - Downgrade to Free
        if (eventType === 'subscription.cancelled' || eventType === 'subscription.expired') {
            if (userId && adminDb) {
                await adminDb.collection('users').doc(userId).update({
                    plan: 'free',
                    maxLimit: 7,
                    cancelAtPeriodEnd: false,
                    subscriptionId: null,
                    updatedAt: new Date()
                });
                console.log(`[Dodo Webhook] Firestore UPDATED: User ${userId} → downgraded to free.`);
            } else if (userId) {
                console.warn(`[Dodo Webhook] Firebase Admin not configured - cannot downgrade user ${userId}.`);
            }
        }

        res.json({ status: 'success', received: true });
    } catch (err) {
        console.error('Dodo Webhook Processing Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Direct Subscription Cancellation Endpoint
app.post('/api/subscription/cancel', async (req, res) => {
    try {
        const { userId, subscriptionId } = req.body;

        // Validate required userId
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            return res.status(400).json({ error: 'Missing required field: userId' });
        }

        const apiKey = process.env.DODO_PAYMENTS_API_KEY;
        const isLive = process.env.DODO_PAYMENTS_MODE === 'live';

        console.log(`[Subscription Cancel Request] User: ${userId}, SubID: ${subscriptionId || 'N/A'}`);

        // Simulation Mode (Used if DODO_PAYMENTS_API_KEY is not configured yet or in local dev)
        if (!apiKey || apiKey.includes('placeholder') || apiKey.includes('your_')) {
            console.log('[Subscription Cancel] Simulation Mode: Cancellation scheduled at period end.');
            return res.json({ 
                success: true, 
                isSimulated: true, 
                message: 'Subscription marked for cancellation at period end.' 
            });
        }

        // Live API call to Dodo Payments
        if (subscriptionId) {
            const cancelUrl = isLive 
                ? `https://live.dodopayments.com/subscriptions/${subscriptionId}/cancel`
                : `https://test.dodopayments.com/subscriptions/${subscriptionId}/cancel`;

            console.log(`[Subscription Cancel API] Posting to ${cancelUrl}...`);

            const cancelResponse = await fetch(cancelUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!cancelResponse.ok) {
                const errData = await cancelResponse.json().catch(() => ({}));
                console.error('[Dodo API Cancel Error]', cancelResponse.status, errData);
                return res.status(400).json({
                    error: errData.message || `Dodo Payments API Error (${cancelResponse.status})`
                });
            }
        } else {
            // No subscriptionId provided — can't call Dodo API but mark locally
            console.warn(`[Subscription Cancel] No subscriptionId for user ${userId}. Marking cancelAtPeriodEnd locally only.`);
        }

        return res.json({ 
            success: true, 
            message: 'Subscription successfully scheduled for cancellation at period end.' 
        });
    } catch (err) {
        console.error('Error cancelling subscription:', err);
        res.status(500).json({ error: err.message });
    }
});


// Helpers
function decodeHtml(html) {
    if (!html) return '';
    return html.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
}

function getRelativeTime(publishDateStr) {
    if (!publishDateStr) return 'Recently';
    const publishDate = new Date(publishDateStr);
    const now = new Date();
    const diffMs = now - publishDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const diffYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365));

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return 'Today';
}

app.listen(PORT, () => {
    console.log(`ThumbnailSpy server running at http://localhost:${PORT}`);
});
