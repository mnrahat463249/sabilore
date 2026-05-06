

window.SabiloreTracking = (() => {
    
    const fire = (fbName, fbData, gaName, gaData) => {
        try {
            if (typeof fbq === 'function') fbq('track', fbName, { currency: 'BDT', ...fbData });
        } catch (e) { console.error(`[Tracking] FB ${fbName}:`, e); }
        try {
            if (typeof gtag === 'function') gtag('event', gaName, { currency: 'BDT', ...gaData });
        } catch (e) { console.error(`[Tracking] GA ${gaName}:`, e); }
    };

    return {
        trackPageView(pageTitle) {
            try { if (typeof fbq === 'function') fbq('track', 'PageView'); } catch (e) { console.error('[Tracking] FB PageView:', e); }
            try {
                if (typeof gtag === 'function') gtag('event', 'page_view', {
                    page_title: pageTitle,
                    page_location: window.location.href,
                    page_path: window.location.pathname
                });
            } catch (e) { console.error('[Tracking] GA page_view:', e); }
        },

        trackViewContent(product) {
            fire('ViewContent', {
                content_name: product.name,
                content_category: product.category_name,
                content_ids: [product.id],
                content_type: 'product',
                value: product.price
            }, 'view_item', {
                value: product.price,
                items: [{ item_id: product.id, item_name: product.name, item_category: product.category_name, price: product.price }]
            });
        },

        trackAddToCart(item) {
            fire('AddToCart', {
                content_name: item.name,
                content_ids: [item.id],
                content_type: 'product',
                value: item.price
            }, 'add_to_cart', {
                value: item.price * (item.quantity || 1),
                items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: item.quantity || 1 }]
            });
        },

        trackPurchase({ transaction_id, value, items = [] }) {
            const contents = items.map(i => ({ id: i.id || i.product_id, quantity: i.quantity }));
            fire('Purchase', {
                content_ids: contents.map(c => c.id),
                content_type: 'product',
                contents,
                value
            }, 'purchase', {
                transaction_id,
                value,
                items: items.map(i => ({
                    item_id: i.id || i.product_id,
                    item_name: i.name || 'Product',
                    price: i.price,
                    quantity: i.quantity
                }))
            });
        }
    };
})();
