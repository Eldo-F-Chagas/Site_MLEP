/**
 * Course Page JavaScript
 * Handles individual course page functionality
 */

class CoursePage {
    constructor() {
        this.courseSlug = this.getCourseSlugFromURL();
        this.course = null;
        this.currentTab = 'overview';
        this.progress = 0;
        
        this.init();
    }

    async init() {
        if (!this.courseSlug) {
            this.redirectToCatalog();
            return;
        }

        await this.loadCourse();
        this.setupEventListeners();
        this.setupTabs();
        this.loadProgress();
        this.updatePageMeta();
    }

    getCourseSlugFromURL() {
        const path = window.location.pathname;
        const match = path.match(/\/cursos\/([^\/]+)/);
        return match ? match[1] : null;
    }

    async loadCourse() {
        try {
            const response = await fetchAuth(`/api/courses/${this.courseSlug}`);
            if (!response) return; // Redirected to login

            if (response.ok) {
                this.course = await response.json();
                this.renderCourse();
            } else if (response.status === 404) {
                this.showNotFound();
            } else {
                console.error('Failed to load course');
                this.course = this.getMockCourse();
                this.renderCourse();
            }
        } catch (error) {
            console.error('Error loading course:', error);
            this.course = this.getMockCourse();
            this.renderCourse();
        }
    }

    renderCourse() {
        if (!this.course) return;

        // Update page title and meta
        document.getElementById('page-title').textContent = `${this.course.title} | MLEP Data Lab`;
        document.getElementById('page-description').content = this.course.summary;
        
        // Update breadcrumb
        document.getElementById('breadcrumb-course').textContent = this.course.title;
        
        // Update course header
        document.getElementById('course-level').textContent = this.getLevelText(this.course.level);
        document.getElementById('course-level').className = `course-header__badge course-header__badge--${this.course.level}`;
        document.getElementById('course-title').textContent = this.course.title;
        document.getElementById('course-summary').textContent = this.course.summary;
        document.getElementById('course-hours').textContent = `${this.course.hours}h`;
        document.getElementById('course-lessons').textContent = `${this.course.lesson_count || 0} aulas`;
        document.getElementById('course-materials').textContent = `${this.course.material_count || 0} materiais`;
        
        // Update tags
        this.renderTags();
        
        // Update overview content
        document.getElementById('course-description').innerHTML = this.course.description || this.course.summary;
        document.getElementById('modules-count').textContent = this.course.modules?.length || 0;
        document.getElementById('lessons-count').textContent = this.course.lesson_count || 0;
        document.getElementById('materials-count').textContent = this.course.material_count || 0;
        
        // Load modules and lessons
        this.renderModules();
        
        // Load forum topics
        this.loadForumTopics();
        
        // Load materials
        this.loadMaterials();
        
        // Update schema.org
        this.updateSchema();
    }

    renderTags() {
        const tagsContainer = document.getElementById('course-tags');
        if (!this.course.tags || this.course.tags.length === 0) {
            tagsContainer.innerHTML = '';
            return;
        }

        tagsContainer.innerHTML = this.course.tags.map(tag => 
            `<span class="course-header__tag">${tag}</span>`
        ).join('');
    }

    renderModules() {
        const modulesContainer = document.getElementById('course-modules');
        if (!this.course.modules || this.course.modules.length === 0) {
            modulesContainer.innerHTML = '<p>Nenhum módulo disponível ainda.</p>';
            return;
        }

        modulesContainer.innerHTML = this.course.modules.map(module => `
            <div class="course-module">
                <div class="module-header">
                    <h3 class="module-title">${module.title}</h3>
                    <p class="module-description">${module.description || ''}</p>
                </div>
                <div class="module-lessons">
                    ${module.lessons?.map(lesson => `
                        <div class="lesson-item">
                            <div class="lesson-info">
                                <h4 class="lesson-title">${lesson.title}</h4>
                                <div class="lesson-meta">
                                    <span class="lesson-duration">${this.formatDuration(lesson.video_duration)}</span>
                                    ${lesson.is_free ? '<span class="lesson-badge lesson-badge--free">Gratuito</span>' : ''}
                                </div>
                            </div>
                            <div class="lesson-actions">
                                <a href="/cursos/${this.courseSlug}/aulas/${lesson.slug}" class="btn btn--small btn--primary">
                                    Assistir
                                </a>
                            </div>
                        </div>
                    `).join('') || '<p>Nenhuma aula disponível.</p>'}
                </div>
            </div>
        `).join('');
    }

    async loadForumTopics() {
        try {
            const response = await fetch(`/api/courses/${this.courseSlug}/forum`);
            if (response.ok) {
                const topics = await response.json();
                this.renderForumTopics(topics);
            } else {
                this.renderForumTopics([]);
            }
        } catch (error) {
            console.error('Error loading forum topics:', error);
            this.renderForumTopics([]);
        }
    }

    renderForumTopics(topics) {
        const forumContainer = document.getElementById('forum-topics');
        
        if (topics.length === 0) {
            forumContainer.innerHTML = `
                <div class="forum-empty">
                    <p>Nenhum tópico no fórum ainda. Seja o primeiro a iniciar uma discussão!</p>
                </div>
            `;
            return;
        }

        forumContainer.innerHTML = topics.map(topic => `
            <div class="forum-topic">
                <div class="topic-info">
                    <h4 class="topic-title">
                        <a href="/cursos/${this.courseSlug}/forum/${topic.id}">${topic.title}</a>
                    </h4>
                    <div class="topic-meta">
                        <span class="topic-author">Por ${topic.author}</span>
                        <span class="topic-date">${this.formatDate(topic.created_at)}</span>
                        <span class="topic-replies">${topic.post_count || 0} respostas</span>
                    </div>
                </div>
                ${topic.is_pinned ? '<span class="topic-badge topic-badge--pinned">Fixado</span>' : ''}
            </div>
        `).join('');
    }

    async loadMaterials() {
        try {
            const response = await fetch(`/api/courses/${this.courseSlug}/materials`);
            if (response.ok) {
                const materials = await response.json();
                this.renderMaterials(materials);
            } else {
                this.renderMaterials([]);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            this.renderMaterials([]);
        }
    }

    renderMaterials(materials) {
        const materialsContainer = document.getElementById('materials-list');
        
        if (materials.length === 0) {
            materialsContainer.innerHTML = `
                <div class="materials-empty">
                    <p>Nenhum material disponível ainda.</p>
                </div>
            `;
            return;
        }

        materialsContainer.innerHTML = materials.map(material => `
            <div class="material-item">
                <div class="material-info">
                    <div class="material-icon">${this.getMaterialIcon(material.file_type)}</div>
                    <div class="material-details">
                        <h4 class="material-title">${material.original_filename}</h4>
                        <div class="material-meta">
                            <span class="material-type">${material.file_type.toUpperCase()}</span>
                            <span class="material-size">${this.formatFileSize(material.file_size_bytes)}</span>
                            <span class="material-downloads">${material.download_count} downloads</span>
                        </div>
                        ${material.description ? `<p class="material-description">${material.description}</p>` : ''}
                    </div>
                </div>
                <div class="material-actions">
                    <a href="${material.file_url}" class="btn btn--small btn--secondary" 
                       onclick="this.trackDownload(${material.id})" download>
                        Download
                    </a>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });

        // Start course button
        const startBtn = document.getElementById('start-course-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.startCourse();
            });
        }

        // Preview button
        const previewBtn = document.getElementById('preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => {
                this.showPreview();
            });
        }

        // New topic button
        const newTopicBtn = document.getElementById('new-topic-btn');
        if (newTopicBtn) {
            newTopicBtn.addEventListener('click', () => {
                this.showNewTopicForm();
            });
        }
    }

    setupTabs() {
        // Handle tab switching from URL hash
        const hash = window.location.hash.substring(1);
        if (hash && ['overview', 'lessons', 'forum', 'materials'].includes(hash)) {
            this.switchTab(hash);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('tab--active');
            tab.setAttribute('aria-selected', 'false');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('tab--active');
        document.querySelector(`[data-tab="${tabName}"]`).setAttribute('aria-selected', 'true');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('tab-content--active');
        });
        
        document.getElementById(`${tabName}-content`).classList.add('tab-content--active');
        
        // Update URL hash
        window.history.replaceState(null, null, `#${tabName}`);
        
        this.currentTab = tabName;
    }

    loadProgress() {
        // Load progress from localStorage
        const savedProgress = localStorage.getItem(`course_progress_${this.courseSlug}`);
        this.progress = savedProgress ? parseInt(savedProgress) : 0;
        this.updateProgressDisplay();
    }

    updateProgressDisplay() {
        document.getElementById('progress-fill').style.width = `${this.progress}%`;
        document.getElementById('progress-text').textContent = `${this.progress}% concluído`;
    }

    startCourse() {
        if (this.course && this.course.modules && this.course.modules.length > 0) {
            const firstModule = this.course.modules[0];
            if (firstModule.lessons && firstModule.lessons.length > 0) {
                const firstLesson = firstModule.lessons[0];
                window.location.href = `/cursos/${this.courseSlug}/aulas/${firstLesson.slug}`;
            }
        }
    }

    showPreview() {
        // Find first free lesson
        if (this.course && this.course.modules) {
            for (const module of this.course.modules) {
                if (module.lessons) {
                    const freeLesson = module.lessons.find(lesson => lesson.is_free);
                    if (freeLesson) {
                        window.location.href = `/cursos/${this.courseSlug}/aulas/${freeLesson.slug}`;
                        return;
                    }
                }
            }
        }
        
        // If no free lesson found, show first lesson
        this.startCourse();
    }

    showNewTopicForm() {
        // This would open a modal or redirect to a form page
        alert('Funcionalidade de criar tópico será implementada em breve!');
    }

    // Utility methods
    getLevelText(level) {
        const levelMap = {
            'iniciante': 'Iniciante',
            'intermediario': 'Intermediário',
            'avancado': 'Avançado'
        };
        return levelMap[level] || level;
    }

    formatDuration(seconds) {
        if (!seconds) return '0min';
        const minutes = Math.floor(seconds / 60);
        return `${minutes}min`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    getMaterialIcon(fileType) {
        const iconMap = {
            'pdf': '📄',
            'ipynb': '📓',
            'csv': '📊',
            'zip': '📦',
            'mp4': '🎥',
            'png': '🖼️',
            'jpg': '🖼️'
        };
        return iconMap[fileType] || '📄';
    }

    updatePageMeta() {
        if (!this.course) return;
        
        document.title = `${this.course.title} | MLEP Data Lab`;
        
        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.content = this.course.summary;
        }
    }

    updateSchema() {
        if (!this.course) return;
        
        const schema = {
            "@context": "https://schema.org",
            "@type": "Course",
            "name": this.course.title,
            "description": this.course.summary,
            "provider": {
                "@type": "Organization",
                "name": "MLEP Data Lab"
            },
            "educationalLevel": this.course.level,
            "timeRequired": `PT${this.course.hours}H`
        };
        
        document.getElementById('course-schema').textContent = JSON.stringify(schema);
    }

    redirectToCatalog() {
        window.location.href = '/cursos';
    }

    showNotFound() {
        document.getElementById('main-content').innerHTML = `
            <div class="container" style="text-align: center; padding: 4rem 0;">
                <h1>Curso não encontrado</h1>
                <p>O curso que você está procurando não existe ou foi removido.</p>
                <a href="/cursos" class="btn btn--primary">Voltar ao Catálogo</a>
            </div>
        `;
    }

    getMockCourse() {
        return {
            id: 1,
            slug: this.courseSlug,
            title: 'Curso de Exemplo',
            summary: 'Este é um curso de exemplo para demonstração.',
            description: 'Descrição detalhada do curso de exemplo.',
            level: 'iniciante',
            hours: 20,
            tags: ['exemplo', 'demo'],
            modules: [],
            lesson_count: 0,
            material_count: 0
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.coursePage = new CoursePage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoursePage;
}
