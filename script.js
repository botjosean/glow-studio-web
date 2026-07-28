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
const bookingConfirmation = document.getElementById('bookingConfirmation');
const confirmService = document.getElementById('confirmService');
const confirmDay = document.getElementById('confirmDay');
const confirmTime = document.getElementById('confirmTime');

let servicesByCategory = null; // { hair: [...], nails: [...] }
let loadServicesPromise = null;
let selectedSlot = null;
const serviceMemberMap = new Map(); // serviceId -> memberId, needed by POST /bookings

const today = new Date();
dateInput.min = today.toISOString().slice(0, 10);
const maxBookingDate = new Date(today);
maxBookingDate.setDate(maxBookingDate.getDate() + 30);
dateInput.max = maxBookingDate.toISOString().slice(0, 10);

let confirmationTimeoutId = null;

bookingToggle.addEventListener('click', () => {
  const willShow = bookingForm.hidden;
  bookingForm.hidden = !willShow;
  bookingToggle.setAttribute('aria-expanded', String(willShow));
  if (willShow) {
    if (confirmationTimeoutId) {
      clearTimeout(confirmationTimeoutId);
      confirmationTimeoutId = null;
    }
    bookingConfirmation.hidden = true;
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
    const chosenServiceLabel = serviceSelect.options[serviceSelect.selectedIndex].textContent;
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

    showBookingConfirmation({
      service: chosenServiceLabel,
      day: result.dayLabel,
      time: result.timeLabel,
    });
  } catch (err) {
    bookingStatus.textContent = 'Ese horario ya no está disponible. Probá con otro.';
    bookingStatus.className = 'upload-status upload-status--error';
    updateBookingSubmitState();
  }
});

function showBookingConfirmation({ service, day, time }) {
  confirmService.textContent = service;
  confirmDay.textContent = day;
  confirmTime.textContent = time;

  bookingForm.hidden = true;
  bookingConfirmation.hidden = false;

  confirmationTimeoutId = setTimeout(() => {
    confirmationTimeoutId = null;
    bookingConfirmation.hidden = true;
    bookingForm.reset();
    for (const el of categoryTabs.querySelectorAll('.category-tab')) el.classList.remove('selected');
    bothHint.hidden = true;
    serviceField.hidden = true;
    dateField.hidden = true;
    slotsField.hidden = true;
    slotsGrid.innerHTML = '';
    selectedSlot = null;
    bookingStatus.textContent = '';
    bookingStatus.className = 'upload-status';
    updateBookingSubmitState();
    bookingToggle.setAttribute('aria-expanded', 'false');
    bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 4500);
}

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

// Cloudflare corta cualquier request de más de 100MB con un 413 antes de que llegue
// al servidor — los videos de celular reales superan eso fácil, así que se suben en
// pedazos de CHUNK_SIZE (muy por debajo del límite) y se re-arman del otro lado.
const CHUNK_SIZE = 20 * 1024 * 1024;

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
    await uploadFilesChunked(files, name, (pct, label) => {
      progressFill.style.width = `${pct}%`;
      statusEl.textContent = label || `Subiendo… ${pct}%`;
    });

    progressFill.style.width = '100%';
    statusEl.textContent = '✓ ¡Listo! Gracias por compartir tu trabajo.';
    statusEl.className = 'upload-status upload-status--success';
    form.reset();
    fileDrop.classList.remove('has-files');
    fileLabelText.textContent = 'Tocá para elegir';
  } catch (err) {
    statusEl.textContent = friendlyUploadError(err);
    statusEl.className = 'upload-status upload-status--error';
  } finally {
    updateSubmitState();
    setTimeout(() => {
      progressTrack.hidden = true;
    }, 400);
  }
});

function friendlyUploadError(err) {
  const knownServerMessages = new Set([
    'solo se aceptan fotos o videos',
    'no se pudo verificar la seguridad del archivo',
    'demasiados intentos, esperá un momento',
    'falta el nombre o los archivos',
  ]);
  const message = err && err.message;
  if (knownServerMessages.has(message)) {
    return message.charAt(0).toUpperCase() + message.slice(1) + '.';
  }
  if (message === 'archivo_pesado') {
    return 'Ese archivo es demasiado pesado. Probá con uno más liviano.';
  }
  return 'No se pudo subir. Revisá tu conexión e intentá de nuevo.';
}

async function uploadFilesChunked(files, name, onProgress) {
  const uploadId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
  const totalBytes = Array.from(files).reduce((sum, file) => sum + file.size, 0) || 1;
  let completedBytes = 0;
  const manifest = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];
    manifest.push({ fileIndex, fileName: file.name });

    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * CHUNK_SIZE;
      const blob = file.slice(start, start + CHUNK_SIZE);

      const chunkForm = new FormData();
      chunkForm.append('uploadId', uploadId);
      chunkForm.append('fileIndex', String(fileIndex));
      chunkForm.append('chunkIndex', String(chunkIndex));
      chunkForm.append('chunk', blob, file.name);

      await xhrRequest(`${UPLOAD_ENDPOINT}/chunk`, chunkForm, (loaded) => {
        const pct = Math.min(99, Math.round(((completedBytes + loaded) / totalBytes) * 100));
        onProgress(pct, `Subiendo… ${pct}%`);
      });

      completedBytes += blob.size;
      const pct = Math.min(99, Math.round((completedBytes / totalBytes) * 100));
      onProgress(pct, `Subiendo… ${pct}%`);
    }
  }

  onProgress(99, 'Verificando…');

  const finishForm = new FormData();
  finishForm.append('uploadId', uploadId);
  finishForm.append('name', name);
  finishForm.append('files', JSON.stringify(manifest));
  await xhrRequest(`${UPLOAD_ENDPOINT}/finish`, finishForm);
}

function xhrRequest(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(event.loaded);
      };
    }

    xhr.onload = () => {
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch (err) {
        reject(new Error(xhr.status === 413 ? 'archivo_pesado' : 'respuesta inválida'));
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
