/**
 * Events Page JavaScript
 * Handles event filtering and display
 */

class EventsPage {
    constructor() {
        this.events = [];
        this.filteredEvents = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 6;
        
        this.init();
    }

    async init() {
        await this.loadEvents();
        this.setupEventListeners();
        this.applyFilters();
        this.renderEvents();
    }

    async loadEvents() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.events = [];
            return;
        }
        try {
            const response = await fetch('/api/events');
            if (response.ok) {
                this.events = await response.json();
            } else {
                throw new Error('Failed to load events');
            }
        } catch (error) {
            console.error('Error loading events:', error);
            this.events = [];
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
                this.renderEvents();
            });
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMore();
            });
        }

        // Event subscription buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.event-subscribe-btn')) {
                this.handleEventSubscription();
            }
        });
    }

    applyFilters() {
        const now = new Date();
        
        this.filteredEvents = this.events.filter(event => {
            const eventDate = new Date(event.event_date);
            
            switch (this.currentFilter) {
                case 'upcoming':
                    return eventDate >= now;
                case 'past':
                    return eventDate < now;
                default:
                    return true;
            }
        });

        // Sort by date
        this.filteredEvents.sort((a, b) => {
            const dateA = new Date(a.event_date);
            const dateB = new Date(b.event_date);
            
            if (this.currentFilter === 'past') {
                return dateB - dateA; // Most recent first for past events
            } else {
                return dateA - dateB; // Earliest first for upcoming events
            }
        });
    }

    renderEvents() {
        const upcomingContainer = document.getElementById('upcoming-events');
        const pastContainer = document.getElementById('past-events');
        const loadMoreContainer = document.getElementById('load-more-container');

        if (this.currentFilter === 'all' || this.currentFilter === 'upcoming') {
            this.renderUpcomingEvents(upcomingContainer);
        }

        if (this.currentFilter === 'all' || this.currentFilter === 'past') {
            this.renderPastEvents(pastContainer);
        }

        // Show/hide load more button
        if (loadMoreContainer) {
            const totalToShow = this.currentPage * this.itemsPerPage;
            if (totalToShow < this.filteredEvents.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    }

    renderUpcomingEvents(container) {
        if (!container) return;

        const now = new Date();
        const upcomingEvents = this.filteredEvents.filter(event => 
            new Date(event.event_date) >= now
        ).slice(0, 6);

        if (upcomingEvents.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <div class="no-events__icon">📅</div>
                    <h3 class="no-events__title">Nenhum evento próximo</h3>
                    <p class="no-events__message">Não há eventos agendados no momento.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = window.MLEPSecurity.sanitize(upcomingEvents.map(event => this.renderEventCard(event)).join(''));
    }

    renderPastEvents(container) {
        if (!container) return;

        const now = new Date();
        const pastEvents = this.filteredEvents.filter(event => 
            new Date(event.event_date) < now
        );

        const startIndex = 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const eventsToShow = pastEvents.slice(startIndex, endIndex);

        if (eventsToShow.length === 0) {
            container.innerHTML = `
                <div class="no-events">
                    <div class="no-events__icon">📚</div>
                    <h3 class="no-events__title">Nenhum evento passado</h3>
                    <p class="no-events__message">Não há eventos anteriores para exibir.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = window.MLEPSecurity.sanitize(eventsToShow.map(event => this.renderPastEventItem(event)).join(''));
    }

    renderEventCard(event) {
        const eventDate = new Date(event.event_date);
        const day = eventDate.getDate();
        const month = this.getMonthName(eventDate.getMonth());
        const featuredClass = event.is_featured ? 'event-card--featured' : '';

        return `
            <article class="event-card ${featuredClass}">
                <div class="event-date-badge">
                    <span class="event-date-badge__day">${day}</span>
                    <span class="event-date-badge__month">${month}</span>
                </div>
                
                ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" class="event-image" loading="lazy">` : ''}
                
                <div class="event-content">
                    <span class="event-type">${this.getTypeText(event.type)}</span>
                    <h3 class="event-title">${event.title}</h3>
                    <p class="event-summary">${event.summary}</p>
                    
                    <div class="event-details">
                        <div class="event-detail">
                            <span class="event-detail-icon">🕒</span>
                            <span>${this.formatDateTime(event.event_date)}</span>
                        </div>
                        ${event.event_location ? `
                            <div class="event-detail">
                                <span class="event-detail-icon">📍</span>
                                <span>${event.event_location}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <footer class="event-actions">
                        <a href="/events/${event.id}" class="event-link">Ver detalhes</a>
                        ${this.isUpcoming(event.event_date) ? `
                            <button class="event-link event-link--secondary event-subscribe-btn">
                                Inscrever-se
                            </button>
                        ` : ''}
                    </footer>
                </div>
            </article>
        `;
    }

    renderPastEventItem(event) {
        const eventDate = new Date(event.event_date);
        const day = eventDate.getDate();
        const month = this.getMonthName(eventDate.getMonth());

        return `
            <article class="past-event-item">
                <div class="past-event-date">
                    <span class="past-event-date__day">${day}</span>
                    <span class="past-event-date__month">${month}</span>
                </div>
                
                <div class="past-event-content">
                    <h4 class="past-event-title">${event.title}</h4>
                    ${event.event_location ? `<p class="past-event-location">${event.event_location}</p>` : ''}
                </div>
                
                <div class="past-event-actions">
                    <a href="/events/${event.id}" class="past-event-link">Ver resumo</a>
                </div>
            </article>
        `;
    }

    getTypeText(type) {
        const typeMap = {
            'conference': 'Conferência',
            'workshop': 'Workshop',
            'seminar': 'Seminário',
            'defense': 'Defesa',
            'meeting': 'Reunião'
        };
        return typeMap[type] || type;
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getMonthName(monthIndex) {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return months[monthIndex];
    }

    isUpcoming(dateString) {
        return new Date(dateString) >= new Date();
    }

    handleEventSubscription() {
        // Simple alert for now - in a real implementation, this would open a form
        alert('Funcionalidade de inscrição em desenvolvimento. Entre em contato conosco para mais informações.');
    }

    loadMore() {
        this.currentPage++;
        this.renderEvents();
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.eventsPage = new EventsPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventsPage;
}
