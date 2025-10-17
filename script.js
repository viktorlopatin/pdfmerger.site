const uploadArea = document.getElementById('uploadArea');
const uploadEmpty = document.getElementById('uploadEmpty');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const fileActions = document.getElementById('fileActions');
const mergeBtn = document.getElementById('mergeBtn');
let files = [];

// Drag & Drop
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('dragover'); });
uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('dragover'); });
uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
fileInput.addEventListener('change', e => { handleFiles(e.target.files); });

// Handle new files
function handleFiles(selected) {
  for (let file of selected) files.push(file);
  renderList();
  updateView();
}

// Render list with preview (non-blocking)
function renderList() {
  fileList.innerHTML = '';

  files.forEach((file, i) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable = true;
    li.dataset.index = i;

    // preview img placeholder
    const preview = document.createElement('img');
    preview.src = '';
    li.appendChild(preview);

    const span = document.createElement('span');
    span.textContent = file.name;
    li.appendChild(span);

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.onclick = () => { removeFile(i); };
    li.appendChild(btn);

    fileList.appendChild(li);

    // Async preview loading
    if (file.type.startsWith('image/')) {
      preview.src = URL.createObjectURL(file);
    } else if (file.type === 'application/pdf') {
      (async () => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({scale: 0.2});
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({canvasContext: canvas.getContext('2d'), viewport: viewport});
          preview.src = canvas.toDataURL();
        } catch(e) {
          // fallback icon
          preview.src = 'data:image/svg+xml;base64,' +
            btoa('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#667eea"/><text x="20" y="25" font-size="16" fill="white" text-anchor="middle" font-family="Arial">PDF</text></svg>');
        }
      })();
    }
  });

  enableDragSort();
}

// Update view
function updateView() {
  if (files.length > 0) {
    uploadEmpty.classList.add('hidden');
    fileList.classList.remove('hidden');
    fileActions.classList.remove('hidden');
  } else {
    uploadEmpty.classList.remove('hidden');
    fileList.classList.add('hidden');
    fileActions.classList.add('hidden');
  }
}

// Remove file
function removeFile(index) { files.splice(index,1); renderList(); updateView(); }

// Drag & drop sorting
function enableDragSort() {
  const listItems = fileList.querySelectorAll('.file-item');
  let dragSrcEl = null;

  listItems.forEach(item => {
    item.addEventListener('dragstart', e => { dragSrcEl = item; item.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.dragging');
      const afterElement = getDragAfterElement(fileList, e.clientY);
      if (afterElement == null) fileList.appendChild(dragging);
      else fileList.insertBefore(dragging, afterElement);
    });
    item.addEventListener('drop', () => { updateFileOrder(); });
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.file-item:not(.dragging)')];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height/2;
    if(offset < 0 && offset > closest.offset) return {offset, element: child};
    else return closest;
  }, {offset: Number.NEGATIVE_INFINITY}).element;
}

function updateFileOrder() {
  const items = [...fileList.querySelectorAll('.file-item')];
  const newFiles = [];
  items.forEach(item => { const idx = parseInt(item.dataset.index); if(files[idx]) newFiles.push(files[idx]); });
  files = newFiles;
  renderList();
}

// Merge PDFs & auto-download
mergeBtn.addEventListener('click', async () => {
  if(files.length===0) return alert('Please add files first.');
  const { PDFDocument } = PDFLib;
  const mergedPdf = await PDFDocument.create();

  for(const file of files){
    const arrayBuffer = await file.arrayBuffer();
    if(file.type==='application/pdf'){
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf,pdf.getPageIndices());
      copiedPages.forEach(p => mergedPdf.addPage(p));
    } else if(file.type.startsWith('image/')){
      const img = await mergedPdf.embedJpg(arrayBuffer).catch(() => mergedPdf.embedPng(arrayBuffer));
      const page = mergedPdf.addPage([img.width,img.height]);
      page.drawImage(img,{x:0,y:0,width:img.width,height:img.height});
    }
  }

  const mergedBytes = await mergedPdf.save();
  const blob = new Blob([mergedBytes], {type:'application/pdf'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='merged.pdf'; a.click();
  URL.revokeObjectURL(url);
});


const btn = document.createElement('button');
btn.textContent = '×';
btn.onclick = () => { removeFile(i); };
li.appendChild(btn);
