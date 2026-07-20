// TODO(infra): pegar acá la URL del Google Apps Script Web App una vez publicado
const UPLOAD_ENDPOINT = '';
const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB por tramo — sube en pedazos, sin techo de tamaño total

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
  statusEl.textContent = 'Subiendo… 0%';
  statusEl.className = 'upload-status';

  try {
    await uploadInChunks(file, (pct) => {
      statusEl.textContent = `Subiendo… ${pct}%`;
    });

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

async function uploadInChunks(file, onProgress) {
  const sessionId = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random()}`;
  let start = 0;
  let chunkIndex = 0;

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBase64 = await blobToBase64(file.slice(start, end));

    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('chunk', chunkBase64);
    formData.append('filename', file.name);
    formData.append('mimeType', file.type || 'video/mp4');
    formData.append('totalSize', String(file.size));

    const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'falló un tramo de la subida');

    start = end;
    chunkIndex += 1;
    onProgress(Math.min(100, Math.round((start / file.size) * 100)));

    if (result.done) return;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
