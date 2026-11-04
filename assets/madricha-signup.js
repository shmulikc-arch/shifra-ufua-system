// ============================================================================
// טופס רישום עצמי למדריכות — ללא התחברות. קורא לפונקציית register_madricha.
// ============================================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const form = document.getElementById('signupForm');
    form.addEventListener('submit', onSubmit);
  }

  async function onSubmit(e) {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const ageVal = document.getElementById('age').value.trim();
    const hebrewBirthDate = document.getElementById('hebrewBirthDate').value.trim();
    const status = document.getElementById('signupStatus');

    if (!firstName || !lastName || !phone) {
      setStatus(status, 'נא למלא שם פרטי, שם משפחה וטלפון.', 'err');
      return;
    }

    setStatus(status, 'שולחת…', 'ok');

    const { error } = await supabaseClient.rpc('register_madricha', {
      p_first_name: firstName,
      p_last_name: lastName,
      p_phone: phone,
      p_age: ageVal ? Number(ageVal) : null,
      p_hebrew_birth_date: hebrewBirthDate || null,
    });

    if (error) {
      setStatus(status, 'ההרשמה נכשלה, נסי שוב.', 'err');
      return;
    }

    document.getElementById('formCard').classList.add('hidden');
    document.getElementById('successCard').classList.remove('hidden');
  }

  function setStatus(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'status-msg' + (text ? ' show ' + kind : '');
  }
})();
