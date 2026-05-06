



const ADMIN_API_URL = '/api/admin';
const BASE_URL = ''; 


function getToken() {
    return localStorage.getItem('admin_token');
}


function escapeHTML(str) {
    return String(str || '').replaceAll(/[&<>'"]/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[match] || match));
}


function getImageUrl(path, placeholder = 'https://via.placeholder.com/150x150?text=No+Image') {
    if (!path) return placeholder;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path; 
    
    
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    return cleanPath;
}

function getAdminUser() {
    try {
        return JSON.parse(localStorage.getItem('admin_user')) || {};
    } catch { return {}; }
}

function checkAdminAuth() {
    if (!getToken()) {
        globalThis.location.href = 'login';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    globalThis.location.href = 'login';
}
globalThis.logout = logout;

function authHeaders() {
    return { 'Authorization': `Bearer ${getToken()}` };
}
globalThis.authHeaders = authHeaders;


function animateValue(id, start, end, duration) {
    const obj = typeof id === 'string' ? document.getElementById(id) : id;
    if (!obj) return;

    
    const isCurrency = obj.innerText.includes('BDT') || (typeof end === 'string' && end.includes('BDT'));
    const target = Number.parseInt(end.toString().replaceAll(/\D/g, '')) || 0;
    const startVal = Number.parseInt(start.toString().replaceAll(/\D/g, '')) || 0;

    if (startVal === target) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (target - startVal) + startVal);
        obj.innerText = isCurrency ? `${current.toLocaleString()} BDT` : current.toLocaleString();
        if (progress < 1) {
            globalThis.requestAnimationFrame(step);
        }
    };
    globalThis.requestAnimationFrame(step);
}


function initToastContainer() {
    if (document.getElementById('toast-container')) return;
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
}

function showToast(message, type = 'success') {
    
    showSabiloreModal(message, type);
}


function initSabiloreModal() {
    if (document.getElementById('sabilore-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'sabilore-modal-overlay';
    overlay.style.cssText = `
        display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
        -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); z-index: 10000;
        opacity: 0; transition: opacity 0.25s ease; align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `
        <div id="sabilore-modal-content" style="
            background: #fff; border-radius: 4px; width: 90%; max-width: 400px;
            padding: 32px; text-align: center; border: 1px solid #eee;
            transform: translateY(20px); transition: transform 0.25s ease;
        ">
            <div id="sabilore-modal-icon" style="font-size: 2.5rem; margin-bottom: 16px;"></div>
            <h3 id="sabilore-modal-title" style="font-weight: 700; margin-bottom: 12px; color: #111; text-transform: uppercase; font-size: 1.1rem;"></h3>
            <p id="sabilore-modal-text" style="color: #444; line-height: 1.5; margin-bottom: 24px; font-size: 0.95rem;"></p>
            <div id="sabilore-modal-footer" style="display: flex; gap: 8px; justify-content: center;">
                <button id="sabilore-modal-btn" style="
                    background: #2d3436; color: #fff; border: none; padding: 10px 24px;
                    border-radius: 4px; font-weight: 600; cursor: pointer; transition: 0.2s;
                    text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.5px;
                ">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('sabilore-modal-btn').onclick = closeSabiloreModal;
}

function showSabiloreModal(message, type = 'success', title = 'NOTIFICATION') {
    initSabiloreModal();
    const overlay = document.getElementById('sabilore-modal-overlay');
    const content = document.getElementById('sabilore-modal-content');
    const titleEl = document.getElementById('sabilore-modal-title');
    const textEl = document.getElementById('sabilore-modal-text');
    const iconEl = document.getElementById('sabilore-modal-icon');

    const themes = {
        success: { icon: '✅', color: '#27ae60' },
        error: { icon: '❌', color: '#c0392b' },
        warning: { icon: '⚠️', color: '#f39c12' },
        info: { icon: 'ℹ️', color: '#2980b9' }
    };
    const t = themes[type] || themes.success;

    titleEl.textContent = title;
    textEl.textContent = message;
    iconEl.textContent = t.icon;
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 10);
}

function showSabiloreConfirm(message, title = 'CONFIRM ACTION') {
    return new Promise((resolve) => {
        initSabiloreModal();
        const footer = document.getElementById('sabilore-modal-footer');
        
        showSabiloreModal(message, 'warning', title);
        
        footer.innerHTML = `
            <button id="confirm-cancel" style="background: #eee; color: #333; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 600; cursor: pointer;">CANCEL</button>
            <button id="confirm-ok" style="background: #c0392b; color: #fff; border: none; padding: 10px 20px; border-radius: 4px; font-weight: 600; cursor: pointer;">DELETE</button>
        `;
        
        document.getElementById('confirm-cancel').onclick = () => { closeSabiloreModal(); resolve(false); };
        document.getElementById('confirm-ok').onclick = () => { closeSabiloreModal(); resolve(true); };
    });
}

function closeSabiloreModal() {
    const overlay = document.getElementById('sabilore-modal-overlay');
    const content = document.getElementById('sabilore-modal-content');
    if (!overlay) return;
    overlay.style.opacity = '0';
    content.style.transform = 'translateY(20px)';
    setTimeout(() => {
        overlay.style.display = 'none';
        
        document.getElementById('sabilore-modal-footer').innerHTML = `
            <button id="sabilore-modal-btn" onclick="closeSabiloreModal()" style="background: #2d3436; color: #fff; border: none; padding: 10px 24px; border-radius: 4px; font-weight: 600; cursor: pointer; text-transform: uppercase; font-size: 0.85rem;">OK</button>
        `;
    }, 250);
}


async function adminFetch(url, options = {}) {
    const token = getToken();
    if (!token) {
        globalThis.location.href = 'login';
        return null;
    }

    
    let targetUrl = url;
    if (url.startsWith('/') && !url.startsWith('/api/')) {
        targetUrl = `${ADMIN_API_URL}${url}`;
    }

    const defaultHeaders = { 'Authorization': `Bearer ${token}` };
    options.headers = { ...defaultHeaders, ...options.headers };

    try {
        const res = await fetch(targetUrl, options);
        if (res.status === 401) {
            console.warn('Session expired - 401');
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            globalThis.location.href = 'login';
            return null;
        }
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: res.statusText }));
            showToast(`Error ${res.status}: ${errorData.message || 'Something went wrong'}`, 'error');
            console.error(`adminFetch non-ok response: ${res.status}`, errorData);
            return null;
        }
        return res;
    } catch (e) {
        showToast('Network error. Is the server running?', 'error');
        console.error('adminFetch error:', e);
        return null;
    }
}


async function initDashboard() {
    if (!checkAdminAuth()) return;

    
    const admin = getAdminUser();
    const welcomeEl = document.querySelector('.welcome-admin-name');
    if (welcomeEl && admin.name) {
        welcomeEl.textContent = `Welcome, ${admin.name}`;
    }

    
    const [statsRes, reportsRes, ordersRes] = await Promise.all([
        adminFetch(`${ADMIN_API_URL}/stats`),
        adminFetch(`${ADMIN_API_URL}/reports`),
        adminFetch(`${ADMIN_API_URL}/orders?limit=10`)
    ]);

    if (statsRes) {
        const stats = await statsRes.json();
        animateValue('daily-orders', 0, stats.dailyOrders || 0, 1000);
        animateValue('revenue', 0, stats.revenue || 0, 1500);
        animateValue('pending-orders', 0, stats.pendingOrders || 0, 1000);
        animateValue('new-customers', 0, stats.newCustomers || 0, 1000);
    }

    if (reportsRes) {
        const reports = await reportsRes.json();
        renderDashboardCharts(reports);
    }

    if (ordersRes) {
        let data = [];
        try { data = await ordersRes.json(); } catch (e) { console.error('Error parsing dashboard orders:', e); }
        const table = document.getElementById('admin-orders-table');
        const ordersList = Array.isArray(data) ? data : (data.orders || []);
        if (table) {
            const statusMap = {
                'Pending': 'warning text-dark',
                'Processing': 'info text-white',
                'Completed': 'success text-white',
                'Cancelled': 'danger text-white'
            };

            table.innerHTML = ordersList.map(order => `
                <tr>
                    <td><span class="fw-bold">#${order.id}</span></td>
                    <td>${escapeHTML(order.customer_name) || 'Guest'}</td>
                    <td><span class="badge ${statusMap[order.status] || 'bg-secondary text-white'} rounded-pill px-3 py-2">${order.status}</span></td>
                    <td class="fw-bold">${order.total_amount.toLocaleString()} BDT</td>
                    <td class="text-muted small">${new Date(order.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" class="text-center py-4">No recent orders found</td></tr>';
        }
    }

    
    if (!globalThis.liveDashboardInterval) {
        globalThis.liveDashboardInterval = setInterval(fetchLiveDashboardStats, 10000);
    }
}
globalThis.initDashboard = initDashboard;



let mainSalesChart = null;
let mainStatusChart = null;

function renderDashboardCharts(data) {
    if (!globalThis.Chart) return;

    
    const statusCtx = document.getElementById('statusChart');
    if (statusCtx) {
        if (mainStatusChart) mainStatusChart.destroy();

        const statusData = data.ordersByStatus || [];
        const labels = statusData.map(s => s.status);
        const counts = statusData.map(s => s.count);

        const colors = {
            'Pending': '#ffc107',
            'Processing': '#0dcaf0',
            'Completed': '#198754',
            'Cancelled': '#dc3545',
            'Delivered': '#20c997'
        };
        const bgColors = labels.map(l => colors[l] || '#6c757d');

        mainStatusChart = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: counts,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { display: false } }
            }
        });

        
        const legendContainer = document.getElementById('statusLegend');
        if (legendContainer) {
            legendContainer.innerHTML = labels.map((l, i) => `
                <div class="d-flex align-items-center gap-1 border rounded-pill px-2 py-1 bg-white shadow-sm" style="font-size: 0.7rem;">
                    <span style="width:8px;height:8px;border-radius:50%;background:${bgColors[i]}"></span>
                    <span class="fw-bold">${l}</span>: ${counts[i]}
                </div>
            `).join('');
        }
    }
}



async function fetchRecentOrders() {
    const tableBody = document.getElementById('admin-orders-table');
    if (!tableBody) return;

    const res = await adminFetch(`${ADMIN_API_URL}/orders`);
    if (!res) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Failed to load orders.</td></tr>';
        return;
    }
    const orders = await res.json();
    const recentOrders = orders.slice(0, 5);
    if (recentOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No orders yet</td></tr>';
        return;
    }

    const statusBadge = (status) => {
        const map = {
            'Pending': 'bg-warning text-dark',
            'Processing': 'bg-info text-white',
            'Completed': 'bg-success text-white',
            'Cancelled': 'bg-danger text-white'
        };
        return `<span class="badge ${map[status] || 'bg-secondary'} rounded-pill">${status}</span>`;
    };

    tableBody.innerHTML = recentOrders.map(order => `
        <tr>
            <td class="fw-semibold">${escapeHTML(order.order_number || ('#' + order.id))}</td>
            <td>
                ${escapeHTML(order.customer_name) || 'Guest'}
                ${order.customer_id
                    ? '<span class="badge bg-primary-subtle text-primary border rounded-pill ms-1" style="font-size:0.6rem">Member</span>'
                    : '<span class="badge bg-secondary-subtle text-secondary border rounded-pill ms-1" style="font-size:0.6rem">Guest</span>'
                }
            </td>
            <td>${statusBadge(order.status)}</td>
            <td class="fw-semibold">${order.total_amount} BDT</td>
            <td class="text-muted">${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}
globalThis.fetchRecentOrders = fetchRecentOrders;

function updateDashboardStat(elementId, newValue, isCurrency = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let currentValue = Number.parseInt(el.textContent.replaceAll(/\D/g, '')) || 0;
    let targetValue = newValue || 0;
    
    const formatBdt = n => (n || 0).toLocaleString() + ' BDT';
    const isDifferent = isCurrency ? el.textContent !== formatBdt(targetValue) : currentValue !== targetValue;

    if (isDifferent) {
        animateValue(elementId, currentValue, targetValue, 800);
    }
}

async function fetchLiveDashboardStats() {
    if (!document.getElementById('admin-orders-table')) return; 

    const [statsRes, ordersRes] = await Promise.all([
        adminFetch(`${ADMIN_API_URL}/stats`),
        adminFetch(`${ADMIN_API_URL}/orders?limit=10`)
    ]);

    if (statsRes) {
        const stats = await statsRes.json();
        updateDashboardStat('revenue', stats.revenue, true);
        updateDashboardStat('daily-orders', stats.dailyOrders);
        updateDashboardStat('pending-orders', stats.pendingOrders);
        updateDashboardStat('new-customers', stats.newCustomers);
    }

    if (ordersRes) {
        let data = [];
        try { data = await ordersRes.json(); } catch (e) { console.error('Error parsing live dashboard data:', e); }
        const table = document.getElementById('admin-orders-table');
        const ordersList = Array.isArray(data) ? data : (data.orders || []);
        
        const statusMap = {
            'Pending': 'warning text-dark',
            'Processing': 'info text-white',
            'Completed': 'success text-white',
            'Cancelled': 'danger text-white'
        };

        const newHtml = ordersList.map(order => `
            <tr>
                <td class="fw-semibold">${escapeHTML(order.order_number || ('#' + order.id))}</td>
                <td>
                    ${escapeHTML(order.customer_name) || 'Guest'}
                    ${order.customer_id
                        ? '<span class="badge bg-primary-subtle text-primary border rounded-pill ms-1" style="font-size:0.6rem">Member</span>'
                        : '<span class="badge bg-secondary-subtle text-secondary border rounded-pill ms-1" style="font-size:0.6rem">Guest</span>'
                    }
                </td>
                <td><span class="badge ${statusMap[order.status] || 'bg-secondary'} rounded-pill">${order.status}</span></td>
                <td class="fw-semibold">${(order.total_amount||0).toLocaleString()} BDT</td>
                <td class="text-muted small">${new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-4">No recent orders found</td></tr>';
        
        if (table.innerHTML !== newHtml) {
            table.innerHTML = newHtml;
        }
    }
}

globalThis.adminProductsCache = [];

async function loadAdminProducts() {
    if (!checkAdminAuth()) return;
    loadCategoryDropdowns(); 
    loadColorPlate(); 
    initProductFormHooks(); 

    const res = await adminFetch(`${ADMIN_API_URL}/products`);
    if (!res) return;
    const products = await res.json();
    
    globalThis.adminProductsCache = products || [];
    
    const tableBody = document.getElementById('admin-products-table');
    if (!tableBody) return;

    if (globalThis.adminProductsCache.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No products added yet</td></tr>';
        return;
    }

    tableBody.innerHTML = globalThis.adminProductsCache.map(product => {
        const imageUrl = getImageUrl(product.image, 'https://via.placeholder.com/40x40');
        return `
        <tr>
            <td class="fw-semibold">#${product.id}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <img src="${imageUrl}" width="40" height="40" loading="lazy" decoding="async" class="rounded object-fit-cover" onerror="this.src='https://via.placeholder.com/40x40'">
                    <span>${product.name}</span>
                </div>
            </td>
            <td class="fw-semibold">${product.price} BDT</td>
            <td>${product.is_featured ? '<span class="badge bg-primary rounded-pill">Featured</span>' : '<span class="badge bg-light text-dark rounded-pill">Regular</span>'}</td>
            <td>
                <button onclick="editProduct(${product.id})" class="btn btn-sm btn-outline-primary rounded-pill px-3 me-1">
                    <i class="fas fa-edit me-1"></i> Edit
                </button>
                <button onclick="deleteProduct(${product.id})" class="btn btn-sm btn-outline-danger rounded-pill px-3">
                    <i class="fas fa-trash me-1"></i> Delete
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

async function loadCategoryDropdowns() {
    const categorySelect = document.getElementById('add-category-id') || document.getElementById('product-category');
    if (!categorySelect) return;

    const res = await adminFetch(`${ADMIN_API_URL}/categories`);
    if (!res) return;

    const categories = await res.json();
    categorySelect.innerHTML = '<option value="">Select Category</option>' +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    
    const editCatSelect = document.getElementById('edit-category-id');
    if (editCatSelect) {
        editCatSelect.innerHTML = categorySelect.innerHTML;
    }
}

async function loadColorPlate() {
    const addColorsContainer = document.getElementById('add-color-options');
    const editColorsContainer = document.getElementById('edit-color-options');
    const colorDropdowns = [
        'add-img1-color', 'add-img2-color', 'add-img3-color', 'add-img4-color',
        'edit-img1-color', 'edit-img2-color', 'edit-img3-color', 'edit-img4-color',
        'new-prod-var-color', 'new-var-color'
    ];

    const res = await adminFetch(`${ADMIN_API_URL}/colors`);
    if (!res) return;

    const colors = await res.json();
    const activeColors = colors.filter(c => c.status === 'active');

    
    if (addColorsContainer) renderColorCheckboxes('add-color-options', [], activeColors);
    if (editColorsContainer) renderColorCheckboxes('edit-color-options', [], activeColors);

    
    let datalist = document.getElementById('color-datalist');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'color-datalist';
        document.body.append(datalist);
    }
    datalist.innerHTML = activeColors.map(c => `<option value="${c.name}"></option>`).join('');

    colorDropdowns.forEach(id => {
        const el = document.getElementById(id);
        if (el?.tagName === 'INPUT') el.setAttribute('list', 'color-datalist');
    });
}


globalThis.renderColorCheckboxes = function (containerId, selectedColors = [], allColors = []) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    
    let selected = selectedColors;
    if (typeof selected === 'string') {
        try {
            if (selected.trim()) selected = JSON.parse(selected);
            else selected = [];
        } catch (e) { console.error('Error parsing selected colors:', e); selected = []; }
    }

    const checkboxHtml = (allColors || []).map(c => {
        const isChecked = (selected || []).some(s => {
            const sName = (typeof s === 'string' ? s : (s.name || '')).toString();
            return sName.toLowerCase() === c.name.toLowerCase();
        });
        return `
            <div class="color-check-wrapper ${isChecked ? 'active' : ''}" 
                 data-cname="${(c.name || '').toLowerCase()}" 
                 data-chex="${(c.hex_code || '').toLowerCase()}">
                <label class="btn btn-outline-secondary rounded-pill btn-sm d-flex align-items-center gap-2 mb-0" 
                       style="cursor:pointer; position: relative;">
                    <input type="checkbox" class="color-checkbox" style="position: absolute; opacity: 0; width: 100%; height: 100%; top: 0; left: 0; cursor: pointer;" 
                           value='${JSON.stringify(c).replaceAll("'", "&apos;")}' ${isChecked ? 'checked' : ''} 
                           onchange="if(globalThis.toggleColorCheckbox) globalThis.toggleColorCheckbox(this, '${containerId}')">
                    <span style="width:14px;height:14px;border-radius:50%;background:${c.hex_code};border:1px solid #ccc; position: relative; z-index: 1;"></span>
                    <span style="position: relative; z-index: 1;">${c.name}</span>
                </label>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="mb-2">
            <div class="input-group input-group-sm position-relative">
                <span class="input-group-text bg-white border-end-0 border-secondary" style="border-radius: 20px 0 0 20px;">
                    <i class="fas fa-search text-muted"></i>
                </span>
                <input type="text" class="form-control form-control-sm border-start-0 border-secondary color-filter-input" 
                       placeholder="Search colors..." 
                       style="border-radius: 0 20px 20px 0; padding-left: 10px; outline: none; box-shadow: none;">
            </div>
        </div>
        <div class="d-flex flex-wrap gap-2 color-checkbox-list" style="max-height: 200px; overflow-y: auto; padding: 5px; border-radius: 8px; border: 1px solid #eee;">
             ${checkboxHtml || '<span class="text-muted small">No active colors found.</span>'}
        </div>
    `;

    
    const searchInput = container.querySelector('.color-filter-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const wrappers = container.querySelectorAll('.color-check-wrapper');
            wrappers.forEach(w => {
                const cname = w.dataset.cname || '';
                const chex = w.dataset.chex || '';
                if (cname.includes(query) || chex.includes(query)) {
                    w.classList.remove('d-none');
                } else {
                    w.classList.add('d-none');
                }
            });
        });
    }
};

globalThis.getSelectedColorsAsJson = function (containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return '[]';
    const checkboxes = Array.from(container.querySelectorAll('.color-checkbox'));
    const checked = checkboxes.filter(cb => cb.checked).map(cb => {
        try { return JSON.parse(cb.value); } catch { return { name: cb.value }; }
    });
    return JSON.stringify(checked);
};

function initProductFormHooks() {
    const nameInput = document.getElementById('product-name');
    const slugInput = document.getElementById('product-slug');

    if (nameInput && slugInput) {
        nameInput.addEventListener('input', () => {
            const slug = nameInput.value
                .toLowerCase()
                .trim()
                .replaceAll(/[^\w\s-]/g, '')
                .replaceAll(/[\s_-]+/g, '-')
                .replaceAll(/^-+|-+$/g, '');
            slugInput.value = slug;
        });
    }
}

async function addProduct(formData) {
    const res = await adminFetch(`${ADMIN_API_URL}/products`, {
        method: 'POST',
        body: formData
    });
    if (!res) return;

    if (res.ok) {
        showToast('Product added successfully!', 'success');
        loadAdminProducts();
    } else {
        const err = await res.json();
        showToast('Error: ' + err.message, 'error');
    }
}
globalThis.addProduct = addProduct;

async function deleteProduct(id) {
    const confirmed = await showSabiloreConfirm('Are you sure you want to delete this product?', 'CONFIRM DELETE');
    if (!confirmed) return;
    
    const res = await adminFetch(`${ADMIN_API_URL}/products/${id}`, { method: 'DELETE' });
    if (!res) return;

    if (res.ok) {
        showSabiloreModal('Product deleted successfully', 'success', 'DELETED');
        loadAdminProducts();
    } else {
        showSabiloreModal('Failed to delete product', 'error', 'ERROR');
    }
}
globalThis.deleteProduct = deleteProduct;





async function loadAdminOrders() {
    if (!checkAdminAuth()) return;
    const res = await adminFetch(`${ADMIN_API_URL}/orders`);
    if (!res) return;
    const tableBody = document.getElementById('admin-orders-table');
    let allOrders = [];
    try {
        globalThis.adminOrdersCache = await res.json();
        if (!Array.isArray(globalThis.adminOrdersCache)) {
            console.error('Orders is not an array:', globalThis.adminOrdersCache);
            globalThis.adminOrdersCache = [];
        }
        allOrders = globalThis.adminOrdersCache;
    } catch (e) {
        console.error('Error parsing orders:', e);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Error loading orders. Please check console.</td></tr>';
        return;
    }
    const searchInput = document.getElementById('order-search');
    const statusFilter = document.getElementById('status-filter');
    const tabButtons = document.querySelectorAll('#order-tabs .nav-link');

    if (!tableBody) return;

    let activeTab = 'all';

    const renderOrders = (ordersToRender) => {
        if (ordersToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No matching orders found</td></tr>';
            return;
        }

        tableBody.innerHTML = ordersToRender.map(order => `
            <tr>
                <td class="fw-semibold">
                    <span class="text-primary">${escapeHTML(order.order_number?.startsWith('#') ? order.order_number : ('#' + (order.order_number || order.id)))}</span>
                </td>
                <td>
                    <div class="fw-bold">${escapeHTML(order.customer_name) || 'Guest'}</div>
                    <small class="text-muted">${escapeHTML(order.phone) || ''}</small>
                    ${order.customer_id ? '<span class="badge bg-primary-subtle text-primary border rounded-pill ms-1" style="font-size:0.6rem">Member</span>' : '<span class="badge bg-secondary-subtle text-secondary border rounded-pill ms-1" style="font-size:0.6rem">Guest</span>'}
                </td>
                <td><small class="text-uppercase fw-bold text-muted">${escapeHTML(order.payment_method) || 'N/A'}</small></td>
                <td class="fw-semibold">${Number(order.total_amount).toLocaleString()} BDT</td>
                <td>
                    <select onchange="updateStatus(${order.id}, this.value)" class="form-select form-select-sm rounded-pill" style="width:auto;">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                        <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>🔄 Processing</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                    </select>
                </td>
                <td class="text-muted small">${new Date(order.created_at).toLocaleDateString()}</td>
                <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-dark rounded-pill me-1" onclick="viewAdminOrderDetail(${order.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${order.customer_id ? '' : `
                        <button class="btn btn-sm btn-outline-primary rounded-pill me-1" onclick="openLinkCustomerModal(${order.id})" title="Link to Customer">
                            <i class="fas fa-user-plus"></i>
                        </button>
                    `}
                    <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteOrder(${order.id})" title="Delete Order">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    };

    const filterAndRender = () => {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const filterStatus = statusFilter?.value || '';

        const filtered = allOrders.filter(o => {
            const matchesSearch = o.id.toString().includes(searchTerm) ||
                (o.order_number || '').toLowerCase().includes(searchTerm) ||
                (o.customer_name || '').toLowerCase().includes(searchTerm);
            const matchesStatus = filterStatus === '' || o.status === filterStatus;

            let matchesTab = true;
            if (activeTab === 'registered') matchesTab = !!o.customer_id;
            else if (activeTab === 'guest') matchesTab = !o.customer_id;

            return matchesSearch && matchesStatus && matchesTab;
        });

        renderOrders(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterAndRender);
    if (statusFilter) statusFilter.addEventListener('change', filterAndRender);

    tabButtons.forEach(btn => {
        btn.onclick = () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.filter;
            filterAndRender();
        };
    });

    renderOrders(allOrders);
}

async function updateStatus(orderId, status) {
    const res = await adminFetch(`${ADMIN_API_URL}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (res?.ok) {
        showToast(`Order #${orderId} → ${status}`, 'success');
    } else {
        showToast('Failed to update order status', 'error');
    }
}
globalThis.updateStatus = updateStatus;

async function deleteOrder(orderId) {
    const confirmed = await showSabiloreConfirm(`Are you sure you want to permanently delete Order #${orderId}? This action cannot be undone.`, 'CONFIRM DELETE');
    if (!confirmed) return;

    const res = await adminFetch(`${ADMIN_API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (res?.ok) {
        showSabiloreModal(`Order #${orderId} deleted successfully`, 'success', 'DELETED');
        loadAdminOrders();
    } else {
        const errMsg = res ? (await res.json().catch(() => ({}))).message : 'Connection error';
        showSabiloreModal(`Failed to delete order: ${errMsg || 'Unknown error'}`, 'error', 'ERROR');
    }
}
globalThis.deleteOrder = deleteOrder;


let currentLinkOrderId = null;

let cachedCustomersForLink = [];

async function openLinkCustomerModal(orderId) {
    currentLinkOrderId = orderId;
    const order = (globalThis.adminOrdersCache || []).find(o => o.id === orderId);
    if (!order) return;

    
    const infoEl = document.getElementById('link-order-info');
    if (infoEl) {
        infoEl.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h6 class="fw-bold mb-1">Order ${escapeHTML(order.order_number || ('#' + order.id))}</h6>
                    <div class="small text-muted">${escapeHTML(order.customer_name)} (${escapeHTML(order.shipping_email)})</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold">${Number(order.total_amount).toLocaleString()} BDT</div>
                    <div class="small text-muted">${new Date(order.created_at).toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }

    
    const modal = new bootstrap.Modal(document.getElementById('linkCustomerModal'));
    modal.show();

    
    await performCustomerSearch('');

    
    let searchTimeout;
    const searchInput = document.getElementById('customer-link-search');
    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            await performCustomerSearch(searchInput.value.trim());
        }, 300);
    };
}
globalThis.openLinkCustomerModal = openLinkCustomerModal;

async function performCustomerSearch(query) {
    const listBody = document.getElementById('link-customer-list');
    if (!listBody) return;
    
    listBody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

    const res = await adminFetch(`${ADMIN_API_URL}/customers?search=${encodeURIComponent(query)}`);
    if (!res) return;
    const customers = await res.json();
    
    if (customers.length === 0) {
        listBody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted small">No customers found for "' + escapeHTML(query) + '"</td></tr>';
        return;
    }

    listBody.innerHTML = customers.map(c => `
        <tr class="animate-fade-in">
            <td>
                <div class="fw-bold small">${escapeHTML(c.name)}</div>
                <div class="text-muted" style="font-size: 0.7rem;">ID: #${c.id}</div>
            </td>
            <td>
                <div class="small">${escapeHTML(c.email)}</div>
                <div class="text-muted" style="font-size: 0.7rem;">${escapeHTML(c.phone || 'No Phone')}</div>
            </td>
            <td class="text-end">
                <button class="btn btn-sm btn-primary rounded-pill px-3 shadow-sm hover-scale" onclick="confirmLinkCustomer(${c.id}, '${escapeHTML(c.name)}')">
                    Link
                </button>
            </td>
        </tr>
    `).join('');
}

async function confirmLinkCustomer(customerId, customerName) {
    const confirmed = await showSabiloreConfirm(`Are you sure you want to link Order #${currentLinkOrderId} to ${customerName}?`, 'CONFIRM LINK');
    if (!confirmed) return;

    const res = await adminFetch(`${ADMIN_API_URL}/orders/${currentLinkOrderId}/link-customer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
    });

    if (res?.ok) {
        showSabiloreModal('Order linked successfully!', 'success', 'LINKED');
        bootstrap.Modal.getInstance(document.getElementById('linkCustomerModal')).hide();
        loadAdminOrders();
    }
}
globalThis.confirmLinkCustomer = confirmLinkCustomer;




async function loadCustomers() {
    if (!checkAdminAuth()) return;
    const res = await adminFetch(`${ADMIN_API_URL}/customers`);
    if (!res) return;
    const customers = await res.json();
    const tableBody = document.getElementById('admin-customers-table');
    if (!tableBody) return;

    if (customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No customers registered yet</td></tr>';
        return;
    }

    tableBody.innerHTML = customers.map(c => `
        <tr>
            <td class="fw-semibold">#${c.id}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="avatar-circle">${(c.name || '?')[0].toUpperCase()}</div>
                    <span>${c.name || 'N/A'}</span>
                </div>
            </td>
            <td>${c.email || 'N/A'}</td>
            <td>${c.phone || '—'}</td>
            <td>
                <span class="badge ${c.is_blocked ? 'bg-danger' : 'bg-success'} bg-opacity-10 text-${c.is_blocked ? 'danger' : 'success'} rounded-pill px-3">
                    ${c.is_blocked ? 'Blocked' : 'Active'}
                </span>
            </td>
            <td class="text-muted">${c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
            <td class="text-end text-nowrap">
                <button onclick="toggleCustomerBlock(${c.id}, ${c.is_blocked})" class="btn btn-sm ${c.is_blocked ? 'btn-outline-success' : 'btn-outline-danger'} rounded-pill px-3 me-1" title="${c.is_blocked ? 'Unblock' : 'Block'} Customer">
                    <i class="fas ${c.is_blocked ? 'fa-user-check' : 'fa-user-slash'}"></i>
                </button>
                <button onclick="deleteCustomer(${c.id})" class="btn btn-sm btn-outline-danger rounded-pill px-3" title="Delete Customer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function toggleCustomerBlock(id, currentStatus) {
    const newStatus = currentStatus ? 0 : 1;
    const action = newStatus ? 'block' : 'unblock';

    const confirmed = await showSabiloreConfirm(`Are you sure you want to ${action} this customer?`, 'CONFIRM ACTION');
    if (!confirmed) return;

    const res = await adminFetch(`${ADMIN_API_URL}/customers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: newStatus })
    });

    if (res?.ok) {
        showSabiloreModal(`Customer ${action}ed successfully`, 'success', 'SUCCESS');
        loadCustomers();
    } else {
        showSabiloreModal(`Failed to ${action} customer`, 'error', 'ERROR');
    }
}
globalThis.toggleCustomerBlock = toggleCustomerBlock;

async function deleteCustomer(id) {
    const confirmed = await showSabiloreConfirm('Are you sure you want to permanently delete this customer? This will remove all their data and cannot be undone.', 'CONFIRM DELETE');
    if (!confirmed) return;

    const res = await adminFetch(`${ADMIN_API_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (res?.ok) {
        showSabiloreModal(`Customer deleted successfully`, 'success', 'DELETED');
        loadCustomers();
    } else {
        const errMsg = res ? (await res.json().catch(() => ({}))).message : 'Connection error';
        showToast(`Failed to delete customer: ${errMsg || 'Unknown error'}`, 'error');
    }
}
globalThis.deleteCustomer = deleteCustomer;


async function viewAdminOrderDetail(orderId) {
    const cachedOrder = (globalThis.adminOrdersCache || []).find(o => o.id === orderId) || {};
    const customerName = cachedOrder.customer_name || 'Guest';
    const totalAmount = cachedOrder.total_amount || '0';
    const status = cachedOrder.status || 'Pending';

    
    let modal = document.getElementById('adminOrderModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'adminOrderModal';
        modal.id = 'adminOrderModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius:16px;">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold" id="adminOrderModalTitle">Order Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div id="admin-order-loading" class="text-center py-4">
                            <div class="spinner-border spinner-border-sm"></div>
                        </div>
                        <div id="admin-order-content" class="d-none">
                            <div id="admin-order-meta" class="row g-3 p-3 bg-light rounded-3 mb-3"></div>
                            <h6 class="fw-bold mb-3">Order Items</h6>
                            <div id="admin-order-items"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    
    const currentOrder = document.querySelector(`[onclick*="viewAdminOrderDetail(${orderId}"]`)?.closest('tr')?.querySelector('.fw-semibold')?.textContent.trim() || `#${orderId}`;

    document.getElementById('adminOrderModalTitle').textContent = `Order ${currentOrder}`;
    document.getElementById('admin-order-loading').classList.remove('d-none');
    document.getElementById('admin-order-content').classList.add('d-none');

    
    const statusMap = { 'Pending': 'warning', 'Processing': 'info', 'Completed': 'success', 'Cancelled': 'danger' };
    document.getElementById('admin-order-meta').innerHTML = `
        <div class="col-md-3">
            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Customer</small>
            <strong class="text-dark">${customerName}</strong>
        </div>
        <div class="col-md-3">
            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Total Amount</small>
            <strong class="text-dark" id="order-detail-total">${Number(totalAmount).toLocaleString()} BDT</strong>
        </div>
        <div class="col-md-3">
            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Current Status</small>
            <span class="badge bg-${statusMap[status] || 'secondary'} rounded-pill">${status}</span>
        </div>
        <div class="col-md-3">
            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Order ID</small>
            <strong class="text-primary">${currentOrder}</strong>
        </div>
        <div class="col-12 mt-2" id="admin-order-edit-actions">
            
        </div>
    `;

    try {
        
        const res = await adminFetch(`${ADMIN_API_URL}/orders/${orderId}`);
        if (!res) return;
        const data = await res.json();
        const items = data.items || [];
        const order = data.order || {};

        
        document.getElementById('admin-order-edit-actions').innerHTML = `
            <div class="row g-2">
                <div class="col-md-6">
                    <div class="p-2 bg-white border rounded-3 d-flex align-items-center justify-content-between">
                        <div>
                            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Delivery Charge</small>
                            <strong class="text-dark" id="order-detail-charge">${Number(order.delivery_charge || 0).toLocaleString()} BDT</strong>
                        </div>
                        <div class="d-flex gap-2">
                            <input type="number" id="new-delivery-charge" class="form-control form-control-sm" style="width:100px" value="${order.delivery_charge || 0}">
                            <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="updateAdminOrderCharge(${orderId})">Update</button>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-2 bg-white border rounded-3 d-flex align-items-center justify-content-between">
                        <div>
                            <small class="text-muted d-block text-uppercase" style="font-size:0.6rem">Total Amount</small>
                            <strong class="text-dark" id="order-detail-total-editable">${Number(order.total_amount || totalAmount).toLocaleString()} BDT</strong>
                        </div>
                        <div class="d-flex gap-2">
                            <input type="number" id="new-total-amount" class="form-control form-control-sm" style="width:100px" value="${order.total_amount || totalAmount}">
                            <button class="btn btn-sm btn-dark rounded-pill px-3" onclick="updateAdminOrderTotal(${orderId})">Update</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        
        if (order.shipping_address) {
            const shippingHtml = `
                <div class="p-4 border-0 rounded-4 mb-4 bg-white shadow-sm" id="admin-order-shipping-section">
                    <h6 class="fw-bold mb-3 small text-uppercase text-muted letter-spacing-1">Contact & Delivery</h6>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Receiver Name</label>
                            <div class="fw-semibold">${order.shipping_name || customerName}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Phone Number</label>
                            <div class="fw-semibold text-primary">${order.shipping_phone || 'N/A'}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Email Address</label>
                            <div class="fw-semibold text-secondary">${order.shipping_email || 'N/A'}</div>
                        </div>
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Full Address</label>
                            <div class="fw-semibold">${order.shipping_address}, ${order.shipping_city || ''} ${order.shipping_postal ? `(${order.shipping_postal})` : ''}</div>
                        </div>
                        ${order.bkash_trx_id ? `
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Transaction ID</label>
                            <div class="fw-bold text-success">${order.bkash_trx_id}</div>
                        </div>` : ''}
                        ${order.coupon_code ? `
                        <div class="col-md-4">
                            <label class="d-block text-muted small">Coupon Used</label>
                            <div class="fw-bold text-primary">${order.coupon_code} (-${order.discount_amount} BDT)</div>
                        </div>` : ''}
                        ${order.notes ? `
                        <div class="col-12 mt-2 p-2 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3">
                            <label class="d-block text-warning small fw-bold">Order Notes</label>
                            <div class="small">${order.notes}</div>
                        </div>` : ''}
                    </div>
                </div>
            `;
            
            const oldSection = document.getElementById('admin-order-shipping-section');
            if (oldSection) oldSection.remove();

            document.getElementById('admin-order-meta').insertAdjacentHTML('afterend', shippingHtml);
        }

        document.getElementById('admin-order-items').innerHTML = items.length === 0
            ? '<p class="text-muted">No items found</p>'
            : items.map(item => {
                let imgToUse = item.variant_image || item.image;
                let imgSrc = 'https://via.placeholder.com/60x60';
                if (imgToUse) {
                    imgSrc = imgToUse.startsWith('http') ? imgToUse : BASE_URL + imgToUse;
                }
                return `
                <div class="d-flex align-items-center mb-3 p-3 bg-light rounded-3">
                    <img src="${imgSrc}"
                         style="width:60px;height:60px;object-fit:cover;border-radius:8px" class="me-3 flex-shrink-0"
                         loading="lazy" decoding="async" onerror="this.src='https://via.placeholder.com/60x60'">
                    <div class="flex-grow-1">
                        <h6 class="mb-1 fw-bold">${item.name || 'Product'}</h6>
                        <div class="d-flex flex-wrap gap-2 mb-1">
                            ${item.size ? `<span class="badge bg-dark rounded-pill px-3 py-1"><i class="fas fa-ruler me-1"></i>Size: ${item.size}</span>` : ''}
                            ${item.color ? `<span class="badge bg-secondary rounded-pill px-3 py-1"><i class="fas fa-palette me-1"></i>Color: ${item.color}</span>` : ''}
                            ${item.tummy_shape ? `<span class="badge bg-info text-white rounded-pill px-3 py-1"><i class="fas fa-user me-1"></i>Tummy: ${item.tummy_shape}</span>` : ''}
                        </div>
                        <small class="text-muted">Qty: ${item.quantity} × ${Number(item.price).toLocaleString()} BDT</small>
                    </div>
                    <strong class="fw-bold ms-2">${(item.quantity * item.price).toLocaleString()} BDT</strong>
                </div>
            `}).join('');

        document.getElementById('admin-order-loading').classList.add('d-none');
        document.getElementById('admin-order-content').classList.remove('d-none');
    } catch (err) {
        console.error('Error loading order details:', err);
        document.getElementById('admin-order-loading').innerHTML = '<p class="text-danger">Error loading details</p>';
    }
}
globalThis.viewAdminOrderDetail = viewAdminOrderDetail;

async function updateAdminOrderCharge(orderId) {
    const newCharge = document.getElementById('new-delivery-charge').value;
    if (newCharge === '' || Number.isNaN(Number(newCharge)) || newCharge < 0) {
        showToast('Please enter a valid delivery charge', 'error');
        return;
    }

    const res = await adminFetch(`${ADMIN_API_URL}/orders/${orderId}/charge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_charge: Number(newCharge) })
    });

    if (res?.ok) {
        const data = await res.json();
        showToast('Delivery charge updated successfully', 'success');
        
        const chargeEl = document.getElementById('order-detail-charge');
        if (chargeEl) chargeEl.textContent = `${Number(data.delivery_charge).toLocaleString()} BDT`;

        const totalValEl = document.getElementById('order-detail-total');
        if (totalValEl) totalValEl.textContent = `${Number(data.total_amount).toLocaleString()} BDT`;

        const editableTotalLabel = document.getElementById('order-detail-total-editable');
        if (editableTotalLabel) editableTotalLabel.textContent = `${Number(data.total_amount).toLocaleString()} BDT`;

        
        loadAdminOrders();
    } else {
        const errMsg = res ? (await res.json().catch(() => ({}))).message : 'Connection error';
        showToast(errMsg || 'Failed to update delivery charge', 'error');
    }
}
globalThis.updateAdminOrderCharge = updateAdminOrderCharge;

async function updateAdminOrderTotal(orderId) {
    const newTotal = document.getElementById('new-total-amount').value;
    if (newTotal === '' || Number.isNaN(Number(newTotal)) || newTotal < 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    const res = await adminFetch(`${ADMIN_API_URL}/orders/${orderId}/total`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_amount: Number(newTotal) })
    });

    if (res?.ok) {
        const data = await res.json();
        showToast('Order total updated successfully', 'success');

        
        const totalLabel = document.getElementById('order-detail-total');
        if (totalLabel) totalLabel.textContent = `${Number(data.total_amount).toLocaleString()} BDT`;

        const editableTotalLabel = document.getElementById('order-detail-total-editable');
        if (editableTotalLabel) editableTotalLabel.textContent = `${Number(data.total_amount).toLocaleString()} BDT`;

        
        loadAdminOrders();
    } else {
        const errMsg = res ? (await res.json().catch(() => ({}))).message : 'Connection error';
        showToast(errMsg || 'Failed to update total amount', 'error');
    }
}
globalThis.updateAdminOrderTotal = updateAdminOrderTotal;

function updatePreviewImage(settingKey, settingsObj, elementId) {
    if (settingsObj[settingKey]) {
        const preview = document.getElementById(elementId);
        if (preview) {
            preview.src = settingsObj[settingKey].startsWith('http') ? settingsObj[settingKey] : BASE_URL + settingsObj[settingKey];
            preview.closest('.preview-wrapper')?.classList.remove('d-none');
        }
    }
}


async function loadAdminSettings() {
    if (!checkAdminAuth()) return;
    try {
        const res = await adminFetch(`${ADMIN_API_URL}/settings`);
        if (!res) return;
        const settings = await res.json();

        updatePreviewImage('site_logo', settings, 'logo-preview');
        updatePreviewImage('site_favicon', settings, 'favicon-preview');
        updatePreviewImage('hero_image', settings, 'hero-preview');
        
        const textFields = ['site_name', 'contact_email', 'contact_phone', 'facebook_url', 'instagram_url', 'whatsapp_url'];
        textFields.forEach(key => {
            const el = document.getElementById(key);
            if (el && settings[key]) el.value = settings[key];
        });
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
globalThis.loadAdminSettings = loadAdminSettings;

async function updateAdminSettings(formData) {
    const res = await adminFetch(`${ADMIN_API_URL}/settings`, {
        method: 'POST',
        body: formData
    });
    if (!res) return;

    if (res.ok) {
        showToast('Settings saved successfully!', 'success');
        setTimeout(() => location.reload(), 1000);
    } else {
        const err = await res.json();
        showToast('Error: ' + err.message, 'error');
    }
}
globalThis.updateAdminSettings = updateAdminSettings;

function applyFaviconToDOM(url) {
    if (!url) return;
    let links = document.querySelectorAll('link[rel*="icon"]');
    if (links.length > 0) {
        links.forEach(link => link.href = url);
    } else {
        let link = document.createElement('link');
        link.rel = 'icon';
        link.href = url;
        document.head.appendChild(link);
    }
}

async function initAdminFavicon() {
    try {
        let url = sessionStorage.getItem('_admin_favicon_v2');
        if (!url) {
            const res = await adminFetch(`${ADMIN_API_URL}/settings`);
            if (res?.ok) {
                const settings = await res.json();
                if (settings.site_favicon) {
                    url = settings.site_favicon.startsWith('http') ? settings.site_favicon : BASE_URL + settings.site_favicon;
                    
                    url += (url.includes('?') ? '&' : '?') + 'v=favicon_v2';
                    sessionStorage.setItem('_admin_favicon_v2', url);
                }
            }
        }
        
        applyFaviconToDOM(url);
    } catch (e) {
        console.error('Failed to init admin favicon', e);
    }
}



function toggleAdminSidebar() {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('adminSidebarOverlay');

    if (globalThis.innerWidth < 768) {
        
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        const closeBtn = document.getElementById('adminSidebarCloseBtn');
        if (closeBtn) closeBtn.classList.toggle('active');
    } else {
        
        document.body.classList.toggle('sidebar-collapsed');
        
        localStorage.setItem('admin_sidebar_collapsed', document.body.classList.contains('sidebar-collapsed'));
    }
}


document.addEventListener('DOMContentLoaded', () => {
    
    if (localStorage.getItem('admin_sidebar_collapsed') === 'true' && globalThis.innerWidth >= 768) {
        document.body.classList.add('sidebar-collapsed');
    }

    
    initAdminFavicon();

    
    const brandFlex = document.querySelector('.sidebar .brand .gap-2');
    if (brandFlex) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-sm btn-light desktop-toggle-btn d-none d-md-inline-block border-0';
        toggleBtn.innerHTML = '<i class="fas fa-bars text-secondary"></i>';
        toggleBtn.onclick = toggleAdminSidebar;
        toggleBtn.title = "Toggle Sidebar";
        brandFlex.insertBefore(toggleBtn, brandFlex.firstChild);
    }
});


function renderAdminLayout() {
    const layoutPlaceholder = document.getElementById('admin-layout-placeholder');
    if (!layoutPlaceholder) return;

    
    const path = globalThis.location.pathname.toLowerCase().replace(/\/$/, "");
    const segments = path.split('/').filter(Boolean);
    let activePage = 'index'; 

    if (segments.length > 1) {
        activePage = segments[segments.length - 1].replace('.html', '');
    } else if (segments.length === 1 && segments[0] !== 'admin') {
        activePage = segments[0].replace('.html', '');
    }

    const navGroups = [
        {
            title: "Overview",
            items: [
                { href: './', icon: 'far fa-chart-bar', text: 'Dashboard', id: 'index' },
                { href: 'reports', icon: 'far fa-file-alt', text: 'Reports', id: 'reports' },
                { href: 'activity-logs', icon: 'far fa-clock', text: 'Activity Logs', id: 'activity-logs' }
            ]
        },
        {
            title: "Catalog & Inventory",
            items: [
                { href: 'products', icon: 'far fa-list-alt', text: 'Products', id: 'products' },
                { href: 'categories', icon: 'far fa-bookmark', text: 'Categories', id: 'categories' },
                { href: 'colors', icon: 'far fa-clone', text: 'Color Plate', id: 'colors' },
                { href: 'product-size-options', icon: 'far fa-square', text: 'Product (Size Chart)', id: 'product-size-options' }
            ]
        },
        {
            title: "Sales & Customers",
            items: [
                { href: 'orders', icon: 'far fa-credit-card', text: 'Orders', id: 'orders' },
                { href: 'returns', icon: 'far fa-calendar-check', text: 'Returns', id: 'returns' },
                { href: 'customers', icon: 'far fa-user', text: 'Customers', id: 'customers' },
                { href: 'coupons', icon: 'far fa-star', text: 'Coupons', id: 'coupons' }
            ]
        },
        {
            title: "Content & Marketing",
            items: [
                { href: 'blog', icon: 'far fa-edit', text: 'Blog Manager', id: 'blog' },
                { href: 'contact-messages', icon: 'far fa-comments', text: 'Messages', id: 'contact-messages' },
                { href: 'newsletter', icon: 'far fa-paper-plane', text: 'Newsletter', id: 'newsletter' }
            ]
        },
        {
            title: "Configuration",
            items: [
                { href: 'settings', icon: 'far fa-sun', text: 'Store Settings', id: 'settings' },
                { href: 'payments', icon: 'far fa-money-bill-alt', text: 'Payment Config', id: 'payments' }
            ]
        }
    ];

    const navHtml = navGroups.map(group => `
        <div class="sidebar-nav-group">
            <h6 class="sidebar-heading px-3 mt-4 mb-2 text-muted text-uppercase fw-bold" style="font-size: 0.65rem; letter-spacing: 0.1em;">
                ${group.title}
            </h6>
            ${group.items.map(item => `
                <a class="nav-link ${activePage === item.id ? 'active' : ''}" href="${item.href}">
                    <i class="${item.icon} me-2"></i> 
                    <span class="nav-text">${item.text}</span>
                </a>
            `).join('')}
        </div>
    `).join('');

    layoutPlaceholder.innerHTML = `
        
        <div class="admin-mobile-header">
            <button class="admin-hamburger" onclick="toggleAdminSidebar()"><i class="fas fa-bars"></i></button>
            <div class="d-flex align-items-center gap-2">
                 <h5 class="mb-0">SABILORÉ</h5>
            </div>
            <a href="/" target="_blank" class="btn btn-outline-dark btn-sm rounded-pill" style="font-size:0.7rem;padding:3px 10px;">
                <i class="fas fa-external-link-alt"></i>
            </a>
        </div>

        
        <div class="admin-sidebar-overlay" id="adminSidebarOverlay" onclick="toggleAdminSidebar()" style="z-index: 1045;"></div>

        
        <button class="sidebar-close-btn d-md-none" id="adminSidebarCloseBtn" onclick="toggleAdminSidebar()"><i class="fas fa-times"></i></button>

        
        <div class="sidebar position-fixed" id="adminSidebar" style="z-index: 1050;">
            <div class="brand">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <div>
                            <h4 class="mb-0">SABILORÉ</h4>
                            <small class="text-muted">Admin Evolution</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <a href="/" target="_blank" class="btn btn-outline-primary btn-sm rounded-pill view-site-btn" title="View Website">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            </div>
            <nav class="pb-5">
                ${navHtml}
            </nav>
            <div class="mt-auto p-3 position-relative sidebar-footer">
                <button onclick="logout()" class="btn btn-danger w-100 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2">
                    <i class="fas fa-sign-out-alt"></i> <span class="nav-text">Logout</span>
                </button>
            </div>
        </div>
    `;

    
    const brandFlex = document.querySelector('.sidebar .brand .gap-2');
    if (brandFlex && !brandFlex.querySelector('.desktop-toggle-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-sm btn-light desktop-toggle-btn d-none d-md-inline-block border-0';
        toggleBtn.innerHTML = '<i class="fas fa-bars text-secondary"></i>';
        toggleBtn.onclick = toggleAdminSidebar;
        toggleBtn.title = "Toggle Sidebar";
        brandFlex.insertBefore(toggleBtn, brandFlex.firstChild);
    }

    
    if (localStorage.getItem('admin_sidebar_collapsed') === 'true' && globalThis.innerWidth >= 768) {
        document.body.classList.add('sidebar-collapsed');
    }

    
    
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) {
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                localStorage.setItem('admin_sidebar_scroll', sidebar.scrollTop);

                
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('open');
                    const overlay = document.getElementById('adminSidebarOverlay');
                    if (overlay) overlay.classList.remove('active');
                    const closeBtn = document.getElementById('adminSidebarCloseBtn');
                    if (closeBtn) closeBtn.classList.remove('active');
                }
            });
        });

        
        const savedScroll = localStorage.getItem('admin_sidebar_scroll');
        if (savedScroll) {
            requestAnimationFrame(() => {
                sidebar.scrollTop = Number.parseInt(savedScroll, 10);
            });
        }
    }
}
globalThis.renderAdminLayout = renderAdminLayout;

