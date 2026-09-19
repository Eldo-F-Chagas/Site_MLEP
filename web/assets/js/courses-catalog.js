/**
 * Courses Catalog JavaScript
 * Handles course listing, filtering, and search functionality
 */

class CoursesCatalog {
    constructor() {
        this.courses = [];
        this.filteredCourses = [];
        this.currentFilters = {
            level: 'all',
            tags: [],
            search: ''
        };
        
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadCourses();
        this.setupEventListeners();
        this.setupExternalDataLabLink();
        this.applyFilters();
        this.renderCourses();
        this.hideLoading();
    }

    showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    async loadCourses() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.courses = [];
            return;
        }
        try {
            const response = await fetchAuth('/api/courses/');
            if (!response) return; // Redirected to login

            if (response.ok) {
                this.courses = await response.json();
            } else {
                console.error('Failed to load courses');
                this.courses = [];
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            this.courses = [];
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.toLowerCase();
                    this.applyFilters();
                    this.renderCourses();
                }, 300);
            });
        }

        // Level filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
                tab.classList.add('filter-tab--active');
                
                // Apply filter
                this.currentFilters.level = tab.dataset.filter;
                this.applyFilters();
                this.renderCourses();
            });
        });

        // Tag filters
        const tagFilters = document.querySelectorAll('.tag-filter');
        tagFilters.forEach(tag => {
            tag.addEventListener('click', () => {
                const tagValue = tag.dataset.tag;
                
                if (this.currentFilters.tags.includes(tagValue)) {
                    // Remove tag
                    this.currentFilters.tags = this.currentFilters.tags.filter(t => t !== tagValue);
                    tag.classList.remove('tag-filter--active');
                } else {
                    // Add tag
                    this.currentFilters.tags.push(tagValue);
                    tag.classList.add('tag-filter--active');
                }
                
                this.applyFilters();
                this.renderCourses();
            });
        });
    }

    async setupExternalDataLabLink() {
        if (window.MLEP_STATIC_PREVIEW) {
            document.querySelectorAll('#external-datalab-link, #footer-datalab-link').forEach(link => {
                link.href = '/Site_MLEP/cursos.html';
            });
            return;
        }
        try {
            const response = await fetch('/api/courses/datalab');
            if (response.ok) {
                const dataLabInfo = await response.json();
                
                // Update external Data Lab links
                const externalLinks = document.querySelectorAll('#external-datalab-link, #footer-datalab-link');
                externalLinks.forEach(link => {
                    if (dataLabInfo.url) {
                        link.href = dataLabInfo.url;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';
                    }
                });
            }
        } catch (error) {
            console.error('Error loading Data Lab info:', error);
        }
    }

    applyFilters() {
        this.filteredCourses = this.courses.filter(course => {
            // Level filter
            if (this.currentFilters.level !== 'all' && course.level !== this.currentFilters.level) {
                return false;
            }

            // Tag filter
            if (this.currentFilters.tags.length > 0) {
                const courseTags = course.tags || [];
                const hasMatchingTag = this.currentFilters.tags.some(tag => 
                    courseTags.some(courseTag => courseTag.toLowerCase().includes(tag.toLowerCase()))
                );
                if (!hasMatchingTag) {
                    return false;
                }
            }

            // Search filter
            if (this.currentFilters.search) {
                const searchText = `${course.title} ${course.summary}`.toLowerCase();
                if (!searchText.includes(this.currentFilters.search)) {
                    return false;
                }
            }

            return true;
        });
    }

    renderCourses() {
        const courseGrid = document.getElementById('course-grid');
        const noResults = document.getElementById('no-results');

        if (!courseGrid) return;

        if (this.filteredCourses.length === 0) {
            courseGrid.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';

        courseGrid.innerHTML = window.MLEPSecurity.sanitize(this.filteredCourses.map(course => this.renderCourseCard(course)).join(''));
    }

    renderCourseCard(course) {
        const tags = course.tags || [];
        const levelText = this.getLevelText(course.level);
        const courseIcon = this.getCourseIcon(course.slug);
        
        return `
            <article class="course-card">
                <div class="course-card__image">
                    <div class="course-card__image-icon">${courseIcon}</div>
                    ${course.is_new ? '<div class="course-card__badge">Novo</div>' : ''}
                </div>
                
                <div class="course-card__content">
                    <header class="course-card__header">
                        <h3 class="course-card__title">${course.title}</h3>
                        <p class="course-card__summary">${course.summary}</p>
                    </header>
                    
                    <div class="course-card__meta">
                        <div class="course-card__meta-item">
                            <span>⏱️</span>
                            <span>${course.hours}h</span>
                        </div>
                        <div class="course-card__meta-item">
                            <span class="course-card__level course-card__level--${course.level}">
                                ${levelText}
                            </span>
                        </div>
                    </div>
                    
                    ${tags.length > 0 ? `
                        <div class="course-card__tags">
                            ${tags.slice(0, 3).map(tag => `
                                <span class="course-card__tag">${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="course-card__actions">
                        <a href="/cursos/${course.slug}" class="course-card__btn course-card__btn--primary">
                            Ver Curso
                        </a>
                        <a href="/cursos/${course.slug}#preview" class="course-card__btn course-card__btn--secondary">
                            Preview
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    getLevelText(level) {
        const levelMap = {
            'iniciante': 'Iniciante',
            'intermediario': 'Intermediário',
            'avancado': 'Avançado'
        };
        return levelMap[level] || level;
    }

    getCourseIcon(slug) {
        const iconMap = {
            'python-basico-ao-avancado': '🐍',
            'latex-para-data-science': '📄',
            'curvas-de-niveis': '🗺️'
        };
        return iconMap[slug] || '📚';
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 500); // Small delay for better UX
        }
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.coursesCatalog = new CoursesCatalog();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoursesCatalog;
}
