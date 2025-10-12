/**
 * Image Lazy Loading Module
 * Optimized image loading with intersection observer
 */
class ImageLazyLoader {
    constructor(options = {}) {
        this.options = {
            rootMargin: '50px',
            threshold: 0.1,
            loadingClass: 'img-loading',
            loadedClass: 'img-loaded',
            errorClass: 'img-error',
            ...options
        };
        
        this.observer = null;
        this.init();
    }

    init() {
        // Check for Intersection Observer support
        if (!('IntersectionObserver' in window)) {
            this.loadAllImages();
            return;
        }

        this.createObserver();
        this.observeImages();
    }

    createObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: this.options.rootMargin,
            threshold: this.options.threshold
        });
    }

    observeImages() {
        const images = document.querySelectorAll('img[data-src], img[data-srcset]');
        images.forEach(img => {
            this.observer.observe(img);
        });
    }

    loadImage(img) {
        img.classList.add(this.options.loadingClass);

        // Create a new image to preload
        const imageLoader = new Image();
        
        imageLoader.onload = () => {
            this.applyImage(img, imageLoader);
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.loadedClass);
        };

        imageLoader.onerror = () => {
            img.classList.remove(this.options.loadingClass);
            img.classList.add(this.options.errorClass);
            console.warn('Failed to load image:', img.dataset.src || img.dataset.srcset);
        };

        // Start loading
        if (img.dataset.srcset) {
            imageLoader.srcset = img.dataset.srcset;
        }
        if (img.dataset.src) {
            imageLoader.src = img.dataset.src;
        }
    }

    applyImage(img, loadedImage) {
        // Apply srcset first if available
        if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            img.removeAttribute('data-srcset');
        }
        
        // Apply src
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }

        // Copy other attributes if needed
        if (img.dataset.sizes) {
            img.sizes = img.dataset.sizes;
            img.removeAttribute('data-sizes');
        }
    }

    loadAllImages() {
        // Fallback for browsers without Intersection Observer
        const images = document.querySelectorAll('img[data-src], img[data-srcset]');
        images.forEach(img => this.loadImage(img));
    }

    // Method to add new images dynamically
    addImages(selector) {
        if (!this.observer) return;
        
        const newImages = document.querySelectorAll(selector);
        newImages.forEach(img => {
            if (img.dataset.src || img.dataset.srcset) {
                this.observer.observe(img);
            }
        });
    }

    // Cleanup method
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

// CSS for loading states
const lazyLoadingCSS = `
.img-loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
}

.img-loaded {
    animation: fadeIn 0.3s ease-in-out;
}

.img-error {
    background: #f5f5f5;
    position: relative;
}

.img-error::after {
    content: '⚠️ Image failed to load';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 12px;
    color: #666;
    text-align: center;
}

@keyframes loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Dark theme support */
[data-theme="dark"] .img-loading {
    background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
    background-size: 200% 100%;
}

[data-theme="dark"] .img-error {
    background: #374151;
}

[data-theme="dark"] .img-error::after {
    color: #9ca3af;
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = lazyLoadingCSS;
document.head.appendChild(style);

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    window.imageLazyLoader = new ImageLazyLoader();
});

// Export for manual use
window.ImageLazyLoader = ImageLazyLoader;
