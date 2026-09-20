/**
 * News Page JavaScript
 * Handles news filtering, pagination, and newsletter subscription
 */

class NewsPage {
    constructor() {
        this.news = [];
        this.filteredNews = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = 'all';
        
        this.init();
    }

    async init() {
        await this.loadNews();
        await this.loadUpcomingEvents();
        this.setupEventListeners();
        this.applyFilters();
        this.renderNews();
    }

    async loadNews() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.news = [];
            return;
        }
        try {
            const response = await fetch('/api/news');
            if (response.ok) {
                this.news = await response.json();
            } else {
                throw new Error('Failed to load news');
            }
        } catch (error) {
            console.error('Error loading news:', error);
            this.news = [];
        }
    }

    async loadUpcomingEvents() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.renderUpcomingEvents([]);
            return;
        }
        try {
            const response = await fetch('/api/events?upcoming=true');
            if (response.ok) {
                const events = await response.json();
                this.renderUpcomingEvents(events);
            }
        } catch (error) {
            console.error('Error loading upcoming events:', error);
            this.renderUpcomingEvents([]);
        }
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
                this.renderNews();
            });
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewsletterSubscription(e.target);
            });
        }

        // Share buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.news-share-btn')) {
                const newsItem = e.target.closest('.news-item');
                const title = newsItem.querySelector('.news-title').textContent;
                this.shareNews(title);
            }
        });
    }

    applyFilters() {
        this.filteredNews = this.currentFilter === 'all' 
            ? this.news 
            : this.news.filter(item => item.type === this.currentFilter);

        // Sort by featured status and publish date
        this.filteredNews.sort((a, b) => {
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            return new Date(b.publish_date) - new Date(a.publish_date);
        });
    }

    renderNews() {
        const featuredContainer = document.getElementById('featured-news');
        const newsContainer = document.getElementById('news-list');
        const loadMoreContainer = document.getElementById('load-more-container');
        const noResults = document.getElementById('no-results');

        if (!newsContainer) return;

        if (this.filteredNews.length === 0) {
            if (featuredContainer) featuredContainer.innerHTML = '';
            newsContainer.innerHTML = '';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';

        // Render featured news
        const featuredNews = this.filteredNews.filter(item => item.is_featured).slice(0, 2);
        if (featuredContainer && featuredNews.length > 0) {
            featuredContainer.innerHTML = window.MLEPSecurity.sanitize(featuredNews.map(item => this.renderFeaturedNewsItem(item)).join(''));
        }

        // Render regular news
        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const newsToShow = this.filteredNews.slice(startIndex, endIndex);

        newsContainer.innerHTML = window.MLEPSecurity.sanitize(newsToShow.map(item => this.renderNewsItem(item)).join(''));

        // Show/hide load more button
        if (loadMoreContainer) {
            if (endIndex < this.filteredNews.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    }

    renderFeaturedNewsItem(item) {
        return `
            <article class="featured-news-item">
                <div class="news-content">
                    <span class="news-type news-type--${item.type}">${this.getTypeText(item.type)}</span>
                    <h3 class="news-title">${item.title}</h3>
                    <div class="news-meta">
                        <span class="news-date">📅 ${this.formatDate(item.publish_date)}</span>
                    </div>
                    <p class="news-summary">${item.summary}</p>
                    <a href="/news/${item.id}" class="news-read-more">Ler mais</a>
                </div>
            </article>
        `;
    }

    renderNewsItem(item) {
        const imageUrl = item.image_url || '/assets/img/logo/mlep-tree-logo-v2.png';
        
        return `
            <article class="news-item ${item.type === 'event' ? 'news-item--event' : ''}">
                <img src="${imageUrl}" alt="${item.title}" class="news-image" loading="lazy">
                <div class="news-content">
                    <header class="news-header">
                        <span class="news-type news-type--${item.type}">${this.getTypeText(item.type)}</span>
                        <h3 class="news-title">${item.title}</h3>
                        <div class="news-meta">
                            <span class="news-date">📅 ${this.formatDate(item.publish_date)}</span>
                            ${item.author ? `<span class="news-author">👤 ${item.author}</span>` : ''}
                        </div>
                    </header>
                    
                    ${item.type === 'event' && item.event_date ? `
                        <div class="event-details">
                            <div class="event-date">📅 ${this.formatDate(item.event_date)}</div>
                            ${item.event_location ? `<div class="event-location">📍 ${item.event_location}</div>` : ''}
                        </div>
                    ` : ''}
                    
                    <p class="news-summary">${item.summary}</p>
                    
                    ${item.tags && item.tags.length > 0 ? `
                        <div class="news-tags">
                            ${item.tags.map(tag => `<span class="news-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <footer class="news-actions">
                        <a href="/news/${item.id}" class="news-read-more">Ler mais</a>
                        <div class="news-share">
                            <button class="news-share-btn" title="Compartilhar">🔗</button>
                        </div>
                    </footer>
                </div>
            </article>
        `;
    }

    renderUpcomingEvents(events) {
        const container = document.getElementById('upcoming-events');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <p>Nenhum evento próximo agendado.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = window.MLEPSecurity.sanitize(events.slice(0, 3).map(event => `
            <div class="upcoming-event">
                <div class="upcoming-event__date">
                    <span class="upcoming-event__day">${new Date(event.event_date).getDate()}</span>
                    <span class="upcoming-event__month">${this.getMonthName(new Date(event.event_date).getMonth())}</span>
                </div>
                <div class="upcoming-event__content">
                    <h4 class="upcoming-event__title">${event.title}</h4>
                    ${event.event_location ? `<p class="upcoming-event__location">📍 ${event.event_location}</p>` : ''}
                </div>
            </div>
        `).join(''));
    }

    async handleNewsletterSubscription(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        if (!email || !this.isValidEmail(email)) {
            this.showMessage('Por favor, insira um email válido.', 'error');
            return;
        }

        submitBtn.textContent = 'Inscrevendo...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                this.showMessage('Inscrição realizada com sucesso!', 'success');
                form.reset();
            } else {
                const error = await response.json();
                this.showMessage(error.message || 'Erro ao realizar inscrição.', 'error');
            }
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            this.showMessage('Erro ao realizar inscrição. Tente novamente.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    getTypeText(type) {
        const typeMap = {
            'news': 'Notícia',
            'event': 'Evento',
            'announcement': 'Anúncio',
            'achievement': 'Conquista'
        };
        return typeMap[type] || type;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    getMonthName(monthIndex) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return months[monthIndex];
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    shareNews(title) {
        if (navigator.share) {
            navigator.share({
                title: title,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showMessage('Link copiado para a área de transferência!', 'success');
            });
        }
    }

    showMessage(message, type) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    loadMore() {
        this.currentPage++;
        this.renderNews();
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.newsPage = new NewsPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NewsPage;
}
