// ============================================================================
// הלוח הציבורי היומי — ללא התחברות. קורא רק דרך פונקציית get_board(token).
// ============================================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const main = document.getElementById('boardMain');
    const dateLabel = document.getElementById('boardDate');

    if (!token) {
      main.innerHTML = '<div class="empty">הקישור לא תקין. יש לבקש קישור חדש מהמנהלת.</div>';
      return;
    }

    const { data, error } = await supabaseClient.rpc('get_board', { p_token: token });

    if (error || !data || !data.found) {
      main.innerHTML = '<div class="empty">הקישור הזה לא נמצא, או שפג תוקפו. יש לבקש קישור חדש מהמנהלת.</div>';
      return;
    }

    dateLabel.textContent = formatHebrewDate(data.date);
    renderChildren(data.children || []);
    renderMadrichot(data.madrichot || []);
  }

  function renderChildren(list) {
    const el = document.getElementById('parentsSection');
    if (!list.length) {
      el.innerHTML = '<div class="empty">אין ילדים רשומים להיום.</div>';
      return;
    }
    el.innerHTML =
      '<ul class="list">' +
      list
        .map((c) => {
          const parents = [];
          if (c.mother_name) {
            parents.push(
              '<a class="call" href="' + esc(telHref(c.mother_phone || '')) + '">' +
                esc(c.mother_name) + (c.mother_phone ? ' · ' + esc(c.mother_phone) : '') +
              '</a>'
            );
          }
          if (c.father_name) {
            parents.push(
              '<a class="call" href="' + esc(telHref(c.father_phone || '')) + '">' +
                esc(c.father_name) + (c.father_phone ? ' · ' + esc(c.father_phone) : '') +
              '</a>'
            );
          }
          return (
            '<li class="row"><div class="info">' +
            '<strong>' + esc(c.child_name || 'ילד/ה') + '</strong>' +
            (c.pickup_info ? '<span class="sub">אוסף/ת: ' + esc(c.pickup_info) + '</span>' : '') +
            (c.notes ? '<span class="sub">' + esc(c.notes) + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">' + (parents.join('') || '<span class="muted">אין פרטי הורה</span>') + '</div>' +
            '</li>'
          );
        })
        .join('') +
      '</ul>';
  }

  function renderMadrichot(list) {
    const el = document.getElementById('madrichotSection');
    if (!list.length) {
      el.innerHTML = '<div class="empty">טרם שובצו מדריכות להיום.</div>';
      return;
    }
    el.innerHTML =
      '<ul class="list">' +
      list
        .map(
          (m) =>
            '<li class="row"><div class="info"><strong>' + esc(m.full_name) + '</strong></div>' +
            '<a class="call" href="' + esc(telHref(m.phone)) + '">' + esc(m.phone) + '</a>' +
            '</li>'
        )
        .join('') +
      '</ul>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function telHref(phone) {
    return 'tel:' + String(phone).replace(/[^0-9+]/g, '');
  }

  function formatHebrewDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
})();
