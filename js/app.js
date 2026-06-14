// Controle de abas e utilitários gerais

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).setAttribute('aria-selected', 'true');
  document.getElementById('panel-' + tab).classList.add('active');
}

function fmt(num) {
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function mostrarErro(el, msg) {
  el.className = 'resultado resultado-erro';
  el.innerHTML = `<h4>Erro de validação</h4><p class="status-msg">&#10007; ${msg}</p>`;
}
