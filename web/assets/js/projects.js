/**
 * Projects Page JavaScript
 * Handles project filtering, search, and statistics
 */

class ProjectsPage {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 9;
        this.currentFilters = {
            query: '',
            status: '',
            area: '',
            featured: false
        };
        
        this.init();
    }

    async init() {
        await this.loadProjects();
        await this.loadStatistics();
        this.setupEventListeners();
        this.applyFilters();
        this.renderProjects();
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                this.projects = await response.json();
            } else {
                throw new Error('Failed to load projects');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            // Use mock data as fallback
            this.projects = this.getMockProjects();
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/projects/stats');
            if (response.ok) {
                const stats = await response.json();
                this.renderStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            // Use mock stats
            this.renderStatistics({
                total: this.projects.length,
                ongoing: this.projects.filter(p => p.status === 'ongoing').length,
                completed: this.projects.filter(p => p.status === 'completed').length,
                featured: this.projects.filter(p => p.is_featured).length
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
                    this.renderProjects();
                }, 300);
            });
        }

        // Filter controls
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderProjects();
            });
        }

        const areaFilter = document.getElementById('area-filter');
        if (areaFilter) {
            areaFilter.addEventListener('change', (e) => {
                this.currentFilters.area = e.target.value;
                this.currentPage = 1;
                this.applyFilters();
                this.renderProjects();
            });
        }

        const featuredFilter = document.getElementById('featured-filter');
        if (featuredFilter) {
            featuredFilter.addEventListener('change', (e) => {
                this.currentFilters.featured = e.target.checked;
                this.currentPage = 1;
                this.applyFilters();
                this.renderProjects();
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
    }

    applyFilters() {
        this.filteredProjects = this.projects.filter(project => {
            // Text search
            if (this.currentFilters.query) {
                const query = this.currentFilters.query.toLowerCase();
                const searchText = `${project.title} ${project.description} ${project.team_members.join(' ')}`.toLowerCase();
                if (!searchText.includes(query)) return false;
            }

            // Status filter
            if (this.currentFilters.status && project.status !== this.currentFilters.status) {
                return false;
            }

            // Area filter
            if (this.currentFilters.area && !project.research_areas.includes(this.currentFilters.area)) {
                return false;
            }

            // Featured filter
            if (this.currentFilters.featured && !project.is_featured) {
                return false;
            }

            return true;
        });

        // Sort by featured status and start date
        this.filteredProjects.sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return new Date(b.start_date) - new Date(a.start_date);
        });
    }

    renderProjects() {
        const container = document.getElementById('projects-grid');
        const loadMoreContainer = document.getElementById('load-more-container');
        const noResults = document.getElementById('no-results');

        if (!container) return;

        if (this.filteredProjects.length === 0) {
            container.innerHTML = '';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';

        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const projectsToShow = this.filteredProjects.slice(startIndex, endIndex);

        container.innerHTML = projectsToShow.map(project => this.renderProjectCard(project)).join('');

        // Show/hide load more button
        if (loadMoreContainer) {
            if (endIndex < this.filteredProjects.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }

        // Update results count
        this.updateResultsCount();
    }

    renderProjectCard(project) {
        const featuredClass = project.is_featured ? 'project-card--featured' : '';
        const statusClass = `project-status--${project.status}`;
        const statusText = this.getStatusText(project.status);
        
        return `
            <article class="project-card ${featuredClass}">
                <header class="project-header">
                    <h3 class="project-title">${project.title}</h3>
                    <span class="project-status ${statusClass}">${statusText}</span>
                </header>
                
                <div class="project-description">
                    ${project.description}
                </div>
                
                <div class="project-meta">
                    <div class="project-meta-item">
                        <span class="project-meta-label">Início</span>
                        <span class="project-meta-value">${this.formatDate(project.start_date)}</span>
                    </div>
                    <div class="project-meta-item">
                        <span class="project-meta-label">Financiamento</span>
                        <span class="project-meta-value">${project.funding_agency || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="project-areas">
                    ${project.research_areas.map(area => `<span class="project-area">${area}</span>`).join('')}
                </div>
                
                <div class="project-team">
                    <div class="project-team-label">Equipe</div>
                    <div class="project-team-members">${project.team_members.join(', ')}</div>
                </div>
                
                <footer class="project-actions">
                    ${project.dataset_url ? `<a href="${project.dataset_url}" class="project-link" target="_blank" rel="noopener">
                        <span>📊</span> Dataset
                    </a>` : ''}
                    ${project.repository_url ? `<a href="${project.repository_url}" class="project-link project-link--secondary" target="_blank" rel="noopener">
                        <span>💻</span> Código
                    </a>` : ''}
                    ${project.results_url ? `<a href="${project.results_url}" class="project-link project-link--secondary" target="_blank" rel="noopener">
                        <span>📈</span> Resultados
                    </a>` : ''}
                </footer>
            </article>
        `;
    }

    renderStatistics(stats) {
        const statsContainer = document.getElementById('stats-grid');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-item__number">${stats.total}</span>
                <span class="stat-item__label">Total de Projetos</span>
            </div>
            <div class="stat-item stat-item--ongoing">
                <span class="stat-item__number">${stats.ongoing}</span>
                <span class="stat-item__label">Em Andamento</span>
            </div>
            <div class="stat-item stat-item--completed">
                <span class="stat-item__number">${stats.completed}</span>
                <span class="stat-item__label">Concluídos</span>
            </div>
            <div class="stat-item stat-item--featured">
                <span class="stat-item__number">${stats.featured}</span>
                <span class="stat-item__label">Em Destaque</span>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'ongoing': 'Em Andamento',
            'completed': 'Concluído',
            'planned': 'Planejado',
            'paused': 'Pausado'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { 
            year: 'numeric', 
            month: 'short' 
        });
    }

    updateResultsCount() {
        const countElement = document.getElementById('results-count');
        if (countElement) {
            const showing = Math.min(this.currentPage * this.itemsPerPage, this.filteredProjects.length);
            countElement.textContent = `Mostrando ${showing} de ${this.filteredProjects.length} projetos`;
        }
    }

    loadMore() {
        this.currentPage++;
        this.renderProjects();
    }

    clearFilters() {
        this.currentFilters = {
            query: '',
            status: '',
            area: '',
            featured: false
        };
        this.currentPage = 1;

        // Reset form controls
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';

        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) statusFilter.value = '';

        const areaFilter = document.getElementById('area-filter');
        if (areaFilter) areaFilter.value = '';

        const featuredFilter = document.getElementById('featured-filter');
        if (featuredFilter) featuredFilter.checked = false;

        this.applyFilters();
        this.renderProjects();
    }

    getMockProjects() {
        return [
            {
                id: 1,
                title: "ML-Climate: Previsão Climática Avançada",
                description: "Desenvolvimento de modelos de machine learning para previsão climática de longo prazo usando dados de múltiplas fontes.",
                status: "ongoing",
                start_date: "2023-01-15",
                end_date: null,
                funding_agency: "CNPq",
                funding_amount: 150000,
                team_members: ["Dr. Silva", "Dra. Santos", "João Aluno"],
                research_areas: ["Climate", "Machine Learning"],
                dataset_url: "/datasets/climate-data",
                repository_url: "https://github.com/mlep/ml-climate",
                results_url: "/results/ml-climate",
                is_featured: true
            },
            {
                id: 2,
                title: "AirSense: Monitoramento Inteligente do Ar",
                description: "Sistema de IoT com IA para monitoramento em tempo real da qualidade do ar urbano.",
                status: "completed",
                start_date: "2022-03-01",
                end_date: "2023-12-31",
                funding_agency: "FAPESP",
                funding_amount: 200000,
                team_members: ["Dra. Costa", "Dr. Lima", "Maria Aluna"],
                research_areas: ["Air Quality", "IoT"],
                dataset_url: "/datasets/air-quality",
                repository_url: "https://github.com/mlep/airsense",
                results_url: "/results/airsense",
                is_featured: false
            }
        ];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.projectsPage = new ProjectsPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectsPage;
}
