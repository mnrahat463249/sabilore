
window.API_URL = '/api';
window.BASE_URL = '';



window._throttle = function (fn, delay) {
    delay = delay || 100;
    let lastCall = 0;
    return function () {
        const now = Date.now();
        if (now - lastCall < delay) return;
        lastCall = now;
        return fn.apply(this, arguments);
    };
};


window._debounce = function (fn, delay) {
    delay = delay || 200;
    let timer;
    return function () {
        const ctx = this, args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () { fn.apply(ctx, args); }, delay);
    };
};


window._rafThrottle = function (fn) {
    let raf = null;
    return function () {
        const ctx = this, args = arguments;
        if (raf) return;
        raf = requestAnimationFrame(function () {
            fn.apply(ctx, args);
            raf = null;
        });
    };
};


window.cachedFetch = async function (url) {
    
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } });
    if (!res.ok) throw new Error(`Fetch failed: ${url}`);
    return await res.json();
};


const SABILORE_DOM = {
    get navLogo() { return this._navLogo || (this._navLogo = document.getElementById('nav-logo-img')); },
    get footerLogo() { return this._footerLogo || (this._footerLogo = document.getElementById('footer-logo-img')); },
    get preloader() { return this._preloader || (this._preloader = document.getElementById('site-preloader')); },
    get cartIcon() { return this._cartIcon || (this._cartIcon = document.getElementById('cart-icon-count')); },
    get wishlistIcon() { return this._wishlistIcon || (this._wishlistIcon = document.getElementById('wishlist-count')); }
};


window.SABILORE_UTILS = {
    escapeHTML: (str) => String(str || '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m] || m)),
    getImageUrl: (path) => path ? (path.startsWith('http') ? path : window.BASE_URL + path) : '/assets/img/placeholder.jpg',
    getDiscountPercentage: (price, salePrice) => { if (!price || !salePrice || salePrice >= price) return 0; return Math.round(((price - salePrice) / price) * 100); },
    isStockOut: (product) => { if (product.variants_summary) { const stocks = product.variants_summary.split(',').map(v => parseInt(v.split(':')[2] || 0)); return stocks.reduce((a, b) => a + b, 0) <= 0; } if (product.stock !== undefined) return product.stock <= 0; return false; },
    getResponsiveImageAttrs: (path) => { 
        const url = window.SABILORE_UTILS.getImageUrl(path); 
        if (url.endsWith('.webp')) {
            const base = url.substring(0, url.lastIndexOf('.'));
            const srcset = `${base}-600.webp 600w, ${url} 900w, ${base}-1920.webp 1200w`;
            return `src="${url}" srcset="${srcset}" sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"`;
        }
        return `src="${url}"`; 
    },
    setResponsiveImage: (img, path) => {
        if (!img) return;
        const url = window.SABILORE_UTILS.getImageUrl(path);
        img.src = url;
        if (url.endsWith('.webp')) {
            const base = url.substring(0, url.lastIndexOf('.'));
            img.srcset = `${base}-600.webp 600w, ${url} 900w, ${base}-1920.webp 1200w`;
            if (!img.sizes) {
                img.sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw";
            }
        } else {
            img.srcset = "";
        }
    },
    formatPrice: (price) => { return '৳' + Number(price).toLocaleString(); },
    getCategories: async () => {
        try {
            const response = await fetch(`${window.API_URL}/products/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            return await response.json();
        } catch (e) {
            console.error('[Categories] Fetch error:', e);
            throw e;
        }
    },
    buildItemListSchema: (products, listName = 'Products') => {
        const schema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": products.map((p, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "item": {
                    "@type": "Product",
                    "name": p.name,
                    "url": (window.BASE_URL || window.location.origin) + `/product/${p.slug}`,
                    "image": window.SABILORE_UTILS.getImageUrl(p.image),
                    "offers": {
                        "@type": "Offer",
                        "price": p.sale_price || p.price,
                        "priceCurrency": "BDT",
                        "availability": window.SABILORE_UTILS.isStockOut(p) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
                    }
                }
            }))
        };
        const scriptId = 'seo-itemlist-schema-' + listName.replace(/\s+/g, '-').toLowerCase();
        let schemaEl = document.getElementById(scriptId);
        if (schemaEl) schemaEl.remove();
        schemaEl = document.createElement('script');
        schemaEl.type = 'application/ld+json';
        schemaEl.id = scriptId;
        schemaEl.text = JSON.stringify(schema, null, 0);
        document.head.appendChild(schemaEl);
    },

    renderProductCard: (product, colClass = 'col-6 col-md-4 col-lg-3', cardOptions = {}) => {
        const u = window.SABILORE_UTILS;
        const { loading = 'lazy', fetchpriority = 'auto', staggerIndex = 0 } = cardOptions;
        const animationClass = staggerIndex > 0 && staggerIndex <= 6 ? ` slide-ltr stagger-${staggerIndex}` : (staggerIndex === 0 ? ' slide-ltr' : '');
        
        const img2 = product.image2 ? u.getImageUrl(product.image2) : '';
        const isFav = typeof isFavorited === 'function' ? isFavorited(product.id) : false;
        const discountPct = product.discount_percentage || u.getDiscountPercentage(product.price, product.sale_price);
        const stockOut = u.isStockOut(product);

        const sizes = product.available_sizes ? product.available_sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
        const sizeHtml = sizes.length > 0 ? `<div class="shop-card-sizes d-flex flex-wrap gap-1 mt-1 mb-1">${sizes.map(s => `<span class="size-pill">${s}</span>`).join('')}</div>` : '';
        const sizePreviewHtml = sizes.length > 0 ? `<div class="shop-card-sizes-overlay"><span class="small fw-bold">Available:</span> ${sizes.join(', ')}</div>` : '';

        
        const colorMap = {};
        if (product.variants_summary) {
            product.variants_summary.split(',').forEach(v => {
                const parts = v.split(':');
                const color = parts[0];
                const size = parts[1];
                const stock = parts[2];
                if (color && size) {
                    if (!colorMap[color]) colorMap[color] = 0;
                    colorMap[color] += parseInt(stock || 0);
                }
            });
        }
        let colors = Object.keys(colorMap);
        let colorSwatchesHtml = '';
        if (colors.length > 0) {
            colorSwatchesHtml = `<div class="shop-card-colors mt-2 mb-1 d-flex flex-wrap gap-1">
                ${colors.map(c => `
                    <a href="product/${product.slug}?color=${encodeURIComponent(c)}" title="${c}" draggable="false">
                        <span class="shop-color-swatch" style="background-color: ${c.toLowerCase().replace(/\s+/g, '')};"></span>
                    </a>`).join('')}
            </div>`;
        }

        return `
            <div class="${colClass} scroll-reveal-card${animationClass}">
                <div class="asos-card">
                    <div class="asos-card-img-wrap" data-hover-img="${img2 || ''}" data-product-id="${product.id}">
                        <a href="product/${product.slug}" draggable="false">
                            <img ${u.getResponsiveImageAttrs(product.image)} class="asos-card-img" alt="${product.name}" loading="${loading}" fetchpriority="${fetchpriority}" width="900" height="1200" draggable="false">
                            ${sizePreviewHtml}
                        </a>
                        ${stockOut ? '<span class="asos-badge-fast" style="background:#dc3545 !important; color:#fff !important; left:auto; right:10px; top:10px;">STOCK OUT</span>' :
                (product.is_top_selling ? '<span class="asos-badge-fast bg-dark text-white" style="color: #fff !important;">TOP SELLING</span>' :
                    (product.is_featured ? '<span class="asos-badge-fast">SELLING FAST</span>' : ''))}
                        ${product.is_free_delivery ? '<span class="asos-badge-fast" style="background: linear-gradient(135deg, #7c3aed, #a78bfa) !important; color:#fff !important; bottom:10px; top:auto; left:10px; font-size:0.6rem; letter-spacing:0.04em; border-radius: 4px;">🚚 FREE DELIVERY</span>' : ''}
                        ${discountPct > 0 && !stockOut ? `<span class="asos-badge-sale bg-violet text-white border-0 px-2 py-1" style="background: #7c3aed !important; border-radius: 4px;">${discountPct}% OFF</span>` : ''}
                        <button class="asos-heart-btn ${isFav ? 'asos-heart-active' : ''}" data-action="favorite" data-id="${product.id}" aria-label="${isFav ? 'Remove ' + u.escapeHTML(product.name) + ' from Wishlist' : 'Add ' + u.escapeHTML(product.name) + ' to Wishlist'}" aria-pressed="${isFav ? 'true' : 'false'}" title="${isFav ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                            <i class="${isFav ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="asos-card-body">
                        <a href="product/${product.slug}" class="text-decoration-none text-dark" draggable="false">
                            <p class="asos-card-name">${product.name}</p>
                            <p class="asos-card-price">${product.sale_price ? `<span class="text-danger fw-bold">${u.formatPrice(product.sale_price)}</span> <span class="text-muted small text-decoration-line-through ms-1">${u.formatPrice(product.price)}</span>` : u.formatPrice(product.price)}</p>
                        </a>
                        ${colorSwatchesHtml}
                        ${sizeHtml}
                    </div>
                </div>
            </div>`;
    },

    
    renderSkeleton: (count = 8, colClass = 'col-6 col-md-4 col-lg-3') => {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
            <div class="${colClass} mb-4">
                <div class="skeleton-card pulseshow" style="background: rgba(124,58,237,0.03); border: 1px solid rgba(124,58,237,0.08); border-radius: 16px; overflow: hidden;">
                    <div class="skeleton-img pulse-slow" style="aspect-ratio: 3/4; background: rgba(124,58,237,0.05);"></div>
                    <div class="p-3">
                        <div class="skeleton-text pulse-slow" style="height: 14px; width: 85%; background: rgba(124,58,237,0.05); border-radius: 6px; margin-bottom: 8px;"></div>
                        <div class="skeleton-text pulse-slow" style="height: 12px; width: 45%; background: rgba(124,58,237,0.05); border-radius: 6px;"></div>
                    </div>
                </div>
            </div>`;
        }
        return html;
    },

    

    fetchBulkProducts: async (ids) => {
        if (!ids || ids.length === 0) return [];
        try {
            const response = await fetch(`${window.API_URL}/products/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (!response.ok) throw new Error('Bulk fetch failed');
            return await response.json();
        } catch (e) {
            console.error('[BulkFetch] Error:', e);
            return [];
        }
    },

    updateSiteMeta: function (title, description, image, url) {
        if (title) {
            document.title = title;
            ['meta[property="og:title"]', 'meta[name="twitter:title"]'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.setAttribute('content', title);
            });
        }
        if (description) {
            const cleanDesc = description.replace(/<[^>]*>?/gm, '').substring(0, 160);
            ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.setAttribute('content', cleanDesc);
            });
        }
        if (image) {
            const imgUrl = image.startsWith('http') ? image : window.BASE_URL + image;
            ['meta[property="og:image"]', 'meta[name="twitter:image"]'].forEach(sel => {
                const el = document.querySelector(sel);
                if (el) el.setAttribute('content', imgUrl);
            });
        }
        if (url) {
            const canonical = document.querySelector('link[rel="canonical"]');
            if (canonical) canonical.setAttribute('href', url);
            const ogUrl = document.querySelector('meta[property="og:url"]');
            if (ogUrl) ogUrl.setAttribute('content', url);
        }
    },

    prefillShippingInfo: (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const savedInfo = JSON.parse(localStorage.getItem('shipping_info') || '{}');
        Object.keys(savedInfo).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input && !input.value) {
                input.value = savedInfo[key];
            }
        });
    },

    
    Cart: {
        get: () => JSON.parse(localStorage.getItem('cart') || '[]'),
        set: (cart) => {
            localStorage.setItem('cart', JSON.stringify(cart));
            if (window.updateGlobalBadges) window.updateGlobalBadges();
        },
        add: function (product, options = {}) {
            const cart = this.get();
            const existing = cart.find(item =>
                item.id === product.id &&
                item.size === (options.size || '') &&
                item.color === (options.color || '')
            );

            if (existing) {
                existing.quantity += (options.quantity || 1);
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    size: options.size || '',
                    color: options.color || '',
                    quantity: options.quantity || 1,
                    slug: product.slug,
                    tummy_shape: options.tummy_shape || ''
                });
            }
            this.set(cart);

            
            if (window.SabiloreTracking) {
                window.SabiloreTracking.trackAddToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: options.quantity || 1
                });
            }
        },
        remove: function (index) {
            const cart = this.get();
            cart.splice(index, 1);
            this.set(cart);
        },
        updateQty: function (index, delta) {
            const cart = this.get();
            if (cart[index]) {
                cart[index].quantity += delta;
                if (cart[index].quantity <= 0) cart.splice(index, 1);
                this.set(cart);
            }
        },
        clear: function () {
            this.set([]);
        },
        getTotal: function () {
            return this.get().reduce((sum, item) => sum + (item.price * item.quantity), 0);
        }
    },

    
    ProductDetail: {
        formatPrice: (p) => window.SABILORE_UTILS.formatPrice(p), 
        getImages: (product) => {
            const imgs = [];
            ['image', 'image2', 'image3', 'image4'].forEach(k => {
                if (product[k]) imgs.push(product[k].startsWith('http') ? product[k] : window.BASE_URL + product[k]);
            });
            return imgs;
        },
        getColorImageMap: (product) => {
            const map = {};
            const variants = product.variants || [];
            const colors = [...new Set(variants.map(v => v.color))].filter(Boolean);
            colors.forEach(c => {
                const colorVariants = variants.filter(v => v.color === c);
                const imgs = [];
                colorVariants.forEach(v => {
                    ['image1', 'image2', 'image3', 'image4'].forEach(k => {
                        if (v[k]) {
                            const url = v[k].startsWith('http') ? v[k] : window.BASE_URL + v[k];
                            if (!imgs.includes(url)) imgs.push(url);
                        }
                    });
                });
                if (imgs.length > 0) map[c.toLowerCase()] = imgs;
            });
            
            ['image1_color', 'image2_color', 'image3_color', 'image4_color'].forEach((f, i) => {
                const c = product[f];
                const k = i === 0 ? 'image' : `image${i + 1}`;
                if (c && product[k]) {
                    const key = c.toLowerCase();
                    const url = product[k].startsWith('http') ? product[k] : window.BASE_URL + product[k];
                    if (!map[key]) map[key] = [];
                    if (!map[key].includes(url)) map[key].push(url);
                }
            });
            return map;
        },
        getUniqueSizes: (variants) => {
            if (!Array.isArray(variants)) return [];
            return [...new Set(variants.map(v => v.size))].filter(Boolean);
        },
        
        updateStockStatus: function (config) {
            const { variants, size, color, selectors, baseSku } = config;
            const stockEl = document.getElementById(selectors.stockStatus);
            const cartBtn = document.getElementById(selectors.cartBtn);
            const orderBtn = document.getElementById(selectors.orderNowBtn);
            const skuValEl = document.getElementById(selectors.skuVal);
            const stockOutBadge = document.getElementById('main-stock-out-badge');

            if (!stockEl) return null;

            const getStock = (sz, col) => {
                return variants.reduce((sum, v) => {
                    const sizeMatch = sz ? (v.size && v.size.toUpperCase().includes(sz.toUpperCase())) : true;
                    const colorMatch = col ? v.color === col : true;
                    if (sizeMatch && colorMatch) return sum + v.stock;
                    return sum;
                }, 0);
            };

            const isOutOfStock = variants.reduce((sum, v) => sum + v.stock, 0) <= 0;

            if (isOutOfStock) {
                stockEl.innerHTML = '<span class="text-danger">PRODUCT OUT OF STOCK</span>';
                if (cartBtn) { cartBtn.disabled = true; cartBtn.innerHTML = 'Stock Out'; }
                if (orderBtn) { orderBtn.disabled = true; orderBtn.innerHTML = 'Stock Out'; }
                if (stockOutBadge) stockOutBadge.classList.remove('d-none');
                if (skuValEl) skuValEl.innerText = baseSku || '--';
                return null;
            }

            if (size || color) {
                const stock = getStock(size, color);
                const variant = variants.find(v => {
                    const sizeMatch = size ? (v.size && v.size.toUpperCase().includes(size.toUpperCase())) : true;
                    const colorMatch = color ? v.color === color : true;
                    return sizeMatch && colorMatch;
                });

                if (stock > 0) {
                    stockEl.innerHTML = `<span class="${stock < 5 ? 'text-warning' : 'text-success'}">In Stock: ${stock} available</span>`;
                    if (cartBtn) { cartBtn.disabled = false; cartBtn.innerHTML = '<i class="fas fa-shopping-cart me-2"></i> Add to Cart'; }
                    if (orderBtn) { orderBtn.disabled = false; orderBtn.innerHTML = '<i class="fas fa-bolt me-2"></i> Order Now'; }
                    if (stockOutBadge) stockOutBadge.classList.add('d-none');

                    if (variant && variant.price_override) {
                        const pEl = document.getElementById(selectors.price);
                        if (pEl) {
                            pEl.dataset.price = variant.price_override;
                            pEl.innerText = `৳${Number(variant.price_override).toLocaleString()}`;
                        }
                    }
                    if (skuValEl) skuValEl.innerText = (variant && variant.sku) || baseSku || '--';
                } else {
                    stockEl.innerHTML = '<span class="text-danger">STOCK OUT</span>';
                    if (cartBtn) { cartBtn.disabled = true; cartBtn.innerHTML = 'Stock Out'; }
                    if (orderBtn) { orderBtn.disabled = true; orderBtn.innerHTML = 'Stock Out'; }
                    if (stockOutBadge) stockOutBadge.classList.remove('d-none');
                    if (skuValEl) skuValEl.innerText = baseSku || '--';
                }
                return variant;
            } else {
                stockEl.innerHTML = 'Select options to see availability';
                stockEl.className = 'theme-text-muted small fw-bold';
                if (stockOutBadge) stockOutBadge.classList.add('d-none');
                if (skuValEl) skuValEl.innerText = baseSku || '--';
                return null;
            }
        }
    }
};


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // Add page-loaded immediately to improve FCP
    document.body.classList.add('page-loaded');
});






window.updateMetaTags = function (title, description, image, url) {
    window.SABILORE_UTILS.updateSiteMeta(title, description, image, url);
};




(function injectPreloader() {
    
    if (document.getElementById('site-preloader')) return;

    
    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('/home');
    if (!isHome) return;

    const preloaderHtml = `
        <div id="site-preloader" class="site-preloader">
            <div class="preloader-content">
                <img id="preloader-logo-img" src="" alt="Loading..." class="preloader-logo" style="display:none;">
            </div>
        </div>
    `;
    
    if (document.body) {
        document.body.insertAdjacentHTML('afterbegin', preloaderHtml);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (!document.getElementById('site-preloader')) {
                document.body.insertAdjacentHTML('afterbegin', preloaderHtml);
            }
        });
    }

    
    setTimeout(hidePreloader, 1500);
})();

function hidePreloader() {
    const preloader = document.getElementById('site-preloader');
    if (preloader && !preloader.classList.contains('fade-out')) {
        preloader.classList.add('fade-out');
        setTimeout(() => preloader.remove(), 700);
    }
}




window.getSettings = async function () {
    if (window.siteSettings) return window.siteSettings;
    
    
    if (window.getSiteSettingsFast) {
        const s = await window.getSiteSettingsFast();
        if (s) {
            window.siteSettings = s;
            return s;
        }
    }

    
    if (!window._settingsPromise) {
        window._settingsPromise = window.cachedFetch(`${API_URL}/admin/settings`, 120000)
            .then(s => {
                window.siteSettings = s;
                return s;
            })
            .catch(e => { window._settingsPromise = null; throw e; });
    }
    return window._settingsPromise;
};




async function applyBranding(preloadedSettings = null) {
    try {
        let settings;
        if (preloadedSettings) {
            settings = preloadedSettings;
            window.siteSettings = settings; 
        } else {
            settings = await window.getSettings();
        }


        
        hidePreloader();

        
        const fitMode = settings.image_display_mode || 'contain';
        document.body.classList.remove('fit-contain', 'fit-cover');
        document.body.classList.add(`fit-${fitMode}`);

        
        const siteName = settings.site_name || 'SABILORÉ';
        

        
        const nameElements = document.querySelectorAll('.site-name-text');
        nameElements.forEach(el => el.textContent = siteName);
        
        
        if (!document.title || document.title === 'SABILORÉ') {
            document.title = siteName;
        }

        
        const siteLogoMobile = settings.site_logo; 
        const siteLogoDesktop = settings.site_logo_desktop || settings.site_logo; 

        if (siteLogoMobile || siteLogoDesktop) {

            const isMobileView = window.innerWidth <= 991.98; 

            
            const targetUrlHeader = isMobileView
                ? (siteLogoMobile ? (siteLogoMobile.startsWith('http') ? siteLogoMobile : BASE_URL + siteLogoMobile) : '')
                : (siteLogoDesktop ? (siteLogoDesktop.startsWith('http') ? siteLogoDesktop : BASE_URL + siteLogoDesktop) : '');

            
            const finalHeaderUrl = targetUrlHeader || (isMobileView ?
                (siteLogoDesktop ? (siteLogoDesktop.startsWith('http') ? siteLogoDesktop : BASE_URL + siteLogoDesktop) : '') :
                (siteLogoMobile ? (siteLogoMobile.startsWith('http') ? siteLogoMobile : BASE_URL + siteLogoMobile) : ''));

            [SABILORE_DOM.navLogo, SABILORE_DOM.footerLogo].forEach(el => {
                if (el && finalHeaderUrl) {
                    el.src = finalHeaderUrl;
                    el.onload = () => {
                        el.style.display = 'inline-block';
                        
                        if (el.id === 'nav-logo-img') {
                            const t = document.getElementById('nav-logo-text');
                            if (t) t.style.display = 'none';
                        }
                        if (el.id === 'footer-logo-img') {
                            const t = document.querySelector('.footer-brand-text');
                            if (t) { t.style.display = 'none'; t.classList.add('d-none'); }
                        }
                    };
                    el.onerror = () => {
                        el.style.display = 'none';
                        
                        if (el.id === 'nav-logo-img') {
                            const t = document.getElementById('nav-logo-text');
                            if (t) t.style.display = 'inline-block';
                        }
                        if (el.id === 'footer-logo-img') {
                            const t = document.querySelector('.footer-brand-text');
                            if (t) { t.style.display = 'inline-block'; t.classList.remove('d-none'); }
                        }
                    };
                }
            });

            
            if (siteLogoMobile || siteLogoDesktop) {
                const preloaderUrl = siteLogoMobile ?
                    (siteLogoMobile.startsWith('http') ? siteLogoMobile : BASE_URL + siteLogoMobile) :
                    (siteLogoDesktop.startsWith('http') ? siteLogoDesktop : BASE_URL + siteLogoDesktop);

                
                const preLogo = document.getElementById('preloader-logo-img');
                if (preLogo) {
                    preLogo.src = preloaderUrl;
                    preLogo.style.display = 'block';
                    const textLogo = document.getElementById('preloader-text-logo');
                    if (textLogo) textLogo.style.display = 'none';
                }
            }
        } else {
            
            const navText = document.getElementById('nav-logo-text');
            if (navText) navText.style.display = 'inline-block';
            const footerText = document.querySelector('.footer-brand-text');
            if (footerText) { footerText.style.display = 'inline-block'; footerText.classList.remove('d-none'); }
        }

        
        if (settings.site_favicon) {
            const faviconUrl = settings.site_favicon.startsWith('http') ? settings.site_favicon : BASE_URL + settings.site_favicon;
            const icons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');

            if (icons.length > 0) {
                icons.forEach(icon => icon.href = faviconUrl);
            } else {
                
                const link = document.createElement('link');
                link.rel = 'icon';
                link.href = faviconUrl;
                document.head.appendChild(link);
            }
        }

        

        
        if (settings.hero_description) {
            const descEl = document.getElementById('hero-short-desc');
            if (descEl) {
                descEl.textContent = settings.hero_description.substring(0, 60);
                descEl.style.display = 'block';
            }
        }

        
        if (settings.facebook_url) {
            document.querySelectorAll('a[href*="facebook"]').forEach(a => a.href = settings.facebook_url);
        }
        if (settings.instagram_url) {
            document.querySelectorAll('a[href*="instagram"]').forEach(a => a.href = settings.instagram_url);
        }
        if (settings.whatsapp_url) {
            document.querySelectorAll('a[href*="wa.me"]').forEach(a => a.href = settings.whatsapp_url);
        }

        
        if (settings.contact_email) {
            const emailEl = document.getElementById('footer-contact-email');
            if (emailEl) emailEl.innerHTML = settings.contact_email;
        }
        if (settings.contact_phone) {
            const phoneEl = document.getElementById('footer-contact-phone');
            if (phoneEl) phoneEl.innerHTML = settings.contact_phone;
        }

        
        if (settings.footer_faq) {
            loadFaqContent(settings.footer_faq);
        }

        
        if (settings.footer_support) {
            loadSupportContent(settings.footer_support);
        }

        
        if (settings.legal_terms) {
            const el = document.getElementById('terms-content');
            if (el) el.innerHTML = settings.legal_terms;
            footerDrawerCache.terms = settings.legal_terms;
        }
        if (settings.legal_privacy) {
            const el = document.getElementById('privacy-content');
            if (el) el.innerHTML = settings.legal_privacy;
            footerDrawerCache.privacy = settings.legal_privacy;
        }
        if (settings.legal_delivery) {
            footerDrawerCache.delivery = settings.legal_delivery;
        }
        if (settings.legal_returns) {
            footerDrawerCache.returns = settings.legal_returns;
        }

        
        if (settings.footer_contact_text) {
            footerDrawerCache.contact_text = settings.footer_contact_text;
        }

        
        loadPaymentLogos();

    } catch (error) {
        console.error('Branding error:', error);
        showBrandFallback();
    }
}






const footerDrawerCache = {
    faq: '',
    support: '',
    delivery: '',
    returns: '',
    contact_text: ''
};

function loadFaqContent(faqData) { footerDrawerCache.faq = faqData; }
function loadSupportContent(supportData) { footerDrawerCache.support = supportData; }


window.addContactRipple = function(e) {
    const card = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(card.clientWidth, card.clientHeight);
    const radius = diameter / 2;
    const rect = card.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top  = `${e.clientY - rect.top  - radius}px`;
    circle.className = 'ripple';
    const old = card.querySelector('.ripple');
    if (old) old.remove();
    card.appendChild(circle);
};

window.showFooterDrawer = function (type) {
    const drawer = document.getElementById('footer-info-drawer');
    const overlay = document.getElementById('footer-drawer-overlay');
    const title = document.getElementById('footer-drawer-title');
    const body = document.getElementById('footer-drawer-body');

    if (!drawer || !overlay || !title || !body) return;

    
    const titles = {
        'faq': 'Frequently Asked Questions',
        'support': 'Support',
        'delivery': 'Delivery Information',
        'returns': 'Exchange & Returns',
        'contact': 'Contact Us'
    };
    title.textContent = titles[type] || 'Information';

    
    if (type === 'contact') {
        body.innerHTML = `
            <style>
                .contact-hero-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
                .contact-hero-card {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    padding: 22px 12px;
                    text-align: center;
                    text-decoration: none;
                    color: inherit;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), border-color 0.2s, background 0.2s;
                    display: block;
                    -webkit-tap-highlight-color: transparent;
                }
                .contact-hero-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.28); background: rgba(255,255,255,0.08); color: inherit; }
                .contact-hero-card:active { transform: scale(0.96); }
                .contact-hero-card .ripple {
                    position: absolute; border-radius: 50%;
                    background: rgba(255,255,255,0.18);
                    transform: scale(0); animation: rippleAnim 0.55s linear;
                    pointer-events: none;
                }
                @keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }
                .chc-icon-wrap {
                    width: 52px; height: 52px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 10px;
                    font-size: 1.25rem;
                }
                .chc-icon-wrap.email-ic { background: linear-gradient(135deg,#667eea,#764ba2); }
                .chc-icon-wrap.phone-ic { background: linear-gradient(135deg,#11998e,#38ef7d); }
                .chc-icon-wrap.chat-ic  { background: linear-gradient(135deg,#25D366,#128C7E); }
                .chc-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.55; margin-bottom: 3px; }
                .chc-value { font-size: 0.78rem; font-weight: 600; opacity: 0.9; word-break: break-all; }
                .chc-badge { display:inline-block; background:#25D366; color:#fff; font-size:0.6rem; font-weight:700; letter-spacing:0.06em; padding:2px 8px; border-radius:99px; text-transform:uppercase; }
                .custom-drawer-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; }
                .form-group-flat { margin-bottom: 16px; }
                .form-group-flat label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45; display: block; margin-bottom: 6px; }
                .drawer-input-flat { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; color: inherit; font-size: 0.88rem; outline: none; transition: border-color 0.2s, background 0.2s; }
                .drawer-input-flat:focus { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.09); }
                .drawer-btn-flat { width: 100%; background: #fff; color: #111; border: none; border-radius: 10px; padding: 12px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s, transform 0.15s; margin-top: 4px; }
                .drawer-btn-flat:hover { opacity: 0.88; transform: translateY(-1px); }
                .drawer-btn-flat:active { transform: scale(0.98); }
                .drawer-availability { text-align: center; font-size: 0.72rem; opacity: 0.4; letter-spacing: 0.06em; margin-top: 20px; }
            </style>

            <div class="contact-hero-grid">
                <a href="mailto:sabiloreofficial@gmail.com" class="contact-hero-card" onclick="addContactRipple(event)">
                    <div class="chc-icon-wrap email-ic"><i class="fas fa-envelope" style="color:#fff;"></i></div>
                    <div class="chc-label">Email Us</div>
                </a>
                <a href="tel:+8801812244988" class="contact-hero-card" onclick="addContactRipple(event)">
                    <div class="chc-icon-wrap phone-ic"><i class="fas fa-phone-alt" style="color:#fff;"></i></div>
                    <div class="chc-label">Call Us</div>
                </a>
                <a href="https://wa.me/8801812244988" target="_blank" rel="noopener" class="contact-hero-card" onclick="addContactRipple(event)">
                    <div class="chc-icon-wrap chat-ic"><i class="fab fa-whatsapp" style="color:#fff;"></i></div>
                    <div class="chc-label">WhatsApp</div>
                </a>
            </div>

            <div id="contact-info-dynamic" class="mb-3 text-white-50 small"></div>

            <form id="contact-form" class="custom-drawer-form">
                <div class="form-group-flat">
                    <label>Name</label>
                    <input type="text" id="contact-name" name="contact_name" class="drawer-input-flat text-reset" placeholder="Your name" required>
                </div>
                <div class="form-group-flat">
                    <label>Email</label>
                    <input type="email" id="contact-email-input" name="contact_email_input" class="drawer-input-flat text-reset" placeholder="your@email.com" required>
                </div>
                <div class="form-group-flat">
                    <label>Message</label>
                    <textarea id="contact-message" name="contact_message" class="drawer-input-flat text-reset" rows="4" placeholder="How can we help you?" required></textarea>
                </div>
                <button type="submit" class="drawer-btn-flat">Send Message</button>
            </form>
            <div id="contact-success" class="alert alert-success mt-3 p-2 rounded-0 d-none text-center small">Message Sent!</div>
            <p class="drawer-availability">Contact Sabilore Support · Available 24/7</p>
        `;

        
        setTimeout(() => {
            if (footerDrawerCache.contact_text) {
                const extraContact = document.getElementById('contact-info-dynamic');
                if (extraContact) extraContact.innerHTML = footerDrawerCache.contact_text;
            }

            const contactForm = document.getElementById('contact-form');
            if (contactForm) {
                contactForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const btn = contactForm.querySelector('button');
                    const successAlert = document.getElementById('contact-success');
                    
                    
                    const name = document.getElementById('contact-name').value.trim();
                    const email = document.getElementById('contact-email-input').value.trim();
                    const message = document.getElementById('contact-message').value.trim();
                    
                    if (!name || !email || !message) return;

                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
                    successAlert.classList.add('d-none');
                    successAlert.classList.remove('alert-success', 'alert-danger');

                    try {
                        const res = await fetch('/api/contact', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name, email, subject: 'Customer Support Inquiry', message })
                        });
                        
                        const data = await res.json();
                        
                        if (res.ok) {
                            contactForm.reset();
                            successAlert.textContent = data.message || 'Message Sent!';
                            successAlert.classList.add('alert-success');
                            successAlert.classList.remove('d-none');
                        } else {
                            throw new Error(data.message || 'Failed to send message');
                        }
                    } catch (err) {
                        console.error('[CONTACT FORM]', err);
                        successAlert.textContent = err.message || 'Network Error. Please try again.';
                        successAlert.classList.add('alert-danger');
                        successAlert.classList.remove('d-none');
                    } finally {
                        btn.disabled = false;
                        btn.innerHTML = 'SEND MESSAGE';
                    }
                });
            }
        }, 100);

    } else if (type === 'faq') {
        const rawData = (footerDrawerCache.faq || '').trim();
        let faqs = [];

        
        if (rawData.startsWith('[') && rawData.endsWith(']')) {
            try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed)) {
                    faqs = parsed.map(item => ({
                        q: item.question || item.q,
                        a: item.answer || item.a
                    }));
                }
            } catch (e) {
                console.warn('[FAQ] Failed to parse JSON, falling back to text parsing', e);
            }
        }

        
        if (faqs.length === 0) {
            
            const plainText = rawData.replace(/<[^>]+>/g, '\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
            const lines = plainText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            
            const qPattern = /^(\d+)[.)]\s+(.+)/;
            let currentQ = null;
            let currentA = [];

            lines.forEach(line => {
                const match = line.match(qPattern);
                if (match) {
                    
                    if (currentQ !== null) {
                        faqs.push({ q: currentQ, a: currentA.join(' ') });
                    }
                    currentQ = match[2];
                    currentA = [];
                } else if (currentQ !== null) {
                    if (line.length > 0) currentA.push(line);
                }
            });
            
            if (currentQ !== null) {
                faqs.push({ q: currentQ, a: currentA.join(' ') });
            }
        }

        if (faqs.length > 0) {
            
            body.innerHTML = `
                <div class="faq-accordion-list">
                    ${faqs.map((item, i) => `
                        <div class="faq-item" id="faq-item-${i}">
                            <button class="faq-question" onclick="toggleFaqItem(${i})" aria-expanded="false">
                                <span class="faq-num">${i + 1}</span>
                                <span class="faq-q-text">${item.q}</span>
                                <i class="fas fa-chevron-down faq-chevron"></i>
                            </button>
                            <div class="faq-answer" id="faq-ans-${i}" style="display:none;">
                                <p>${item.a || 'Answer coming soon.'}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (rawData.trim()) {
            
            body.innerHTML = `<div class="legal-rich-text">${rawData}</div>`;
        } else {
            body.innerHTML = `<p class="text-white-50 small">No FAQs available yet.</p>`;
        }

    } else {
        
        let rawHtml = footerDrawerCache[type] || '<p class="text-muted">Information not available.</p>';
        body.innerHTML = `<div class="legal-rich-text">${rawHtml}</div>`;
    }

    
    drawer.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden'; 
};

window.closeFooterDrawer = function () {
    const drawer = document.getElementById('footer-info-drawer');
    const overlay = document.getElementById('footer-drawer-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
};


window.toggleFaqItem = function (index) {
    const ans = document.getElementById(`faq-ans-${index}`);
    const btn = ans?.previousElementSibling;
    const chevron = btn?.querySelector('.faq-chevron');
    if (!ans) return;

    const isOpen = ans.style.display !== 'none';

    
    document.querySelectorAll('.faq-answer').forEach(el => {
        el.style.display = 'none';
        const b = el.previousElementSibling;
        if (b) {
            b.setAttribute('aria-expanded', 'false');
            b.classList.remove('faq-open');
            const ch = b.querySelector('.faq-chevron');
            if (ch) ch.style.transform = 'rotate(0deg)';
        }
    });

    
    if (!isOpen) {
        ans.style.display = 'block';
        if (btn) {
            btn.setAttribute('aria-expanded', 'true');
            btn.classList.add('faq-open');
        }
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
};








function initNavbarSearch() {
    const searchWrap = document.getElementById('header-search-wrap');
    const searchInput = document.getElementById('header-search-input');
    const closeBtn = document.getElementById('header-search-close-btn');
    const submitBtn = document.getElementById('header-search-submit-btn');
    const ticker = document.querySelector('.logo-ticker-bar');

    const searchConfig = [
        { inputId: 'mobile-direct-search-input', btnId: 'mobile-direct-search-btn' },
        { inputId: 'mobile-search-input', btnId: 'mobile-search-btn' },
        
        { btnId: 'desktop-search-btn', action: () => openSearchBar() }
    ];

    function openSearchBar() {
        if (!searchWrap) return;

        
        const isTickerVisible = ticker && ticker.style.transform !== 'translateY(-100%)';
        searchWrap.classList.toggle('search-bar-shifted', isTickerVisible);

        searchWrap.classList.add('active');
        setTimeout(() => searchInput?.focus(), 100);
    }

    function closeSearchBar() {
        if (searchWrap) searchWrap.classList.remove('active');
    }

    const doGlobalSearch = () => {
        const query = searchInput?.value.trim();
        if (query) {
            window.location.href = `/shop?search=${encodeURIComponent(query)}`;
            closeSearchBar();
        }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeSearchBar);
    if (submitBtn) submitBtn.addEventListener('click', doGlobalSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') doGlobalSearch();
        });
    }

    
    document.addEventListener('mousedown', (e) => {
        if (searchWrap && searchWrap.classList.contains('active')) {
            if (!searchWrap.contains(e.target) && !e.target.closest('#desktop-search-btn')) {
                closeSearchBar();
            }
        }
    });

    searchConfig.forEach(cfg => {
        const btn = document.getElementById(cfg.btnId);
        if (!btn) return;

        if (cfg.action) {
            btn.addEventListener('click', cfg.action);
        } else {
            const input = document.getElementById(cfg.inputId);
            const doSearch = () => {
                const query = input?.value.trim();
                if (query) window.location.href = `/shop?search=${encodeURIComponent(query)}`;
            };
            btn.addEventListener('click', doSearch);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') doSearch();
                });
            }
        }
    });

    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSearchBar();
    });
}




function updateAuthUI() {
    const token = localStorage.getItem('token');
    const user = getUser();

    
    const guestDesktop = document.getElementById('auth-guest-desktop');
    const userDesktop = document.getElementById('user-menu-desktop');

    if (token && user) {
        if (guestDesktop) guestDesktop.classList.add('d-none');
        if (userDesktop) userDesktop.classList.remove('d-none');
    } else {
        if (guestDesktop) guestDesktop.classList.remove('d-none');
        if (userDesktop) userDesktop.classList.add('d-none');
    }

    
    const mobileAuthPlaceholder = document.getElementById('mobile-auth-placeholder');
    if (mobileAuthPlaceholder) {
        if (token && user) {
            mobileAuthPlaceholder.innerHTML = `
                <div class="d-flex flex-column gap-3 mt-4 border-top border-dark pt-4">
                    <a href="/profile" class="text-decoration-none text-dark fw-bold text-uppercase d-flex align-items-center gap-2">
                        <i class="fas fa-user-circle fs-5 opacity-75"></i> My Profile
                    </a>
                    <a href="/orders" class="text-decoration-none text-dark fw-bold text-uppercase d-flex align-items-center gap-2">
                        <i class="fas fa-box fs-5 opacity-75"></i> Orders
                    </a>
                    <a href="#" onclick="logoutUser(event)" class="text-decoration-none text-danger fw-bold text-uppercase d-flex align-items-center gap-2">
                        <i class="fas fa-sign-out-alt fs-5 opacity-75"></i> Logout
                    </a>
                </div>
            `;
        } else {
            mobileAuthPlaceholder.innerHTML = `
                <div class="mt-4 border-top border-dark pt-4 text-center">
                    <a href="/login" class="btn btn-dark rounded-0 w-100 py-3 text-uppercase fw-bold tracking-widest">
                        Login / Register
                    </a>
                </div>
            `;
        }
    }
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
        return null;
    }
}

function logoutUser(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'home';
}
window.logoutUser = logoutUser;


function updateGlobalBadges() {
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    ['cart-count', 'mobile-cart-count'].forEach(id => updateBadge(id, cartCount));

    
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    ['fav-count-desktop', 'fav-count-mobile'].forEach(id => updateBadge(id, favorites.length));
}

function updateBadge(id, count) {
    const el = document.getElementById(id);
    if (el) {
        const oldCount = parseInt(el.textContent || '0');
        
        if (count > 0) {
            el.textContent = count;
            el.style.setProperty('display', 'flex', 'important');
            el.style.opacity = '1';
        } else {
            el.textContent = '';
            el.style.setProperty('display', 'none', 'important');
        }
        
        if (count > oldCount && count > 0) {
            el.classList.remove('badge-pop-anim');
            void el.offsetWidth;
            el.classList.add('badge-pop-anim');
        }
    }
}

function addToCart(productId, size, color) {
    const product = {
        id: productId,
        name: (document.getElementById('product-name')?.innerText || '').trim() || 'Product',
        price: Number(document.getElementById('product-price')?.dataset?.price || document.getElementById('product-price')?.innerText?.replace(/[^\d]/g, '') || 0),
        image: document.getElementById('main-product-image')?.src || '',
        slug: window.location.pathname.split('/').pop()
    };

    window.SABILORE_UTILS.Cart.add(product, {
        size: size,
        color: color,
        quantity: 1,
        tummy_shape: localStorage.getItem('last_tummy_shape') || ''
    });

    showMiniToast(`Added to cart 🛒${color ? ' · ' + color : ''}${size ? ' · ' + size : ''}`);
}
window.addToCart = addToCart;

window.SABILORE_UTILS.fetchAndRenderProducts = async (apiUrl, containerId, options = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
        colClass = 'col-6 col-md-4 col-lg-3',
        limit = null,
        fallbackUrl = null,
        emptyMsg = 'No products found.',
        errorMsg = 'Failed to load products.',
        onSuccess = null,
        repeat = false 
    } = options;

    try {
        const fullUrl = limit ? `${apiUrl}?limit=${limit}` : apiUrl;
        let response = await fetch(fullUrl);
        let products = await response.json();

        if ((!Array.isArray(products) || products.length === 0) && fallbackUrl) {
            response = await fetch(fallbackUrl);
            const allProducts = await response.json();
            products = allProducts.slice(0, limit || 8);
        }

        if (!Array.isArray(products) || products.length === 0) {
            container.innerHTML = `<div class="col-12 text-center py-5 text-muted">${emptyMsg}</div>`;
            return;
        }

        let cardsHtml = products.map((p, index) => {
            const cardOptions = { 
                staggerIndex: (index % 6) + 1,
                
                loading: (index < 4 && !repeat) ? 'eager' : 'lazy',
                fetchpriority: (index < 4 && !repeat) ? 'high' : 'auto'
            };
            return window.SABILORE_UTILS.renderProductCard(p, colClass, cardOptions);
        }).join('');
        if (repeat) cardsHtml += cardsHtml;

        container.innerHTML = cardsHtml;

        if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
        if (onSuccess) onSuccess(products);

    } catch (error) {
        console.error(`[FetchAndRender] Error (${containerId}):`, error);
        container.innerHTML = `<div class="col-12 text-center py-5 text-muted">${errorMsg}</div>`;
    }
};

window.SABILORE_UTILS.fetchAndRenderCategories = async (containerId) => {
    const row = document.getElementById(containerId);
    if (!row) return;

    try {
        const categories = await window.SABILORE_UTILS.getCategories();
        if (categories.length === 0) {
            row.innerHTML = '<div class="col-12 text-center py-5 theme-text-muted">No collections available yet.</div>';
            return;
        }

        row.innerHTML = categories.map(cat => {
            const catImage = cat.image ? (cat.image.startsWith('http') ? cat.image : window.BASE_URL + cat.image) : null;
            const catVideo = cat.video ? (cat.video.startsWith('http') ? cat.video : window.BASE_URL + cat.video) : null;
            return `
                <div class="col-6 col-md-3 scroll-reveal-card">
                    <a href="/shop?cat=${encodeURIComponent(cat.slug)}" class="collection-modern-card text-decoration-none">
                        <div class="collection-media-box">
                            ${cat.active_media === 'video' && catVideo
                    ? `<video src="${catVideo}" autoplay muted loop playsinline class="collection-video"></video>`
                    : (catImage
                        ? `<img src="${catImage}" alt="${cat.name}" class="collection-img" loading="lazy">`
                        : `<div class="collection-placeholder"><i class="fas fa-tag"></i></div>`
                    )
                }
                            <div class="collection-overlay-simple"></div>
                        </div>
                        <div class="collection-info-simple">
                            <h3 class="collection-name-simple">${cat.name}</h3>
                            <span class="collection-link-simple">Explore <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </a>
                </div>
            `;
        }).join('');

        if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
    } catch (error) {
        console.error('[Categories] Load error:', error);
        row.innerHTML = '<div class="col-12 text-center py-5 text-muted">Unable to load collections.</div>';
    }
};




async function loadFeaturedProducts() {
    const apiBase = window.API_URL || '/api';
    try {
        let res = await fetch(`${apiBase}/products/featured`);
        let products = await res.json();

        
        if (!Array.isArray(products) || products.length === 0) {
            res = await fetch(`${apiBase}/products?limit=8`);
            products = await res.json();
        }

        if (!Array.isArray(products) || products.length === 0) {
            
            return;
        }

        
        const section = document.getElementById('featured');
        const row = document.getElementById('featured-products-row');
        if (!section || !row) return;

        section.classList.remove('d-none');
        row.innerHTML = products.slice(0, 8).map((p, i) =>
            window.SABILORE_UTILS.renderProductCard(p, 'col-6 col-md-4 col-lg-3', { 
                staggerIndex: (i % 6) + 1,
                loading: i < 4 ? 'eager' : 'lazy',
                fetchpriority: i < 4 ? 'high' : 'auto'
            })
        ).join('');
        
        window.SABILORE_UTILS.buildItemListSchema(products.slice(0, 8), 'Featured Products');

        if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
    } catch (err) {
        console.warn('Failed to load featured products:', err);
    }
}




async function loadHomeSaleProducts() {
    const apiBase = window.API_URL || '/api';
    try {
        const res = await fetch(`${apiBase}/products/sale?limit=4`);
        const products = await res.json();
        if (!Array.isArray(products) || products.length === 0) return;

        const row = document.getElementById('sale-products-row');
        if (!row) return;

        row.innerHTML = products.map((p, i) =>
            window.SABILORE_UTILS.renderProductCard(p, 'col-6 col-md-3', { 
                staggerIndex: (i % 6) + 1,
                loading: i < 2 ? 'eager' : 'lazy',
                fetchpriority: i < 2 ? 'high' : 'auto'
            })
        ).join('');
        
        window.SABILORE_UTILS.buildItemListSchema(products, 'Sale Products');

        if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
    } catch (err) {
        console.warn('Failed to load sale products:', err);
    }
}

async function loadNewArrivals() {
    const track = document.getElementById('na-marquee-track');
    if (!track) return;

    try {
        const response = await fetch(`${window.API_URL}/products/new-arrivals?limit=12`, { cache: 'no-store' });
        const products = await response.json();

        if (!Array.isArray(products) || products.length === 0) {
            track.innerHTML = `<div class="p-5 text-muted small">No new arrivals yet.</div>`;
            return;
        }

        const cardsHtml = products.map((p, index) => 
            window.SABILORE_UTILS.renderProductCard(p, 'na-card-wrap', { staggerIndex: (index % 6) + 1 })
        ).join('');
        
        window.SABILORE_UTILS.buildItemListSchema(products, 'New Arrivals');

        
        const cardW = window.innerWidth <= 576 ? 170 : 220; 
        const gap = 16;
        const vw = window.innerWidth;

        
        const minRepeats = Math.max(4, Math.ceil((vw * 2) / (products.length * (cardW + gap))) + 1);
        const oneSet = Array(minRepeats).fill(cardsHtml).join('');

        
        track.innerHTML = oneSet + oneSet;

        
        setTimeout(() => {
            track.classList.add('is-animating');
            if (typeof initNaArrowNav === 'function') {
                initNaArrowNav(track, 0); 
            }
        }, 60);

    } catch (e) {
        console.error('New arrivals error:', e);
    }
}


function isFavorited(id) {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    return favorites.includes(id);
}

function toggleFavorite(btn, id) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    const icon = btn.querySelector('i');

    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
        btn.classList.remove('asos-heart-active');
        icon.className = 'far fa-heart';
        showMiniToast('Removed from favorites');
    } else {
        favorites.push(id);
        btn.classList.add('asos-heart-active');
        icon.className = 'fas fa-heart';
        showMiniToast('Added to favorites ❤️');

        
        if (window.SabiloreTracking) {
            
            window.SabiloreTracking.trackViewContent({ id: id });
        }
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateGlobalBadges();
}




document.addEventListener('mouseover', (e) => {
    const wrap = e.target.closest('.asos-card-img-wrap');
    if (!wrap || !wrap.dataset.hoverImg) return;
    const img = wrap.querySelector('.asos-card-img');
    if (img && img.src !== wrap.dataset.hoverImg) {
        img.dataset.os = img.src;
        img.dataset.oss = img.srcset || '';
        img.removeAttribute('srcset');
        img.src = wrap.dataset.hoverImg;
    }
});

document.addEventListener('mouseout', (e) => {
    const wrap = e.target.closest('.asos-card-img-wrap');
    if (!wrap || !wrap.dataset.hoverImg) return;
    const img = wrap.querySelector('.asos-card-img');
    if (img && img.dataset.os) {
        if (img.dataset.oss) img.srcset = img.dataset.oss;
        img.src = img.dataset.os;
    }
});

document.addEventListener('click', (e) => {
    
    const favBtn = e.target.closest('[data-action="favorite"]');
    if (favBtn) {
        e.preventDefault();
        const id = parseInt(favBtn.dataset.id);
        if (id) toggleFavorite(favBtn, id);
        return;
    }

    
    const quickAdd = e.target.closest('[data-action="quick-add"]');
    if (quickAdd && quickAdd.dataset.id) {
        e.preventDefault();
        console.log('TODO: Quick add to cart for ID:', quickAdd.dataset.id);
    }
});




async function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletter-email');
    const email = emailInput.value.trim();

    if (!email) {
        showMiniToast('Please enter a valid email address.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();
        if (response.ok) {
            showMiniToast(result.message);
            emailInput.value = '';
        } else {
            showMiniToast(result.message);
        }
    } catch {
        showMiniToast('Network error, please try again.');
    }
}
window.subscribeNewsletter = subscribeNewsletter;






function initContactForm() {
    const form = document.getElementById('contact-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-name')?.value?.trim();
            const email = document.getElementById('contact-email-input')?.value?.trim();
            const subject = document.getElementById('contact-subject')?.value?.trim();
            const message = document.getElementById('contact-message')?.value?.trim();
            const submitBtn = form.querySelector('[type="submit"]');

            if (!name || !email || !message) {
                showMiniToast('Please fill in all required fields.');
                return;
            }

            
            const originalText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending…';
            }

            try {
                const response = await fetch(`${API_URL}/contact`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });
                const result = await response.json();

                if (response.ok) {
                    showMiniToast("Your message has been received.");
                    form.reset();
                } else {
                    showMiniToast(result.message || 'Failed to send.');
                }
            } catch {
                showMiniToast('Network error.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        });
    }
}




function showMiniToast(msg) {
    let toast = document.getElementById('mini-toast-global');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'mini-toast-global';
        toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:12px 28px;border-radius:50px;font-size:0.85rem;font-weight:600;z-index:99999;opacity:0;transition:opacity 0.3s;pointer-events:none;font-family:Inter,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}






function openSizeRecommender() {
    initSizeRecommender();
    const popup = document.getElementById('size-popup');
    const overlay = document.getElementById('size-popup-overlay');
    if (popup && overlay) {
        overlay.style.display = 'block';
        
        setTimeout(() => {
            popup.classList.add('active');
            overlay.classList.add('active');
        }, 10);
    }
}
window.openSizeRecommender = openSizeRecommender;

function initSizeRecommender() {
    if (document.getElementById('size-popup')) return;

    
    const overlay = document.createElement('div');
    overlay.id = 'size-popup-overlay';
    overlay.onclick = closeSizeRecommender;
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.id = 'size-popup';
    popup.className = 'size-recommender-popup p-0 overflow-hidden'; 
    popup.innerHTML = `
        <div class="px-3 pt-3 pb-0 d-flex justify-content-end">
            <button class="btn-close" onclick="closeSizeRecommender()"></button>
        </div>
        
        <div class="px-3 pb-4 mt-2" id="sr-measurements-step">
            
            <div class="mb-4 text-center">
                <label class="form-label small fw-bold text-uppercase tracking-wider mb-2">Tummy Shape</label>
                <button type="button" class="btn btn-outline-dark w-100 rounded-0 py-3 text-uppercase small fw-bold tracking-widest" id="sr-btn-select-shape" onclick="toggleGlobalTummyCollapse()">
                    Select Your Shape
                </button>
                
                
                <div id="srTummyCollapse" class="tummy-selection-container mt-3 d-none text-start">
                    <h6 class="text-uppercase small fw-bold mb-4 tracking-widest text-center">Your Tummy Shape</h6>
                    
                    <div class="tummy-illustration-hero mb-4">
                        <img loading="lazy" decoding="async" id="sr-tummy-hero-img-global" src="" class="img-fluid rounded-4 shadow-sm" style="display:none; object-fit: contain; max-height: 280px; width: 100%; margin: 0 auto;">
                        <div class="sr-tummy-hero-placeholder text-muted py-5 text-center" id="sr-tummy-hero-placeholder-global" style="aspect-ratio: 3/4; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 12px; max-height: 280px; width: 210px; margin: 0 auto;">
                            <i class="fas fa-user-tie fa-3x opacity-25"></i>
                        </div>
                    </div>

                    <div class="tummy-radio-group d-flex justify-content-between mb-5">
                        <div class="tummy-radio-opt flex-fill text-center" onclick="selectGlobalTummyRadio('flatter')">
                            <div class="custom-radio-circle flatter" id="sr-radio-flatter"></div>
                            <span class="small fw-bold text-uppercase d-block mt-2" style="font-size: 0.6rem; letter-spacing: 0.1em;">Flatter</span>
                        </div>
                        <div class="tummy-radio-opt flex-fill text-center" onclick="selectGlobalTummyRadio('average')">
                            <div class="custom-radio-circle average active" id="sr-radio-average"></div>
                            <span class="small fw-bold text-uppercase d-block mt-2" style="font-size: 0.6rem; letter-spacing: 0.1em;">Average</span>
                        </div>
                        <div class="tummy-radio-opt flex-fill text-center" onclick="selectGlobalTummyRadio('curvier')">
                            <div class="custom-radio-circle curvier" id="sr-radio-curvier"></div>
                            <span class="small fw-bold text-uppercase d-block mt-2" style="font-size: 0.6rem; letter-spacing: 0.1em;">Curvier</span>
                        </div>
                    </div>

                    <button type="button" class="btn btn-dark w-100 rounded-0 py-3 text-uppercase small fw-bold tracking-widest" onclick="toggleGlobalTummyCollapse()">
                        Continue
                    </button>
                </div>
                <input type="hidden" id="sr-tummy" value="average">
            </div>

            <div id="sr-measurements-fields">
                <div class="mb-4">
                    <label class="form-label small fw-bold text-uppercase tracking-wider">Height (cm)</label>
                    <input type="number" id="sr-height" class="form-control rounded-0 border-0 border-bottom px-0" placeholder="E.G. 170" style="border-bottom: 2px solid #eee !important; box-shadow: none;">
                </div>
                <div class="mb-4">
                    <label class="form-label small fw-bold text-uppercase tracking-wider">Weight (kg)</label>
                    <input type="number" id="sr-weight" class="form-control rounded-0 border-0 border-bottom px-0" placeholder="E.G. 70" style="border-bottom: 2px solid #eee !important; box-shadow: none;">
                </div>
                <button class="btn btn-dark w-100 py-3 btn-rect text-uppercase-wide fw-bold mt-3" onclick="calculateSize()" style="font-size: 0.75rem; letter-spacing: 0.2em;">Get Recommendation</button>
            </div>
            <div id="sr-result" class="alert mt-4 rounded-0 text-center d-none border-dark" style="background: #f8f8f8; color: #000; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.75rem;"></div>
        </div>
    `;
    document.body.appendChild(popup);

    
    loadGlobalTummyIllustrations();
}

function toggleGlobalTummyCollapse() {
    const collapse = document.getElementById('srTummyCollapse');
    const fields = document.getElementById('sr-measurements-fields');
    const shape = document.getElementById('sr-tummy')?.value || 'average';

    if (collapse) {
        if (collapse.classList.contains('d-none')) {
            collapse.classList.remove('d-none');
            if (fields) fields.classList.add('d-none');
            updateGlobalTummyHero(shape);
        } else {
            collapse.classList.add('d-none');
            if (fields) fields.classList.remove('d-none');
        }
    }
}
window.toggleGlobalTummyCollapse = toggleGlobalTummyCollapse;

function selectGlobalTummyRadio(shape) {
    const shapeInput = document.getElementById('sr-tummy');
    if (shapeInput) shapeInput.value = shape;

    document.querySelectorAll('#srTummyCollapse .custom-radio-circle').forEach(rd => {
        rd.classList.remove('active');
    });
    const activeRadio = document.getElementById(`sr-radio-${shape}`);
    if (activeRadio) activeRadio.classList.add('active');

    
    const selectBtn = document.getElementById('sr-btn-select-shape');
    if (selectBtn) {
        selectBtn.innerText = `SHAPE: ${shape.toUpperCase()}`;
    }

    updateGlobalTummyHero(shape);
    localStorage.setItem('last_tummy_shape', shape);
}
window.selectGlobalTummyRadio = selectGlobalTummyRadio;

function updateGlobalTummyHero(shape) {
    const heroImg = document.getElementById('sr-tummy-hero-img-global');
    const placeholder = document.getElementById('sr-tummy-hero-placeholder-global');
    if (!heroImg || !window.siteSettings) return;

    const imgSrc = window.siteSettings[`tummy_${shape.toLowerCase()}_img`];

    if (imgSrc) {
        heroImg.src = imgSrc.startsWith('http') ? imgSrc : (window.BASE_URL || '') + imgSrc;
        heroImg.onload = () => {
            heroImg.style.display = 'inline-block';
            if (placeholder) placeholder.style.display = 'none';
        };
    } else {
        heroImg.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    }
}

async function loadGlobalTummyIllustrations() {
    let attempts = 0;
    while (!window.siteSettings && attempts < 15) {
        await new Promise(r => setTimeout(r, 400));
        attempts++;
    }
    if (!window.siteSettings) return;

    const initialShape = localStorage.getItem('last_tummy_shape') || 'average';
    selectGlobalTummyRadio(initialShape);
}

function closeSizeRecommender() {
    const popup = document.getElementById('size-popup');
    const overlay = document.getElementById('size-popup-overlay');
    if (popup) popup.classList.remove('active');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            if (!overlay.classList.contains('active')) {
                overlay.style.display = 'none';
            }
        }, 300);
    }
}
window.closeSizeRecommender = closeSizeRecommender;

async function calculateSize() {
    const height = parseFloat(document.getElementById('sr-height')?.value);
    const weight = parseFloat(document.getElementById('sr-weight')?.value);
    const tummyShape = document.getElementById('sr-tummy')?.value || 'average';
    const result = document.getElementById('sr-result');
    const btn = document.querySelector('button[onclick="calculateSize()"]');

    if (!height || !weight) {
        result.classList.remove('d-none');
        result.innerHTML = '<span class="text-danger">Please enter both height and weight.</span>';
        return;
    }

    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = 'Calculating...';

    try {
        const res = await fetch(`${API_URL || '/api'}/admin/size-guide/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tummy_shape: tummyShape, weight, height })
        });
        const data = await res.json();

        result.classList.remove('d-none');
        if (data.recommendedSize) {
            result.className = 'alert mt-4 rounded-0 text-center border-dark';
            result.innerHTML = `Your Recommended Size: <span class="badge bg-dark fs-6 ms-2">${data.recommendedSize}</span>`;
        } else {
            result.className = 'alert mt-4 rounded-0 text-center border-warning';
            result.innerHTML = data.message || 'No specific recommendation found.';
        }
    } catch (error) {
        console.error('Calculation error:', error);
        result.classList.remove('d-none');
        result.innerHTML = '<span class="text-danger">Error getting recommendation. Please try again.</span>';
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}
window.calculateSize = calculateSize;




async function loadPaymentLogos() {
    const container = document.getElementById('payment-logos-footer');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/payments/active`);
        if (!res.ok) return;
        const methods = await res.json();

        container.innerHTML = methods.map(m => {
            if (!m.image) return ''; 
            return `
            <img loading="lazy" decoding="async" src="${m.image}" alt="${m.name}" title="${m.name}" style="max-height: 24px; width: auto; filter: grayscale(1) brightness(2);" 
                 onmouseover="this.style.filter='none'" onmouseout="this.style.filter='grayscale(1) brightness(2)'"
                 onerror="this.style.display='none'">
            `;
        }).join('');
    } catch (err) {
        console.warn('Failed to load payment methods:', err);
    }
}




function initDarkMode() {
    const btns = document.querySelectorAll('.theme-toggle');
    const icons = document.querySelectorAll('.theme-icon');
    if (btns.length === 0) return;

    
    function syncIcon() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        icons.forEach(icon => {
            icon.className = isDark ? 'fas fa-sun fa-lg theme-icon' : 'fas fa-moon fa-lg theme-icon';
        });
        btns.forEach(btn => {
            btn.style.color = isDark ? '#f0edff' : '';
        });
    }

    
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            syncIcon();
        });
    });

    
    syncIcon();
}




document.addEventListener('DOMContentLoaded', () => {
    
    updateAuthUI();       
    updateGlobalBadges(); 
    initDarkMode();       
    initNavbarSearch();   
    initFooterAccordion(); 

    
    
    applyBranding();            
    initTickerAndNavbarFix();   

    
    const deferredWork = () => {
        initContactForm();          
        initScrollReveal();         
        if (typeof loadPaymentLogos === 'function') loadPaymentLogos();
    };

    if (window.requestIdleCallback) {
        requestIdleCallback(deferredWork, { timeout: 2000 });
    } else {
        setTimeout(deferredWork, 500);
    }
});


window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        
        requestAnimationFrame(() => {
            document.body.classList.remove('page-loaded');
            requestAnimationFrame(() => {
                document.body.classList.add('page-loaded');
            });
        });
        
        
        if (typeof refreshScrollReveal === 'function') {
            refreshScrollReveal();
        }
    } else {
        
        document.body.classList.add('page-loaded');
    }
});






function initFooterAccordion() {
    const labels = document.querySelectorAll(".footer-section-label");
    const isMobile = () => window.innerWidth <= 991.98;

    labels.forEach(label => {
        label.addEventListener("click", () => {
            if (!isMobile()) return;
            const group = label.closest(".footer-nav-group");
            if (group) {
                const wasActive = group.classList.contains("active");
                document.querySelectorAll(".footer-nav-group").forEach(other => {
                    other.classList.remove("active");
                });
                if (!wasActive) group.classList.add("active");
            }
        });
    });

    const links = document.querySelectorAll(".footer-nav-group a");
    links.forEach(link => {
        link.addEventListener("click", (e) => {
            if (isMobile()) {
                e.stopPropagation();
            }
        });
    });
}


const _SABILORE_REVEAL_OBSERVER = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const delay = (entry.target.dataset.revealDelay || 0) * 300;
            if (delay > 0) {
                setTimeout(() => entry.target.classList.add('revealed'), delay);
            } else {
                entry.target.classList.add('revealed');
            }
            _SABILORE_REVEAL_OBSERVER.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

function initScrollReveal() {
    
    const revealSelectors = [
        '#collections-section', '#featured', '.footer-drawer-content',
        '.product-gallery', '.product-info-panel'
    ].join(', ');

    document.querySelectorAll(revealSelectors).forEach(el => el.classList.add('scroll-reveal'));

    
    const textSelectors = 'h1:not(.no-anim), h2:not(.no-anim), h3:not(.no-anim), h4:not(.no-anim), h5:not(.no-anim), h6:not(.no-anim), p:not(.no-anim), .lead:not(.no-anim), .section-title:not(.no-anim)';
    document.querySelectorAll(textSelectors).forEach((el, idx) => {
        if (!el.closest('.hero-section') && !el.closest('.asos-card-body')) {
            el.classList.add(idx % 2 === 0 ? 'anim-slide-left' : 'anim-slide-right');
        }
    });

    refreshScrollReveal();
}

function refreshScrollReveal() {
    const selectors = '.scroll-reveal:not(.revealed), .scroll-reveal-card:not(.revealed), .anim-fade-up:not(.revealed), .anim-slide-left:not(.revealed), .anim-slide-right:not(.revealed), .anim-bounce:not(.revealed)';
    document.querySelectorAll(selectors).forEach((el, idx) => {
        if (el.classList.contains('scroll-reveal-card')) el.dataset.revealDelay = idx % 4;
        _SABILORE_REVEAL_OBSERVER.observe(el);
    });
}











function initTickerAndNavbarFix() {
    try {
        
        
        
        document.querySelectorAll('.logo-ticker-item').forEach(el => {
            el.style.color = '#ffffff';
        });
        document.querySelectorAll('.logo-ticker-dot').forEach(el => {
            el.style.backgroundColor = '#ffffff';
            el.style.opacity = '0.5';
        });

        
        const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
        document.querySelectorAll('.main-site-navbar .nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const normalised = href.replace(/\/$/, '') || '/';
            if (currentPath === normalised || (normalised !== '/' && currentPath.startsWith(normalised))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        
        
        
        const stickyWrapper = document.querySelector('.site-header-sticky-wrapper');
        if (stickyWrapper) {
            requestAnimationFrame(() => {
                stickyWrapper.style.transform = 'translateZ(0)'; 
            });
        }
    } catch (e) {
        console.warn('[initTickerAndNavbarFix] Non-critical error:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    
    document.body.classList.add('page-loaded');

    
    const runDeferred = () => {
        if (typeof initScrollReveal === 'function') initScrollReveal();
        if (typeof initLazyLoading === 'function') initLazyLoading();
        if (typeof initFooterAccordion === 'function') initFooterAccordion();
        if (typeof initTickerAndNavbarFix === 'function') initTickerAndNavbarFix();
    };

    if (window.requestIdleCallback) {
        requestIdleCallback(() => setTimeout(runDeferred, 100), { timeout: 2000 });
    } else {
        setTimeout(runDeferred, 200);
    }
});



document.addEventListener('DOMContentLoaded', () => {
    if (window.SabiloreTracking) window.SabiloreTracking.trackPageView();
    
    
    if (typeof initHeroAnimations === 'function') initHeroAnimations();
    
    
    const loadHomeContent = () => {
        try {
            if (typeof loadHomeCategories === 'function') loadHomeCategories();
            if (typeof loadNewArrivals === 'function') loadNewArrivals();
            if (typeof loadFeaturedProducts === 'function') loadFeaturedProducts();
            if (typeof loadHomeSaleProducts === 'function') loadHomeSaleProducts();
            if (typeof loadSeasonEndSale === 'function') loadSeasonEndSale();
        } catch (e) {
            console.error('[HomeContent] Deferred load error:', e);
        }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(loadHomeContent, 50);
    } else {
        if (window.requestIdleCallback) {
            requestIdleCallback(loadHomeContent, { timeout: 1000 });
        } else {
            document.addEventListener('DOMContentLoaded', loadHomeContent);
        }
    }
});

function initHeroAnimations() {
        const fadeElements = document.querySelectorAll('.hero-fade-in');
        fadeElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            const delay = parseFloat(el.style.animationDelay || '0') * 1000;
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, delay);
        });

        const slideEl = document.querySelector('.hero-slide-in');
        if (slideEl) {
            slideEl.style.opacity = '0';
            slideEl.style.transform = 'translateX(60px)';
            slideEl.style.transition = 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s';
            setTimeout(() => {
                slideEl.style.opacity = '1';
                slideEl.style.transform = 'translateX(0)';
            }, 100);
        }
    }

    async function loadHomeCategories() {
        const row = document.getElementById('home-categories-row');
        if (!row) return;

        try {
            const categories = await window.SABILORE_UTILS.getCategories();
            if (categories.length === 0) {
                row.innerHTML = '<div class="col-12 text-center py-5 theme-text-muted">No collections available yet.</div>';
                return;
            }

            row.innerHTML = categories.map(cat => {
                const catImage = cat.image ? (cat.image.startsWith('http') ? cat.image : window.BASE_URL + cat.image) : null;
                const catVideo = cat.video ? (cat.video.startsWith('http') ? cat.video : window.BASE_URL + cat.video) : null;
                return `
                    <div class="col-6 col-md-3 scroll-reveal-card">
                        <a href="/shop?cat=${encodeURIComponent(cat.slug)}" class="collection-modern-card text-decoration-none">
                            <div class="collection-media-box">
                                ${cat.active_media === 'video' && catVideo
                        ? `<video src="${catVideo}" autoplay muted loop playsinline class="collection-video"></video>`
                        : (catImage
                            ? `<img src="${catImage}" alt="${cat.name}" class="collection-img" width="600" height="900" loading="lazy" style="object-fit: cover; width: 100%; height: 100%;">`
                            : `<div class="collection-placeholder"><i class="fas fa-tag"></i></div>`
                        )
                    }
                                <div class="collection-overlay-simple"></div>
                            </div>
                            <div class="collection-info-simple">
                                <h3 class="collection-name-simple">${cat.name}</h3>
                                <span class="collection-link-simple">Explore <i class="fas fa-arrow-right"></i></span>
                            </div>
                        </a>
                    </div>
                `;
            }).join('');

            if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
        } catch (error) {
            console.error('Home categories error:', error);
            row.innerHTML = '<div class="col-12 text-center py-5 text-muted">Unable to load collections.</div>';
        }
    }

    
    function initNaArrowNav(track) {
        const prevBtn = document.getElementById('na-prev-btn');
        const nextBtn = document.getElementById('na-next-btn');
        if (!track) return;

        const scrollAmount = window.innerWidth <= 576 ? 186 : 236;
        
        
        let isDown = false;
        let isDragging = false;
        let startX;
        let currentTranslate = 0;
        let prevTranslate = 0;

        function getTranslateX(el) {
            const style = window.getComputedStyle(el);
            const transform = style.transform || style.webkitTransform || style.mozTransform;
            if (!transform || transform === 'none') return 0;
            
            const matrix = transform.match(/^matrix\((.+)\)$/);
            if (matrix) {
                const values = matrix[1].split(', ');
                return parseFloat(values[4]);
            }
            return 0;
        }
        
        track.addEventListener('mousedown', (e) => {
            isDown = true;
            isDragging = false;
            track.classList.add('active');
            startX = e.pageX;
            prevTranslate = getTranslateX(track);
            track.style.transition = 'none'; 
        });

        track.addEventListener('mouseleave', () => {
            isDown = false;
            track.classList.remove('active');
        });

        track.addEventListener('mouseup', () => {
            isDown = false;
            track.classList.remove('active');
            
            
            track.style.transition = 'none'; 
            prevTranslate = currentTranslate;
        });

        track.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX;
            const walk = (x - startX) * 1.5; 
            if (Math.abs(walk) > 5) isDragging = true;
            currentTranslate = prevTranslate + walk;
            track.style.transform = `translateX(${currentTranslate}px)`;
        });
        
        
        track.addEventListener('click', (e) => {
            if (isDragging) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });

        
        track.addEventListener('touchstart', (e) => {
            isDown = true;
            isDragging = false;
            startX = e.touches[0].pageX;
            prevTranslate = getTranslateX(track);
            track.style.transition = 'none';
        }, { passive: true });

        track.addEventListener('touchend', () => {
            isDown = false;
            track.style.transition = 'none';
            prevTranslate = currentTranslate;
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!isDown) return;
            const x = e.touches[0].pageX;
            const walk = (x - startX) * 1.5;
            if (Math.abs(walk) > 5) isDragging = true;
            currentTranslate = prevTranslate + walk;
            track.style.transform = `translateX(${currentTranslate}px)`;
        }, { passive: true });


        
        function checkBoundsLoop() {
            
            
            const trackWidth = track.scrollWidth;
            const originalWidth = trackWidth / 2; 

            if (currentTranslate <= -originalWidth) {
                currentTranslate += originalWidth;
            } else if (currentTranslate > 0) {
                currentTranslate -= originalWidth;
            }
            track.style.transform = `translateX(${currentTranslate}px)`;
            prevTranslate = currentTranslate;
        }

        
        let isHovered = false;
        const scrollSpeed = 1.0; 

        
        if (track._naAnimFrame) cancelAnimationFrame(track._naAnimFrame);

        function tick() {
            if (!isDown && !isHovered) {
                
                if (track.style.transition !== 'none') track.style.transition = 'none';
                
                currentTranslate -= scrollSpeed;
                checkBoundsLoop();
            }
            track._naAnimFrame = requestAnimationFrame(tick);
        }

        
        track._naAnimFrame = requestAnimationFrame(tick);

        track.addEventListener('mouseenter', () => isHovered = true);
        track.addEventListener('mouseleave', () => {
            isHovered = false;
            if (!isDown) {
                prevTranslate = getTranslateX(track);
                currentTranslate = prevTranslate;
            }
        });
        
        track.addEventListener('touchstart', () => isHovered = true, { passive: true });
        track.addEventListener('touchend', () => setTimeout(() => isHovered = false, 100), { passive: true });

        
        
        function performSmoothShift(shiftAmount) {
            
            if (track._naAnimFrame) cancelAnimationFrame(track._naAnimFrame);
            
            
            prevTranslate = getTranslateX(track);
            currentTranslate = prevTranslate + shiftAmount;
            
            track.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
            track.style.transform = `translateX(${currentTranslate}px)`;
            
            
            setTimeout(() => {
                track.style.transition = 'none';
                checkBoundsLoop();
                track._naAnimFrame = requestAnimationFrame(tick);
            }, 450); 
        }

        if (prevBtn) prevBtn.addEventListener('click', () => performSmoothShift(scrollAmount));
        if (nextBtn) nextBtn.addEventListener('click', () => performSmoothShift(-scrollAmount));
    }
async function loadSeasonEndSale() {
        try {
            const apiBase = window.API_URL || '/api';
            const res = await fetch(`${apiBase}/products/season-end-sale?limit=6`);
            if (!res.ok) return;
            const products = await res.json();
            if (!products || products.length === 0) return;

            const section = document.getElementById('season-sale-home');
            const row = document.getElementById('home-sale-row');
            if (!section || !row || !window.SABILORE_UTILS) return;

            row.innerHTML = products.slice(0, 6).map((product, i) => {
                const card = SABILORE_UTILS.renderProductCard(product, undefined, { staggerIndex: (i % 6) + 1 });
                return card.replace('<div class="asos-card-img-wrap position-relative">', `<div class="asos-card-img-wrap position-relative"><div style="position:absolute;top:10px;left:10px;background:#ff4d00;color:#fff;font-size:0.6rem;font-weight:900;letter-spacing:0.15em;padding:4px 10px;z-index:5;">SALE</div>`);
            }).join('');
            
            window.SABILORE_UTILS.buildItemListSchema(products.slice(0, 6), 'Sale Products');

            section.classList.remove('d-none');

            
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#ffffff' : '#1a1a1a';
            const priceColor = isDark ? '#ff6a1a' : '#e53935';
            const mutedColor = isDark ? 'rgba(255,255,255,0.5)' : '#888';

            
            if (!isDark) {
                section.style.setProperty('background', '#ffffff', 'important');
            }

            
            const saleH2 = document.getElementById('sale-heading');
            if (saleH2) saleH2.style.setProperty('color', textColor, 'important');

            section.querySelectorAll('h2, h3, h4, p, span, a, .asos-card-name, .asos-card-price, .asos-card a, .asos-card-body a').forEach(el => {
                if (!el.closest('.btn') && !el.classList.contains('asos-badge-sale') && !el.classList.contains('asos-badge-fast') && !el.classList.contains('sale-limited-badge') && !el.classList.contains('sale-viewall-link')) {
                    el.style.setProperty('color', textColor, 'important');
                }
            });
            section.querySelectorAll('.asos-card-price .text-danger').forEach(el => {
                el.style.setProperty('color', priceColor, 'important');
            });
            section.querySelectorAll('.asos-card-price .text-muted').forEach(el => {
                el.style.setProperty('color', mutedColor, 'important');
            });
            section.querySelectorAll('.size-pill').forEach(el => {
                if (isDark) {
                    el.style.setProperty('color', 'rgba(255,255,255,0.7)', 'important');
                    el.style.setProperty('border-color', 'rgba(255,255,255,0.2)', 'important');
                    el.style.setProperty('background', 'rgba(255,255,255,0.08)', 'important');
                } else {
                    el.style.setProperty('color', '#333', 'important');
                    el.style.setProperty('border-color', '#ccc', 'important');
                    el.style.setProperty('background', 'rgba(0,0,0,0.04)', 'important');
                }
            });
            section.querySelectorAll('.asos-card, .asos-card-body').forEach(el => {
                el.style.setProperty('background', 'transparent', 'important');
            });

            if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
        } catch (err) {
            console.warn('Failed to load season end sale products:', err);
        }
    }



function initShopScripts() {
    if (!document.getElementById("shop-products-row")) return;

    
    const URL_CAT = "{{url_cat}}";
    let allProducts = [];
    let searchInput;
    let suggestionsBox;
    let searchDebounce;
    const selectedSizes = new Set();

    (function() {
        if (window.SabiloreTracking) window.SabiloreTracking.trackPageView();

        const urlParams = new URLSearchParams(window.location.search);
        const initialSearch = urlParams.get('search');
        if (initialSearch) {
            const sInput = document.getElementById('product-search');
            if (sInput) sInput.value = initialSearch;
        }

        window.toggleMobileFilterDrawer = function () {
            const drawer = document.getElementById('mobile-filter-drawer');
            const desktopCard = document.querySelector('.glass-filter-card');
            const mobileContent = document.getElementById('mobile-filter-content');
            const overlay = document.getElementById('shopFilterOverlay');

            if (drawer.classList.contains('active')) {
                drawer.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
                document.querySelector('.filter-sidebar-sticky').appendChild(desktopCard);
            } else {
                mobileContent.innerHTML = '';
                mobileContent.appendChild(desktopCard);
                drawer.classList.add('active');
                if (overlay) overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        };

        const priceRange = document.getElementById('price-range');
        const priceValue = document.getElementById('price-value');
        if (priceRange && priceValue) {
            priceRange.addEventListener('input', (e) => {
                const val = e.target.value;
                priceValue.textContent = (val >= 1000) ? 'UP TO ' + (val / 1000) + 'k BDT' : 'UP TO ' + val + ' BDT';
                filterProducts();
            });
        }

        searchInput = document.getElementById('product-search');
        suggestionsBox = document.getElementById('search-suggestions');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                clearTimeout(searchDebounce);
                if (val.length < 1) {
                    if (suggestionsBox) suggestionsBox.style.display = 'none';
                    filterProducts();
                    return;
                }
                searchDebounce = setTimeout(async () => {
                    try {
                        const res = await fetch(`${window.API_URL}/products/suggestions?q=${encodeURIComponent(val)}`);
                        const data = await res.json();
                        if (suggestionsBox) {
                            if (data.length > 0) {
                                suggestionsBox.innerHTML = data.map(item => `
                                    <div class="suggestion-item" onclick="applySuggestion('${item.name.replaceAll("'", "\\'")}', '${item.type}')">
                                        <span>${item.name}</span>
                                        <span class="suggestion-type">${item.type}</span>
                                    </div>
                                `).join('');
                                suggestionsBox.style.display = 'block';
                            } else {
                                suggestionsBox.style.display = 'none';
                            }
                        }
                    } catch (e) {
                        console.error('Suggestion error:', e);
                    }
                    filterProducts();
                }, 300);
            });

            document.addEventListener('click', (e) => {
                if (suggestionsBox && !searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                    suggestionsBox.style.display = 'none';
                }
            });
        }

        const sortSelect = document.getElementById('sort-by');
        if (sortSelect) sortSelect.addEventListener('change', () => filterProducts());

        loadCategoryFilter();
        loadShopProducts();
    })();

    async function loadCategoryFilter() {
        try {
            const categories = await window.SABILORE_UTILS.getCategories();
            const catFilter = document.getElementById('category-filter');
            if (!catFilter) return;
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.name.toLowerCase();
                opt.textContent = cat.name;
                const cleanURLCat = (URL_CAT && URL_CAT !== '{{url_cat}}') ? URL_CAT.toLowerCase() : '';
                if (cleanURLCat && cat.name.toLowerCase() === cleanURLCat) opt.selected = true;
                catFilter.appendChild(opt);
            });
        } catch (e) {
            console.error('Category filter load failed:', e);
        }
    }

    window.toggleSizeFilter = (size, element) => {
        if (selectedSizes.has(size)) {
            selectedSizes.delete(size);
            element.classList.remove('active');
        } else {
            selectedSizes.add(size);
            element.classList.add('active');
        }
        document.getElementById('size-filter').value = Array.from(selectedSizes).join(',');
        document.getElementById('clear-size').classList.toggle('visible', selectedSizes.size > 0);
        filterProducts();
    };

    window.clearSpecificFilter = (type) => {
        if (type === 'category') {
            document.getElementById('category-filter').value = '';
            document.getElementById('clear-category').classList.remove('visible');
        } else if (type === 'size') {
            selectedSizes.clear();
            document.querySelectorAll('#size-chips-container .filter-chip-stark').forEach(el => el.classList.remove('active'));
            document.getElementById('size-filter').value = '';
            document.getElementById('clear-size').classList.remove('visible');
        }
        filterProducts();
    };

    window.applySuggestion = (name, type) => {
        if (type === 'category') {
            const selected = name.toLowerCase();
            document.getElementById('category-filter').value = selected;
            document.getElementById('product-search').value = '';
            window.history.replaceState({}, '', `/shop/${encodeURIComponent(selected)}`);
            loadShopProducts(selected);
        } else {
            document.getElementById('product-search').value = name;
            filterProducts();
        }
        if (suggestionsBox) suggestionsBox.style.display = 'none';
    };

    window.resetFilters = () => {
        document.getElementById('product-search').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('price-range').value = 10000;
        document.getElementById('price-value').textContent = 'UP TO 10k BDT';
        document.getElementById('size-filter').value = '';
        document.getElementById('sort-by').value = 'latest';
        selectedSizes.clear();
        document.querySelectorAll('.filter-chip-stark').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.filter-clear-link').forEach(el => el.classList.remove('visible'));
        window.history.replaceState({}, '', '/shop');
        loadShopProducts('');
    };

    function populateSizeAndColorFilters() {
        const sizeContainer = document.getElementById('size-chips-container');
        if (!sizeContainer) return;
        const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
        sizeContainer.innerHTML = '';
        standardSizes.forEach(s => {
            const chip = document.createElement('div');
            chip.className = `filter-chip-stark ${selectedSizes.has(s) ? 'active' : ''}`;
            chip.textContent = s;
            chip.onclick = () => toggleSizeFilter(s, chip);
            sizeContainer.appendChild(chip);
        });
    }

    async function loadShopProducts(overrideCategory) {
        const productsRow = document.getElementById('shop-products-row');
        if (!productsRow) return;
        let category = overrideCategory !== undefined ? overrideCategory : URL_CAT;
        if (category === '{{url_cat}}') category = '';

        const urlParams = new URLSearchParams(window.location.search);
        if (overrideCategory !== undefined && !urlParams.has('search')) {
            document.getElementById('size-filter').value = '';
            document.getElementById('product-search').value = '';
        }

        const titleEl = document.getElementById('shop-title');
        const subtitleEl = document.getElementById('shop-subtitle');
        if (category) {
            titleEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            subtitleEl.textContent = `Showing products in "${category}"`;
        } else {
            titleEl.textContent = 'All Collections';
            subtitleEl.textContent = 'Showing all available products';
        }

        productsRow.innerHTML = `<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>`;

        try {
            let url = `${window.API_URL}/products`;
            if (category) url = `${window.API_URL}/products/category/${encodeURIComponent(category)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            allProducts = await response.json();
            populateSizeAndColorFilters();
            filterProducts();
        } catch (error) {
            console.error('Products load failed:', error);
            productsRow.innerHTML = `<div class="col-12 text-center text-danger py-5"><p>Failed to load products.</p></div>`;
        }
    }

    function filterProducts() {
        const productsRow = document.getElementById('shop-products-row');
        const searchTerm = (document.getElementById('product-search')?.value || '').toLowerCase();
        const maxPrice = parseInt(document.getElementById('price-range')?.value || '10000');
        const sizes = (document.getElementById('size-filter')?.value || '').split(',').filter(Boolean);
        const sortBy = document.getElementById('sort-by')?.value || 'latest';

        let filtered = [...allProducts];
        if (searchTerm) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.description || '').toLowerCase().includes(searchTerm));
        }
        filtered = filtered.filter(p => Number(p.sale_price || p.price) <= maxPrice);
        if (sizes.length > 0) {
            filtered = filtered.filter(p => p.available_sizes && sizes.some(s => p.available_sizes.split(',').map(sz => sz.trim()).includes(s)));
        }

        if (sortBy === 'low') filtered.sort((a, b) => Number(a.sale_price || a.price) - Number(b.sale_price || b.price));
        else if (sortBy === 'high') filtered.sort((a, b) => Number(b.sale_price || b.price) - Number(a.sale_price || a.price));
        else if (sortBy === 'bestselling') filtered.sort((a, b) => (b.is_top_selling || 0) - (a.is_top_selling || 0));
        else filtered.sort((a, b) => (b.id || 0) - (a.id || 0));

        if (filtered.length === 0) {
            productsRow.innerHTML = `<div class="col-12 text-center py-5"><h4>No results found</h4></div>`;
            return;
        }
        productsRow.innerHTML = filtered.map((product, index) =>
            window.SABILORE_UTILS.renderProductCard(product, undefined, { 
                staggerIndex: (index % 6) + 1,
                loading: index < 4 ? 'eager' : 'lazy',
                fetchpriority: index < 4 ? 'high' : 'auto'
            })
        ).join('');
        
        window.SABILORE_UTILS.buildItemListSchema(filtered, 'Shop Products');
        
        if (typeof refreshScrollReveal === 'function') refreshScrollReveal();
    }

    function quickAddToCart(productId, name, price, image) {
        window.SABILORE_UTILS.Cart.add({ id: productId, name, price, image });
        if (window.SabiloreTracking) window.SabiloreTracking.trackAddToCart(productId, name, price);
        if (typeof showMiniToast === 'function') showMiniToast('Added to cart 🛒');
    }
    window.quickAddToCart = quickAddToCart;
}

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initShopScripts);
} else {
    initShopScripts();
}



