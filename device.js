// ============================================================
// MK_Device — laitetunnistus ja Lite-tila
// Tunnistaa hitaat/vanhat laitteet ja heikon verkon.
// Lite-tilassa karsitaan efektit/animaatiot vain VIERASNÄKYMÄSTÄ
// (kirjautuminen + tilastot) — QR, lomake ja tallennus toimivat aina.
// Miittiseinä ei käytä Lite-tilaa.
// ============================================================
(function () {
    var lite = false;
    var reasons = [];
    try {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
        var mem = navigator.deviceMemory || 0;
        var cores = navigator.hardwareConcurrency || 0;
        var reduced = false;
        try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e0) {}

        if (reduced) { lite = true; reasons.push('reduced-motion'); }
        else if (mem && mem <= 2) { lite = true; reasons.push('memory'); }
        else if (cores && cores <= 2) { lite = true; reasons.push('cores'); }
        else if (conn.saveData === true) { lite = true; reasons.push('save-data'); }
        else if (/2g/.test(conn.effectiveType || '')) { lite = true; reasons.push('slow-network'); }
        else if (typeof window.requestAnimationFrame !== 'function') { lite = true; reasons.push('legacy'); }
    } catch (e) { /* tuntematon laite → täysi versio */ }

    window.MK_LITE = lite;
    window.MK_Device = { lite: lite, reasons: reasons };

    // Luokka <html>-elementtiin välittömästi — CSS pääsee reagoimaan ennen renderöintiä
    if (lite && document.documentElement) {
        var cn = document.documentElement.className || '';
        document.documentElement.className = cn + (cn ? ' ' : '') + 'mk-lite';
    }
})();
