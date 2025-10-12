/**
 * Authentication JavaScript
 */

class AuthManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupGoogleLogin();
        this.handleUrlParams();
        this.checkAuthStatus();
    }

    setupGoogleLogin() {
        const googleLoginBtn = document.getElementById('google-login-btn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', this.handleGoogleLogin.bind(this));
        }
    }

    async handleGoogleLogin(event) {
        event.preventDefault();

        // Check if OAuth is configured first
        try {
            const configResponse = await fetch('/api/auth/config');
            const config = await configResponse.json();

            if (!config.oauth_configured) {
                this.showError('Google OAuth não está configurado. Entre em contato com o administrador.');
                return;
            }
        } catch (error) {
            this.showError('Erro ao verificar configuração de autenticação.');
            return;
        }

        // Get next URL from current page
        const urlParams = new URLSearchParams(window.location.search);
        const nextUrl = urlParams.get('next') || '/cursos';

        // Show loading state
        const btn = event.target.closest('button');
        const btnContent = btn.querySelector('.btn-content');
        const btnText = btn.querySelector('.btn-text');
        const btnLoading = btn.querySelector('.btn-loading');

        // Disable button and show loading
        btn.disabled = true;
        btn.classList.add('loading');

        if (btnText && btnLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'flex';
        }

        // Add visual feedback
        btn.style.transform = 'scale(0.98)';

        // Small delay for better UX
        setTimeout(() => {
            // Redirect to Google OAuth
            const loginUrl = `/auth/google/login?next=${encodeURIComponent(nextUrl)}`;
            window.location.href = loginUrl;
        }, 300);
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
            this.showError(this.getErrorMessage(error));
        }
    }

    getErrorMessage(error) {
        const errorMessages = {
            'access_denied': 'Login cancelado. Você precisa autorizar o acesso para continuar.',
            'oauth_error': 'Erro na autenticação com Google. Tente novamente.',
            'auth_required': 'Você precisa estar logado para acessar esta página.',
            'session_expired': 'Sua sessão expirou. Faça login novamente.',
            'oauth_access_denied': 'Login cancelado. Você precisa autorizar o acesso para continuar.',
            'oauth_invalid_client': 'Configuração de autenticação inválida. Entre em contato com o suporte.',
            'oauth_server_error': 'Erro no servidor de autenticação. Tente novamente em alguns minutos.',
            'oauth_not_configured': 'Google OAuth não está configurado. Entre em contato com o administrador.',
            'oauth_client_not_initialized': 'Cliente OAuth não foi inicializado corretamente. Verifique a configuração.'
        };

        return errorMessages[error] || 'Erro de autenticação. Tente novamente.';
    }

    showError(message) {
        // Show toast notification
        showToast(message, 'error', 8000);

        // Also show in error div if exists
        const errorDiv = document.getElementById('auth-error');
        const errorMessage = document.getElementById('error-message');

        if (errorDiv && errorMessage) {
            errorMessage.textContent = message;
            errorDiv.style.display = 'block';

            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 10000);
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.authenticated) {
                    // User is already logged in, redirect to next URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const nextUrl = urlParams.get('next') || '/cursos';
                    window.location.href = nextUrl;
                }
            }
        } catch (error) {
            console.log('Auth status check failed:', error);
        }
    }
}

/**
 * Auth Guard for protected pages
 */
class AuthGuard {
    constructor() {
        this.init();
    }

    async init() {
        // Only run on course pages
        if (this.isCoursePage()) {
            await this.checkAuthentication();
        }
    }

    isCoursePage() {
        const path = window.location.pathname;
        return path.startsWith('/cursos') || 
               path.includes('/aulas/') || 
               path.includes('/forum/') || 
               path.includes('/materiais');
    }

    async checkAuthentication() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (!data.authenticated) {
                    this.redirectToLogin();
                } else {
                    this.setupUserInterface(data.user);
                }
            } else {
                this.redirectToLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.redirectToLogin();
        }
    }

    redirectToLogin() {
        const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${currentUrl}`;
    }

    setupUserInterface(user) {
        this.addUserMenu(user);
        this.setupLogoutHandler();
    }

    addUserMenu(user) {
        // Find header or create user menu area
        const header = document.querySelector('header');
        if (!header) return;

        // Check if user menu already exists
        if (document.querySelector('.user-menu')) return;

        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <div class="user-menu__trigger">
                <img src="${user.picture || this.getDefaultAvatar(user.email)}" 
                     alt="${user.name || user.email}" 
                     class="user-avatar">
                <span class="user-name">${user.name || user.email.split('@')[0]}</span>
                <svg class="user-menu__arrow" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M7 10l5 5 5-5z"/>
                </svg>
            </div>
            <div class="user-menu__dropdown">
                <a href="/profile" class="user-menu__item">
                    <span>Meu Perfil</span>
                </a>
                <a href="/cursos" class="user-menu__item">
                    <span>Meus Cursos</span>
                </a>
                <div class="user-menu__divider"></div>
                <button class="user-menu__item user-menu__logout">
                    <span>Sair</span>
                </button>
            </div>
        `;

        // Add to header
        const headerContent = header.querySelector('.container') || header;
        headerContent.appendChild(userMenu);

        // Setup dropdown toggle
        const trigger = userMenu.querySelector('.user-menu__trigger');
        const dropdown = userMenu.querySelector('.user-menu__dropdown');
        
        trigger.addEventListener('click', () => {
            dropdown.classList.toggle('user-menu__dropdown--open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!userMenu.contains(event.target)) {
                dropdown.classList.remove('user-menu__dropdown--open');
            }
        });
    }

    setupLogoutHandler() {
        const logoutBtn = document.querySelector('.user-menu__logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }
    }

    async handleLogout(event) {
        event.preventDefault();
        
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                window.location.href = '/';
            } else {
                console.error('Logout failed');
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    getDefaultAvatar(email) {
        // Generate a simple avatar based on email
        const hash = this.simpleHash(email);
        return `https://www.gravatar.com/avatar/${hash}?s=40&d=identicon`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    }
}

/**
 * Fetch with authentication
 */
async function fetchAuth(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    const response = await fetch(url, { ...defaultOptions, ...options });

    if (response.status === 401) {
        // Redirect to login with current page as next
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
        return null;
    }

    return response;
}

/**
 * Initialize authentication
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth manager on login page
    if (window.location.pathname === '/login') {
        new AuthManager();
    }
    
    // Initialize auth guard on all pages
    new AuthGuard();
});

/**
 * Toast notification system
 */
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    // Add to page
    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Export for use in other modules
window.AuthManager = AuthManager;
window.AuthGuard = AuthGuard;
window.fetchAuth = fetchAuth;
window.showToast = showToast;
