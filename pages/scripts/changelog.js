/**
 * changelog.js — Generic changelog loader & renderer.
 *
 * Usage: add these data attributes to the container element:
 *   data-changelog-src="path/to/Changelog.txt"
 *   data-product-name="My Product Name"
 *
 * Example:
 *   <div id="my-changelog"
 *        data-changelog-src="pages/PWB/PWBChangeLog.txt"
 *        data-product-name="Prefab World Builder">
 *   </div>
 *   <script src="pages/scripts/changelog.js"></script>
 */
(async function () {
    const container = document.querySelector('[data-changelog-src]');
    if (!container) return;

    const src         = container.dataset.changelogSrc;
    const productName = container.dataset.productName || '';

    try {
        const res = await fetch(src);
        if (!res.ok) throw new Error();
        renderChangelog(container, parseChangelog(await res.text(), productName));
    } catch {
        container.innerHTML =
            '<h2>Version History</h2>' +
            '<p style="color:var(--secondary-text);text-align:center;padding:20px">Could not load changelog.</p>';
    }

    function parseChangelog(text, name) {
        const lines   = text.split('\n').map(l => l.trim());
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const header  = new RegExp('^' + escaped + '\\s+(\\S+)\\s+(.+)$');
        const CAT_MAP = { features: 'Features', fixes: 'Fixes', changes: 'Changes', changed: 'Changes' };

        const versions = [];
        let cur = null, cat = null;

        for (const line of lines) {
            if (!line) continue;
            const m = line.match(header);
            if (m) {
                cur = { version: m[1], date: m[2], categories: {} };
                versions.push(cur);
                cat = null;
                continue;
            }
            if (!cur) continue;
            const mapped = CAT_MAP[line.toLowerCase()];
            if (mapped) {
                cat = mapped;
                if (!cur.categories[cat]) cur.categories[cat] = [];
                continue;
            }
            if (cat && line.startsWith('[')) {
                cur.categories[cat].push(line);
            }
        }
        return versions;
    }

    function renderChangelog(container, versions) {
        const ORDER     = ['Features', 'Changes', 'Fixes'];
        const CAT_CLASS = { Features: 'category--features', Changes: 'category--changes', Fixes: 'category--fixes' };
        const productName = container.dataset.productName || '';
        let html = '<h2>Version History</h2>';

        for (const v of versions) {
            const hasCats = ORDER.some(c => v.categories[c]?.length);
            if (!hasCats) continue;

            html += `<article class="changelog-entry">
                <h3 class="version-title">
                    ${esc(productName)} ${esc(v.version)}
                    <span class="version-date">${esc(v.date)}</span>
                </h3>
                <div class="changelog-categories">`;

            for (const catName of ORDER) {
                const items = v.categories[catName];
                if (!items?.length) continue;
                html += `<div class="category ${CAT_CLASS[catName]}">
                    <h4 class="category-title">${catName}</h4>
                    <ul class="change-list">`;
                for (const item of items) {
                    html += `<li>${fmt(item)}</li>`;
                }
                html += `</ul></div>`;
            }
            html += `</div></article>`;
        }
        container.innerHTML = html;
    }

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fmt(item) {
        return esc(item).replace(/^\[(\w+)\]/, '<strong>[$1]</strong>');
    }
})();
