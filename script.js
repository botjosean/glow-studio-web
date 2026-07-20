const UPLOAD_ENDPOINT = 'https://upload.glowstudios.vip';
const MAX_FILES = 3;
const BOOKING_API = 'https://citas.glowstudios.vip/api';
const BOOKING_PROFILE_SLUG = 'glow-studios';

const HAIR_MEMBER_SLUG = 'glow-studios-owner';
const NAILS_MEMBER_SLUG = 'glow-nails';

const bookingSection = document.getElementById('booking');
const bookingToggle = document.getElementById('bookingToggle');
const bookingForm = document.getElementById('bookingForm');
const categoryTabs = document.getElementById('categoryTabs');
const bothHint = document.getElementById('bothHint');
const serviceField = document.getElementById('serviceField');
const serviceSelect = document.getElementById('serviceSelect');
const dateField = document.getElementById('dateField');
const dateInput = document.getElementById('dateInput');
const slotsField = document.getElementById('slotsField');
const slotsGrid = document.getElementById('slotsGrid');
const bookingNameInput = document.getElementById('bookingNameInput');
const bookingPhoneInput = document.getElementById('bookingPhoneInput');
const bookingSubmitBtn = document.getElementById('bookingSubmitBtn');
const bookingStatus = document.getElementById('bookingStatus');

let servicesByCategory = null; // { hair: [...], nails: [...] }
let loadServicesPromise = null;
let selectedSlot = null;
const serviceMemberMap = new Map(); // serviceId -> memberId, needed by POST /bookings

const today = new Date();
dateInput.min = today.toISOString().slice(0, 10);
const maxBookingDate = new Date(today);
maxBookingDate.setDate(maxBookingDate.getDate() + 30);
dateInput.max = maxBookingDate.toISOString().slice(0, 10);

bookingToggle.addEventListener('click', () => {
  const willShow = bookingForm.hidden;
  bookingForm.hidden = !willShow;
  bookingToggle.setAttribute('aria-expanded', String(willShow));
  if (willShow) {
    setTimeout(() => {
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    if (!loadServicesPromise) loadServicesPromise = loadServices();
    loadServicesPromise.catch(() => {}); // avoid an unhandled-rejection warning if no tab is tapped yet
  }
});

async function loadServices() {
  const response = await fetch(`${BOOKING_API}/profiles/${BOOKING_PROFILE_SLUG}`);
  if (!response.ok) throw new Error('no se pudo cargar');
  const data = await response.json();
  const hairMember = data.team.find((member) => member.slug === HAIR_MEMBER_SLUG);
  const nailsMember = data.team.find((member) => member.slug === NAILS_MEMBER_SLUG);
  servicesByCategory = {
    hair: hairMember ? hairMember.services : [],
    nails: nailsMember ? nailsMember.services : [],
  };
}

categoryTabs.addEventListener('click', async (event) => {
  const tab = event.target.closest('.category-tab');
  if (!tab) return;

  if (!servicesByCategory) {
    bookingStatus.textContent = 'Cargando servicios…';
    bookingStatus.className = 'upload-status';
    try {
      await (loadServicesPromise || (loadServicesPromise = loadServices()));
    } catch (err) {
      bookingStatus.textContent = 'No se pudieron cargar los servicios. Intentá de nuevo más tarde.';
      bookingStatus.className = 'upload-status upload-status--error';
      return;
    }
    bookingStatus.textContent = '';
    bookingStatus.className = 'upload-status';
  }

  for (const el of categoryTabs.querySelectorAll('.category-tab')) el.classList.remove('selected');
  tab.classList.add('selected');

  const category = tab.dataset.category;
  bothHint.hidden = category !== 'both';
  const services = category === 'hair' ? servicesByCategory.hair : servicesByCategory.nails;

  serviceSelect.innerHTML = '<option value="" disabled selected>Elegí un servicio</option>';
  for (const service of services) {
    const option = document.createElement('option');
    option.value = service.id;
    option.textContent = `${service.name} — $${Number(service.price).toFixed(0)}`;
    serviceSelect.appendChild(option);
    serviceMemberMap.set(service.id, service.memberId);
  }

  serviceField.hidden = false;
  dateField.hidden = false;
  slotsField.hidden = true;
  selectedSlot = null;
  updateBookingSubmitState();
});

async function loadSlots() {
  const serviceId = serviceSelect.value;
  const date = dateInput.value;
  selectedSlot = null;
  updateBookingSubmitState();

  if (!serviceId || !date) {
    slotsField.hidden = true;
    return;
  }

  slotsField.hidden = false;
  slotsGrid.innerHTML = '<p class="slots-empty">Buscando horarios…</p>';

  try {
    const url = `${BOOKING_API}/availability?profileSlug=${BOOKING_PROFILE_SLUG}&serviceId=${serviceId}&date=${date}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('fail');
    const data = await response.json();
    renderSlots(data.slots || []);
  } catch (err) {
    slotsGrid.innerHTML = '<p class="slots-empty">No se pudo cargar la disponibilidad.</p>';
  }
}

function renderSlots(slots) {
  slotsGrid.innerHTML = '';
  if (slots.length === 0) {
    slotsGrid.innerHTML = '<p class="slots-empty">No hay horarios disponibles ese día.</p>';
    return;
  }
  for (const slot of slots) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot-btn';
    btn.textContent = slot.label;
    btn.addEventListener('click', () => {
      selectedSlot = slot;
      for (const el of slotsGrid.querySelectorAll('.slot-btn')) el.classList.remove('selected');
      btn.classList.add('selected');
      updateBookingSubmitState();
    });
    slotsGrid.appendChild(btn);
  }
}

serviceSelect.addEventListener('change', loadSlots);
dateInput.addEventListener('change', loadSlots);

function updateBookingSubmitState() {
  const hasName = bookingNameInput.value.trim().length > 0;
  const hasPhone = bookingPhoneInput.value.trim().length > 0;
  bookingSubmitBtn.disabled = !(serviceSelect.value && selectedSlot && hasName && hasPhone);
}

bookingNameInput.addEventListener('input', updateBookingSubmitState);
bookingPhoneInput.addEventListener('input', updateBookingSubmitState);

function normalizePhoneE164(raw) {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedSlot || !serviceSelect.value) return;

  bookingSubmitBtn.disabled = true;
  bookingStatus.textContent = 'Confirmando…';
  bookingStatus.className = 'upload-status';

  try {
    const idempotencyKey = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
    const response = await fetch(`${BOOKING_API}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify({
        profileSlug: BOOKING_PROFILE_SLUG,
        serviceId: serviceSelect.value,
        memberId: serviceMemberMap.get(serviceSelect.value),
        appointmentAt: selectedSlot.appointmentAt,
        clientName: bookingNameInput.value.trim(),
        clientPhone: normalizePhoneE164(bookingPhoneInput.value),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'no se pudo reservar');

    bookingStatus.textContent = `✓ ¡Listo! Tu cita para ${result.dayLabel} a las ${result.timeLabel} quedó reservada. Te confirmamos por teléfono.`;
    bookingStatus.className = 'upload-status upload-status--success';
    bookingForm.reset();
    slotsField.hidden = true;
    slotsGrid.innerHTML = '';
    selectedSlot = null;
  } catch (err) {
    bookingStatus.textContent = 'Ese horario ya no está disponible. Probá con otro.';
    bookingStatus.className = 'upload-status upload-status--error';
  } finally {
    updateBookingSubmitState();
  }
});

const uploadSection = document.getElementById('upload');
const toggleBtn = document.getElementById('uploadToggle');
const form = document.getElementById('uploadForm');
const nameInput = document.getElementById('nameInput');
const fileInput = document.getElementById('fileInput');
const fileDrop = fileInput.closest('.file-drop');
const fileLabelText = document.getElementById('fileLabelText');
const statusEl = document.getElementById('uploadStatus');
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
const submitBtn = document.getElementById('submitBtn');

toggleBtn.addEventListener('click', () => {
  const willShow = form.hidden;
  form.hidden = !willShow;
  toggleBtn.setAttribute('aria-expanded', String(willShow));
  if (willShow) {
    setTimeout(() => {
      uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      nameInput.focus({ preventScroll: true });
    }, 50);
  }
});

function updateSubmitState() {
  const hasName = nameInput.value.trim().length > 0;
  const fileCount = fileInput.files.length;
  const filesOk = fileCount > 0 && fileCount <= MAX_FILES;
  submitBtn.disabled = !(hasName && filesOk);
}

nameInput.addEventListener('input', updateSubmitState);

fileInput.addEventListener('change', () => {
  const files = fileInput.files;

  if (files.length > MAX_FILES) {
    statusEl.textContent = `Solo podés elegir hasta ${MAX_FILES} a la vez. Volvé a intentar.`;
    statusEl.className = 'upload-status upload-status--error';
    fileInput.value = '';
    fileDrop.classList.remove('has-files');
    fileLabelText.textContent = 'Tocá para elegir';
    updateSubmitState();
    return;
  }

  statusEl.textContent = '';
  statusEl.className = 'upload-status';

  if (files.length) {
    fileDrop.classList.add('has-files');
    fileLabelText.textContent = files.length === 1
      ? files[0].name
      : `${files.length} archivos elegidos`;
  } else {
    fileDrop.classList.remove('has-files');
    fileLabelText.textContent = 'Tocá para elegir';
  }

  updateSubmitState();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const files = fileInput.files;
  const name = nameInput.value.trim();
  if (!name || files.length === 0 || files.length > MAX_FILES) return;

  submitBtn.disabled = true;
  statusEl.textContent = '';
  statusEl.className = 'upload-status';
  progressTrack.hidden = false;
  progressFill.style.width = '0%';

  try {
    const formData = new FormData();
    formData.append('name', name);
    for (const file of files) {
      formData.append('files', file);
    }

    await uploadWithProgress(UPLOAD_ENDPOINT, formData, (pct) => {
      progressFill.style.width = `${pct}%`;
      statusEl.textContent = `Subiendo… ${pct}%`;
    });

    progressFill.style.width = '100%';
    statusEl.textContent = '✓ ¡Listo! Gracias por compartir tu trabajo.';
    statusEl.className = 'upload-status upload-status--success';
    form.reset();
    fileDrop.classList.remove('has-files');
    fileLabelText.textContent = 'Tocá para elegir';
  } catch (err) {
    statusEl.textContent = 'No se pudo subir. Revisá tu conexión e intentá de nuevo.';
    statusEl.className = 'upload-status upload-status--error';
  } finally {
    updateSubmitState();
    setTimeout(() => {
      progressTrack.hidden = true;
    }, 400);
  }
});

function uploadWithProgress(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch (err) {
        reject(new Error('respuesta inválida'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && result.ok) {
        resolve(result);
      } else {
        reject(new Error(result.error || 'upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(formData);
  });
}
