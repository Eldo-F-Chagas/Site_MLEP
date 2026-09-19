/**
 * Team Page JavaScript
 * Handles team member filtering and display
 */

class TeamPage {
    constructor() {
        this.members = [];
        this.filteredMembers = [];
        this.currentFilters = {
            role: '',
            active: true
        };
        
        this.init();
    }

    async init() {
        await this.loadTeamMembers();
        await this.loadStatistics();
        this.setupEventListeners();
        this.applyFilters();
        this.renderTeamSections();
    }

    async loadTeamMembers() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.members = [];
            return;
        }
        try {
            const response = await fetch('/api/team');
            if (response.ok) {
                this.members = await response.json();
            } else {
                throw new Error('Failed to load team members');
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            this.members = [];
        }
    }

    async loadStatistics() {
        if (window.MLEP_STATIC_PREVIEW) {
            this.renderStatistics({ total: 0, researchers: 0, students: 0, alumni: 0 });
            return;
        }
        try {
            const response = await fetch('/api/team/stats');
            if (response.ok) {
                const stats = await response.json();
                this.renderStatistics(stats);
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
            // Use mock stats
            this.renderStatistics({
                total: this.members.length,
                researchers: this.members.filter(m => m.role === 'RESEARCHER').length,
                students: this.members.filter(m => m.role.includes('STUDENT')).length,
                alumni: this.members.filter(m => !m.is_active).length
            });
        }
    }

    setupEventListeners() {
        // Role filter checkboxes
        const roleFilters = document.querySelectorAll('input[name="role-filter"]');
        roleFilters.forEach(filter => {
            filter.addEventListener('change', () => {
                this.applyFilters();
                this.renderTeamSections();
            });
        });

        // Active/Alumni toggle
        const activeFilter = document.getElementById('active-filter');
        if (activeFilter) {
            activeFilter.addEventListener('change', (e) => {
                this.currentFilters.active = e.target.checked;
                this.applyFilters();
                this.renderTeamSections();
            });
        }

        // Member card interactions
        document.addEventListener('click', (e) => {
            const memberCard = e.target.closest('.member-card');
            if (memberCard && e.target.closest('.member-link')) {
                // Handle link clicks (already handled by href)
                return;
            }
            
            if (memberCard) {
                this.showMemberDetails(memberCard.dataset.memberId);
            }
        });
    }

    applyFilters() {
        const selectedRoles = Array.from(document.querySelectorAll('input[name="role-filter"]:checked'))
            .map(input => input.value);

        this.filteredMembers = this.members.filter(member => {
            // Role filter
            if (selectedRoles.length > 0 && !selectedRoles.includes(member.role)) {
                return false;
            }

            // Active/Alumni filter
            if (this.currentFilters.active && !member.is_active) {
                return false;
            }

            return true;
        });

        // Sort by role hierarchy and name
        this.filteredMembers.sort((a, b) => {
            const roleOrder = {
                'PRINCIPAL_INVESTIGATOR': 1,
                'RESEARCHER': 2,
                'POSTDOC': 3,
                'PHD_STUDENT': 4,
                'MASTERS_STUDENT': 5,
                'UNDERGRADUATE': 6,
                'COLLABORATOR': 7,
                'ALUMNI': 8
            };

            const aOrder = roleOrder[a.role] || 9;
            const bOrder = roleOrder[b.role] || 9;

            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }

            return a.name.localeCompare(b.name);
        });
    }

    renderTeamSections() {
        const roles = [
            { key: 'PRINCIPAL_INVESTIGATOR', title: 'Pesquisador Principal', id: 'pi-section' },
            { key: 'RESEARCHER', title: 'Pesquisadores', id: 'researchers-section' },
            { key: 'POSTDOC', title: 'Pós-Doutorandos', id: 'postdocs-section' },
            { key: 'PHD_STUDENT', title: 'Doutorandos', id: 'phd-section' },
            { key: 'MASTERS_STUDENT', title: 'Mestrandos', id: 'masters-section' },
            { key: 'UNDERGRADUATE', title: 'Graduandos', id: 'undergrad-section' },
            { key: 'COLLABORATOR', title: 'Colaboradores', id: 'collaborators-section' },
            { key: 'ALUMNI', title: 'Ex-membros', id: 'alumni-section' }
        ];

        roles.forEach(role => {
            const members = this.filteredMembers.filter(m => m.role === role.key);
            const section = document.getElementById(role.id);
            
            if (section) {
                if (members.length > 0) {
                    section.style.display = 'block';
                    const grid = section.querySelector('.team-grid');
                    if (grid) {
                        grid.innerHTML = window.MLEPSecurity.sanitize(members.map(member => this.renderMemberCard(member)).join(''));
                    }
                } else {
                    section.style.display = 'none';
                }
            }
        });
    }

    renderMemberCard(member) {
        const alumniClass = !member.is_active ? 'member-card--alumni' : '';
        const photoUrl = member.photo_url || '/assets/img/logo/mlep-mark.svg';
        
        return `
            <div class="member-card ${alumniClass}" data-member-id="${member.id}">
                <img src="${photoUrl}" alt="${member.name}" class="member-photo" loading="lazy">
                <h3 class="member-name">${member.name}</h3>
                <span class="member-role">${this.getRoleText(member.role)}</span>
                ${member.position ? `<p class="member-position">${member.position}</p>` : ''}
                ${member.bio ? `<p class="member-bio">${this.truncateText(member.bio, 100)}</p>` : ''}
                
                ${member.research_interests && member.research_interests.length > 0 ? `
                    <div class="member-interests">
                        ${member.research_interests.slice(0, 3).map(interest => 
                            `<span class="member-interest">${interest}</span>`
                        ).join('')}
                    </div>
                ` : ''}
                
                <div class="member-links">
                    ${member.email ? `<a href="mailto:${member.email}" class="member-link" title="Email">📧</a>` : ''}
                    ${member.orcid_id ? `<a href="https://orcid.org/${member.orcid_id}" class="member-link member-link--orcid" target="_blank" rel="noopener" title="ORCID">🆔</a>` : ''}
                    ${member.google_scholar_id ? `<a href="https://scholar.google.com/citations?user=${member.google_scholar_id}" class="member-link member-link--scholar" target="_blank" rel="noopener" title="Google Scholar">🎓</a>` : ''}
                    ${member.github_username ? `<a href="https://github.com/${member.github_username}" class="member-link member-link--github" target="_blank" rel="noopener" title="GitHub">💻</a>` : ''}
                    ${member.lattes_id ? `<a href="http://lattes.cnpq.br/${member.lattes_id}" class="member-link member-link--lattes" target="_blank" rel="noopener" title="Lattes">📄</a>` : ''}
                </div>
            </div>
        `;
    }

    renderStatistics(stats) {
        const statsContainer = document.getElementById('team-stats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="team-stat">
                <span class="team-stat__number">${stats.total}</span>
                <span class="team-stat__label">Total de Membros</span>
            </div>
            <div class="team-stat">
                <span class="team-stat__number">${stats.researchers}</span>
                <span class="team-stat__label">Pesquisadores</span>
            </div>
            <div class="team-stat">
                <span class="team-stat__number">${stats.students}</span>
                <span class="team-stat__label">Estudantes</span>
            </div>
            <div class="team-stat">
                <span class="team-stat__number">${stats.alumni}</span>
                <span class="team-stat__label">Ex-membros</span>
            </div>
        `;
    }

    getRoleText(role) {
        const roleMap = {
            'PRINCIPAL_INVESTIGATOR': 'Pesquisador Principal',
            'RESEARCHER': 'Pesquisador',
            'POSTDOC': 'Pós-Doutorando',
            'PHD_STUDENT': 'Doutorando',
            'MASTERS_STUDENT': 'Mestrando',
            'UNDERGRADUATE': 'Graduando',
            'COLLABORATOR': 'Colaborador',
            'ALUMNI': 'Ex-membro'
        };
        return roleMap[role] || role;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showMemberDetails(memberId) {
        const member = this.members.find(m => m.id == memberId);
        if (!member) return;

        // For now, just scroll to member or show more info
        // In a full implementation, this could open a modal
        console.log('Show details for:', member.name);
    }

}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teamPage = new TeamPage();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamPage;
}
