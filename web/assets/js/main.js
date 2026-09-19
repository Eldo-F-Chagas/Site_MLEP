// Main JavaScript Module - Core functionality
window.MLEPSecurity = Object.freeze({
  sanitize(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html);
    template.content.querySelectorAll('script, iframe, object, embed, meta, base').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc' || name === 'style') {
          node.removeAttribute(attribute.name);
          return;
        }
        if (['href', 'src', 'action', 'formaction'].includes(name)) {
          try {
            const value = attribute.value.trim();
            const url = new URL(value, window.location.origin);
            if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) && !value.startsWith('#')) {
              node.removeAttribute(attribute.name);
            }
          } catch {
            node.removeAttribute(attribute.name);
          }
        }
      });
    });
    return template.innerHTML;
  },
});

const MLEP_STATIC_BASE = window.location.hostname.endsWith('github.io')
  || window.location.pathname.startsWith('/Site_MLEP/')
  ? '/Site_MLEP'
  : '';
window.MLEP_STATIC_PREVIEW = Boolean(MLEP_STATIC_BASE);

window.fetchAuth = async (url, options = {}) => {
  if (window.MLEP_STATIC_PREVIEW) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const response = await fetch(url, { credentials: 'include', ...options });
  if (response.status === 401) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
    return null;
  }
  return response;
};

class MLEPApp {
  constructor() {
    this.theme = this.getStoredTheme() || this.detectTheme();
    this.apiBaseUrl = '/api';
    this.githubPagesBase = MLEP_STATIC_BASE;
    
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupNavigation();
    this.setupDataLabLinks();
    this.setupScrollEffects();
    this.setupErrorHandling();
    this.registerServiceWorker();

    // Initialize after DOM is fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.onDOMReady();
      });
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    this.setupStaticPreviewLinks();
    this.setupCurrentYear();
    this.setupThemeToggle();
    this.setupMobileNavigation();
    this.setupSmoothScrolling();
    this.setupFormValidation();
  }

  setupStaticPreviewLinks() {
    if (!this.githubPagesBase) return;
    const banner = document.createElement('aside');
    banner.className = 'static-preview-banner';
    banner.setAttribute('role', 'status');
    banner.textContent = 'Prévia estática: contas, formulários e dados dinâmicos exigem a implantação completa da API.';
    document.body.prepend(banner);

    const publicPages = new Set([
      'about', 'aula', 'contact', 'curso', 'cursos', 'events', 'forum',
      'forum-topic', 'index', 'login', 'materiais', 'news', 'profile',
      'projects', 'publications', 'register', 'research', 'resources',
      'settings', 'team',
    ]);
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      const target = new URL(link.getAttribute('href'), window.location.origin);
      const page = target.pathname.replace(/^\//, '') || 'index';
      if (publicPages.has(page)) {
        link.href = `${this.githubPagesBase}/${page}.html${target.search}${target.hash}`;
      }
    });

    document.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.showNotification('Formulários indisponíveis nesta prévia estática.', 'info');
      }, true);
    });
  }

  setupCurrentYear() {
    document.querySelectorAll('[data-current-year]').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  // Theme Management
  detectTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  getStoredTheme() {
    return localStorage.getItem('mlep-theme');
  }

  setStoredTheme(theme) {
    localStorage.setItem('mlep-theme', theme);
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme();
      });
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!this.getStoredTheme()) {
          this.setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  toggleTheme() {
    const newTheme = this.theme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme) {
    this.theme = theme;
    this.setStoredTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { theme }
    }));
  }

  // Navigation
  setupNavigation() {
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav__link');
    
    navLinks.forEach(link => {
      link.classList.remove('nav__link--active');
      
      const linkPath = new URL(link.href).pathname;
      if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
        link.classList.add('nav__link--active');
      }
    });
  }

  setupMobileNavigation() {
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav__menu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
        
        navToggle.setAttribute('aria-expanded', !isOpen);
        navMenu.classList.toggle('nav__menu--open');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = isOpen ? '' : 'hidden';
      });

      // Close menu when clicking on links
      const navLinks = navMenu.querySelectorAll('.nav__link');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.classList.remove('nav__menu--open');
          document.body.style.overflow = '';
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.classList.remove('nav__menu--open');
          document.body.style.overflow = '';
        }
      });
    }
  }

  // Data Lab Links
  async setupDataLabLinks() {
    const dataLabLinks = document.querySelectorAll('#datalab-link, #hero-datalab-link, #footer-datalab-link, #external-datalab-link');
    if (window.MLEP_STATIC_PREVIEW) {
      dataLabLinks.forEach((link) => {
        link.href = `${this.githubPagesBase}/cursos.html`;
      });
      return;
    }
    try {
      const response = await fetch(`${this.apiBaseUrl}/courses/datalab`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const target = new URL(data.url || '/cursos', window.location.origin);
      if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Invalid Data Lab URL');
      dataLabLinks.forEach(link => {
        link.href = target.href;
        if (target.origin !== window.location.origin) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
      });
    } catch (error) {
      console.error('Error loading Data Lab URL:', error);
      dataLabLinks.forEach((link) => {
        link.href = this.githubPagesBase ? `${this.githubPagesBase}/cursos.html` : '/cursos';
      });
    }
  }

  // Scroll Effects (Optimized with throttling)
  setupScrollEffects() {
    const header = document.querySelector('.header');
    if (!header) return;

    let ticking = false;
    let lastScrollY = window.scrollY;

    const updateHeader = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > 100) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  setupSmoothScrolling() {
    // Use event delegation for better performance
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;

      e.preventDefault();

      const targetId = anchor.getAttribute('href');
      const target = document.querySelector(targetId);

      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }

  // Form Validation
  setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
        }
      });

      // Real-time validation
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input);
        });
      });
    });
  }

  validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    const required = field.hasAttribute('required');
    let isValid = true;
    let errorMessage = '';

    // Clear previous errors
    this.clearFieldError(field);

    // Required validation
    if (required && !value) {
      isValid = false;
      errorMessage = 'This field is required';
    }

    // Email validation
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }

    // URL validation
    if (type === 'url' && value) {
      try {
        new URL(value);
      } catch {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
      }
    }

    // Show error if invalid
    if (!isValid) {
      this.showFieldError(field, errorMessage);
    }

    return isValid;
  }

  showFieldError(field, message) {
    field.classList.add('form-input--error');
    
    let errorElement = field.parentNode.querySelector('.form-error');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'form-error';
      field.parentNode.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
  }

  clearFieldError(field) {
    field.classList.remove('form-input--error');
    
    const errorElement = field.parentNode.querySelector('.form-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  // Error Handling
  setupErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
    });
  }

  // API Helper Methods
  async apiRequest(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Utility Methods (Optimized)
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };

      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) func.apply(this, args);
    };
  }

  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  formatDate(date, options = {}) {
    if (window.i18n) {
      return window.i18n.formatDate(date, options);
    }
    return new Intl.DateTimeFormat('pt-BR', options).format(date);
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification--show');
    }, 100);

    setTimeout(() => {
      notification.classList.remove('notification--show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Service Worker Registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const serviceWorkerUrl = this.githubPagesBase ? `${this.githubPagesBase}/sw.js` : '/sw.js';
        const registration = await navigator.serviceWorker.register(serviceWorkerUrl);
        console.log('Service Worker registered successfully:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              this.showNotification('Nova versão disponível. Recarregue a página.', 'info');
            }
          });
        });
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  }
}

// Initialize the app
const app = new MLEPApp();

// Export for use in other modules
window.MLEPApp = app;
