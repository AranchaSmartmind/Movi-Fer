// Configuración de Supabase
const SUPABASE_URL = 'https://siltfertxegddidlplw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpbHRmZXJ0eGVnZGRpZGxwbHciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDAyMTQ1MSwiZXhwIjoyMDQ5NTk3NDUxfQ.xVfIKI1CnAgmTFdJpK-gLZ__WJ9iB9q8BWBp7ypQ4cU';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// VARIABLES GLOBALES
// ============================================

let selectedFiles = [];
let allPhotos = [];
let isAdminOpen = false;

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const clientNameInput = document.getElementById('clientName');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const previewContainer = document.getElementById('previewContainer');
const uploadBtn = document.getElementById('uploadBtn');
const adminToggle = document.getElementById('adminToggle');
const clientView = document.getElementById('clientView');
const adminView = document.getElementById('adminView');

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', init);

function init() {
    setupClientEventListeners();
}

// ============================================
// VISTA DE CLIENTE - EVENT LISTENERS
// ============================================

function setupClientEventListeners() {
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    uploadZone.addEventListener('dragover', handleDragOver);
    uploadZone.addEventListener('dragleave', handleDragLeave);
    uploadZone.addEventListener('drop', handleDrop);
    clientNameInput.addEventListener('input', updateUploadButton);
    uploadBtn.addEventListener('click', uploadPhotos);
    adminToggle.addEventListener('click', toggleAdmin);
}

// ============================================
// VISTA DE CLIENTE - MANEJO DE ARCHIVOS
// ============================================

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    addFiles(imageFiles);
}

function addFiles(files) {
    selectedFiles = [...selectedFiles, ...files];
    renderPreviews();
    updateUploadButton();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    renderPreviews();
    updateUploadButton();
}

function renderPreviews() {
    previewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button class="remove-btn" onclick="removeFile(${index})">×</button>
            `;
            previewContainer.appendChild(previewItem);
        };
        
        reader.readAsDataURL(file);
    });
}

function updateUploadButton() {
    const hasName = clientNameInput.value.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;
    
    uploadBtn.disabled = !(hasName && hasFiles);
}

// ============================================
// VISTA DE CLIENTE - SUBIDA DE FOTOS
// ============================================

async function uploadPhotos() {
    const clientName = clientNameInput.value.trim();
    
    if (!clientName) {
        showNotification('Por favor, escribe tu nombre', 'error');
        return;
    }
    
    if (selectedFiles.length === 0) {
        showNotification('Por favor, selecciona al menos una foto', 'error');
        return;
    }
    
    uploadBtn.disabled = true;
    uploadBtn.classList.add('uploading');
    uploadBtn.textContent = 'Subiendo...';
    
    try {
        let uploadedCount = 0;
        
        for (const file of selectedFiles) {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const filePath = `${clientName}/${fileName}`;
            
            const { data, error } = await supabase.storage
                .from('Fotos')
                .upload(filePath, file);
            
            if (error) {
                console.error('Error subiendo archivo:', error);
                throw error;
            }
            
            uploadedCount++;
            uploadBtn.textContent = `Subiendo ${uploadedCount}/${selectedFiles.length}...`;
        }
        
        showNotification('Fotos enviadas correctamente', 'success');
        
        selectedFiles = [];
        clientNameInput.value = '';
        fileInput.value = '';
        previewContainer.innerHTML = '';
        
    } catch (error) {
        console.error('Error completo:', error);
        showNotification('Error al subir las fotos: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('uploading');
        uploadBtn.textContent = 'Enviar Fotos';
        updateUploadButton();
    }
}

// ============================================
// VISTA DE ADMIN - TOGGLE
// ============================================

function toggleAdmin() {
    isAdminOpen = !isAdminOpen;
    
    if (isAdminOpen) {
        clientView.style.display = 'none';
        adminView.style.display = 'block';
        loadPhotos();
    } else {
        clientView.style.display = 'block';
        adminView.style.display = 'none';
    }
}

function closeAdmin() {
    isAdminOpen = false;
    clientView.style.display = 'block';
    adminView.style.display = 'none';
}

// ============================================
// VISTA DE ADMIN - CARGA DE FOTOS
// ============================================

async function loadPhotos() {
    try {
        const clientsList = document.getElementById('clientsList');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = '';
        clientsList.innerHTML = '<div class="loading">Cargando fotos...</div>';
        
        console.log('Iniciando carga de fotos...');

        const { data: folders, error: listError } = await supabase
            .storage
            .from('Fotos')
            .list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            });

        if (listError) {
            console.error('Error al listar carpetas:', listError);
            throw listError;
        }

        console.log('Carpetas encontradas:', folders);

        if (!folders || folders.length === 0) {
            clientsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">Sin fotos</div>
                    <p>No hay fotos todavía</p>
                </div>
            `;
            updateStats(0, 0);
            return;
        }

        allPhotos = [];
        let totalPhotos = 0;

        for (const folder of folders) {
            if (!folder.name || folder.id) continue;

            console.log('Procesando carpeta:', folder.name);

            const { data: photos, error: photosError } = await supabase
                .storage
                .from('Fotos')
                .list(folder.name, {
                    limit: 1000,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (photosError) {
                console.error('Error listando fotos de', folder.name, photosError);
                continue;
            }

            console.log(`Fotos en ${folder.name}:`, photos);

            const imageFiles = photos.filter(file => 
                file.name && file.id && (
                    file.name.toLowerCase().endsWith('.jpg') || 
                    file.name.toLowerCase().endsWith('.jpeg') || 
                    file.name.toLowerCase().endsWith('.png') ||
                    file.name.toLowerCase().endsWith('.webp')
                )
            );

            if (imageFiles.length > 0) {
                const photosWithUrls = imageFiles.map(file => {
                    const { data: urlData } = supabase
                        .storage
                        .from('Fotos')
                        .getPublicUrl(`${folder.name}/${file.name}`);
                    
                    return {
                        name: file.name,
                        url: urlData.publicUrl,
                        path: `${folder.name}/${file.name}`
                    };
                });

                allPhotos.push({
                    clientName: folder.name,
                    photos: photosWithUrls,
                    timestamp: folder.created_at
                });

                totalPhotos += imageFiles.length;
            }
        }

        console.log('Total de clientes con fotos:', allPhotos.length);
        console.log('Total de fotos:', totalPhotos);

        updateStats(totalPhotos, allPhotos.length);

        if (allPhotos.length === 0) {
            clientsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">Sin fotos</div>
                    <p>No hay fotos todavía</p>
                </div>
            `;
        } else {
            displayClients();
        }

    } catch (error) {
        console.error('Error completo:', error);
        document.getElementById('errorMessage').innerHTML = `
            <div class="error">
                Error al cargar fotos: ${error.message}
            </div>
        `;
        document.getElementById('clientsList').innerHTML = '';
    }
}

function updateStats(totalPhotos, totalClients) {
    document.getElementById('totalPhotos').textContent = totalPhotos;
    document.getElementById('totalClients').textContent = totalClients;
}

function displayClients() {
    const clientsList = document.getElementById('clientsList');
    
    const html = allPhotos.map(client => `
        <div class="client-card">
            <div class="client-header">
                <div class="client-name">${client.clientName}</div>
                <div class="photo-count">${client.photos.length} fotos</div>
            </div>
            <div class="photos-grid">
                ${client.photos.map(photo => `
                    <div class="photo-thumb" onclick="openModal('${photo.url}')">
                        <img src="${photo.url}" alt="${photo.name}" loading="lazy">
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    clientsList.innerHTML = `<div class="clients-grid">${html}</div>`;
}

// ============================================
// VISTA DE ADMIN - MODAL DE IMAGEN
// ============================================

function openModal(url) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = url;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
}

// ============================================
// VISTA DE ADMIN - DESCARGAR FOTOS
// ============================================

async function downloadAllPhotos() {
    if (allPhotos.length === 0) {
        alert('No hay fotos para descargar');
        return;
    }

    try {
        const zip = new JSZip();
        let downloadedCount = 0;
        const totalPhotos = allPhotos.reduce((sum, client) => sum + client.photos.length, 0);

        const clientsList = document.getElementById('clientsList');
        const originalContent = clientsList.innerHTML;
        clientsList.innerHTML = `
            <div class="loading">
                Descargando fotos: <span id="progress">0/${totalPhotos}</span>
            </div>
        `;

        for (const client of allPhotos) {
            const clientFolder = zip.folder(client.clientName);

            for (const photo of client.photos) {
                try {
                    const { data, error } = await supabase
                        .storage
                        .from('Fotos')
                        .download(photo.path);

                    if (error) throw error;

                    clientFolder.file(photo.name, data);
                    downloadedCount++;
                    document.getElementById('progress').textContent = `${downloadedCount}/${totalPhotos}`;

                } catch (error) {
                    console.error('Error descargando', photo.name, error);
                }
            }
        }

        clientsList.innerHTML = '<div class="loading">Generando archivo ZIP...</div>';
        const blob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `fotos-movi-fer-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();

        clientsList.innerHTML = originalContent;
        displayClients();

    } catch (error) {
        console.error('Error en descarga:', error);
        alert('Error al descargar las fotos: ' + error.message);
        loadPhotos();
    }
}

// ============================================
// VISTA DE ADMIN - BORRAR FOTOS
// ============================================

async function confirmDeleteAll() {
    if (allPhotos.length === 0) {
        alert('No hay fotos para borrar');
        return;
    }

    const totalPhotosCount = allPhotos.reduce((sum, c) => sum + c.photos.length, 0);
    
    const confirm = window.confirm(
        `¿Estás seguro de que quieres borrar TODAS las fotos?\n\n` +
        `Total: ${totalPhotosCount} fotos de ${allPhotos.length} clientes\n\n` +
        `Esta acción no se puede deshacer.`
    );

    if (!confirm) return;

    try {
        const clientsList = document.getElementById('clientsList');
        clientsList.innerHTML = '<div class="loading">Borrando fotos...</div>';

        let deletedCount = 0;

        for (const client of allPhotos) {
            for (const photo of client.photos) {
                try {
                    const { error } = await supabase
                        .storage
                        .from('Fotos')
                        .remove([photo.path]);

                    if (error) throw error;
                    deletedCount++;

                } catch (error) {
                    console.error('Error borrando', photo.name, error);
                }
            }
        }

        alert(`Se borraron ${deletedCount} de ${totalPhotosCount} fotos`);
        loadPhotos();

    } catch (error) {
        console.error('Error al borrar:', error);
        alert('Error al borrar las fotos: ' + error.message);
        loadPhotos();
    }
}

// ============================================
// NOTIFICACIONES
// ============================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================

window.removeFile = removeFile;
window.toggleAdmin = toggleAdmin;
window.closeAdmin = closeAdmin;
window.loadPhotos = loadPhotos;
window.openModal = openModal;
window.closeModal = closeModal;
window.downloadAllPhotos = downloadAllPhotos;
window.confirmDeleteAll = confirmDeleteAll;