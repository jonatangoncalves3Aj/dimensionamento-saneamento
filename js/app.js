// app.js — Lógica principal da aplicação

/* ============================================================
   Navegação por abas
   ============================================================ */
function switchTab(tabName) {
  // Atualizar botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  const activeBtn = document.getElementById('tab-' + tabName);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  // Mostrar painel correspondente
  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });
  const activePanel = document.getElementById('panel-' + tabName);
  if (activePanel) {
    activePanel.classList.add('active');
  }

  // Scroll para o topo do conteúdo
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   Utilitário global: formatar números (padrão brasileiro)
   ============================================================ */
/**
 * Formata número com casas decimais e substitui ponto por vírgula.
 * @param {number} val
 * @param {number} [dec=2]
 * @returns {string}
 */
function fmt(val, dec) {
  if (dec === undefined) dec = 2;
  if (typeof val !== 'number' || isNaN(val)) return '—';
  return val.toFixed(dec).replace('.', ',');
}

/* ============================================================
   Utilitário global: exibir erro num elemento de resultado
   ============================================================ */
/**
 * Exibe mensagem de erro formatada num elemento.
 * @param {HTMLElement} el
 * @param {string} msg
 */
function mostrarErro(el, msg) {
  el.className = 'resultado resultado-erro';
  el.innerHTML = '<h4>&#9888; Dados inválidos</h4><p class="status-msg">' + msg + '</p>';
}

/* ============================================================
   Inicialização
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  // Iniciar na aba Dados do Projeto
  switchTab('projeto');

  // Inicializar coeficientes IDF com a cidade padrão
  if (typeof atualizarCoeficientesIDF === 'function') {
    atualizarCoeficientesIDF();
  }

  // Permitir submissão com Enter em campos de formulário
  document.querySelectorAll('input[type="number"]').forEach(function (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const form = input.closest('form');
        if (form) {
          const btn = form.querySelector('.btn-calc');
          if (btn) btn.click();
        }
      }
    });
  });
});
