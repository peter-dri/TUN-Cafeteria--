// Simple Promise-based confirm modal
(function () {
    function ensureElements() {
        const modal = document.getElementById('confirmModal');
        const msg = document.getElementById('confirmMessage');
        const yes = document.getElementById('confirmYes');
        const no = document.getElementById('confirmNo');
        return { modal, msg, yes, no };
    }

    let active = false;

    async function confirm(message, title = 'Please confirm') {
        if (active) return false;
        const { modal, msg, yes, no } = ensureElements();
        if (!modal || !msg || !yes || !no) {
            // fallback to native confirm if modal not present
            return window.confirm(message);
        }

        active = true;
        msg.textContent = message;
        const titleEl = document.getElementById('confirmTitle');
        if (titleEl) titleEl.textContent = title;

        modal.style.display = 'flex';

        return await new Promise(resolve => {
            function cleanup() {
                modal.style.display = 'none';
                yes.removeEventListener('click', onYes);
                no.removeEventListener('click', onNo);
                document.removeEventListener('keydown', onKey);
                active = false;
            }

            function onYes() {
                cleanup();
                resolve(true);
            }

            function onNo() {
                cleanup();
                resolve(false);
            }

            function onKey(e) {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                }
            }

            yes.addEventListener('click', onYes);
            no.addEventListener('click', onNo);
            document.addEventListener('keydown', onKey);
        });
    }

    window.Confirm = {
        confirm
    };
})();
