/**
 * Resources Page JavaScript
 * Handles resource filtering, search, and visualizations
 */

class ResourcesPage {
    constructor() {
        this.resources = [];
        this.filteredResources = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.searchQuery = '';
        this.charts = {};
        
        this.init();
    }

    async init() {
        await this.loadResources();
        await this.loadCategoryCounts();
        this.setupEventListeners();
        this.initializeCharts();
        this.applyFilters();
        this.renderResources();
    }

    async loadResources() {
        this.resources = [];
    }

    async loadCategoryCounts() {
        const counts = {
            datasets: this.resources.filter(r => r.type === 'dataset').length,
            tools: this.resources.filter(r => r.type === 'tool').length,
            notebooks: this.resources.filter(r => r.type === 'notebook').length,
            visualizations: this.resources.filter(r => r.type === 'visualization').length
        };

        this.updateCategoryCounts(counts);
    }

    setupEventListeners() {
        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active tab
                filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
                tab.classList.add('filter-tab--active');
                
                // Apply filter
                this.currentFilter = tab.dataset.filter;
                this.currentPage = 1;
                this.applyFilters();
                this.renderResources();
            });
        });

        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchQuery = e.target.value;
                    this.currentPage = 1;
                    this.applyFilters();
                    this.renderResources();
                }, 300);
            });
        }

        // Category cards
        const categoryCards = document.querySelectorAll('.category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }

        // Data Lab CTA
        const datalabCta = document.getElementById('datalab-cta');
        if (datalabCta) {
            datalabCta.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.loadDataLabUrl();
            });
        }
    }

    async loadDataLabUrl() {
        if (window.MLEP_STATIC_PREVIEW) {
            window.location.href = '/Site_MLEP/cursos.html';
            return;
        }
        try {
            const response = await fetch('/api/courses/datalab');
            if (response.ok) {
                const data = await response.json();
                if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    alert('Link do Data Lab não disponível no momento.');
                }
            }
        } catch (error) {
            console.error('Error loading Data Lab URL:', error);
            alert('Erro ao carregar link do Data Lab.');
        }
    }

    initializeCharts() {
        this.initGroupStatsChart();
        this.initPublicationsChart();
        this.initResearchAreasChart();
        this.initProjectsStatusChart();
    }

    initGroupStatsChart() {
        const ctx = document.getElementById('group-stats-chart');
        if (!ctx) return;

        this.charts.groupStats = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pesquisadores', 'Estudantes', 'Colaboradores', 'Ex-membros'],
                datasets: [{
                    data: [8, 15, 5, 12],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initPublicationsChart() {
        const ctx = document.getElementById('publications-chart');
        if (!ctx) return;

        this.charts.publications = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['2020', '2021', '2022', '2023', '2024'],
                datasets: [{
                    label: 'Publicações',
                    data: [3, 5, 8, 12, 15],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initResearchAreasChart() {
        const ctx = document.getElementById('research-areas-chart');
        if (!ctx) return;

        this.charts.researchAreas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Clima', 'Ar', 'Água', 'Biodiversidade', 'Energia'],
                datasets: [{
                    label: 'Projetos',
                    data: [6, 4, 5, 3, 4],
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    initProjectsStatusChart() {
        const ctx = document.getElementById('projects-status-chart');
        if (!ctx) return;

        this.charts.projectsStatus = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Em Andamento', 'Concluídos', 'Planejados'],
                datasets: [{
                    data: [8, 12, 3],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    applyFilters() {
        this.filteredResources = this.resources.filter(resource => {
            // Type filter
            if (this.currentFilter !== 'all' && resource.type !== this.currentFilter) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                const searchText = `${resource.title} ${resource.description} ${resource.tags.join(' ')}`.toLowerCase();
                if (!searchText.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        // Sort by featured status and date
        this.filteredResources.sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return new Date(b.created_date) - new Date(a.created_date);
        });
    }

    renderResources() {
        const featuredContainer = document.getElementById('featured-resources');
        const resourcesContainer = document.getElementById('resources-grid');
        const loadMoreContainer = document.getElementById('load-more-container');
        const noResults = document.getElementById('no-results');

        if (!resourcesContainer) return;

        if (this.filteredResources.length === 0) {
            if (featuredContainer) featuredContainer.innerHTML = '';
            resourcesContainer.innerHTML = '';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';

        // Render featured resources
        const featuredResources = this.filteredResources.filter(r => r.is_featured).slice(0, 3);
        if (featuredContainer && featuredResources.length > 0) {
            featuredContainer.innerHTML = window.MLEPSecurity.sanitize(featuredResources.map(resource => this.renderFeaturedResource(resource)).join(''));
        }

        // Render regular resources
        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const resourcesToShow = this.filteredResources.slice(startIndex, endIndex);

        resourcesContainer.innerHTML = window.MLEPSecurity.sanitize(resourcesToShow.map(resource => this.renderResourceItem(resource)).join(''));

        // Show/hide load more button
        if (loadMoreContainer) {
            if (endIndex < this.filteredResources.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    }

    renderFeaturedResource(resource) {
        return `
            <article class="featured-resource">
                <div class="resource-content">
                    <span class="resource-type resource-type--${resource.type}">${this.getTypeText(resource.type)}</span>
                    <h3 class="resource-title">${resource.title}</h3>
                    <p class="resource-description">${resource.description}</p>
                    <div class="resource-actions">
                        <a href="${resource.download_url}" class="resource-link" target="_blank" rel="noopener">
                            Acessar
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    renderResourceItem(resource) {
        return `
            <article class="resource-item">
                <span class="resource-type resource-type--${resource.type}">${this.getTypeText(resource.type)}</span>
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-description">${resource.description}</p>
                
                <div class="resource-meta">
                    <div class="resource-meta-item">
                        <span class="resource-meta-label">Formato</span>
                        <span class="resource-meta-value">${resource.format}</span>
                    </div>
                    <div class="resource-meta-item">
                        <span class="resource-meta-label">Tamanho</span>
                        <span class="resource-meta-value">${resource.size}</span>
                    </div>
                </div>
                
                <div class="resource-tags">
                    ${resource.tags.map(tag => `<span class="resource-tag">${tag}</span>`).join('')}
                </div>
                
                <footer class="resource-actions">
                    <a href="${resource.download_url}" class="resource-link" target="_blank" rel="noopener">
                        <span>📥</span> Download
                    </a>
                    ${resource.documentation_url ? `
                        <a href="${resource.documentation_url}" class="resource-link resource-link--secondary" target="_blank" rel="noopener">
                            <span>📖</span> Docs
                        </a>
                    ` : ''}
                </footer>
            </article>
        `;
    }

    updateCategoryCounts(counts) {
        const elements = {
            'datasets-count': `${counts.datasets} datasets`,
            'tools-count': `${counts.tools} ferramentas`,
            'notebooks-count': `${counts.notebooks} notebooks`,
            'viz-count': `${counts.visualizations} visualizações`
        };

        Object.entries(elements).forEach(([id, text]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = text;
        });
    }

    getTypeText(type) {
        const typeMap = {
            'dataset': 'Dataset',
            'tool': 'Ferramenta',
            'notebook': 'Notebook',
            'visualization': 'Visualização'
        };
        return typeMap[type] || type;
    }

    filterByCategory(category) {
        this.currentFilter = category;
        this.currentPage = 1;
        
        // Update active tab
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.classList.toggle('filter-tab--active', tab.dataset.filter === category);
        });
        
        this.applyFilters();
        this.renderResources();
    }

    loadMore() {
        this.currentPage++;
        this.renderResources();
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.resourcesPage = new ResourcesPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourcesPage;
}
