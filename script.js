// TODO(infra): pegar acá la URL del Google Apps Script Web App una vez publicado
const UPLOAD_ENDPOINT = '';

const toggleBtn = document.getElementById('uploadToggle');
const form = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const fileLabelText = document.getElementById('fileLabelText');
const statusEl = document.getElementById('uploadStatus');
const submitBtn = form.querySelector('.btn-submit');

toggleBtn.addEventListener('click', () => {
  const willShow = form.hidden;
  form.hidden = !willShow;
  toggleBtn.setAttribute('aria-expanded', String(willShow));
  if (willShow) fileInput.focus();
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileLabelText.textContent = file ? file.name : 'Elegí un archivo de video';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];
  if (!file) return;

  if (!UPLOAD_ENDPOINT) {
    statusEl.textContent = 'La subida todavía no está activa. Volvé pronto.';
    statusEl.className = 'upload-status upload-status--pending';
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = 'Subiendo…';
  statusEl.className = 'upload-status';

  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('upload failed');

    statusEl.textContent = '¡Listo! Gracias por compartir tu trabajo.';
    statusEl.className = 'upload-status upload-status--success';
    form.reset();
    fileLabelText.textContent = 'Elegí un archivo de video';
  } catch (err) {
    statusEl.textContent = 'Hubo un problema. Intentá de nuevo.';
    statusEl.className = 'upload-status upload-status--error';
  } finally {
    submitBtn.disabled = false;
  }
});
