window.initSizeCalculator = function() {
    const calcForm = document.getElementById('size-calc-form');
    if (!calcForm) return;

    calcForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const height = parseFloat(document.getElementById('height').value);
        const weight = parseFloat(document.getElementById('weight').value);
        const shape = document.getElementById('tummy-shape')?.value || 'average';

        const resultDisplay = document.getElementById('size-result');
        if (!resultDisplay) return;

        if (!height || !weight) {
            resultDisplay.innerHTML = '<span class="text-danger">Please enter both height and weight.</span>';
            resultDisplay.classList.remove('d-none');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'CALCULATING...';

        try {
            const res = await fetch('/api/admin/size-guide/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tummy_shape: shape, weight, height })
            });

            const data = await res.json();

            if (data.recommendedSize) {
                resultDisplay.innerHTML = `BEST FIT FOR YOU: <span class="badge bg-dark fs-6 ms-2 px-3">${data.recommendedSize}</span>`;
                resultDisplay.classList.remove('d-none', 'alert-danger');
                resultDisplay.classList.add('alert-success');

                
                const mainSizeSelector = document.getElementById('size-selector');
                if (mainSizeSelector) {
                    mainSizeSelector.value = data.recommendedSize;
                }
            } else {
                resultDisplay.innerHTML = data.message || 'No specific match found. Please refer to chart.';
                resultDisplay.classList.remove('d-none', 'alert-success');
                resultDisplay.classList.add('alert-warning');
            }
        } catch (error) {
            console.error('Size Calc Error:', error);
            resultDisplay.innerHTML = '<span class="text-danger">Service busy. Please check chart manually.</span>';
            resultDisplay.classList.remove('d-none');
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });

    
    loadTummyIllustrations();
}

window.toggleTummyCollapse = function() {
    const collapse = document.getElementById('tummyCollapse');
    const measurements = document.getElementById('measurementsSection');
    const shape = document.getElementById('tummy-shape')?.value || 'average';

    if (collapse) {
        if (collapse.classList.contains('d-none')) {
            collapse.classList.remove('d-none');
            if (measurements) measurements.classList.add('d-none');
            
            updateTummyHero(shape);
        } else {
            collapse.classList.add('d-none');
            if (measurements) measurements.classList.remove('d-none');
        }
    }
}

function selectTummyRadio(shape) {
    
    const shapeInput = document.getElementById('tummy-shape');
    if (shapeInput) shapeInput.value = shape;

    
    document.querySelectorAll('.custom-radio-circle').forEach(rd => {
        rd.classList.remove('active');
    });
    const activeRadio = document.getElementById(`radio-${shape}`);
    if (activeRadio) activeRadio.classList.add('active');

    
    const selectBtn = document.getElementById('btn-select-shape');
    if (selectBtn) {
        selectBtn.innerText = `SHAPE: ${shape.toUpperCase()}`;
    }

    
    updateTummyHero(shape);

    
    localStorage.setItem('last_tummy_shape', shape);
}

function updateTummyHero(shape) {
    const heroImg = document.getElementById('sr-tummy-hero-img');
    const placeholder = document.getElementById('sr-tummy-hero-placeholder');
    if (!heroImg || !window.siteSettings) return;

    const imgSrc = window.siteSettings[`tummy_${shape.toLowerCase()}_img`];

    if (imgSrc) {
        heroImg.src = imgSrc.startsWith('http') ? imgSrc : (window.BASE_URL || '') + imgSrc;
        heroImg.classList.remove('d-none');
        heroImg.style.display = 'inline-block';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        heroImg.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
    }
}

async function loadTummyIllustrations() {
    
    if (!window.siteSettings) {
        if (window.getSiteSettingsFast) {
            await window.getSiteSettingsFast();
        } else if (window.getSettings) {
            await window.getSettings();
        }
    }

    
    let attempts = 0;
    while (!window.siteSettings && attempts < 10) {
        await new Promise(r => setTimeout(r, 400));
        attempts++;
    }

    if (!window.siteSettings) return;

    
    const initialShape = document.getElementById('tummy-shape')?.value || localStorage.getItem('last_tummy_shape') || 'average';
    updateTummyHero(initialShape);

    
    selectTummyRadio(initialShape);
}
