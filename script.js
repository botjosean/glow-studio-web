const UPLOAD_ENDPOINT = 'https://upload.glowstudios.vip';
const MAX_FILES = 3;

// Las fotos vienen del CDN de la app de citas. Si alguna se reemplaza allá, su
// URL cambia y esta quedaría rota — antes de mostrar un cuadro gris se cae a un
// monograma dorado, que en el peor caso sigue viéndose intencional.
for (const photo of document.querySelectorAll('.pro-photo')) {
  photo.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'pro-photo pro-photo--fallback';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.textContent = photo.dataset.initial || '';
    photo.replaceWith(fallback);
  }, { once: true });
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
const uploadHint = document.getElementById('uploadHint');

toggleBtn.addEventListener('click', () => {
  const willShow = form.hidden;
  form.hidden = !willShow;
  toggleBtn.setAttribute('aria-expanded', String(willShow));
  if (willShow) {
    updateSubmitState();
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

  if (hasName && filesOk) {
    uploadHint.textContent = '';
  } else if (!hasName && fileCount === 0) {
    uploadHint.textContent = 'Falta tu nombre y elegir una foto o video.';
  } else if (!hasName) {
    uploadHint.textContent = 'Falta tu nombre.';
  } else {
    uploadHint.textContent = 'Elegí al menos una foto o video.';
  }
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
