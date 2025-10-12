// Contact Page JavaScript
class ContactPage {
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
    this.setupContactForm();
    this.setupNewsletterForm();
  }

  setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleContactSubmission(form);
    });
  }

  setupNewsletterForm() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleNewsletterSubmission(form);
    });
  }

  async handleContactSubmission(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
      // Disable submit button and show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';

      // Get form data
      const formData = new FormData(form);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        contact_type: formData.get('contact_type')
      };

      // Submit to API
      const response = await fetch(`${this.apiBaseUrl}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.showSuccessMessage('Mensagem enviada com sucesso! Entraremos em contato em breve.');
        form.reset();
      } else {
        throw new Error(result.detail || 'Erro ao enviar mensagem');
      }

    } catch (error) {
      console.error('Error submitting contact form:', error);
      this.showErrorMessage('Erro ao enviar mensagem. Tente novamente mais tarde.');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  async handleNewsletterSubmission(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
      // Disable submit button and show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Inscrevendo...';

      // Get form data
      const formData = new FormData(form);
      const data = {
        email: formData.get('email')
      };

      // Submit to API
      const response = await fetch(`${this.apiBaseUrl}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.already_subscribed) {
          this.showInfoMessage('Você já está inscrito em nossa newsletter!');
        } else if (result.reactivated) {
          this.showSuccessMessage('Bem-vindo de volta! Sua inscrição foi reativada.');
        } else {
          this.showSuccessMessage('Inscrição realizada com sucesso! Obrigado por se juntar à nossa newsletter.');
        }
        form.reset();
      } else {
        throw new Error(result.detail || 'Erro ao inscrever na newsletter');
      }

    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      this.showErrorMessage('Erro ao inscrever na newsletter. Tente novamente mais tarde.');
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  showSuccessMessage(message) {
    this.showNotification(message, 'success');
  }

  showErrorMessage(message) {
    this.showNotification(message, 'error');
  }

  showInfoMessage(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.innerHTML = `
      <div class="notification__content">
        <span class="notification__message">${this.escapeHtml(message)}</span>
        <button class="notification__close" aria-label="Close notification">&times;</button>
      </div>
    `;

    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          max-width: 400px;
          padding: 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
        }
        
        .notification--success {
          background-color: #10b981;
          color: white;
        }
        
        .notification--error {
          background-color: #ef4444;
          color: white;
        }
        
        .notification--info {
          background-color: #3b82f6;
          color: white;
        }
        
        .notification--show {
          transform: translateX(0);
        }
        
        .notification__content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        
        .notification__message {
          flex: 1;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .notification__close {
          background: none;
          border: none;
          color: inherit;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        
        .notification__close:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        @media (max-width: 480px) {
          .notification {
            top: 10px;
            right: 10px;
            left: 10px;
            max-width: none;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('notification--show');
    }, 100);

    // Auto-hide after 5 seconds
    const autoHideTimeout = setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Close button functionality
    const closeButton = notification.querySelector('.notification__close');
    closeButton.addEventListener('click', () => {
      clearTimeout(autoHideTimeout);
      this.hideNotification(notification);
    });
  }

  hideNotification(notification) {
    notification.classList.remove('notification--show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize contact page functionality
new ContactPage();
