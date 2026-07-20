const UPLOAD_ENDPOINT = 'https://upload.glowstudios.vip';
const MAX_FILES = 3;

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
