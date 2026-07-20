const UPLOAD_ENDPOINT = 'https://upload.glowstudios.vip';
const MAX_FILES = 3;

const toggleBtn = document.getElementById('uploadToggle');
const form = document.getElementById('uploadForm');
const nameInput = document.getElementById('nameInput');
const fileInput = document.getElementById('fileInput');
const fileLabelText = document.getElementById('fileLabelText');
const statusEl = document.getElementById('uploadStatus');
const progressTrack = document.getElementById('progressTrack');
const progressFill = document.getElementById('progressFill');
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
    statusEl.textContent = `Solo podés subir hasta ${MAX_FILES} archivos a la vez. Elegí menos.`;
    statusEl.className = 'upload-status upload-status--error';
    fileInput.value = '';
    fileLabelText.textContent = 'Elegí hasta 3 fotos o videos';
    return;
  }
  statusEl.textContent = '';
  statusEl.className = 'upload-status';
  fileLabelText.textContent = files.length
    ? `${files.length} archivo${files.length > 1 ? 's' : ''} elegido${files.length > 1 ? 's' : ''}`
    : 'Elegí hasta 3 fotos o videos';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const files = fileInput.files;
  const name = nameInput.value.trim();
  if (!name || files.length === 0) return;

  if (files.length > MAX_FILES) {
    statusEl.textContent = `Solo podés subir hasta ${MAX_FILES} archivos a la vez.`;
    statusEl.className = 'upload-status upload-status--error';
    return;
  }

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
    statusEl.textContent = '¡Listo! Gracias por compartir tu trabajo.';
    statusEl.className = 'upload-status upload-status--success';
    form.reset();
    fileLabelText.textContent = 'Elegí hasta 3 fotos o videos';
  } catch (err) {
    statusEl.textContent = 'Hubo un problema. Intentá de nuevo.';
    statusEl.className = 'upload-status upload-status--error';
  } finally {
    submitBtn.disabled = false;
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
