// Home Page Specific JavaScript
class HomePage {
  constructor() {
    this.apiBaseUrl = '/api';
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.onDOMReady();
      });
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    if (window.MLEP_STATIC_PREVIEW) {
      this.renderPublications(document.getElementById('latest-publications'), []);
      this.renderProjects(document.getElementById('featured-projects'), []);
      this.renderNews(document.getElementById('latest-news'), []);
      this.setupHeroAnimations();
      return;
    }
    this.loadLatestPublications();
    this.loadFeaturedProjects();
    this.loadLatestNews();
    this.setupHeroAnimations();
  }

  // Load Latest Publications
  async loadLatestPublications() {
    const container = document.getElementById('latest-publications');
    if (!container) return;

    try {
      const publications = await this.apiRequest('/publications?featured=true&limit=3');
      
      if (publications.length === 0) {
        // Fallback to latest publications if no featured ones
        const latestPublications = await this.apiRequest('/publications?limit=3');
        this.renderPublications(container, latestPublications);
      } else {
        this.renderPublications(container, publications);
      }
    } catch (error) {
      console.error('Error loading publications:', error);
      this.renderError(container, 'Publicações indisponíveis no momento.');
    }
  }

  renderPublications(container, publications) {
    if (publications.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">Nenhuma publicação cadastrada.</p>';
      return;
    }

    const html = publications.map(pub => `
      <article class="publication-card">
        <h3 class="publication-card__title">${this.escapeHtml(pub.title)}</h3>
        <p class="publication-card__authors">${this.formatAuthors(pub.authors)}</p>
        ${pub.journal ? `<p class="publication-card__journal">${this.escapeHtml(pub.journal)}</p>` : ''}
        <div class="publication-card__footer">
          <span class="publication-card__year">${pub.year}</span>
          <div class="publication-card__links">
            ${pub.doi ? `<a href="${this.safeUrl(`https://doi.org/${encodeURIComponent(pub.doi)}`)}" class="publication-card__link" target="_blank" rel="noopener noreferrer">DOI</a>` : ''}
            ${this.safeUrl(pub.pdf_url) ? `<a href="${this.safeUrl(pub.pdf_url)}" class="publication-card__link" target="_blank" rel="noopener noreferrer">PDF</a>` : ''}
          </div>
        </div>
      </article>
    `).join('');

    container.innerHTML = html;
  }

  // Load Featured Projects
  async loadFeaturedProjects() {
    const container = document.getElementById('featured-projects');
    if (!container) return;

    try {
      const projects = await this.apiRequest('/projects?featured=true&limit=3');
      
      if (projects.length === 0) {
        // Fallback to latest projects if no featured ones
        const latestProjects = await this.apiRequest('/projects?limit=3');
        this.renderProjects(container, latestProjects);
      } else {
        this.renderProjects(container, projects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      this.renderError(container, 'Projetos indisponíveis no momento.');
    }
  }

  renderProjects(container, projects) {
    if (projects.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">Nenhum projeto cadastrado.</p>';
      return;
    }

    const html = projects.map(project => `
      <article class="project-card">
        ${this.safeUrl(project.image_url) ? `<img src="${this.safeUrl(project.image_url)}" alt="${this.escapeHtml(project.title)}" class="project-card__image" loading="lazy">` : ''}
        <div class="project-card__content">
          <div class="project-card__header">
            <h3 class="project-card__title">${this.escapeHtml(project.title)}</h3>
            <span class="badge badge--${this.getStatusColor(project.status)} project-card__status">
              ${this.formatStatus(project.status)}
            </span>
          </div>
          <p class="project-card__description">${this.escapeHtml(project.short_description || project.description)}</p>
          <div class="project-card__footer">
            ${project.funding_agency ? `<span class="project-card__funding">${this.escapeHtml(project.funding_agency)}</span>` : ''}
            <div class="project-card__links">
              ${this.safeUrl(project.repository_url) ? `<a href="${this.safeUrl(project.repository_url)}" class="btn btn--sm btn--outline" target="_blank" rel="noopener noreferrer">Repositório</a>` : ''}
            </div>
          </div>
        </div>
      </article>
    `).join('');

    container.innerHTML = html;
  }

  // Load Latest News
  async loadLatestNews() {
    const container = document.getElementById('latest-news');
    if (!container) return;

    try {
      const news = await this.apiRequest('/news?featured=true&limit=3');
      
      if (news.length === 0) {
        // Fallback to latest news if no featured ones
        const latestNews = await this.apiRequest('/news?limit=3');
        this.renderNews(container, latestNews);
      } else {
        this.renderNews(container, news);
      }
    } catch (error) {
      console.error('Error loading news:', error);
      this.renderError(container, 'Notícias indisponíveis no momento.');
    }
  }

  renderNews(container, newsItems) {
    if (newsItems.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">Nenhuma notícia cadastrada.</p>';
      return;
    }

    const html = newsItems.map(item => `
      <article class="news-card">
        ${this.safeUrl(item.image_url) ? `<img src="${this.safeUrl(item.image_url)}" alt="${this.escapeHtml(item.title)}" class="news-card__image" loading="lazy">` : ''}
        <div class="news-card__content">
          <div class="news-card__header">
            <span class="badge badge--${this.getNewsTypeColor(item.type)} news-card__type">
              ${this.formatNewsType(item.type)}
            </span>
            <span class="news-card__date">${this.formatDate(new Date(item.publish_date))}</span>
          </div>
          <h3 class="news-card__title">${this.escapeHtml(item.title)}</h3>
          ${item.summary ? `<p class="news-card__summary">${this.escapeHtml(item.summary)}</p>` : ''}
        </div>
      </article>
    `).join('');

    container.innerHTML = html;
  }

  // Hero Animations
  setupHeroAnimations() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      window.addEventListener('scroll', () => {
        const heroBackground = hero.querySelector('.hero__background');
        if (heroBackground) {
          heroBackground.style.transform = `translateY(${window.pageYOffset * -0.2}px)`;
        }
      }, { passive: true });
    }

    // Animate pillars on scroll
    const pillars = document.querySelectorAll('.pillar');
    if (pillars.length > 0 && !reduceMotion && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
            }, index * 200);
          }
        });
      }, { threshold: 0.1 });

      pillars.forEach(pillar => {
        pillar.style.opacity = '0';
        pillar.style.transform = 'translateY(30px)';
        pillar.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(pillar);
      });
    }
  }

  // Helper Methods
  async apiRequest(endpoint) {
    const response = await fetch(`${this.apiBaseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  renderError(container, message) {
    container.innerHTML = `<p class="text-center text-muted">${message}</p>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return this.escapeHtml(url.href);
    } catch {
      return '';
    }
  }

  formatAuthors(authors) {
    if (Array.isArray(authors)) {
      return this.escapeHtml(authors.join(', '));
    }
    return this.escapeHtml(authors || '');
  }

  formatStatus(status) {
    const statusMap = {
      'ongoing': 'Em andamento',
      'completed': 'Concluído',
      'planned': 'Planejado',
      'paused': 'Pausado'
    };
    return statusMap[status] || status;
  }

  getStatusColor(status) {
    const colorMap = {
      'ongoing': 'primary',
      'completed': 'success',
      'planned': 'warning',
      'paused': 'neutral'
    };
    return colorMap[status] || 'neutral';
  }

  formatNewsType(type) {
    const typeMap = {
      'news': 'Notícia',
      'event': 'Evento',
      'announcement': 'Anúncio',
      'achievement': 'Conquista'
    };
    return typeMap[type] || type;
  }

  getNewsTypeColor(type) {
    const colorMap = {
      'news': 'primary',
      'event': 'secondary',
      'announcement': 'warning',
      'achievement': 'success'
    };
    return colorMap[type] || 'neutral';
  }

  formatDate(date) {
    if (window.i18n) {
      return window.i18n.formatDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}

// Initialize home page functionality
new HomePage();
