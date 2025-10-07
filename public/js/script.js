// JavaScript personalizado para el Sistema de Gestión

document.addEventListener('DOMContentLoaded', function() {
    
    // Auto-ocultar alertas después de 5 segundos
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        if (alert.classList.contains('alert-success') || alert.classList.contains('alert-info')) {
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => {
                    alert.remove();
                }, 300);
            }, 5000);
        }
    });

    // Confirmación para acciones de eliminación
    const deleteButtons = document.querySelectorAll('[data-action="delete"]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const message = this.getAttribute('data-message') || '¿Estás seguro de que quieres eliminar este elemento?';
            if (confirm(message)) {
                window.location.href = this.href;
            }
        });
    });

    // Validación de formularios
    const forms = document.querySelectorAll('form[data-validate="true"]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const requiredFields = form.querySelectorAll('[required]');
            let valid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    field.classList.add('is-invalid');
                    valid = false;
                } else {
                    field.classList.remove('is-invalid');
                }
            });
            
            if (!valid) {
                e.preventDefault();
                alert('Por favor, completa todos los campos requeridos.');
            }
        });
    });

    // Mostrar/ocultar contraseña
    const passwordToggles = document.querySelectorAll('[data-toggle="password"]');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const target = document.querySelector(this.getAttribute('data-target'));
            if (target.type === 'password') {
                target.type = 'text';
                this.innerHTML = '<i class="bi bi-eye-slash"></i>';
            } else {
                target.type = 'password';
                this.innerHTML = '<i class="bi bi-eye"></i>';
            }
        });
    });

    // Tooltip de Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    console.log('Sistema de Gestión - JavaScript cargado correctamente');
}); 