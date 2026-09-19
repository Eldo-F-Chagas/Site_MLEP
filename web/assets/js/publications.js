/**
 * Publications Page JavaScript
 * Handles search, filtering, and pagination for publications
 */

class PublicationsPage {
    constructor() {
        this.publications = [];
        this.filteredPublications = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilters = {
            query: '',
            year: '',
            area: '',
            featured: false
        };
        
        this.init();
    }

    async init() {
        await this.loadPublications();
        await this.loadStatistics();
        this.setupEventListeners();
        this.applyFilters();
        this.renderPublications();
    }

    async loadPublications() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.publications = [];
            return;
        }
        try {
            const response = await fetch('/api/publications');
            if (response.ok) {
                this.publications = await response.json();
            } else {
                throw new Error('Failed to load publications');
            }
        } catch (error) {
            console.error('Error loading publications:', error);
            this.publications = [];
        }
    }

    async loadStatistics() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.renderStatistics({ total: 0, thisYear: 0, featured: 0, journals: 0 });
            return;
        }
        try {
            const response = await fetch('/api/publications/stats');
            if (response.ok) {
                const stats = await response.json();
                this.renderStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            // Use mock stats
            this.renderStatistics({
                total: this.publications.length,
                thisYear: this.publications.filter(p => new Date(p.year, 0).getFullYear() === new Date().getFullYear()).length,
                featured: this.publications.filter(p => p.is_featured).length,
                journals: new Set(this.publications.map(p => p.journal)).size
            });
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
                    this.currentFilters.query = e.target.value;
                    this.currentPage = 1;
                    this.applyFilters();
                    this.renderPublications();
                }, 300);
            });
        }

        // Filter controls
        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.currentFilters.year = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderPublications();
            });
        }

        const areaFilter = document.getElementById('area-filter');
        if (areaFilter) {
            areaFilter.addEventListener('change', (e) => {
                this.currentFilters.area = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderPublications();
            });
        }

        const featuredFilter = document.getElementById('featured-filter');
        if (featuredFilter) {
            featuredFilter.addEventListener('change', (e) => {
                this.currentFilters.featured = e.target.checked;
                this.currentPage = 1;
                this.applyFilters();
                this.renderPublications();
            });
        }

        // Clear filters
        const clearFilters = document.getElementById('clear-filters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }

        document.getElementById('publications-list')?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-share-publication]');
            if (!button) return;
            const publication = this.publications.find(item => Number(item.id) === Number(button.dataset.sharePublication));
            if (publication) this.sharePublication(publication.title);
        });
    }

    applyFilters() {
        this.filteredPublications = this.publications.filter(publication => {
            // Text search
            if (this.currentFilters.query) {
                const query = this.currentFilters.query.toLowerCase();
                const searchText = `${publication.title} ${publication.authors.join(' ')} ${publication.abstract}`.toLowerCase();
                if (!searchText.includes(query)) return false;
            }

            // Year filter
            if (this.currentFilters.year && publication.year != this.currentFilters.year) {
                return false;
            }

            // Area filter
            if (this.currentFilters.area && publication.research_area !== this.currentFilters.area) {
                return false;
            }

            // Featured filter
            if (this.currentFilters.featured && !publication.is_featured) {
                return false;
            }

            return true;
        });

        // Sort by year (newest first) and featured status
        this.filteredPublications.sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return b.year - a.year;
        });
    }

    renderPublications() {
        const container = document.getElementById('publications-list');
        const loadMoreContainer = document.getElementById('load-more-container');
        const noResults = document.getElementById('no-results');

        if (!container) return;

        if (this.filteredPublications.length === 0) {
            container.innerHTML = '';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';

        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const publicationsToShow = this.filteredPublications.slice(startIndex, endIndex);

        container.innerHTML = window.MLEPSecurity.sanitize(publicationsToShow.map(publication => this.renderPublicationItem(publication)).join(''));

        // Show/hide load more button
        if (loadMoreContainer) {
            if (endIndex < this.filteredPublications.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        // Update results count
        this.updateResultsCount();
    }

    renderPublicationItem(publication) {
        const featuredClass = publication.is_featured ? 'publication-item--featured' : '';
        
        return `
            <article class="publication-item ${featuredClass}">
                <header class="publication-header">
                    <h3 class="publication-title">${publication.title}</h3>
                    <p class="publication-authors">${publication.authors.join(', ')}</p>
                    <div class="publication-journal">
                        <span>${publication.journal}</span>
                        <span class="publication-year">${publication.year}</span>
                    </div>
                </header>
                
                <div class="publication-abstract">
                    ${publication.abstract}
                </div>
                
                <div class="publication-tags">
                    ${publication.tags.map(tag => `<span class="publication-tag">${tag}</span>`).join('')}
                </div>
                
                <footer class="publication-actions">
                    ${publication.doi ? `<a href="https://doi.org/${publication.doi}" class="publication-link" target="_blank" rel="noopener">
                        <span>📄</span> DOI
                    </a>` : ''}
                    ${publication.pdf_url ? `<a href="${publication.pdf_url}" class="publication-link publication-link--secondary" target="_blank" rel="noopener">
                        <span>📁</span> PDF
                    </a>` : ''}
                    <button class="publication-link publication-link--secondary" data-share-publication="${Number(publication.id)}">
                        <span>🔗</span> Compartilhar
                    </button>
                </footer>
            </article>
        `;
    }

    renderStatistics(stats) {
        const statsContainer = document.getElementById('publications-stats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <span class="stat-card__number">${stats.total}</span>
                <span class="stat-card__label">Total de Publicações</span>
            </div>
            <div class="stat-card">
                <span class="stat-card__number">${stats.thisYear}</span>
                <span class="stat-card__label">Publicações em ${new Date().getFullYear()}</span>
            </div>
            <div class="stat-card">
                <span class="stat-card__number">${stats.featured}</span>
                <span class="stat-card__label">Publicações em Destaque</span>
            </div>
            <div class="stat-card">
                <span class="stat-card__number">${stats.journals}</span>
                <span class="stat-card__label">Periódicos Diferentes</span>
            </div>
        `;
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            const showing = Math.min(this.currentPage * this.itemsPerPage, this.filteredPublications.length);
            countElement.textContent = `Mostrando ${showing} de ${this.filteredPublications.length} publicações`;
        }
    }

    loadMore() {
        this.currentPage++;
        this.renderPublications();
    }

    clearFilters() {
        this.currentFilters = {
            query: '',
            year: '',
            area: '',
            featured: false
        };
        this.currentPage = 1;

        // Reset form controls
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        const yearFilter = document.getElementById('year-filter');
        if (yearFilter) yearFilter.value = '';

        const areaFilter = document.getElementById('area-filter');
        if (areaFilter) areaFilter.value = '';

        const featuredFilter = document.getElementById('featured-filter');
        if (featuredFilter) featuredFilter.checked = false;

        this.applyFilters();
        this.renderPublications();
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.publicationsPage = new PublicationsPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublicationsPage;
}
