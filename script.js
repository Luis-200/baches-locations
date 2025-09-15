// Obtener datos de la colección Locations
db.collection("Locations").get().then((querySnapshot) => {
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`${doc.id} =>`, data);
  });
}).catch((error) => {
  console.error("Error al obtener datos:", error);
});

// Variables globales
var map;
var marcadores = [];
var modoAgregarUbicacion = false;
var BASE_COORDS = [25.88848, -103.62139];
var modal = null;

// Inicializar el mapa
async function iniciarMap() {
    
    // Inicializar modal de Bootstrap
    modal = new bootstrap.Modal(document.getElementById('modalUbicacion'));
    
    // Crear el mapa
    map = L.map('map').setView(BASE_COORDS, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Eventos del mapa
    map.on('click', function(e) {
        if (modoAgregarUbicacion) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            mostrarModalUbicacion(lat, lng);
        }
    });
    
    // Cargar ubicaciones desde Firebase
    await cargarUbicacionesDesdeFirebase();
}

// Mostrar modal para agregar datos
function mostrarModalUbicacion(lat, lng) {
    const form = document.getElementById('formUbicacion');
    form.dataset.lat = lat;
    form.dataset.lng = lng;
    form.reset();
    modal.show();
}

// Cargar ubicaciones desde Firestore
async function cargarUbicacionesDesdeFirebase() {
    try {
        const querySnapshot = await db.collection('Locations').get();
        const container = document.getElementById('locationsContainer');
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-muted text-center mb-0"><i class="bi bi-inbox"></i> No hay ubicaciones registradas...</p>';
            return;
        }
        
        container.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const ubicacion = {
                id: doc.id,
                name: data.name,
                lat: parseFloat(data.latitude),  // Convertir de string a número
                lng: parseFloat(data.longitude), // Convertir de string a número
                amount: data.amount || 0,
                danger: data.danger || 0,
                created_at: data.created_at
            };
            
            if (ubicacion.lat && ubicacion.lng) {
                agregarMarcador(ubicacion.lat, ubicacion.lng, ubicacion);
                agregarALista(ubicacion);
            }
        });
        
    } catch (error) {
        console.error("Error al cargar ubicaciones:", error);
        mostrarAlerta('Error al cargar ubicaciones', 'danger');
    }
}

// Guardar ubicación en Firestore
async function guardarUbicacionEnFirebase(datos) {
    try {
        const docRef = await db.collection('Locations').add({
            name: datos.nombre,
            latitude: datos.lat.toString(),  // Guardar como string
            longitude: datos.lng.toString(), // Guardar como string
            amount: parseInt(datos.amount) || 0,
            danger: parseInt(datos.danger) || 0,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return { 
            id: docRef.id,
            name: datos.nombre,
            lat: datos.lat,
            lng: datos.lng,
            amount: parseInt(datos.amount) || 0,
            danger: parseInt(datos.danger) || 0,
            created_at: new Date()
        };
        
    } catch (error) {
        console.error("Error al guardar ubicación:", error);
        mostrarAlerta('Error al guardar ubicación', 'danger');
        return null;
    }
}

// Función principal para guardar
async function guardarUbicacion() {
    const nombre = document.getElementById('streetInput').value.trim();
    
    if (!nombre) {
        mostrarAlerta('Por favor, ingresa el nombre de la ubicación', 'warning');
        return;
    }
    
    const lat = BASE_COORDS[0] + (Math.random() - 0.5) * 0.03;
    const lng = BASE_COORDS[1] + (Math.random() - 0.5) * 0.03;
    
    const datos = {
        nombre: nombre,
        lat: lat,
        lng: lng,
        amount: 1,
        danger: 3
    };
    
    const resultado = await guardarUbicacionEnFirebase(datos);
    
    if (resultado) {
        agregarMarcador(resultado.lat, resultado.lng, resultado);
        agregarALista(resultado);
        map.setView([resultado.lat, resultado.lng], 15);
        document.getElementById('streetInput').value = '';
        mostrarAlerta('Ubicación agregada correctamente', 'success');
    }
}

// Guardar desde modal
async function guardarDesdeModal() {
    const form = document.getElementById('formUbicacion');
    const nombreInput = document.getElementById('nombreInput');
    
    if (!nombreInput.value.trim()) {
        mostrarAlerta('El nombre es requerido', 'warning');
        return;
    }
    
    const datos = {
        nombre: nombreInput.value.trim(),
        lat: parseFloat(form.dataset.lat),
        lng: parseFloat(form.dataset.lng),
        amount: parseInt(document.getElementById('amountInput').value) || 0,
        danger: parseInt(document.getElementById('dangerInput').value) || 0
    };
    
    const resultado = await guardarUbicacionEnFirebase(datos);
    
    if (resultado) {
        agregarMarcador(resultado.lat, resultado.lng, resultado);
        agregarALista(resultado);
        map.setView([resultado.lat, resultado.lng], 16);
        
        // Asegurarse de que el modal se cierre
        if (modal) {
            modal.hide();
        } else {
            // Si por alguna razón modal no está definido, intentar cerrar usando Bootstrap directamente
            const modalElement = document.getElementById('modalUbicacion');
            if (modalElement) {
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        }
        
        // Desactivar modo de agregar ubicación
        modoAgregarUbicacion = false;
        
        mostrarAlerta('Location guardada correctamente', 'success');
    }
}

// Función para agregar marcador
function agregarMarcador(lat, lng, ubicacion) {
    const colores = ['#198754', '#ffc107', '#fd7e14', '#ff6b00', '#dc3545'];
    const emojis = ['🟢', '🟡', '🟠', '🟠', '🔴'];
    
    const color = colores[ubicacion.danger - 1] || '#1976D2';
    const emoji = emojis[ubicacion.danger - 1] || '📍';
    
    const icono = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${color}; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
        iconSize: [35, 35],
        iconAnchor: [17, 35]
    });
    
    const marker = L.marker([lat, lng], { icon: icono }).addTo(map);
    
    const popupContent = `
        <div class="p-2" style="min-width: 200px;">
            <h6 class="mb-2" style="color: ${color};">
                <i class="bi bi-geo-alt"></i> ${ubicacion.name}
            </h6>
            <div class="d-flex gap-2 mb-2">
                <span class="badge bg-primary">
                    <i class="bi bi-123"></i> ${ubicacion.amount}
                </span>
                <span class="badge bg-danger">
                    <i class="bi bi-exclamation-triangle"></i> ${ubicacion.danger}/5
                </span>
            </div>
            <p class="text-muted small mb-2">
                <i class="bi bi-geo"></i> ${lat.toFixed(6)}, ${lng.toFixed(6)}
            </p>
            <button onclick="eliminarUbicacion('${ubicacion.id}', ${lat}, ${lng})" 
                    class="btn btn-sm btn-outline-danger w-100">
                <i class="bi bi-trash"></i> Eliminar
            </button>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    marker.on('click', () => map.setView([lat, lng], 16));
    marker.id = ubicacion.id;
    marcadores.push(marker);
}

// Función para agregar a la lista
function agregarALista(ubicacion) {
    const colores = ['success', 'warning', 'warning', 'danger', 'danger'];
    let fechas;
    if (ubicacion.created_at && typeof ubicacion.created_at.toDate === 'function') {
        // Si es un timestamp de Firestore
        fechas = ubicacion.created_at.toDate();
    } else if (ubicacion.created_at instanceof Date) {
        // Si ya es un objeto Date
        fechas = ubicacion.created_at;
    } else {
        // Si no hay fecha o es otro formato
        fechas = new Date();
    }
    const fechaStr = fechas.toLocaleDateString() + ' ' + fechas.toLocaleTimeString();
    
    const dangerClass = `danger-${ubicacion.danger >= 4 ? 'high' : ubicacion.danger >= 2 ? 'medium' : 'low'}`;
    const colorClass = `text-${colores[ubicacion.danger - 1] || 'primary'}`;
    
    const item = document.createElement('div');
    item.className = `location-item card mb-2 ${dangerClass}`;
    item.id = `item-${ubicacion.id}`;
    item.innerHTML = `
        <div class="card-body py-2">
            <div class="d-flex justify-content-between align-items-start mb-1">
                <h6 class="card-title mb-0 ${colorClass}">
                    <i class="bi bi-geo-alt"></i> ${ubicacion.name}
                </h6>
                <span class="badge bg-${colores[ubicacion.danger - 1] || 'primary'}">
                    Nvl. ${ubicacion.danger}
                </span>
            </div>
            
            <div class="d-flex gap-2 mb-2">
                <span class="badge bg-primary">
                    <i class="bi bi-123"></i> Cantidad: ${ubicacion.amount}
                </span>
            </div>
            
            <p class="text-muted small mb-2">
                <i class="bi bi-geo"></i> ${ubicacion.lat.toFixed(6)}, ${ubicacion.lng.toFixed(6)}
            </p>
            
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">
                    <i class="bi bi-clock"></i> ${fechaStr}
                </small>
                <div class="btn-group">
                    <button onclick="centrarEnUbicacion(${ubicacion.lat}, ${ubicacion.lng})" 
                            class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-geo"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('locationsContainer').prepend(item);
}


// Mostrar alerta de Bootstrap
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.createElement('div');
    alerta.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
    alerta.style.cssText = 'top: 20px; right: 20px; z-index: 10000; min-width: 300px;';
    alerta.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 3000);
}

function centrarEnUbicacion(lat, lng) {
    map.setView([lat, lng], 16);
}

function activarModoMapa() {
    modoAgregarUbicacion = true;
    mostrarAlerta('Haz clic en el mapa para agregar una ubicación', 'info');
}

// Función para desplazarse hacia arriba
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Controlar visibilidad del botón de subir
function actualizarBotonSubir() {
    const btnSubir = document.getElementById('btnSubir');
    if (!btnSubir) return;

    if (window.scrollY > 200) {
        btnSubir.style.display = 'flex';
        setTimeout(() => btnSubir.classList.add('visible'), 10);
    } else {
        btnSubir.classList.remove('visible');
        setTimeout(() => {
            if (!btnSubir.classList.contains('visible')) {
                btnSubir.style.display = 'none';
            }
        }, 300);
    }
}

window.onload = function() {
    iniciarMap();
    // Inicializar el botón de subir
    window.addEventListener('scroll', actualizarBotonSubir);
    actualizarBotonSubir();
};
