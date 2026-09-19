// Internationalization (i18n) Module
class I18n {
  constructor() {
    this.currentLang = this.getStoredLanguage() || this.detectLanguage();
    this.translations = {};
    this.fallbackLang = 'pt';
    const isStaticPreview = window.location.hostname.endsWith('github.io')
      || window.location.pathname.startsWith('/Site_MLEP/');
    this.basePath = isStaticPreview ? '/Site_MLEP' : '';
    
    this.init();
  }

  async init() {
    await this.loadTranslations();
    this.updatePageLanguage();
    this.translatePage();
    this.setupLanguageToggle();
  }

  detectLanguage() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && ['pt', 'en'].includes(urlLang)) {
      return urlLang;
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('pt')) return 'pt';
    if (browserLang.startsWith('en')) return 'en';
    
    return 'pt'; // Default to Portuguese
  }

  getStoredLanguage() {
    return localStorage.getItem('mlep-language');
  }

  setStoredLanguage(lang) {
    localStorage.setItem('mlep-language', lang);
  }

  async loadTranslations() {
    try {
      const response = await fetch(`${this.basePath}/i18n/${this.currentLang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${this.currentLang}`);
      }
      this.translations = await response.json();
    } catch (error) {
      console.error('Error loading translations:', error);
      
      // Try to load fallback language
      if (this.currentLang !== this.fallbackLang) {
        try {
          const fallbackResponse = await fetch(`${this.basePath}/i18n/${this.fallbackLang}.json`);
          this.translations = await fallbackResponse.json();
        } catch (fallbackError) {
          console.error('Error loading fallback translations:', fallbackError);
        }
      }
    }
  }

  updatePageLanguage() {
    document.documentElement.lang = this.currentLang === 'pt' ? 'pt-BR' : 'en';
  }

  translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.interpolate(this.getTranslation(key));
      
      if (translation) {
        // Handle different element types
        if (element.tagName === 'INPUT' && element.type === 'submit') {
          element.value = translation;
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = this.interpolate(this.getTranslation(key));
      if (translation) {
        element.placeholder = translation;
      }
    });

    // Update page title if available
    const titleKey = document.querySelector('meta[name="i18n-title"]');
    if (titleKey) {
      const titleTranslation = this.getTranslation(titleKey.content);
      if (titleTranslation) {
        document.title = titleTranslation;
      }
    }

    // Update meta description if available
    const descKey = document.querySelector('meta[name="i18n-description"]');
    if (descKey) {
      const descTranslation = this.getTranslation(descKey.content);
      if (descTranslation) {
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.content = descTranslation;
        }
      }
    }
  }

  getTranslation(key) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    
    return typeof value === 'string' ? value : null;
  }

  interpolate(value) {
    if (!value) return value;
    return value.replaceAll('{year}', String(new Date().getFullYear()));
  }

  setupLanguageToggle() {
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
      // Update button text
      const langText = langToggle.querySelector('.lang-text');
      if (langText) {
        langText.textContent = this.currentLang.toUpperCase();
      }

      // Add click handler
      langToggle.addEventListener('click', () => {
        this.toggleLanguage();
      });
    }
  }

  async toggleLanguage() {
    const newLang = this.currentLang === 'pt' ? 'en' : 'pt';
    await this.setLanguage(newLang);
  }

  async setLanguage(lang) {
    if (!['pt', 'en'].includes(lang)) {
      console.error('Unsupported language:', lang);
      return;
    }

    this.currentLang = lang;
    this.setStoredLanguage(lang);
    
    await this.loadTranslations();
    this.updatePageLanguage();
    this.translatePage();
    
    // Update language toggle button
    const langText = document.querySelector('#lang-toggle .lang-text');
    if (langText) {
      langText.textContent = lang.toUpperCase();
    }

    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);

    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChanged', {
      detail: { language: lang, translations: this.translations }
    }));
  }

  // Helper method to get translation with fallback
  t(key, fallback = '') {
    return this.getTranslation(key) || fallback;
  }

  // Format date according to current language
  formatDate(date, options = {}) {
    const locale = this.currentLang === 'pt' ? 'pt-BR' : 'en-US';
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  // Format number according to current language
  formatNumber(number, options = {}) {
    const locale = this.currentLang === 'pt' ? 'pt-BR' : 'en-US';
    return new Intl.NumberFormat(locale, options).format(number);
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLang;
  }

  // Check if current language is RTL (not applicable for pt/en, but good to have)
  isRTL() {
    return false; // Neither Portuguese nor English are RTL
  }
}

// Initialize i18n when DOM is loaded
let i18n;

document.addEventListener('DOMContentLoaded', () => {
  i18n = new I18n();
  window.i18n = i18n;
});
