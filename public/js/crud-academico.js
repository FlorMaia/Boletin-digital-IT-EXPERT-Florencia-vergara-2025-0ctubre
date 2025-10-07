/* ====================================== */
/* CRUD ESTRUCTURA ACADÉMICA - JAVASCRIPT */
/* ====================================== */

// ============================================
// GUARDAR Y RESTAURAR ESTADO
// ============================================

function saveCurrentState() {
    const nivelesView = document.getElementById('niveles-view');
    const divisionesView = document.getElementById('divisiones-view');
    
    if (nivelesView && nivelesView.style.display !== 'none') {
        // Estamos en vista de niveles - guardar modalidad
        const breadcrumb = document.querySelector('.breadcrumb li:nth-child(2) a');
        if (breadcrumb) {
            const onclickAttr = breadcrumb.getAttribute('onclick');
            const match = onclickAttr.match(/showNivelesView\((\d+)/);
            if (match) {
                const modalidadId = parseInt(match[1]);
                const modalidadText = breadcrumb.textContent.trim().replace('🎓', '').trim();
                localStorage.setItem('currentView', JSON.stringify({
                    type: 'niveles',
                    modalidadId: modalidadId,
                    modalidadNombre: modalidadText
                }));
                console.log('💾 Guardado estado de niveles:', modalidadId, modalidadText);
            }
        }
    } else if (divisionesView && divisionesView.style.display !== 'none') {
        // Estamos en vista de divisiones - guardar nivel y modalidad
        const nivelBreadcrumb = document.querySelector('.breadcrumb li:nth-child(3)');
        const modalidadBreadcrumb = document.querySelector('.breadcrumb li:nth-child(2) a');
        
        if (nivelBreadcrumb && modalidadBreadcrumb) {
            const nivelText = nivelBreadcrumb.textContent.trim().replace('📐', '').trim();
            const modalidadOnclick = modalidadBreadcrumb.getAttribute('onclick');
            const modalidadMatch = modalidadOnclick.match(/showNivelesView\((\d+)/);
            
            if (modalidadMatch) {
                localStorage.setItem('currentView', JSON.stringify({
                    type: 'divisiones',
                    modalidadId: parseInt(modalidadMatch[1]),
                    modalidadNombre: modalidadBreadcrumb.textContent.trim().replace('🎓', '').trim(),
                    nivelNombre: nivelText
                }));
                console.log('💾 Guardado estado de divisiones');
            }
        }
    } else {
        // Vista de modalidades
        localStorage.setItem('currentView', JSON.stringify({
            type: 'modalidades'
        }));
    }
}

function restoreStateAfterReload() {
    const savedState = localStorage.getItem('currentView');
    if (savedState) {
        const state = JSON.parse(savedState);
        console.log('🔄 Restaurando estado:', state);
        
        setTimeout(() => {
            if (state.type === 'niveles') {
                // Restaurar vista de niveles
                if (typeof showNivelesView === 'function') {
                    showNivelesView(state.modalidadId, state.modalidadNombre);
                }
            } else if (state.type === 'divisiones') {
                // Restaurar vista de divisiones
                // Primero ir a niveles, luego encontrar el nivel específico
                if (typeof showNivelesView === 'function') {
                    showNivelesView(state.modalidadId, state.modalidadNombre);
                    setTimeout(() => {
                        // Buscar el nivel específico y hacer clic
                        const nivelCards = document.querySelectorAll('.nivel-card');
                        nivelCards.forEach(card => {
                            const titulo = card.querySelector('h6');
                            if (titulo && titulo.textContent.includes(state.nivelNombre)) {
                                card.click();
                            }
                        });
                    }, 1000);
                }
            }
            localStorage.removeItem('currentView');
        }, 1000);
    }
}

// Restaurar estado al cargar la página
document.addEventListener('DOMContentLoaded', restoreStateAfterReload);

// ============================================
// FUNCIÓN SIMPLE PARA RECARGAR VISTA ACTUAL
// ============================================

window.reloadCurrentView = function() {
    console.log('🔄 Recargando vista actual...');
    
    // Detectar vista actual
    const nivelesView = document.getElementById('niveles-view');
    const divisionesView = document.getElementById('divisiones-view');
    
    if (nivelesView && nivelesView.style.display !== 'none') {
        // Estamos en vista de niveles - obtener modalidad del breadcrumb
        console.log('📚 En vista de niveles - obteniendo modalidad...');
        const breadcrumbLink = document.querySelector('.breadcrumb li:nth-child(2) a');
        if (breadcrumbLink) {
            // Simplemente ejecutar el onclick del breadcrumb para recargar
            breadcrumbLink.click();
        }
    } else if (divisionesView && divisionesView.style.display !== 'none') {
        // Estamos en vista de divisiones - obtener nivel del breadcrumb
        console.log('📐 En vista de divisiones - obteniendo nivel...');
        const breadcrumbLink = document.querySelector('.breadcrumb li:nth-child(3)');
        if (breadcrumbLink && breadcrumbLink.previousElementSibling) {
            // Ejecutar el onclick del breadcrumb del nivel para recargar
            const nivelLink = breadcrumbLink.previousElementSibling.querySelector('a');
            if (nivelLink) {
                nivelLink.click();
            }
        }
    } else {
        // Vista de modalidades - recargar modalidades
        console.log('🏫 En vista de modalidades');
        if (typeof loadModalidades === 'function') {
            loadModalidades();
        }
    }
    
    // Recargar estadísticas siempre
    if (typeof window.loadEstructuraStats === 'function') {
        window.loadEstructuraStats();
    }
};

// ============================================
// MODALIDADES CRUD
// ============================================

window.showCreateModalidadModal = function() {
    console.log('📝 Abriendo modal crear modalidad');
    document.getElementById('modalidadModalTitle').innerHTML = '<i class="bi bi-mortarboard me-2"></i>Nueva Modalidad';
    document.getElementById('modalidadForm').reset();
    document.getElementById('modalidadId').value = '';
    document.getElementById('modalidadSaveText').textContent = 'Guardar';
    new bootstrap.Modal(document.getElementById('modalidadModal')).show();
};

window.editModalidad = async function(id) {
    try {
        console.log('✏️ Editando modalidad:', id);
        const response = await fetch(`/admin/modalidades/${id}`);
        if (!response.ok) throw new Error('Error al cargar modalidad');
        
        const modalidad = await response.json();
        
        document.getElementById('modalidadModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Modalidad';
        document.getElementById('modalidadId').value = modalidad.id;
        document.getElementById('modalidadNombre').value = modalidad.nombre;
        document.getElementById('modalidadDescripcion').value = modalidad.descripcion || '';
        document.getElementById('modalidadSaveText').textContent = 'Actualizar';
        
        new bootstrap.Modal(document.getElementById('modalidadModal')).show();
    } catch (error) {
        console.error('❌ Error cargando modalidad:', error);
        showNotification('Error al cargar los datos de la modalidad', 'error');
    }
};

window.saveModalidad = async function() {
    const form = document.getElementById('modalidadForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const id = document.getElementById('modalidadId').value;
    const isEdit = id !== '';
    
    const data = {
        nombre: document.getElementById('modalidadNombre').value.trim(),
        descripcion: document.getElementById('modalidadDescripcion').value.trim()
    };

    try {
        console.log('💾 Guardando modalidad:', data);
        const url = isEdit ? `/admin/modalidades/${id}` : '/admin/modalidades';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const message = isEdit ? 'Modalidad actualizada exitosamente' : 'Modalidad creada exitosamente';
            showNotification(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalidadModal')).hide();
            
            // Recargar modalidades simple
            setTimeout(() => {
                if (typeof loadModalidades === 'function') {
                    loadModalidades();
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar modalidad', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando modalidad:', error);
        showNotification('Error al guardar modalidad', 'error');
    }
};

window.deleteModalidad = function(id, nombre) {
    console.log('🗑️ Eliminar modalidad:', id, nombre);
    document.getElementById('deleteAcademicoName').textContent = `Modalidad: ${nombre}`;
    document.getElementById('deleteAcademicoModal').setAttribute('data-type', 'modalidad');
    document.getElementById('deleteAcademicoModal').setAttribute('data-id', id);
    new bootstrap.Modal(document.getElementById('deleteAcademicoModal')).show();
};

// ============================================
// NIVELES CRUD
// ============================================

window.showCreateNivelModal = function() {
    console.log('📝 Abriendo modal crear nivel');
    document.getElementById('nivelModalTitle').innerHTML = '<i class="bi bi-layers me-2"></i>Nuevo Nivel';
    document.getElementById('nivelForm').reset();
    document.getElementById('nivelId').value = '';
    document.getElementById('nivelSaveText').textContent = 'Guardar';
    
    // Cargar modalidades en el select (con protección)
    if (typeof loadModalidadesIntoSelect === 'function') {
        loadModalidadesIntoSelect();
    }
    
    new bootstrap.Modal(document.getElementById('nivelModal')).show();
};

window.editNivel = async function(id) {
    try {
        console.log('✏️ Editando nivel:', id);
        const response = await fetch(`/admin/niveles/${id}`);
        if (!response.ok) throw new Error('Error al cargar nivel');
        
        const nivel = await response.json();
        
        document.getElementById('nivelModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Nivel';
        document.getElementById('nivelId').value = nivel.id;
        document.getElementById('nivelNumero').value = nivel.numero;
        
        // Limpiar el nombre para eliminar cualquier número adicional al final
        let nombreLimpio = nivel.nombre;
        // Si el nombre termina con "editado" seguido de números, eliminarlos
        nombreLimpio = nombreLimpio.replace(/\s+editado\s+\d+$/, '');
        
        document.getElementById('nivelNombre').value = nombreLimpio;
        document.getElementById('nivelSaveText').textContent = 'Actualizar';
        
        // Cargar modalidades y seleccionar la actual (con protección)
        if (typeof loadModalidadesIntoSelect === 'function') {
            loadModalidadesIntoSelect();
        }
        setTimeout(() => {
            document.getElementById('nivelModalidad').value = nivel.modalidad_id;
        }, 100);
        
        new bootstrap.Modal(document.getElementById('nivelModal')).show();
    } catch (error) {
        console.error('❌ Error cargando nivel:', error);
        showNotification('Error al cargar los datos del nivel', 'error');
    }
};

window.saveNivel = async function() {
    // PROTECCIÓN: Evitar ejecución múltiple
    if (window.saveNivel.isRunning) {
        console.log('⚠️ saveNivel ya está ejecutándose, ignorando...');
        return;
    }
    window.saveNivel.isRunning = true;
    
    console.log('🚀 INICIANDO saveNivel...');
    
    const form = document.getElementById('nivelForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        window.saveNivel.isRunning = false;
        return;
    }

    const id = document.getElementById('nivelId').value;
    const isEdit = id !== '';
    
    // Obtener el nombre y limpiarlo de cualquier sufijo "editado X"
    let nombreNivel = document.getElementById('nivelNombre').value.trim();
    nombreNivel = nombreNivel.replace(/\s+editado\s+\d+$/, '');
    
    const data = {
        modalidad_id: parseInt(document.getElementById('nivelModalidad').value),
        numero: parseInt(document.getElementById('nivelNumero').value),
        nombre: nombreNivel
    };

    try {
        console.log('💾 Guardando nivel:', data);
        console.log('📊 Modo:', isEdit ? 'EDITAR' : 'CREAR');
        console.log('🌐 URL:', isEdit ? `/admin/niveles/${id}` : '/admin/niveles');
        
        const url = isEdit ? `/admin/niveles/${id}` : '/admin/niveles';
        const method = isEdit ? 'PUT' : 'POST';
        
        console.log('📡 Enviando request...');
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        console.log('📨 Response status:', response.status);
        console.log('📨 Response ok:', response.ok);

        if (response.ok) {
            const message = isEdit ? 'Nivel actualizado exitosamente' : 'Nivel creado exitosamente';
            showNotification(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('nivelModal')).hide();
            
            // SOLUCIÓN SIMPLE: Buscar modalidad actual y recargar solo esos niveles
            setTimeout(() => {
                console.log('🔄 Buscando modalidad actual en breadcrumb...');
                const breadcrumbLink = document.querySelector('.breadcrumb li:nth-child(2) a');
                if (breadcrumbLink) {
                    const onclickAttr = breadcrumbLink.getAttribute('onclick');
                    console.log('📋 Onclick encontrado:', onclickAttr);
                    const match = onclickAttr.match(/showNivelesView\((\d+)/);
                    if (match) {
                        const modalidadId = parseInt(match[1]);
                        console.log('🎯 Modalidad ID extraída:', modalidadId);
                        
                        // Llamar directamente a la función global
                        if (typeof window.loadNivelesForModalidad === 'function') {
                            console.log('✅ Llamando a loadNivelesForModalidad...');
                            window.loadNivelesForModalidad(modalidadId);
                        } else {
                            console.log('❌ loadNivelesForModalidad no disponible, haciendo clic en breadcrumb...');
                            breadcrumbLink.click();
                        }
                    }
                } else {
                    console.log('❌ No se encontró breadcrumb, recargando página...');
                    window.location.reload();
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar nivel', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando nivel:', error);
        showNotification('Error al guardar nivel', 'error');
    } finally {
        // SIEMPRE resetear la protección
        window.saveNivel.isRunning = false;
        console.log('✅ saveNivel terminado, protección reseteada');
    }
};

window.deleteNivel = function(id, nombre) {
    console.log('🗑️ Eliminar nivel:', id, nombre);
    document.getElementById('deleteAcademicoName').textContent = `Nivel: ${nombre}`;
    document.getElementById('deleteAcademicoModal').setAttribute('data-type', 'nivel');
    document.getElementById('deleteAcademicoModal').setAttribute('data-id', id);
    new bootstrap.Modal(document.getElementById('deleteAcademicoModal')).show();
};

// ============================================
// DIVISIONES CRUD
// ============================================

// Función para configurar la actualización automática del nombre completo de la división
function setupDivisionNameUpdate() {
    const nivelSelect = document.getElementById('divisionNivel');
    const letraInput = document.getElementById('divisionLetra');
    const nombreCompletoInput = document.getElementById('divisionNombreCompleto');
    
    function updateNombreCompleto() {
        if (nivelSelect && letraInput && nombreCompletoInput) {
            const nivelSelected = nivelSelect.options[nivelSelect.selectedIndex];
            const letra = letraInput.value.trim().toUpperCase();
            
            if (nivelSelected && nivelSelected.value && letra) {
                const nivelText = nivelSelected.text.split(' (')[0]; // Quitar modalidad del texto
                nombreCompletoInput.value = `${nivelText} "${letra}"`;
            } else {
                nombreCompletoInput.value = '';
            }
        }
    }
    
    if (nivelSelect && letraInput) {
        // Eliminar event listeners anteriores para evitar duplicados
        nivelSelect.removeEventListener('change', updateNombreCompleto);
        letraInput.removeEventListener('input', updateNombreCompleto);
        
        // Agregar nuevos event listeners
        nivelSelect.addEventListener('change', updateNombreCompleto);
        letraInput.addEventListener('input', updateNombreCompleto);
        
        // Actualizar inmediatamente
        updateNombreCompleto();
    }
}

window.showCreateDivisionModal = function() {
    console.log('📝 Abriendo modal crear división');
    document.getElementById('divisionModalTitle').innerHTML = '<i class="bi bi-grid-3x3 me-2"></i>Nueva División';
    document.getElementById('divisionForm').reset();
    document.getElementById('divisionId').value = '';
    document.getElementById('divisionSaveText').textContent = 'Guardar';
    
    // Cargar niveles en el select
    loadNivelesIntoSelect();
    
    new bootstrap.Modal(document.getElementById('divisionModal')).show();
    
    // Configurar actualización automática del nombre completo
    setTimeout(() => {
        setupDivisionNameUpdate();
    }, 100);
};

window.editDivision = async function(id) {
    try {
        console.log('✏️ Editando división:', id);
        const response = await fetch(`/admin/divisiones/${id}`);
        if (!response.ok) throw new Error('Error al cargar división');
        
        const division = await response.json();

        // Agrega logs para cada elemento
        const ids = [
            'divisionModalTitle',
            'divisionId',
            'divisionLetra',
            'divisionAula',
            'divisionNombreCompleto',
            'divisionSaveText',
            'divisionNivel'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) {
                console.error(`Elemento con id "${id}" no encontrado en el DOM`);
            }
        });

        // Solo continuar si todos los elementos existen
        if (ids.some(id => !document.getElementById(id))) {
            showNotification('Error interno: faltan elementos del formulario de división', 'error');
            return;
        }

        document.getElementById('divisionModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar División';
        document.getElementById('divisionId').value = division.id;
        document.getElementById('divisionLetra').value = division.division;
        document.getElementById('divisionAula').value = division.aula || '';
        document.getElementById('divisionNombreCompleto').value = division.nombre_completo;
        document.getElementById('divisionSaveText').textContent = 'Actualizar';

        // Cargar niveles y seleccionar el actual
        loadNivelesIntoSelect();
        setTimeout(() => {
            document.getElementById('divisionNivel').value = division.nivel_id;
        }, 100);

        new bootstrap.Modal(document.getElementById('divisionModal')).show();
        
        // Configurar actualización automática del nombre completo
        setTimeout(() => {
            setupDivisionNameUpdate();
        }, 100);
    } catch (error) {
        console.error('❌ Error cargando división:', error);
        showNotification('Error al cargar los datos de la división', 'error');
    }
};

window.saveDivision = async function() {
    const form = document.getElementById('divisionForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const id = document.getElementById('divisionId').value;
    const isEdit = id !== '';
    
    const data = {
        nivel_id: parseInt(document.getElementById('divisionNivel').value),
        division: document.getElementById('divisionLetra').value.trim().toUpperCase(),
        aula: document.getElementById('divisionAula').value.trim(),
        nombre_completo: document.getElementById('divisionNombreCompleto').value.trim()
    };

    try {
        console.log('💾 Guardando división:', data);
        const url = isEdit ? `/admin/divisiones/${id}` : '/admin/divisiones';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const message = isEdit ? 'División actualizada exitosamente' : 'División creada exitosamente';
            showNotification(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('divisionModal')).hide();
            
            // Buscar nivel actual en breadcrumb y recargar
            setTimeout(() => {
                const modalidadBreadcrumb = document.querySelector('.breadcrumb li:nth-child(2) a');
                if (modalidadBreadcrumb) {
                    const onclickAttr = modalidadBreadcrumb.getAttribute('onclick');
                    const match = onclickAttr.match(/showNivelesView\((\d+)/);
                    if (match) {
                        const modalidadId = parseInt(match[1]);
                        // Buscar el nivel específico en los datos globales
                        const nivelBreadcrumb = document.querySelector('.breadcrumb li:nth-child(3)');
                        if (nivelBreadcrumb) {
                            const nivelText = nivelBreadcrumb.textContent.trim().replace('📐', '').trim();
                            if (window.estructuraData?.niveles) {
                                const nivel = window.estructuraData.niveles.find(n => n.nombre === nivelText);
                                if (nivel && typeof window.loadDivisionesForNivel === 'function') {
                                    window.loadDivisionesForNivel(nivel.id);
                                }
                            }
                        }
                    }
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar división', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando división:', error);
        showNotification('Error al guardar división', 'error');
    }
};

window.deleteDivision = function(id, nombre) {
    console.log('🗑️ Eliminar división:', id, nombre);
    document.getElementById('deleteAcademicoName').textContent = `División: ${nombre}`;
    document.getElementById('deleteAcademicoModal').setAttribute('data-type', 'division');
    document.getElementById('deleteAcademicoModal').setAttribute('data-id', id);
    new bootstrap.Modal(document.getElementById('deleteAcademicoModal')).show();
};

// ============================================
// CONFIRMACIÓN DE ELIMINACIÓN
// ============================================

window.confirmDeleteAcademico = async function() {
    const modal = document.getElementById('deleteAcademicoModal');
    const type = modal.getAttribute('data-type');
    const id = modal.getAttribute('data-id');

    try {
        console.log('🗑️ Confirmando eliminación:', type, id);
        const response = await fetch(`/admin/${type}s/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
            showNotification(`${typeName} eliminado exitosamente`, 'success');
            bootstrap.Modal.getInstance(modal).hide();
            
            // Recargar vista actual dependiendo del tipo
            setTimeout(() => {
                if (type === 'modalidad') {
                    if (typeof loadModalidades === 'function') {
                        loadModalidades();
                    }
                } else if (type === 'nivel') {
                    // Buscar modalidad y recargar niveles
                    const breadcrumbLink = document.querySelector('.breadcrumb li:nth-child(2) a');
                    if (breadcrumbLink) {
                        const onclickAttr = breadcrumbLink.getAttribute('onclick');
                        const match = onclickAttr.match(/showNivelesView\((\d+)/);
                        if (match && typeof window.loadNivelesForModalidad === 'function') {
                            window.loadNivelesForModalidad(parseInt(match[1]));
                        }
                    }
                } else if (type === 'division') {
                    // Buscar nivel y recargar divisiones
                    const nivelBreadcrumb = document.querySelector('.breadcrumb li:nth-child(3)');
                    if (nivelBreadcrumb && window.estructuraData?.niveles) {
                        const nivelText = nivelBreadcrumb.textContent.trim().replace('📐', '').trim();
                        const nivel = window.estructuraData.niveles.find(n => n.nombre === nivelText);
                        if (nivel && typeof window.loadDivisionesForNivel === 'function') {
                            window.loadDivisionesForNivel(nivel.id);
                        }
                    }
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar', 'error');
        }
    } catch (error) {
        console.error('❌ Error eliminando:', error);
        showNotification('Error al eliminar', 'error');
    }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function loadModalidadesIntoSelect() {
    // Protección contra ejecuciones múltiples
    if (loadModalidadesIntoSelect.isRunning) {
        console.log('⚠️ loadModalidadesIntoSelect ya está ejecutándose, ignorando...');
        return;
    }
    
    const select = document.getElementById('nivelModalidad');
    if (!select) return;
    
    loadModalidadesIntoSelect.isRunning = true;
    console.log('🔄 Cargando modalidades en select...');
    
    try {
        select.innerHTML = '<option value="">Seleccionar modalidad</option>';
        
        if (window.estructuraData?.modalidades) {
            window.estructuraData.modalidades.forEach(modalidad => {
                select.innerHTML += `<option value="${modalidad.id}">${modalidad.nombre}</option>`;
            });
            console.log('✅ Modalidades cargadas en select:', window.estructuraData.modalidades.length);
        }
    } finally {
        loadModalidadesIntoSelect.isRunning = false;
    }
}

function loadNivelesIntoSelect() {
    // Protección contra ejecuciones múltiples
    if (loadNivelesIntoSelect.isRunning) {
        console.log('⚠️ loadNivelesIntoSelect ya está ejecutándose, ignorando...');
        return;
    }
    
    const select = document.getElementById('divisionNivel');
    if (!select) return;
    
    loadNivelesIntoSelect.isRunning = true;
    console.log('🔄 Cargando niveles en select...');
    
    try {
        select.innerHTML = '<option value="">Seleccionar nivel</option>';
        
        if (window.estructuraData?.niveles) {
            window.estructuraData.niveles.forEach(nivel => {
                select.innerHTML += `<option value="${nivel.id}">${nivel.nombre} (${nivel.modalidad_nombre})</option>`;
            });
            console.log('✅ Niveles cargados en select:', window.estructuraData.niveles.length);
        }
    } finally {
        loadNivelesIntoSelect.isRunning = false;
    }
}

// ============================================
// NOTIFICACIONES
// ============================================

function showNotification(message, type = 'info') {
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    const icon = type === 'success' ? 'check-circle' : 
                 type === 'error' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="bi bi-${icon} me-2"></i>${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// ============================================
// MATERIAS CRUD
// ============================================

window.showCreateMateriaModal = function() {
    console.log('📝 Abriendo modal crear materia');
    document.getElementById('materiaModalTitle').innerHTML = '<i class="bi bi-book me-2"></i>Nueva Materia';
    document.getElementById('materiaForm').reset();
    document.getElementById('materiaId').value = '';
    document.getElementById('materiaSaveText').textContent = 'Guardar';
    
    // Cargar modalidades en el select
    const modalidadSelect = document.getElementById('materiaModalidad');
    if (modalidadSelect) {
        modalidadSelect.innerHTML = '<option value="">Materia común (todas las modalidades)</option>';
        
        if (window.estructuraData && window.estructuraData.modalidades) {
            window.estructuraData.modalidades.forEach(modalidad => {
                modalidadSelect.innerHTML += `<option value="${modalidad.id}">${modalidad.nombre}</option>`;
            });
        }
    }
    
    new bootstrap.Modal(document.getElementById('materiaModal')).show();
};

window.editMateria = async function(id) {
    try {
        console.log('✏️ Editando materia:', id);
        const response = await fetch(`/admin/materias/${id}`);
        if (!response.ok) throw new Error('Error al cargar materia');
        
        const materia = await response.json();
        
        document.getElementById('materiaModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Materia';
        document.getElementById('materiaId').value = materia.id;
        document.getElementById('materiaNombre').value = materia.name;
        document.getElementById('materiaDescripcion').value = materia.description || '';
        document.getElementById('materiaCodigo').value = materia.codigo || '';
        document.getElementById('materiaHoras').value = materia.horas_semanales || '';
        document.getElementById('materiaSaveText').textContent = 'Actualizar';
        
        // Cargar modalidades y seleccionar la actual
        const modalidadSelect = document.getElementById('materiaModalidad');
        if (modalidadSelect) {
            modalidadSelect.innerHTML = '<option value="">Materia común (todas las modalidades)</option>';
            
            if (window.estructuraData && window.estructuraData.modalidades) {
                window.estructuraData.modalidades.forEach(modalidad => {
                    const selected = modalidad.id === materia.modalidad_id ? 'selected' : '';
                    modalidadSelect.innerHTML += `<option value="${modalidad.id}" ${selected}>${modalidad.nombre}</option>`;
                });
            }
        }
        
        new bootstrap.Modal(document.getElementById('materiaModal')).show();
    } catch (error) {
        console.error('❌ Error cargando materia:', error);
        showNotification('Error al cargar los datos de la materia', 'error');
    }
};

window.saveMateria = async function() {
    const form = document.getElementById('materiaForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
    }

    const id = document.getElementById('materiaId').value;
    const isEdit = id !== '';
    
    const data = {
        name: document.getElementById('materiaNombre').value.trim(),
        description: document.getElementById('materiaDescripcion').value.trim(),
        codigo: document.getElementById('materiaCodigo').value.trim(),
        modalidad_id: document.getElementById('materiaModalidad').value || null,
        horas_semanales: document.getElementById('materiaHoras').value || 0
    };

    try {
        console.log('💾 Guardando materia:', data);
        const url = isEdit ? `/admin/materias/${id}` : '/admin/materias';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const message = isEdit ? 'Materia actualizada exitosamente' : 'Materia creada exitosamente';
            showNotification(message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('materiaModal')).hide();
            
            // Recargar materias
            setTimeout(() => {
                if (typeof window.loadMaterias === 'function') {
                    window.loadMaterias();
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar materia', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando materia:', error);
        showNotification('Error al guardar materia', 'error');
    }
};

window.deleteMateria = function(id, nombre) {
    console.log('🗑️ Eliminar materia:', id, nombre);
    document.getElementById('deleteMateriaName').textContent = nombre;
    document.getElementById('deleteMateriaId').value = id;
    new bootstrap.Modal(document.getElementById('deleteMateriaModal')).show();
};

window.materiaDelete = function(id, nombre) {
    console.log('🗑️ Eliminar materia con función específica:', id, nombre);
    
    // Acceder a los elementos de forma segura
    const deleteMateriaName = document.querySelector('#deleteMateriaName');
    const deleteMateriaId = document.querySelector('#deleteMateriaId');
    const deleteMateriaModal = document.querySelector('#deleteMateriaModal');
    
    if (deleteMateriaName) deleteMateriaName.textContent = nombre;
    if (deleteMateriaId) deleteMateriaId.value = id;
    
    if (deleteMateriaModal) {
        const modal = new bootstrap.Modal(deleteMateriaModal);
        modal.show();
    } else {
        console.error('❌ Modal de eliminación no encontrado');
        showNotification('Error al preparar la eliminación', 'error');
    }
};

window.materiaConfirmDelete = async function() {
    console.log('🗑️ Confirmando eliminación de materia');
    
    // Acceder a los elementos de forma segura
    const deleteMateriaId = document.querySelector('#deleteMateriaId');
    const deleteMateriaModal = document.querySelector('#deleteMateriaModal');
    
    if (!deleteMateriaId) {
        console.error('❌ ID de materia no encontrado');
        showNotification('Error al eliminar materia', 'error');
        return;
    }
    
    const id = deleteMateriaId.value;
    
    try {
        const response = await fetch(`/admin/materias/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            showNotification('Materia eliminada exitosamente', 'success');
            
            // Cerrar modal si existe
            if (deleteMateriaModal) {
                const modalInstance = bootstrap.Modal.getInstance(deleteMateriaModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
            // Recargar materias
            setTimeout(() => {
                if (typeof window.loadMaterias === 'function') {
                    window.loadMaterias();
                } else {
                    console.warn('⚠️ Función loadMaterias no disponible');
                    // Intentar recargar la página como fallback
                    window.location.reload();
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al eliminar materia', 'error');
        }
    } catch (error) {
        console.error('❌ Error eliminando materia:', error);
        showNotification('Error al eliminar materia', 'error');
    }
};

// ============================================
// MATERIAS CRUD - FUNCIONES ESPECÍFICAS
// ============================================

window.materiaEdit = async function(id) {
    try {
        console.log('✏️ Editando materia con función específica:', id);
        const response = await fetch(`/admin/materias/${id}`);
        if (!response.ok) throw new Error('Error al cargar materia');
        
        const materia = await response.json();
        
        // Acceder a los elementos de forma segura
        const modalTitle = document.querySelector('#materiaModalTitle');
        const materiaIdInput = document.querySelector('#materiaId');
        const materiaNombreInput = document.querySelector('#materiaNombre');
        const materiaDescripcionInput = document.querySelector('#materiaDescripcion');
        const materiaCodigoInput = document.querySelector('#materiaCodigo');
        const materiaHorasInput = document.querySelector('#materiaHoras');
        const materiaSaveText = document.querySelector('#materiaSaveText');
        
        if (modalTitle) modalTitle.innerHTML = '<i class="bi bi-pencil me-2"></i>Editar Materia';
        if (materiaIdInput) materiaIdInput.value = materia.id;
        if (materiaNombreInput) materiaNombreInput.value = materia.name;
        if (materiaDescripcionInput) materiaDescripcionInput.value = materia.description || '';
        if (materiaCodigoInput) materiaCodigoInput.value = materia.codigo || '';
        if (materiaHorasInput) materiaHorasInput.value = materia.horas_semanales || '';
        if (materiaSaveText) materiaSaveText.textContent = 'Actualizar';
        
        // Cargar modalidades y seleccionar la actual
        const modalidadSelect = document.querySelector('#materiaModalidad');
        if (modalidadSelect) {
            modalidadSelect.innerHTML = '<option value="">Materia común (todas las modalidades)</option>';
            
            if (window.estructuraData && window.estructuraData.modalidades) {
                window.estructuraData.modalidades.forEach(modalidad => {
                    const selected = modalidad.id === materia.modalidad_id ? 'selected' : '';
                    modalidadSelect.innerHTML += `<option value="${modalidad.id}" ${selected}>${modalidad.nombre}</option>`;
                });
            }
        }
        
        // Limpiar validaciones previas
        const materiaForm = document.querySelector('#materiaForm');
        if (materiaForm) {
            materiaForm.classList.remove('was-validated');
        }
        
        // Mostrar el modal
        const materiaModal = document.querySelector('#materiaModal');
        if (materiaModal) {
            const modal = new bootstrap.Modal(materiaModal);
            modal.show();
        }
    } catch (error) {
        console.error('❌ Error cargando materia:', error);
        showNotification('Error al cargar los datos de la materia', 'error');
    }
};

window.materiaSave = async function() {
    console.log('💾 Guardando materia con función específica');
    
    // Acceder a los elementos de forma segura
    const materiaForm = document.querySelector('#materiaForm');
    const materiaId = document.querySelector('#materiaId');
    const materiaNombre = document.querySelector('#materiaNombre');
    const materiaDescripcion = document.querySelector('#materiaDescripcion');
    const materiaCodigo = document.querySelector('#materiaCodigo');
    const materiaModalidad = document.querySelector('#materiaModalidad');
    const materiaHoras = document.querySelector('#materiaHoras');
    const materiaModal = document.querySelector('#materiaModal');
    
    // Verificar que el formulario exista
    if (!materiaForm || !materiaNombre) {
        console.error('❌ Formulario de materia no encontrado');
        showNotification('Error al guardar materia', 'error');
        return;
    }
    
    // Validar formulario
    if (!materiaForm.checkValidity()) {
        materiaForm.classList.add('was-validated');
        return;
    }
    
    const id = materiaId ? materiaId.value : '';
    const isEdit = id !== '';
    
    const data = {
        name: materiaNombre.value.trim(),
        description: materiaDescripcion ? materiaDescripcion.value.trim() : '',
        codigo: materiaCodigo ? materiaCodigo.value.trim() : '',
        modalidad_id: materiaModalidad && materiaModalidad.value ? materiaModalidad.value : null,
        horas_semanales: materiaHoras && materiaHoras.value ? materiaHoras.value : 0
    };
    
    try {
        console.log('📤 Enviando datos:', data);
        const url = isEdit ? `/admin/materias/${id}` : '/admin/materias';
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const message = isEdit ? 'Materia actualizada exitosamente' : 'Materia creada exitosamente';
            showNotification(message, 'success');
            
            // Cerrar modal
            if (materiaModal) {
                const modalInstance = bootstrap.Modal.getInstance(materiaModal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
            
            // Recargar materias
            setTimeout(() => {
                if (typeof window.loadMaterias === 'function') {
                    window.loadMaterias();
                } else {
                    console.warn('⚠️ Función loadMaterias no disponible');
                    // Intentar recargar la página como fallback
                    window.location.reload();
                }
            }, 500);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error al guardar materia', 'error');
        }
    } catch (error) {
        console.error('❌ Error guardando materia:', error);
        showNotification('Error al guardar materia', 'error');
    }
};

// ============================================
// INICIALIZACIÓN
// ============================================

console.log('✅ CRUD Académico cargado correctamente');