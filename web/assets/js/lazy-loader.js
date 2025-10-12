/**
 * Lazy Loading Module
 * Loads JavaScript modules only when needed
 */
class LazyLoader {
    constructor() {
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * Load a module lazily
     * @param {string} moduleName - Name of the module to load
     * @param {string} path - Path to the module file
     * @returns {Promise} Promise that resolves when module is loaded
     */
    async loadModule(moduleName, path) {
        // Return if already loaded
        if (this.loadedModules.has(moduleName)) {
            return Promise.resolve();
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(moduleName)) {
            return this.loadingPromises.get(moduleName);
        }

        // Create loading promise
        const loadingPromise = this.createScript(path)
            .then(() => {
                this.loadedModules.add(moduleName);
                this.loadingPromises.delete(moduleName);
            })
            .catch(error => {
                this.loadingPromises.delete(moduleName);
                console.error(`Failed to load module ${moduleName}:`, error);
                throw error;
            });

        this.loadingPromises.set(moduleName, loadingPromise);
        return loadingPromise;
    }

    /**
     * Create and load a script element
     * @param {string} src - Script source URL
     * @returns {Promise} Promise that resolves when script loads
     */
    createScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.defer = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            
            document.head.appendChild(script);
        });
    }

    /**
     * Load module based on page type
     * @param {string} pageType - Type of page (home, about, courses, etc.)
     */
    async loadPageModule(pageType) {
        const moduleMap = {
            'home': '/assets/js/home.js',
            'about': '/assets/js/about.js',
            'research': '/assets/js/research.js',
            'publications': '/assets/js/publications.js',
            'projects': '/assets/js/projects.js',
            'team': '/assets/js/team.js',
            'news': '/assets/js/news.js',
            'events': '/assets/js/events.js',
            'resources': '/assets/js/resources.js',
            'contact': '/assets/js/contact.js',
            'courses': '/assets/js/courses-catalog.js',
            'course': '/assets/js/course-page.js',
            'login': '/assets/js/auth.js'
        };

        const modulePath = moduleMap[pageType];
        if (modulePath) {
            try {
                await this.loadModule(pageType, modulePath);
            } catch (error) {
                console.warn(`Optional module ${pageType} failed to load:`, error);
            }
        }
    }

    /**
     * Load modules based on intersection observer
     * @param {string} selector - CSS selector for elements to observe
     * @param {string} moduleName - Module to load when element is visible
     * @param {string} modulePath - Path to the module
     */
    loadOnIntersection(selector, moduleName, modulePath) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadModule(moduleName, modulePath);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });

        elements.forEach(el => observer.observe(el));
    }

    /**
     * Preload critical modules
     */
    async preloadCritical() {
        const criticalModules = [
            { name: 'i18n', path: '/assets/js/i18n.js' }
        ];

        const promises = criticalModules.map(module => 
            this.loadModule(module.name, module.path)
        );

        try {
            await Promise.all(promises);
        } catch (error) {
            console.warn('Some critical modules failed to preload:', error);
        }
    }
}

// Create global instance
window.lazyLoader = new LazyLoader();

// Auto-detect page type and load appropriate module
document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const pageType = body.dataset.page || 
                    body.className.split(' ').find(cls => cls.endsWith('-page'))?.replace('-page', '') ||
                    window.location.pathname.split('/')[1] || 'home';
    
    // Preload critical modules
    window.lazyLoader.preloadCritical();
    
    // Load page-specific module
    window.lazyLoader.loadPageModule(pageType);
});

export default LazyLoader;
