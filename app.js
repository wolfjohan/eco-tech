// Elementos del DOM
const cameraInput = document.getElementById('cameraInput');
const galleryInput = document.getElementById('galleryInput');
const btnCamera = document.getElementById('btnCamera');
const btnGallery = document.getElementById('btnGallery');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnRemoveImage = document.getElementById('btnRemoveImage');
const btnReset = document.getElementById('btnReset');

const placeholderUI = document.getElementById('placeholderUI');
const previewContainer = document.getElementById('previewContainer');
const previewImage = document.getElementById('previewImage');
const uploadSection = document.getElementById('uploadSection');
const loadingSection = document.getElementById('loadingSection');
const resultsSection = document.getElementById('resultsSection');

const notWasteAlert = document.getElementById('notWasteAlert');
const notWasteMessage = document.getElementById('notWasteMessage');
const resultCard = document.getElementById('resultCard');

const resultCategory = document.getElementById('resultCategory');
const resultName = document.getElementById('resultName');
const statusBadge = document.getElementById('statusBadge');
const materialsList = document.getElementById('materialsList');
const hazardousList = document.getElementById('hazardousList');
const disposalGuide = document.getElementById('disposalGuide');
const safetyWarnings = document.getElementById('safetyWarnings');
const envValue = document.getElementById('envValue');

let currentBase64 = null;
let currentMimeType = 'image/jpeg';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration error:', err));
  });
}

// Eventos de botones
btnCamera.addEventListener('click', () => cameraInput.click());
btnGallery.addEventListener('click', () => galleryInput.click());

cameraInput.addEventListener('change', handleFileSelect);
galleryInput.addEventListener('change', handleFileSelect);

btnRemoveImage.addEventListener('click', resetSelection);
btnReset.addEventListener('click', resetAll);
btnAnalyze.addEventListener('click', analyzeImage);

// Redimensionar imagen para optimizar envío desde celular
async function compressImage(file, maxDimension = 1024, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const compressed = await compressImage(file);
    currentBase64 = compressed.base64;
    currentMimeType = compressed.mimeType;

    previewImage.src = compressed.dataUrl;
    previewContainer.classList.remove('hidden');
    placeholderUI.classList.add('hidden');
    btnAnalyze.classList.remove('hidden');

    resultsSection.classList.add('hidden');
  } catch (err) {
    console.error(err);
    alert('No se pudo procesar la imagen seleccionada.');
  }
}

function resetSelection() {
  currentBase64 = null;
  cameraInput.value = '';
  galleryInput.value = '';
  previewImage.src = '';
  previewContainer.classList.add('hidden');
  placeholderUI.classList.remove('hidden');
  btnAnalyze.classList.add('hidden');
}

function resetAll() {
  resetSelection();
  resultsSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
}

async function analyzeImage() {
  if (!currentBase64) return;

  uploadSection.classList.add('hidden');
  loadingSection.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: currentBase64,
        mimeType: currentMimeType
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al conectar con el servidor.');
    }

    renderResults(data);
  } catch (err) {
    console.error('Error:', err);
    alert('Error al analizar la imagen: ' + err.message);
    uploadSection.classList.remove('hidden');
  } finally {
    loadingSection.classList.add('hidden');
  }
}

function renderResults(data) {
  resultsSection.classList.remove('hidden');

  if (data.is_tech_waste === false) {
    notWasteAlert.classList.remove('hidden');
    notWasteMessage.textContent = data.message || 'El objeto fotografiado no parece ser un desecho tecnológico o electrónico.';
    resultCard.classList.add('hidden');
    return;
  }

  notWasteAlert.classList.add('hidden');
  resultCard.classList.remove('hidden');

  // Llenar textos principales
  resultCategory.textContent = data.category || 'Desecho Tecnológico General';
  resultName.textContent = data.item_name || 'Componente Electrónico';
  disposalGuide.textContent = data.disposal_guide || 'Entregar en punto limpio autorizado para RAEE.';
  safetyWarnings.textContent = data.safety_warnings || 'No manipular con herramientas abrasivas ni perforar.';
  envValue.textContent = data.environmental_value || 'Recupera metales escasos y previene contaminación de suelos y acuíferos.';

  // Badge de estado
  const status = data.recyclability_status || 'Reciclable';
  const color = data.status_color || 'green';
  statusBadge.textContent = status;

  if (color === 'green') {
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  } else if (color === 'yellow') {
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold shrink-0 bg-amber-500/20 text-amber-300 border border-amber-500/30';
  } else {
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold shrink-0 bg-rose-500/20 text-rose-300 border border-rose-500/30';
  }

  // Lista de materiales aprovechables
  materialsList.innerHTML = '';
  if (Array.isArray(data.materials_recoverable) && data.materials_recoverable.length > 0) {
    data.materials_recoverable.forEach((mat) => {
      const span = document.createElement('span');
      span.className = 'text-[11px] px-2.5 py-0.5 rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-medium';
      span.textContent = mat;
      materialsList.appendChild(span);
    });
  } else {
    materialsList.innerHTML = '<span class="text-xs text-slate-500">No especificado</span>';
  }

  // Lista de sustancias peligrosas
  hazardousList.innerHTML = '';
  if (Array.isArray(data.hazardous_materials) && data.hazardous_materials.length > 0) {
    data.hazardous_materials.forEach((haz) => {
      const span = document.createElement('span');
      span.className = 'text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 font-medium';
      span.textContent = haz;
      hazardousList.appendChild(span);
    });
  } else {
    hazardousList.innerHTML = '<span class="text-xs text-slate-500">Ninguno identificado</span>';
  }
}
