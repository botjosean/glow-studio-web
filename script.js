const UPLOAD_ENDPOINT = 'https://upload.glowstudios.vip';
const MAX_FILES = 3;

const toggleBtn = document.getElementById('uploadToggle');
const form = document.getElementById('uploadForm');
const nameInput = document.getElementById('nameInput');
const fileInput = document.getElementById('fileInput');
const fileLabelText = document.getElementById('fileLabelText');
const statusEl = document.getElementById('uploadStatus');
const submitBtn = form.querySelector('.btn-submit');

toggleBtn.addEventListener('click', () => {
  const willShow = form.hidden;
  form.hidden = !willShow;
  toggleBtn.setAttribute('aria-expanded', String(willShow));
  if (willShow) nameInput.focus();
});

fileInput.addEventListener('change', () => {
  const files = fileInput.files;
  if (files.length > MAX_FILES) {
    statusEl.textContent = `Solo podés subir hasta ${MAX_FILES} videos a la vez. Elegí menos archivos.`;
    statusEl.className = 'upload-status upload-status--error';
    fileInput.value = '';
    fileLabelText.textContent = 'Elegí hasta 3 videos';
    return;
  }
  statusEl.textContent = '';
  statusEl.className = 'upload-status';
  fileLabelText.textContent = files.length
    ? `${files.length} video${files.length > 1 ? 's' : ''} elegido${files.length > 1 ? 's' : ''}`
    : 'Elegí hasta 3 videos';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const files = fileInput.files;
  const name = nameInput.value.trim();
  if (!name || files.length === 0) return;

  if (files.length > MAX_FILES) {
    statusEl.textContent = `Solo podés subir hasta ${MAX_FILES} videos a la vez.`;
    statusEl.className = 'upload-status upload-status--error';
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = 'Subiendo…';
  statusEl.className = 'upload-status';

  try {
    const formData = new FormData();
    formData.append('name', name);
    for (const file of files) {
      formData.append('files', file);
    }

    const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'upload failed');

    statusEl.textContent = '¡Listo! Gracias por compartir tu trabajo.';
    statusEl.className = 'upload-status upload-status--success';
    form.reset();
    fileLabelText.textContent = 'Elegí hasta 3 videos';
  } catch (err) {
    statusEl.textContent = 'Hubo un problema. Intentá de nuevo.';
    statusEl.className = 'upload-status upload-status--error';
  } finally {
    submitBtn.disabled = false;
  }
});
