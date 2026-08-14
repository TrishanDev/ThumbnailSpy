// Custom Auth & Checkout Modal Manager for ThumbnailSpy

(function() {
    // 1. Inject Initial Loading Overlay Immediately to prevent UI flicker
    function injectLoadingOverlay() {
        if (document.getElementById('tsAuthLoadingOverlay')) return;
        const isAppPage = window.location.pathname.endsWith('app.html');
        
        // Always inject loading overlay on app.html, or during auth state resolution
        const overlay = document.createElement('div');
        overlay.id = 'tsAuthLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: #0e0e11;
            z-index: 99999;
            display: ${isAppPage ? 'flex' : 'none'};
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            opacity: 1;
            transition: opacity 0.25s ease;
        `;
        overlay.innerHTML = `
            <div style="width:40px; height:40px; border:3px solid rgba(255,255,255,0.08); border-top-color:#4c7dfb; border-radius:50%; animation:tsSpinner 0.75s linear infinite;"></div>
            <span id="tsAuthLoadingText" style="font-family:'Space Grotesk','Inter',sans-serif; font-size:14px; font-weight:600; color:#9a9aa3; letter-spacing:0.02em;">Syncing account...</span>
            <style>
                @keyframes tsSpinner {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;
        document.body.appendChild(overlay);
    }

    function showLoadingOverlay(msg = 'Syncing account...') {
        injectLoadingOverlay();
        const overlay = document.getElementById('tsAuthLoadingOverlay');
        const text = document.getElementById('tsAuthLoadingText');
        if (text) text.innerText = msg;
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        }
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('tsAuthLoadingOverlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 250);
        }
    }

    // Inject Modals Markup
    function injectModalMarkup() {
        injectLoadingOverlay();
        if (document.getElementById('tsAuthModal')) return;

        const container = document.createElement('div');
        container.innerHTML = `
        <!-- GOOGLE AUTH MODAL -->
        <div class="modal-overlay" id="tsAuthModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.82); backdrop-filter:blur(10px); z-index:1000; align-items:center; justify-content:center; padding:20px;">
            <div class="modal-card" style="background:#151517; border:1px solid #29292d; border-radius:20px; width:100%; max-width:420px; padding:36px 30px; text-align:center; box-shadow:0 25px 70px rgba(0,0,0,0.7); position:relative; animation:modalPopIn 0.3s ease;">
                <button type="button" class="modal-close-btn" id="closeAuthModalBtn" style="position:absolute; top:16px; right:16px; background:none; border:none; color:#9a9aa3; font-size:22px; cursor:pointer; padding:4px 8px; line-height:1;">✕</button>

                <div style="display:inline-flex; align-items:center; justify-content:center; width:56px; height:56px; border-radius:14px; background:rgba(37,99,235,0.12); border:1px solid rgba(37,99,235,0.3); color:#4c7dfb; margin-bottom:18px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                </div>

                <h3 style="font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:#fff; margin:0 0 8px 0;">Sign In to ThumbnailSpy</h3>
                <p style="font-size:13.5px; color:#9a9aa3; margin:0 0 20px 0; line-height:1.5;">Access 7 free feed previews & competitor AI diagnostics every month.</p>

                <!-- Required Policy Agreement Checkboxes -->
                <div style="background:#19191c; border:1px solid #27272a; border-radius:12px; padding:14px; margin-bottom:20px; text-align:left; display:flex; flex-direction:column; gap:10px;">
                    <label style="display:flex; align-items:flex-start; gap:10px; font-size:12.5px; color:#d4d4d8; cursor:pointer; line-height:1.4;">
                        <input type="checkbox" id="tsAgreeTerms" style="accent-color:#2563eb; width:16px; height:16px; margin-top:1px; flex-shrink:0; cursor:pointer;">
                        <span>I agree to the <a href="terms.html" style="color:#60a5fa; text-decoration:underline;" target="_blank">Terms of Service</a> & <a href="privacy.html" style="color:#60a5fa; text-decoration:underline;" target="_blank">Privacy Policy</a></span>
                    </label>
                    <label style="display:flex; align-items:flex-start; gap:10px; font-size:12.5px; color:#d4d4d8; cursor:pointer; line-height:1.4;">
                        <input type="checkbox" id="tsAgreeRefund" style="accent-color:#2563eb; width:16px; height:16px; margin-top:1px; flex-shrink:0; cursor:pointer;">
                        <span>I acknowledge that all purchases are final and non-refundable (<a href="refund.html" style="color:#60a5fa; text-decoration:underline;" target="_blank">Refund Policy</a>)</span>
                    </label>
                </div>

                <!-- Google Sign-In Button -->
                <button type="button" id="googleSignInBtn" style="width:100%; display:inline-flex; align-items:center; justify-content:center; gap:12px; padding:13px 20px; background:#ffffff; color:#1f1f1f; font-family:'Inter',sans-serif; font-size:15px; font-weight:600; border-radius:10px; border:none; cursor:pointer; transition:all 0.2s ease; box-shadow:0 4px 15px rgba(0,0,0,0.2);">
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
                        <path fill="#FBBC05" d="M3.87 10.78c-.18-.53-.28-1.1-.28-1.78s.1-1.25.28-1.78L.97 4.96C.35 6.18 0 7.55 0 9s.35 2.82.97 4.04l2.9-2.26z"/>
                        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.97 4.96l2.9 2.26C4.59 5.05 6.62 3.58 9 3.58z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>
            </div>
        </div>

        <!-- CHECKOUT MODAL -->
        <div class="modal-overlay" id="tsCheckoutModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:1050; align-items:center; justify-content:center; padding:20px;">
            <div class="modal-card" style="background:#151517; border:1px solid #2563eb; border-radius:20px; width:100%; max-width:480px; padding:36px 30px; text-align:center; box-shadow:0 25px 80px rgba(37,99,235,0.3); position:relative; animation:modalPopIn 0.3s ease;">
                <button type="button" class="modal-close-btn" id="closeCheckoutModalBtn" style="position:absolute; top:16px; right:16px; background:none; border:none; color:#9a9aa3; font-size:22px; cursor:pointer; padding:4px 8px; line-height:1;">✕</button>

                <span style="display:inline-block; background:#2563eb; color:#fff; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; padding:4px 12px; border-radius:100px; margin-bottom:14px;">Limited Founder Offer</span>
                
                <h3 style="font-family:'Space Grotesk',sans-serif; font-size:24px; font-weight:700; color:#fff; margin:0 0 8px 0;" id="checkoutPlanTitle">$30 Lifetime Pass</h3>
                <p style="font-size:14px; color:#9a9aa3; margin:0 0 24px 0; line-height:1.5;" id="checkoutPlanDesc">Get lifetime access to unlimited feed previews, Gemini vision AI feedback, and A/B testing forever.</p>

                <div style="background:#1b1b1e; border:1px solid #29292d; border-radius:12px; padding:18px; margin-bottom:24px; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <span style="font-weight:600; color:#fff; font-size:15px;" id="checkoutItemName">ThumbnailSpy Lifetime Plan</span>
                        <span style="font-family:'Space Grotesk',sans-serif; font-size:20px; font-weight:700; color:#4c7dfb;" id="checkoutItemPrice">$30</span>
                    </div>
                    <ul style="list-style:none; padding:0; margin:0; font-size:13px; color:#9a9aa3; display:flex; flex-direction:column; gap:6px;">
                        <li style="display:flex; align-items:center; gap:6px;"><span style="color:#4c7dfb;">✓</span> Unlimited competitor feed previews</li>
                        <li style="display:flex; align-items:center; gap:6px;"><span style="color:#4c7dfb;">✓</span> Gemini 3.6 Vision AI recommendations</li>
                        <li style="display:flex; align-items:center; gap:6px;"><span style="color:#4c7dfb;">✓</span> Desktop & Mobile Simulator Views</li>
                        <li style="display:flex; align-items:center; gap:6px;"><span style="color:#4c7dfb;">✓</span> Visual Attention Heatmap analysis</li>
                    </ul>
                </div>

                <button type="button" id="payNowBtn" style="width:100%; padding:14px 24px; background:#2563eb; color:#fff; font-family:'Inter',sans-serif; font-size:16px; font-weight:700; border-radius:10px; border:none; cursor:pointer; transition:all 0.2s ease; box-shadow:0 8px 24px -6px rgba(37,99,235,0.6);">
                    Complete Purchase ($30)
                </button>
                
                <p style="font-size:12.5px; color:#6c6c74; margin-top:14px;">Instant activation • All sales final (<a href="refund.html" style="color:#60a5fa; text-decoration:underline;" target="_blank">Refund Policy</a>)</p>
            </div>
        </div>

        <!-- SUBSCRIPTION STATUS & MANAGEMENT MODAL -->
        <div class="modal-overlay" id="tsSubscriptionModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:1060; align-items:center; justify-content:center; padding:20px;">
            <div class="modal-card" style="background:#151517; border:1px solid #29292d; border-radius:20px; width:100%; max-width:480px; padding:32px 28px; text-align:center; box-shadow:0 25px 80px rgba(0,0,0,0.8); position:relative; animation:modalPopIn 0.3s ease;">
                <button type="button" class="modal-close-btn" id="closeSubscriptionModalBtn" style="position:absolute; top:16px; right:16px; background:none; border:none; color:#9a9aa3; font-size:22px; cursor:pointer; padding:4px 8px; line-height:1;">✕</button>
                <div id="subscriptionModalBody">
                    <!-- Dynamic Content populated by showSubscriptionModal() -->
                </div>
            </div>
        </div>

        <style>
            @keyframes modalPopIn {
                from { opacity: 0; transform: scale(0.92) translateY(10px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            #googleSignInBtn:hover {
                background: #f1f1f1 !important;
                transform: translateY(-1px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important;
            }
            #payNowBtn:hover {
                background: #4c7dfb !important;
                box-shadow: 0 12px 30px -6px rgba(37,99,235,0.8) !important;
            }
        </style>
        `;
        document.body.appendChild(container);

        // Event Handlers
        document.getElementById('closeAuthModalBtn')?.addEventListener('click', hideAuthModal);
        document.getElementById('closeCheckoutModalBtn')?.addEventListener('click', hideCheckoutModal);
        document.getElementById('closeSubscriptionModalBtn')?.addEventListener('click', hideSubscriptionModal);
        
        document.getElementById('tsAuthModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('tsAuthModal')) hideAuthModal();
        });
        document.getElementById('tsCheckoutModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('tsCheckoutModal')) hideCheckoutModal();
        });
        document.getElementById('tsSubscriptionModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('tsSubscriptionModal')) hideSubscriptionModal();
        });

        // Google Sign In Button Handler
        document.getElementById('googleSignInBtn')?.addEventListener('click', async () => {
            const chkTerms = document.getElementById('tsAgreeTerms');
            const chkRefund = document.getElementById('tsAgreeRefund');

            if (!chkTerms?.checked || !chkRefund?.checked) {
                if (typeof showToast === 'function') {
                    showToast('Please check both agreement boxes (Terms & Refund Policy) to continue.', 'warning');
                } else {
                    alert('Please check both agreement boxes (Terms & Refund Policy) to continue.');
                }
                return;
            }

            try {
                showLoadingOverlay('Signing in with Google...');
                hideAuthModal();
                await signInWithGoogle();
            } catch (err) {
                console.error('Google Sign In Error:', err);
                hideLoadingOverlay();
                if (typeof showToast === 'function') {
                    showToast('Google sign-in failed: ' + err.message, 'error');
                } else {
                    alert('Google sign-in failed: ' + err.message);
                }
            }
        });

        // Pay Now Handler (Connects to Dodo Payments Checkout API)
        document.getElementById('payNowBtn')?.addEventListener('click', async () => {
            const user = auth?.currentUser;
            if (!user) {
                hideCheckoutModal();
                showAuthModal();
                if (typeof showToast === 'function') showToast('Please sign in with Google before upgrading.', 'info');
                return;
            }

            const payBtn = document.getElementById('payNowBtn');
            const planTitle = document.getElementById('checkoutPlanTitle')?.innerText || '';
            const selectedPlan = planTitle.toLowerCase().includes('pro') ? 'pro' : 'lifetime';

            if (payBtn) payBtn.innerText = 'Creating Checkout Session...';

            try {
                // API_BASE is set in app.html / index.html as window.THUMBNAILSPY_API_URL
                // For local dev it falls back to localhost:3000
                const API_BASE = window.THUMBNAILSPY_API_URL
                    || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? `http://localhost:${window.location.port || 3000}`
                        : '');

                const response = await fetch(`${API_BASE}/api/checkout/create-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan: selectedPlan,
                        userId: user.uid,
                        userEmail: user.email,
                        returnUrl: window.location.origin + '/app.html'
                    })
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    throw new Error(data.error || 'Server returned HTTP ' + response.status);
                }

                if (data.isSimulated || data.url?.includes('simulated=true')) {
                    if (db) {
                        const updateData = {
                            plan: selectedPlan,
                            maxLimit: 999999,
                            subscriptionId: 'simulated_' + Date.now()
                        };
                        if (selectedPlan === 'pro') {
                            const expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 30);
                            updateData.subscriptionExpiresAt = expiresAt;
                            updateData.cancelAtPeriodEnd = false;
                        }
                        await db.collection('users').doc(user.uid).update(updateData);
                        const updatedProfile = await getUserProfile(user.uid);
                        updateAuthUI(user, updatedProfile);
                        if (typeof updateUsageDisplay === 'function') updateUsageDisplay(updatedProfile);
                    }
                    hideCheckoutModal();
                    if (typeof showToast === 'function') {
                        showToast(`🎉 Success! Activated ${selectedPlan === 'pro' ? 'Pro ($19/mo)' : 'Founder Lifetime ($30)'} Plan.`, 'success');
                    } else {
                        alert(`Activated ${selectedPlan} Plan.`);
                    }
                } else if (data.url) {
                    window.location.href = data.url;
                }
            } catch (err) {
                console.error('Checkout error:', err);
                if (typeof showToast === 'function') showToast('Checkout failed: ' + err.message, 'error');
            } finally {
                if (payBtn) payBtn.innerText = 'Complete Purchase';
            }
        });
    }

    function updateAuthUI(user, profile) {
        if (profile) window.currentUserProfile = profile;
        const containers = document.querySelectorAll('#userAuthContainer, .nav-cta');
        containers.forEach(container => {
            if (!container) return;

            if (user) {
                const displayName = profile?.displayName || user.displayName || user.email || 'User';
                const photoURL = user.photoURL || profile?.photoURL || '';
                const planTag = profile?.plan === 'lifetime' ? '🔥 Lifetime' : (profile?.plan === 'pro' ? '⚡ Pro' : 'Free');
                const initial = displayName.charAt(0).toUpperCase();

                const isLanding = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');
                const isAppPage = window.location.pathname.endsWith('app.html');

                container.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${isAppPage ? `
                        <!-- STANDALONE PLAN BUTTON (App Dashboard Only) -->
                        <button type="button" onclick="showSubscriptionModal()" title="Manage Subscription Plan" style="background:rgba(37,99,235,0.14); border:1px solid rgba(59,130,246,0.35); color:#60a5fa; padding:6px 12px; border-radius:100px; display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.15s ease; box-shadow:0 2px 8px rgba(0,0,0,0.2);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                            <span>Plan</span>
                        </button>
                        ` : ''}

                        <!-- USER PROFILE CAPSULE -->
                        <div style="display:inline-flex; align-items:center; gap:10px; background:rgba(255,255,255,0.06); padding:4px 12px 4px 6px; border-radius:100px; border:1px solid rgba(255,255,255,0.12);">
                            ${photoURL ? `<img src="${photoURL}" style="width:28px; height:28px; border-radius:50%; object-fit:cover; border:1.5px solid #4c7dfb; display:block;" referrerpolicy="no-referrer">` : `<div style="width:28px; height:28px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">${initial}</div>`}
                            <div style="display:flex; flex-direction:column; align-items:flex-start; text-align:left; cursor:pointer;" onclick="showSubscriptionModal()" title="View Subscription Details">
                                <span style="font-size:12px; font-weight:600; color:#fff; line-height:1.1;">${displayName.split(' ')[0]}</span>
                                <span style="font-size:9.5px; color:#4c7dfb; font-weight:700; line-height:1;">${planTag}</span>
                            </div>
                            ${isLanding ? `<a href="app.html" class="btn btn-primary" style="padding:4px 10px; font-size:11px; margin-left:2px;">Open App</a>` : ''}
                            <button type="button" onclick="signOutUser()" title="Sign Out" style="background:none; border:none; color:#9a9aa3; font-size:13px; cursor:pointer; padding:0 4px; line-height:1;">✕</button>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <button type="button" class="btn btn-primary" onclick="showAuthModal()" style="padding:8px 16px; font-size:13px;">Sign In with Google</button>
                `;
            }
        });
    }

    function showSubscriptionModal() {
        injectModalMarkup();
        const modal = document.getElementById('tsSubscriptionModal');
        const body = document.getElementById('subscriptionModalBody');
        if (!modal || !body) return;

        const profile = window.currentUserProfile || null;
        const plan = profile?.plan || 'free';

        if (plan === 'lifetime') {
            body.innerHTML = `
                <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,179,8,0.1)); border:2px solid #f59e0b; color:#fbbf24; margin-bottom:16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-5-4 5-6-7z"/><path d="M5 20h14"/></svg>
                </div>
                <span style="display:inline-block; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; padding:4px 14px; border-radius:100px; margin-bottom:12px;">🔥 Founder Lifetime Pass Active</span>
                <h3 style="font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:#fff; margin:0 0 6px 0;">Lifetime Pro Unlocked</h3>
                <p style="font-size:13.5px; color:#a1a1aa; margin:0 0 24px 0; line-height:1.5;">Your subscription is active and will <strong>NEVER expire</strong>. You have permanent unlimited access to all competitor feed previews and Gemini AI diagnostics.</p>
                
                <div style="background:#1a1a1e; border:1px solid #27272a; border-radius:12px; padding:18px; text-align:left; margin-bottom:24px;">
                    <div style="font-size:13px; font-weight:700; color:#e4e4e7; margin-bottom:10px;">Active Founder Privileges:</div>
                    <ul style="list-style:none; padding:0; margin:0; font-size:13px; color:#a1a1aa; display:flex; flex-direction:column; gap:8px;">
                        <li style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981; font-weight:bold;">✓</span> Unlimited YouTube Search Feed Previews</li>
                        <li style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981; font-weight:bold;">✓</span> Unlimited Gemini Vision AI Recommendations</li>
                        <li style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981; font-weight:bold;">✓</span> Visual Attention Heatmap & Contrast Diagnostics</li>
                        <li style="display:flex; align-items:center; gap:8px;"><span style="color:#10b981; font-weight:bold;">✓</span> All Future ThumbnailSpy Updates</li>
                    </ul>
                </div>

                <button type="button" onclick="hideSubscriptionModal()" style="width:100%; padding:12px; background:#27272a; color:#fff; font-family:'Inter',sans-serif; font-size:14px; font-weight:600; border-radius:10px; border:1px solid #3f3f46; cursor:pointer;">Close</button>
            `;
        } else if (plan === 'pro') {
            const expiresAtMs = profile?.subscriptionExpiresAt ? (profile.subscriptionExpiresAt.toMillis ? profile.subscriptionExpiresAt.toMillis() : new Date(profile.subscriptionExpiresAt).getTime()) : null;
            const daysLeft = expiresAtMs ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24))) : 30;

            body.innerHTML = `
                <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; background:rgba(37,99,235,0.15); border:2px solid #3b82f6; color:#60a5fa; margin-bottom:16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <span style="display:inline-block; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); color:#60a5fa; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; padding:4px 14px; border-radius:100px; margin-bottom:12px;">⚡ Pro Monthly Plan Active</span>
                <h3 style="font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:#fff; margin:0 0 6px 0;">Pro Monthly Active</h3>
                <p style="font-size:13.5px; color:#a1a1aa; margin:0 0 20px 0; line-height:1.5;">You have unlimited previews billed monthly.</p>
                
                <div style="background:#1a1a1e; border:1px solid #27272a; border-radius:12px; padding:16px 18px; text-align:left; margin-bottom:22px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; color:#a1a1aa; font-weight:500;">Billing Cycle Status</div>
                        <div style="font-size:16px; font-weight:700; color:#60a5fa; margin-top:2px;">${daysLeft} Days Remaining</div>
                    </div>
                    <span style="font-size:11px; font-weight:700; padding:4px 10px; background:rgba(16,185,129,0.15); color:#34d399; border-radius:100px;">Active</span>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button type="button" onclick="handleCancelSubscription(${daysLeft})" style="width:100%; padding:12px; background:rgba(239,68,68,0.1); color:#f87171; font-family:'Inter',sans-serif; font-size:13.5px; font-weight:600; border-radius:10px; border:1px solid rgba(239,68,68,0.3); cursor:pointer; transition:all 0.2s ease;">
                        End Subscription
                    </button>
                    <button type="button" onclick="hideSubscriptionModal()" style="width:100%; padding:11px; background:#27272a; color:#fff; font-family:'Inter',sans-serif; font-size:13.5px; font-weight:600; border-radius:10px; border:1px solid #3f3f46; cursor:pointer;">
                        Close
                    </button>
                </div>
            `;
        } else {
            const count = profile?.usageCount || 0;
            const max = profile?.maxLimit || 7;

            body.innerHTML = `
                <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.06); border:2px solid #3f3f46; color:#a1a1aa; margin-bottom:16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                </div>
                <span style="display:inline-block; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#d4d4d8; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; padding:4px 14px; border-radius:100px; margin-bottom:12px;">Free Tier Account</span>
                <h3 style="font-family:'Space Grotesk',sans-serif; font-size:22px; font-weight:700; color:#fff; margin:0 0 6px 0;">Subscription Plan</h3>
                <p style="font-size:13.5px; color:#a1a1aa; margin:0 0 20px 0; line-height:1.5;">You receive <strong>7 free credits</strong> refilled automatically every month.</p>
                
                <div style="background:#1a1a1e; border:1px solid #27272a; border-radius:12px; padding:16px 18px; text-align:left; margin-bottom:22px;">
                    <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600; color:#e4e4e7; margin-bottom:8px;">
                        <span>Monthly Quota Used</span>
                        <span style="color:#60a5fa;">${count} / ${max} credits</span>
                    </div>
                    <div style="width:100%; height:8px; background:#27272a; border-radius:100px; overflow:hidden;">
                        <div style="width:${Math.min(100, Math.round((count/max)*100))}%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa); border-radius:100px;"></div>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button type="button" onclick="hideSubscriptionModal(); showCheckoutModal('$30 Lifetime Pass', '$30', 'One-time payment for lifetime unlimited feed previews.');" style="width:100%; padding:13px; background:#2563eb; color:#fff; font-family:'Inter',sans-serif; font-size:14.5px; font-weight:700; border-radius:10px; border:none; cursor:pointer; box-shadow:0 8px 24px -6px rgba(37,99,235,0.6);">
                        🔥 Get Founder Lifetime ($30 One-Time)
                    </button>
                    <button type="button" onclick="hideSubscriptionModal(); showCheckoutModal('Pro Monthly Plan', '$19/mo', 'Unlimited previews billed monthly.');" style="width:100%; padding:11px; background:#27272a; color:#e4e4e7; font-family:'Inter',sans-serif; font-size:13.5px; font-weight:600; border-radius:10px; border:1px solid #3f3f46; cursor:pointer;">
                        ⚡ Upgrade to Pro ($19/month)
                    </button>
                </div>
            `;
        }

        modal.style.display = 'flex';
    }

    function hideSubscriptionModal() {
        const modal = document.getElementById('tsSubscriptionModal');
        if (modal) modal.style.display = 'none';
    }

    async function handleCancelSubscription(daysLeft) {
        const user = typeof auth !== 'undefined' ? auth.currentUser : null;
        const profile = window.currentUserProfile || null;

        if (!confirm(`Are you sure you want to end your Pro subscription? Your Pro access will remain active for the remaining ${daysLeft} days.`)) {
            return;
        }

        try {
            showLoadingOverlay('Processing cancellation request...');
            const API_BASE = window.THUMBNAILSPY_API_URL
                || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? `http://localhost:${window.location.port || 3000}`
                    : '');

            const response = await fetch(`${API_BASE}/api/subscription/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.uid || '',
                    subscriptionId: profile?.subscriptionId || ''
                })
            });

            const data = await response.json();
            hideLoadingOverlay();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Server error');
            }

            if (user && typeof db !== 'undefined' && db) {
                await db.collection('users').doc(user.uid).update({
                    cancelAtPeriodEnd: true
                });
                if (typeof getUserProfile === 'function') {
                    const updatedProfile = await getUserProfile(user.uid);
                    updateAuthUI(user, updatedProfile);
                }
            }

            if (typeof showToast === 'function') {
                showToast(`ℹ️ Subscription cancelled. Pro access remains active for ${daysLeft} more days.`, 'info');
            }
            hideSubscriptionModal();
        } catch (err) {
            hideLoadingOverlay();
            console.error('Cancellation error:', err);
            if (typeof showToast === 'function') {
                showToast('Cancellation request failed: ' + err.message, 'error');
            } else {
                alert('Cancellation request failed: ' + err.message);
            }
        }
    }

    function showAuthModal() {
        injectModalMarkup();
        const modal = document.getElementById('tsAuthModal');
        if (modal) modal.style.display = 'flex';
    }

    function hideAuthModal() {
        const modal = document.getElementById('tsAuthModal');
        if (modal) modal.style.display = 'none';
    }

    function showCheckoutModal(planName = '$30 Lifetime Pass', price = '$30', desc = 'Get lifetime access to unlimited feed previews and AI diagnostics forever.') {
        injectModalMarkup();
        const modal = document.getElementById('tsCheckoutModal');
        const titleEl = document.getElementById('checkoutPlanTitle');
        const priceEl = document.getElementById('checkoutItemPrice');
        const descEl = document.getElementById('checkoutPlanDesc');
        const nameEl = document.getElementById('checkoutItemName');
        const payBtn = document.getElementById('payNowBtn');

        if (titleEl) titleEl.innerText = planName;
        if (priceEl) priceEl.innerText = price;
        if (descEl) descEl.innerText = desc;
        if (nameEl) nameEl.innerText = `ThumbnailSpy ${planName}`;
        if (payBtn) payBtn.innerText = `Complete Purchase (${price})`;

        if (modal) modal.style.display = 'flex';
    }

    function hideCheckoutModal() {
        const modal = document.getElementById('tsCheckoutModal');
        if (modal) modal.style.display = 'none';
    }

    // Auth state listener: Shows loading overlay while syncing auth & profile
    function setupAuthListener() {
        if (typeof onAuthStateChanged === 'function') {
            onAuthStateChanged((user, profile) => {
                const isAppPage = window.location.pathname.endsWith('app.html');
                const isLanding = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/');

                if (user) {
                    updateAuthUI(user, profile);
                    if (typeof updateUsageDisplay === 'function') {
                        updateUsageDisplay(profile);
                    }
                    hideLoadingOverlay();
                    if (isLanding && document.getElementById('tsAuthLoadingOverlay')?.style.opacity === '1') {
                        window.location.href = 'app.html';
                    }
                } else {
                    if (isAppPage) {
                        window.location.href = 'index.html';
                    } else {
                        updateAuthUI(null, null);
                        hideLoadingOverlay();
                    }
                }
            });
        } else {
            setTimeout(setupAuthListener, 80);
        }
    }

    // Expose global functions
    window.showLoadingOverlay = showLoadingOverlay;
    window.hideLoadingOverlay = hideLoadingOverlay;
    window.showAuthModal = showAuthModal;
    window.hideAuthModal = hideAuthModal;
    window.showCheckoutModal = showCheckoutModal;
    window.hideCheckoutModal = hideCheckoutModal;
    window.showSubscriptionModal = showSubscriptionModal;
    window.hideSubscriptionModal = hideSubscriptionModal;
    window.handleCancelSubscription = handleCancelSubscription;
    window.updateAuthUI = updateAuthUI;

    // Inject immediately to avoid flash of unauthenticated content
    injectLoadingOverlay();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectModalMarkup();
            setupAuthListener();
        });
    } else {
        injectModalMarkup();
        setupAuthListener();
    }
})();
