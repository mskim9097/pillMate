(() => {
    const modalEl = document.getElementById('supplementModal');
    const form = document.getElementById('supplement-form');
    const title = document.getElementById('supplement-modal-title');
    const idInput = document.getElementById('supplement-id');
    const nameInput = document.getElementById('supplement-name');

    const dosageHidden = document.getElementById('supplement-dosage');
    const dosageNum = document.getElementById('supplement-dosage-number');
    const dosageUnit = document.getElementById('supplement-dosage-unit');

    const timeList = document.getElementById('time-list');
    const addTimeBtn = document.getElementById('add-time');
    const deleteBtn = document.getElementById('btn-delete');
    const newBtn = document.getElementById('btn-new-supplement');

    if (!modalEl) return;

    function addTimeRow(value = '') {
        const row = document.createElement('div');
        row.className = 'input-group';
        row.innerHTML = `
      <input type="time" class="form-control" name="times" value="${value}">
      <button class="btn btn-outline-danger" type="button" aria-label="Remove">&times;</button>
    `;
        row.querySelector('button').addEventListener('click', () => {
            row.remove();
            if (!timeList.children.length) addTimeRow();
        });
        timeList.appendChild(row);
    }

    function parseDosage(str) {
        if (typeof str !== 'string') return { n: '', u: '' };
        const m = str.trim().match(/^(\d+(?:\.\d+)?)(?:\s*)(.*)$/i);
        if (!m) return { n: '', u: str.trim() || '' };
        return { n: m[1], u: (m[2] || '').trim() };
    }

    function buildDosageString() {
        const n = (dosageNum?.value ?? '').toString().trim();
        const u = (dosageUnit?.value ?? '').toString().trim();
        if (!n && !u) return '';
        if (!n) return u;
        if (!u) return n;
        return `${n} ${u}`;
    }

    function resetForm() {
        idInput.value = '';
        nameInput.value = '';
        if (dosageHidden) dosageHidden.value = '';
        if (dosageNum) dosageNum.value = '';
        if (dosageUnit) dosageUnit.value = '';

        timeList.innerHTML = '';
        addTimeRow();

        deleteBtn.classList.add('d-none');
        title.textContent = 'Add Supplement';
        form.action = '/supplements';
        form.method = 'POST';
    }

    newBtn?.addEventListener('click', () => resetForm());

    document.querySelectorAll('button[data-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            resetForm();
            title.textContent = 'Edit Supplement';
            idInput.value = id;
            deleteBtn.classList.remove('d-none');

            form.action = `/supplements/${id}`;
            form.method = 'POST';

            try {
                const res = await fetch(`/supplements/api/${id}`);
                if (!res.ok) throw new Error('Fetch failed');
                const data = await res.json();

                nameInput.value = data.name || '';

                const { n, u } = parseDosage(data.dosage || '');
                if (dosageNum) dosageNum.value = n;
                if (dosageUnit) {
                    const hasOption = [...dosageUnit.options].some(o => o.value === u);
                    dosageUnit.value = hasOption ? u : (u || dosageUnit.value);
                }

                timeList.innerHTML = '';
                if (Array.isArray(data.times) && data.times.length) {
                    data.times.forEach(t => addTimeRow(t));
                } else {
                    addTimeRow();
                }
            } catch (e) {
                console.error(e);
            }
        });
    });

    addTimeBtn?.addEventListener('click', () => addTimeRow());

    form?.addEventListener('submit', () => {
        [...timeList.querySelectorAll('input[name="times"]')].forEach(i => (i.name = 'times[]'));
        const combined = buildDosageString();
        if (dosageHidden) dosageHidden.value = combined;
    });

    deleteBtn?.addEventListener('click', async () => {
        const id = idInput.value;
        if (!id) return;
        if (!confirm('Delete this supplement?')) return;
        try {
            const res = await fetch(`/supplements/${id}`, { method: 'DELETE' });
            if (res.ok) location.reload();
            else alert('Failed to delete.');
        } catch (e) {
            console.error(e);
        }
    });

    addTimeRow();
})();