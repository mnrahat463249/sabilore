


document.addEventListener('DOMContentLoaded', () => {
    const apiBase = '/admin/colors'; 
    const form = document.getElementById('color-form');
    const nameInput = document.getElementById('color-name');
    const hexInput = document.getElementById('color-hex');
    const previewSwatch = document.getElementById('preview-swatch');
    const listContainer = document.getElementById('color-list');
    const submitBtn = document.getElementById('form-submit');
    const hexError = document.getElementById('hex-error');
    let editId = null;

    
    const fetchColors = async () => {
        const res = await fetch(apiBase);
        if (!res.ok) throw new Error('Failed to load colors');
        return await res.json();
    };

    const renderList = async () => {
        const colors = await fetchColors();
        listContainer.innerHTML = '';
        colors.forEach(c => {
            const item = document.createElement('div');
            item.className = 'color-item';
            item.innerHTML = `
        <div class="color-swatch" style="background:${c.hex_code || c.hex}"></div>
        <span>${c.name} (${c.hex_code || c.hex})</span>
        <div class="color-actions">
          <button class="edit-btn" data-id="${c.id}">✏️</button>
          <button class="del-btn" data-id="${c.id}">🗑️</button>
        </div>
      `;
            listContainer.appendChild(item);
        });
    };

    const resetForm = () => {
        form.reset();
        editId = null;
        submitBtn.textContent = 'Add Color';
        previewSwatch.style.background = 'transparent';
        hexError.textContent = '';
    };

    
    
    hexInput.addEventListener('input', () => {
        const hex = hexInput.value.trim();
        if (/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            previewSwatch.style.background = hex;
            hexError.textContent = '';
        } else {
            previewSwatch.style.background = 'transparent';
        }
    });

    
    form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const hex = hexInput.value.trim().toUpperCase();
        if (!/^#([A-Fa-f0-9]{6})$/.test(hex)) {
            hexError.textContent = 'Invalid hex format (e.g. #FF5733)';
            return;
        }
        try {
            const method = editId ? 'PUT' : 'POST';
            const url = editId ? `${apiBase}/${editId}` : apiBase;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, hex })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error');
            resetForm();
            await renderList();
        } catch (err) {
            alert(err.message);
        }
    });

    
    listContainer.addEventListener('click', async e => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            const id = target.dataset.id;
            const colors = await fetchColors();
            const color = colors.find(c => c.id == id);
            if (color) {
                nameInput.value = color.name;
                hexInput.value = color.hex_code || color.hex;
                previewSwatch.style.background = color.hex_code || color.hex;
                editId = id;
                submitBtn.textContent = 'Update Color';
            }
        }
        if (target.classList.contains('del-btn')) {
            const id = target.dataset.id;
            if (!confirm('Delete this color?')) return;
            try {
                const res = await fetch(`${apiBase}/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Error');
                await renderList();
            } catch (err) {
                alert(err.message);
            }
        }
    });

    
    renderList();
});
