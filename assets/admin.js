// ============================================================================
// מסך ניהול — מערכת משחקיית "שפרה ופועה"
// ============================================================================

(function () {
  'use strict';

  const els = {};
  let selectedDate = todayIso();

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheEls();
    wireStaticEvents();

    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      showApp();
    } else {
      showLogin();
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) showApp();
      else showLogin();
    });
  }

  function cacheEls() {
    els.loginView = document.getElementById('loginView');
    els.appView = document.getElementById('appView');
    els.loginForm = document.getElementById('loginForm');
    els.loginEmail = document.getElementById('loginEmail');
    els.loginPassword = document.getElementById('loginPassword');
    els.loginStatus = document.getElementById('loginStatus');
    els.logoutBtn = document.getElementById('logoutBtn');

    els.tabButtons = Array.from(document.querySelectorAll('nav.tabs button'));
    els.views = Array.from(document.querySelectorAll('section[data-view]'));

    els.journalDate = document.getElementById('journalDate');
    els.journalDateLabel = document.getElementById('journalDateLabel');
    els.journalList = document.getElementById('journalList');
    els.madrichotChecklist = document.getElementById('madrichotChecklist');
    els.generateLinkBtn = document.getElementById('generateLinkBtn');
    els.linkBox = document.getElementById('linkBox');
    els.linkInput = document.getElementById('linkInput');
    els.copyLinkBtn = document.getElementById('copyLinkBtn');
    els.journalStatus = document.getElementById('journalStatus');

    els.childrenList = document.getElementById('childrenList');
    els.childForm = document.getElementById('childForm');
    els.childName = document.getElementById('childName');
    els.motherName = document.getElementById('motherName');
    els.motherPhone = document.getElementById('motherPhone');
    els.fatherName = document.getElementById('fatherName');
    els.fatherPhone = document.getElementById('fatherPhone');
    els.childNotes = document.getElementById('childNotes');
    els.childrenStatus = document.getElementById('childrenStatus');

    els.madrichotList = document.getElementById('madrichotList');
    els.madrichaForm = document.getElementById('madrichaForm');
    els.madrichaName = document.getElementById('madrichaName');
    els.madrichaPhone = document.getElementById('madrichaPhone');
    els.madrichotStatus = document.getElementById('madrichotStatus');
  }

  function wireStaticEvents() {
    els.loginForm.addEventListener('submit', onLogin);
    els.logoutBtn.addEventListener('click', onLogout);

    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    els.journalDate.addEventListener('change', () => {
      selectedDate = els.journalDate.value || todayIso();
      loadJournal();
    });
    els.generateLinkBtn.addEventListener('click', onGenerateLink);
    els.copyLinkBtn.addEventListener('click', onCopyLink);

    els.childForm.addEventListener('submit', onAddChild);
    els.madrichaForm.addEventListener('submit', onAddMadricha);
  }

  // ---- auth -----------------------------------------------------------

  async function onLogin(e) {
    e.preventDefault();
    setStatus(els.loginStatus, 'מתחברת…', 'ok');
    const { error } = await supabaseClient.auth.signInWithPassword({
      email: els.loginEmail.value.trim(),
      password: els.loginPassword.value,
    });
    if (error) {
      setStatus(els.loginStatus, 'התחברות נכשלה: פרטים שגויים.', 'err');
    } else {
      setStatus(els.loginStatus, '', '');
    }
  }

  async function onLogout() {
    await supabaseClient.auth.signOut();
  }

  function showLogin() {
    els.loginView.classList.remove('hidden');
    els.appView.classList.add('hidden');
  }

  function showApp() {
    els.loginView.classList.add('hidden');
    els.appView.classList.remove('hidden');
    els.journalDate.value = selectedDate;
    els.journalDateLabel.textContent = formatHebrewDate(selectedDate);
    switchTab('journal');
    loadJournal();
    loadChildren();
    loadMadrichotTab();
  }

  // ---- tabs -------------------------------------------------------------

  function switchTab(tab) {
    els.tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    els.views.forEach((v) => v.classList.toggle('hidden', v.dataset.view !== tab));
  }

  // ---- journal + assignment ---------------------------------------------

  async function loadJournal() {
    els.journalDateLabel.textContent = formatHebrewDate(selectedDate);
    els.linkBox.classList.add('hidden');
    setStatus(els.journalStatus, '', '');

    const { data: regs, error: regErr } = await supabaseClient
      .from('daily_registrations')
      .select('id, child_name, pickup_info, notes, child:children(child_name, mother_name, mother_phone, father_name, father_phone)')
      .eq('reg_date', selectedDate)
      .order('created_at', { ascending: true });

    if (regErr) {
      els.journalList.innerHTML = '';
      setStatus(els.journalStatus, 'שגיאה בטעינת היומן.', 'err');
      return;
    }

    renderJournalList(regs || []);
    await renderAssignmentChecklist();
  }

  function renderJournalList(regs) {
    if (!regs.length) {
      els.journalList.innerHTML = '<div class="empty">אין רישומים לתאריך הזה.</div>';
      return;
    }
    els.journalList.innerHTML =
      '<ul class="list">' +
      regs
        .map((r) => {
          const childName = esc((r.child && r.child.child_name) || r.child_name || 'ילד/ה');
          const parentLines = [];
          if (r.child && r.child.mother_name) {
            parentLines.push(
              '<a class="call" href="' + esc(telHref(r.child.mother_phone || '')) + '">' +
                esc(r.child.mother_name) + (r.child.mother_phone ? ' · ' + esc(r.child.mother_phone) : '') +
              '</a>'
            );
          }
          if (r.child && r.child.father_name) {
            parentLines.push(
              '<a class="call" href="' + esc(telHref(r.child.father_phone || '')) + '">' +
                esc(r.child.father_name) + (r.child.father_phone ? ' · ' + esc(r.child.father_phone) : '') +
              '</a>'
            );
          }
          return (
            '<li class="row"><div class="info">' +
            '<strong>' + childName + '</strong>' +
            (r.pickup_info ? '<span class="sub">אוסף/ת: ' + esc(r.pickup_info) + '</span>' : '') +
            (!r.child ? '<span class="sub">לא נמצאה התאמה ברשימת הילדים</span>' : '') +
            (r.notes ? '<span class="sub">' + esc(r.notes) + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">' + parentLines.join('') + '</div>' +
            '</li>'
          );
        })
        .join('') +
      '</ul>';
  }

  async function renderAssignmentChecklist() {
    const { data: madrichot, error: mErr } = await supabaseClient
      .from('madrichot')
      .select('id, full_name, phone')
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (mErr) {
      els.madrichotChecklist.innerHTML = '<div class="empty">שגיאה בטעינת רשימת המדריכות.</div>';
      return;
    }
    if (!madrichot.length) {
      els.madrichotChecklist.innerHTML = '<div class="empty">אין עדיין מדריכות ברשימה. הוסיפי בלשונית "מדריכות".</div>';
      return;
    }

    const { data: assigned } = await supabaseClient
      .from('assignments')
      .select('madricha_id')
      .eq('assign_date', selectedDate);
    const assignedIds = new Set((assigned || []).map((a) => a.madricha_id));

    els.madrichotChecklist.innerHTML = madrichot
      .map((m) => {
        const checked = assignedIds.has(m.id) ? 'checked' : '';
        return (
          '<label class="checkbox-row">' +
          '<input type="checkbox" data-mid="' + m.id + '" ' + checked + ' />' +
          '<span>' + esc(m.full_name) + ' <span class="muted">· ' + esc(m.phone) + '</span></span>' +
          '</label>'
        );
      })
      .join('');

    els.madrichotChecklist.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', onToggleAssignment);
    });
  }

  async function onToggleAssignment(e) {
    const madrichaId = e.target.dataset.mid;
    if (e.target.checked) {
      const { error } = await supabaseClient
        .from('assignments')
        .insert({ assign_date: selectedDate, madricha_id: madrichaId });
      if (error) setStatus(els.journalStatus, 'שגיאה בשיבוץ.', 'err');
    } else {
      const { error } = await supabaseClient
        .from('assignments')
        .delete()
        .eq('assign_date', selectedDate)
        .eq('madricha_id', madrichaId);
      if (error) setStatus(els.journalStatus, 'שגיאה בהסרת שיבוץ.', 'err');
    }
  }

  async function onGenerateLink() {
    setStatus(els.journalStatus, 'יוצרת קישור…', 'ok');
    const { data, error } = await supabaseClient.rpc('create_board_link', { p_date: selectedDate });
    if (error || !data) {
      setStatus(els.journalStatus, 'יצירת הקישור נכשלה. נסי שוב.', 'err');
      return;
    }
    const url = new URL('board.html', window.location.href);
    url.searchParams.set('token', data);
    els.linkInput.value = url.toString();
    els.linkBox.classList.remove('hidden');
    setStatus(els.journalStatus, 'הקישור מוכן — אפשר להעתיק ולשלוח.', 'ok');
  }

  function onCopyLink() {
    els.linkInput.select();
    navigator.clipboard
      .writeText(els.linkInput.value)
      .then(() => setStatus(els.journalStatus, 'הקישור הועתק.', 'ok'))
      .catch(() => {});
  }

  // ---- children tab --------------------------------------------------------

  async function loadChildren() {
    const { data, error } = await supabaseClient
      .from('children')
      .select('id, child_name, mother_name, mother_phone, father_name, father_phone, notes')
      .order('child_name', { ascending: true });

    if (error) {
      els.childrenList.innerHTML = '<div class="empty">שגיאה בטעינת רשימת הילדים.</div>';
      return;
    }
    if (!data.length) {
      els.childrenList.innerHTML = '<div class="empty">עדיין אין ילדים ברשימה.</div>';
      return;
    }
    els.childrenList.innerHTML =
      '<ul class="list">' +
      data
        .map((c) => {
          const parents = [];
          if (c.mother_name) parents.push('<a class="call" href="' + esc(telHref(c.mother_phone || '')) + '">' + esc(c.mother_name) + (c.mother_phone ? ' · ' + esc(c.mother_phone) : '') + '</a>');
          if (c.father_name) parents.push('<a class="call" href="' + esc(telHref(c.father_phone || '')) + '">' + esc(c.father_name) + (c.father_phone ? ' · ' + esc(c.father_phone) : '') + '</a>');
          return (
            '<li class="row" data-id="' + c.id + '"><div class="info">' +
            '<strong>' + esc(c.child_name) + '</strong>' +
            (c.notes ? '<span class="sub">' + esc(c.notes) + '</span>' : '') +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">' + parents.join('') + '</div>' +
            '<button type="button" class="btn danger remove-child">הסרה</button>' +
            '</li>'
          );
        })
        .join('') +
      '</ul>';

    els.childrenList.querySelectorAll('.remove-child').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('li').dataset.id;
        removeChild(id);
      });
    });
  }

  async function onAddChild(e) {
    e.preventDefault();
    const child_name = els.childName.value.trim();
    const mother_name = els.motherName.value.trim();
    const mother_phone = els.motherPhone.value.trim();
    const father_name = els.fatherName.value.trim();
    const father_phone = els.fatherPhone.value.trim();
    const notes = els.childNotes.value.trim();
    if (!child_name) return;

    const { error } = await supabaseClient.from('children').insert({
      child_name,
      mother_name: mother_name || null,
      mother_phone: mother_phone || null,
      father_name: father_name || null,
      father_phone: father_phone || null,
      notes: notes || null,
      source_row_id: 'manual-' + Date.now(),
    });
    if (error) {
      setStatus(els.childrenStatus, 'הוספה נכשלה.', 'err');
      return;
    }
    els.childForm.reset();
    setStatus(els.childrenStatus, 'הילד/ה נוסף/ה בהצלחה.', 'ok');
    loadChildren();
  }

  async function removeChild(id) {
    const { error } = await supabaseClient.from('children').delete().eq('id', id);
    if (error) {
      setStatus(els.childrenStatus, 'ההסרה נכשלה.', 'err');
      return;
    }
    loadChildren();
  }

  // ---- madrichot tab --------------------------------------------------------

  async function loadMadrichotTab() {
    const { data, error } = await supabaseClient
      .from('madrichot')
      .select('id, full_name, phone, active')
      .order('full_name', { ascending: true });

    if (error) {
      els.madrichotList.innerHTML = '<div class="empty">שגיאה בטעינת רשימת המדריכות.</div>';
      return;
    }
    if (!data.length) {
      els.madrichotList.innerHTML = '<div class="empty">עדיין אין מדריכות ברשימה.</div>';
      return;
    }
    els.madrichotList.innerHTML =
      '<ul class="list">' +
      data
        .map(
          (m) =>
            '<li class="row" data-id="' + m.id + '"><div class="info">' +
            '<strong>' + esc(m.full_name) + '</strong>' +
            '<span class="badge ' + (m.active ? 'on' : '') + '">' + (m.active ? 'פעילה' : 'לא פעילה') + '</span>' +
            '</div>' +
            '<a class="call" href="' + esc(telHref(m.phone)) + '">' + esc(m.phone) + '</a>' +
            '<button type="button" class="btn secondary toggle-active">' + (m.active ? 'השבתה' : 'הפעלה') + '</button>' +
            '<button type="button" class="btn danger remove-madricha">הסרה</button>' +
            '</li>'
        )
        .join('') +
      '</ul>';

    els.madrichotList.querySelectorAll('.toggle-active').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        toggleMadrichaActive(li.dataset.id, data.find((m) => m.id === li.dataset.id));
      });
    });
    els.madrichotList.querySelectorAll('.remove-madricha').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        removeMadricha(e.target.closest('li').dataset.id);
      });
    });
  }

  async function onAddMadricha(e) {
    e.preventDefault();
    const full_name = els.madrichaName.value.trim();
    const phone = els.madrichaPhone.value.trim();
    if (!full_name || !phone) return;

    const { error } = await supabaseClient.from('madrichot').insert({ full_name, phone, active: true });
    if (error) {
      setStatus(els.madrichotStatus, 'הוספה נכשלה.', 'err');
      return;
    }
    els.madrichaForm.reset();
    setStatus(els.madrichotStatus, 'המדריכה נוספה בהצלחה.', 'ok');
    loadMadrichotTab();
  }

  async function toggleMadrichaActive(id, current) {
    const nextActive = !(current && current.active);
    const { error } = await supabaseClient.from('madrichot').update({ active: nextActive }).eq('id', id);
    if (error) {
      setStatus(els.madrichotStatus, 'העדכון נכשל.', 'err');
      return;
    }
    loadMadrichotTab();
  }

  async function removeMadricha(id) {
    const { error } = await supabaseClient.from('madrichot').delete().eq('id', id);
    if (error) {
      setStatus(els.madrichotStatus, 'ההסרה נכשלה (יכול להיות שיש שיבוצים קיימים).', 'err');
      return;
    }
    loadMadrichotTab();
  }

  // ---- helpers --------------------------------------------------------

  function setStatus(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'status-msg' + (text ? ' show ' + kind : '');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function telHref(phone) {
    return 'tel:' + String(phone).replace(/[^0-9+]/g, '');
  }

  function todayIso() {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d - tzOffset).toISOString().slice(0, 10);
  }

  function formatHebrewDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }
})();
