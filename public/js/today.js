// public/js/today.js
(() => {
    const list = document.getElementById('today-list');
    if (!list) return;

    list.addEventListener('click', async (e) => {
        const btn = e.target.closest('.mark-btn');
        if (!btn) return;

        const li = btn.closest('li');

        // support both <li> and <button> data attributes
        const logId = Number((li?.dataset.logId ?? btn.dataset.logId ?? 0));
        const supplementId = Number((li?.dataset.supplementId ?? btn.dataset.supplementId));
        const localTime = String((li?.dataset.localTime ?? btn.dataset.localTime ?? '')).trim();

        const curr = (btn.getAttribute('data-status') || 'PENDING').toUpperCase();
        const toStatus = (curr === 'TAKEN') ? 'PENDING' : 'TAKEN';

        try {
            const res = await fetch('/dose/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logId, supplementId, localTime, toStatus })
            });

            if (!res.ok) {
                const t = await res.text();
                alert('Failed: ' + t);
                return;
            }

            const data = await res.json();
            if (data.logId) {
                if (li) li.dataset.logId = String(data.logId);
                btn.dataset.logId = String(data.logId);
            }

            btn.textContent = (data.status === 'TAKEN') ? '✔ Taken' : 'Mark as Taken';
            btn.classList.toggle('btn-success', data.status !== 'TAKEN');
            btn.classList.toggle('btn-outline-secondary', data.status === 'TAKEN');
            btn.setAttribute('data-status', data.status);

        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    });
})();