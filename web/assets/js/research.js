/**
 * Research Page JavaScript
 * Handles research area filtering and dynamic content loading
 */

class ResearchPage {
    constructor() {
        this.currentFilter = 'all';
        this.researchAreas = [];
        this.relatedProjects = [];
        
        this.init();
    }

    async init() {
        await this.loadResearchAreas();
        await this.loadRelatedProjects();
        this.setupEventListeners();
        this.renderResearchAreas();
        this.renderRelatedProjects();
    }

    async loadResearchAreas() {
        try {
            // Mock data for research areas
            this.researchAreas = [
                {
                    id: 1,
                    title: 'Modelagem Climática',
                    description: 'Aplicação de machine learning para melhorar modelos de previsão climática e compreender padrões de mudanças climáticas.',
                    icon: '🌍',
                    tags: ['Climate', 'Modeling', 'Prediction'],
                    projectCount: 5,
                    area: 'climate'
                },
                {
                    id: 2,
                    title: 'Qualidade do Ar',
                    description: 'Desenvolvimento de sistemas inteligentes para monitoramento e previsão da qualidade do ar urbano.',
                    icon: '🏭',
                    tags: ['Air Quality', 'Urban', 'Monitoring'],
                    projectCount: 3,
                    area: 'air-quality'
                },
                {
                    id: 3,
                    title: 'Recursos Hídricos',
                    description: 'Análise de dados hidrológicos usando técnicas de aprendizado de máquina para gestão sustentável da água.',
                    icon: '💧',
                    tags: ['Water', 'Hydrology', 'Sustainability'],
                    projectCount: 4,
                    area: 'water'
                },
                {
                    id: 4,
                    title: 'Biodiversidade',
                    description: 'Uso de IA para monitoramento de espécies e análise de padrões de biodiversidade.',
                    icon: '🦋',
                    tags: ['Biodiversity', 'Species', 'Conservation'],
                    projectCount: 2,
                    area: 'biodiversity'
                },
                {
                    id: 5,
                    title: 'Energia Renovável',
                    description: 'Otimização de sistemas de energia renovável através de algoritmos de machine learning.',
                    icon: '⚡',
                    tags: ['Renewable Energy', 'Optimization', 'Solar'],
                    projectCount: 3,
                    area: 'energy'
                },
                {
                    id: 6,
                    title: 'Sensoriamento Remoto',
                    description: 'Processamento de imagens de satélite e dados de sensoriamento remoto para análise ambiental.',
                    icon: '🛰️',
                    tags: ['Remote Sensing', 'Satellite', 'Image Processing'],
                    projectCount: 6,
                    area: 'remote-sensing'
                }
            ];
        } catch (error) {
            console.error('Error loading research areas:', error);
            this.showError('Erro ao carregar áreas de pesquisa');
        }
    }

    async loadRelatedProjects() {
        try {
            // Mock data for related projects
            this.relatedProjects = [
                {
                    id: 1,
                    title: 'ML-Climate: Previsão Climática Avançada',
                    description: 'Desenvolvimento de modelos de machine learning para previsão climática de longo prazo.',
                    status: 'ongoing',
                    area: 'climate'
                },
                {
                    id: 2,
                    title: 'AirSense: Monitoramento Inteligente do Ar',
                    description: 'Sistema de IoT com IA para monitoramento em tempo real da qualidade do ar.',
                    status: 'completed',
                    area: 'air-quality'
                },
                {
                    id: 3,
                    title: 'HydroML: Gestão Inteligente de Recursos Hídricos',
                    description: 'Plataforma de análise preditiva para gestão sustentável de recursos hídricos.',
                    status: 'ongoing',
                    area: 'water'
                }
            ];
        } catch (error) {
            console.error('Error loading related projects:', error);
        }
    }

    setupEventListeners() {
        // Filter dropdown
        const filterSelect = document.getElementById('area-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.renderResearchAreas();
            });
        }

        // Research area cards click events
        document.addEventListener('click', (e) => {
            const researchArea = e.target.closest('.research-area');
            if (researchArea) {
                const areaId = researchArea.dataset.areaId;
                this.showAreaDetails(areaId);
            }
        });
    }

    renderResearchAreas() {
        const container = document.getElementById('research-areas');
        if (!container) return;

        const filteredAreas = this.currentFilter === 'all' 
            ? this.researchAreas 
            : this.researchAreas.filter(area => area.area === this.currentFilter);

        if (filteredAreas.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="no-results__icon">🔬</div>
                    <h3 class="no-results__title">Nenhuma área encontrada</h3>
                    <p class="no-results__message">
                        Tente ajustar os filtros para encontrar áreas de pesquisa.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredAreas.map(area => `
            <div class="research-area" data-area-id="${area.id}">
                <div class="research-area__icon">${area.icon}</div>
                <h3 class="research-area__title">${area.title}</h3>
                <p class="research-area__description">${area.description}</p>
                <div class="research-area__tags">
                    ${area.tags.map(tag => `<span class="research-area__tag">${tag}</span>`).join('')}
                </div>
                <div class="research-area__footer">
                    <span class="research-area__projects">${area.projectCount} projetos</span>
                    <a href="/projects?area=${area.area}" class="research-area__link">Ver projetos</a>
                </div>
            </div>
        `).join('');

        // Add animation
        this.animateCards('.research-area');
    }

    renderRelatedProjects() {
        const container = document.getElementById('related-projects');
        if (!container) return;

        container.innerHTML = this.relatedProjects.map(project => `
            <div class="project-card">
                <h4 class="project-card__title">${project.title}</h4>
                <p class="project-card__description">${project.description}</p>
                <span class="project-card__status project-card__status--${project.status}">
                    ${project.status === 'ongoing' ? 'Em andamento' : 'Concluído'}
                </span>
            </div>
        `).join('');

        // Add animation
        this.animateCards('.project-card');
    }

    showAreaDetails(areaId) {
        const area = this.researchAreas.find(a => a.id == areaId);
        if (!area) return;

        // Create modal or navigate to detailed page
        // For now, just navigate to projects page with filter
        window.location.href = `/projects?area=${area.area}`;
    }

    animateCards(selector) {
        const cards = document.querySelectorAll(selector);
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    showError(message) {
        const container = document.getElementById('research-areas');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <div class="error-message__icon">⚠️</div>
                    <h3 class="error-message__title">Erro</h3>
                    <p class="error-message__text">${message}</p>
                    <button class="btn btn--primary" onclick="location.reload()">Tentar novamente</button>
                </div>
            `;
        }
    }

    // Public methods for external access
    filterByArea(area) {
        this.currentFilter = area;
        this.renderResearchAreas();
        
        const filterSelect = document.getElementById('area-filter');
        if (filterSelect) {
            filterSelect.value = area;
        }
    }

    getAreaBySlug(slug) {
        return this.researchAreas.find(area => area.area === slug);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.researchPage = new ResearchPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResearchPage;
}
