// notifications.js — Sistema de Notificações do VessieOS
// Exibe notificações estilo Windows 10 no canto da tela
// Dependências: window.toast, document

(function () {
  "use strict";

  // Container de notificações
  let container = null;

  // Criar container se não existir
  function ensureContainer() {
    if (container) return container;

    container = document.createElement('div');
    container.id = 'vessie-notifications';
    container.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 380px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }

  // Mostrar notificação
  function notify(title, message, options = {}) {
    const container = ensureContainer();

    const notification = document.createElement('div');
    notification.className = 'vessie-notification';
    notification.style.cssText = `
      background: linear-gradient(135deg, #a78bfa 0%, #e9e4f5 100%);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border-left: 4px solid ${options.color || '#1d4ed8'};
      pointer-events: auto;
      animation: slideIn 0.3s ease-out;
      font-family: 'Segoe UI', sans-serif;
      min-width: 280px;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <span style="font-size: 24px;">${options.icon || '🔔'}</span>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem;">${title}</div>
          <div style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">${message}</div>
        </div>
        <button style="background: none; border: none; color: #64748b; cursor: pointer; font-size: 1rem;">×</button>
      </div>
    `;

    // Botão fechar
    const closeBtn = notification.querySelector('button');
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-out forwards';
      setTimeout(() => notification.remove(), 300);
    });

    container.appendChild(notification);

    // Auto-remover após tempo (padrão 5 segundos)
    const duration = options.duration || 5000;
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-out forwards';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);
    }

    return notification;
  }

  // Notificação de sucesso
  function success(title, message, options = {}) {
    return notify(title, message, { ...options, icon: '✅', color: '#22c55e' });
  }

  // Notificação de erro
  function error(title, message, options = {}) {
    return notify(title, message, { ...options, icon: '❌', color: '#ef4444' });
  }

  // Notificação de aviso
  function warning(title, message, options = {}) {
    return notify(title, message, { ...options, icon: '⚠️', color: '#f59e0b' });
  }

  // Notificação de informação
  function info(title, message, options = {}) {
    return notify(title, message, { ...options, icon: 'ℹ️', color: '#3b82f6' });
  }

  // Limpar todas as notificações
  function clearAll() {
    const container = ensureContainer();
    container.innerHTML = '';
  }

  // Adicionar animações CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Exportar
  window.VessieNotifications = {
    notify,
    success,
    error,
    warning,
    info,
    clearAll
  };

  // Atalhos globais
  window.vNotify = notify;
  window.vNotifySuccess = success;
  window.vNotifyError = error;
  window.vNotifyWarning = warning;
  window.vNotifyInfo = info;

})();