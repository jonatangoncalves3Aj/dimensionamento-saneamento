// Cálculos de Esgoto Predial — NBR 8160 (Método UHC)

let aparelhosPredial = [];

/* ── Inicialização do seletor de aparelhos ── */
function inicializarSeletorAparelhos() {
  const sel = document.getElementById('predial-aparelho-sel');
  if (!sel || sel.options.length > 1) return;
  TAB_UHC_APARELHO.forEach((ap, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${ap.nome} — ${ap.uhc} UHC (DN ${ap.dn})`;
    sel.appendChild(opt);
  });
}

/* ── Renderização da tabela de aparelhos adicionados ── */
function renderizarTabelaAparelhos() {
  const tbody = document.getElementById('predial-aparelhos-tbody');
  if (!tbody) return;

  if (aparelhosPredial.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="predial-empty">Nenhum aparelho adicionado. Use o formulário acima para adicionar.</td></tr>';
    atualizarUHCTotal();
    return;
  }

  tbody.innerHTML = aparelhosPredial.map((a, i) => `
    <tr>
      <td>${a.nome}</td>
      <td class="text-center">${a.qtd}</td>
      <td class="text-center">${a.uhc.toFixed(1)}</td>
      <td class="text-center"><strong>${(a.uhc * a.qtd).toFixed(1)}</strong></td>
      <td class="text-center">DN ${a.dnRamal}</td>
      <td class="text-center">
        <button class="btn-remove-ap" onclick="removerAparelho(${i})" title="Remover">&#10005;</button>
      </td>
    </tr>
  `).join('');

  atualizarUHCTotal();
}

function atualizarUHCTotal() {
  const total = aparelhosPredial.reduce((s, a) => s + a.uhc * a.qtd, 0);
  const el = document.getElementById('predial-uhc-total');
  if (el) el.textContent = total.toFixed(1);
}

/* ── Adicionar aparelho à lista ── */
function adicionarAparelho() {
  const sel = document.getElementById('predial-aparelho-sel');
  const qtdEl = document.getElementById('predial-qtd');
  if (!sel || !qtdEl) return;

  const idx = parseInt(sel.value);
  if (isNaN(idx) || idx < 0 || idx >= TAB_UHC_APARELHO.length) {
    alert('Selecione um aparelho válido.');
    return;
  }

  const qtd = Math.max(1, parseInt(qtdEl.value) || 1);
  const ap = TAB_UHC_APARELHO[idx];

  // Agrupar aparelhos iguais
  const existente = aparelhosPredial.find(a => a.nome === ap.nome);
  if (existente) {
    existente.qtd += qtd;
  } else {
    aparelhosPredial.push({
      nome: ap.nome,
      uhc: ap.uhc,
      dnRamal: ap.dn,
      temVaso: ap.temVaso,
      qtd,
    });
  }

  renderizarTabelaAparelhos();
  qtdEl.value = 1;
}

/* ── Remover aparelho da lista ── */
function removerAparelho(idx) {
  aparelhosPredial.splice(idx, 1);
  renderizarTabelaAparelhos();
}

/* ── Limpar todos os aparelhos ── */
function limparAparelhosPredial() {
  aparelhosPredial = [];
  renderizarTabelaAparelhos();
  const el = document.getElementById('resultado-predial');
  if (el) { el.className = 'resultado hidden'; el.innerHTML = ''; }
}

/* ── Cálculo principal ── */
function calcularPredial() {
  const el = document.getElementById('resultado-predial');
  if (!el) return;

  if (aparelhosPredial.length === 0) {
    mostrarErro(el, 'Adicione ao menos um aparelho sanitário antes de calcular.');
    return;
  }

  const pav     = Math.max(1, parseInt(document.getElementById('predial-pav').value) || 2);
  const declivStr = document.getElementById('predial-decliv').value || '1.0';
  const decliv  = parseFloat(declivStr);

  // UHC total e verificação de vaso sanitário
  const totalUHC = aparelhosPredial.reduce((s, a) => s + a.uhc * a.qtd, 0);
  const temVaso  = aparelhosPredial.some(a => a.temVaso);

  // ── Ramal de esgoto (Tabela 5) ──
  let dnRamal = selecionarDNRamalEsgoto(totalUHC);
  if (temVaso && dnRamal < 100) dnRamal = 100;

  // ── Tubo de queda (Tabela 4) ──
  let dnQueda = selecionarDNTuboQueda(totalUHC, pav);
  const obsQueda = temVaso && dnQueda < 100 ? ' (mínimo DN100 com vaso — NBR 8160)' : '';
  if (temVaso && dnQueda < 100) dnQueda = 100;

  // ── Coletor predial (Tabela 3) ──
  let dnColetor = selecionarDNColetor(totalUHC, decliv);
  const obsColetor = temVaso && dnColetor < 100 ? ' (mínimo DN100 com vaso — NBR 8160)' : '';
  if (temVaso && dnColetor < 100) dnColetor = 100;

  // ── Ramal de ventilação (Tabela 8) ──
  const dnVent = selecionarDNRamalVentilacao(totalUHC, temVaso);

  // ── Distância máx. desconector → ventilador (Tabela 7) ──
  const distVent = buscarDistDesconector(dnRamal);

  // ── Montar linhas dos aparelhos ──
  const rowsAp = aparelhosPredial.map(a => `
    <tr>
      <td>${a.nome}</td>
      <td class="text-center">${a.qtd}</td>
      <td class="text-center">${a.uhc.toFixed(1)}</td>
      <td class="text-center"><strong>${(a.uhc * a.qtd).toFixed(1)}</strong></td>
      <td class="text-center">DN ${a.dnRamal}</td>
    </tr>
  `).join('');

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Esgoto Predial (NBR 8160)</h4>
    <div class="result-main">
      <div><div class="label">UHC Total</div><div class="value">${totalUHC.toFixed(1)} UHC</div></div>
      <div><div class="label">Ramal de Esgoto</div><div class="value">DN ${dnRamal}</div></div>
      <div><div class="label">Tubo de Queda</div><div class="value">DN ${dnQueda}</div></div>
      <div><div class="label">Coletor Predial</div><div class="value">DN ${dnColetor}</div></div>
    </div>

    <h5 class="result-subtitle">Lista de Aparelhos</h5>
    <table class="result-table">
      <thead>
        <tr><th>Aparelho</th><th>Qtd</th><th>UHC unit.</th><th>UHC total</th><th>DN ramal desc.</th></tr>
      </thead>
      <tbody>${rowsAp}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${totalUHC.toFixed(1)}</strong></td>
          <td>—</td>
        </tr>
      </tfoot>
    </table>

    <h5 class="result-subtitle">Dimensionamento dos Tubos</h5>
    <table class="result-table">
      <tr><td>UHC total acumulado</td><td>${totalUHC.toFixed(1)} UHC</td></tr>
      <tr><td>Ramal de esgoto — DN adotado</td><td>DN ${dnRamal} mm <em>(Tab. 5 — NBR 8160)</em></td></tr>
      <tr><td>Tubo de queda — ${pav} pavimento(s)</td><td>DN ${dnQueda} mm <em>(Tab. 4 — NBR 8160)</em>${obsQueda}</td></tr>
      <tr><td>Coletor predial — i = ${fmt(decliv, 1)}%</td><td>DN ${dnColetor} mm <em>(Tab. 3 — NBR 8160)</em>${obsColetor}</td></tr>
      <tr><td>Ramal de ventilação${temVaso ? ' (com vaso)' : ' (sem vaso)'}</td><td>DN ${dnVent} mm <em>(Tab. 8 — NBR 8160)</em></td></tr>
      <tr><td>Dist. máx. desconector → ventilador</td><td>${fmt(distVent, 2)} m <em>(Tab. 7 — NBR 8160)</em></td></tr>
    </table>

    ${temVaso ? '<p class="status-msg">&#9432; DN mínimo 100 mm para tubulações que recebem vasos sanitários (NBR 8160 §6.2).</p>' : ''}
    <p class="status-msg">&#9432; Inclinação mínima dos ramais de descarga: 2% para DN 40–50 mm; 1% para DN 75–100 mm (NBR 8160).</p>
    <p class="status-msg">&#10003; Dimensionamento realizado pelo Método das Unidades Hunter de Contribuição — NBR 8160.</p>
  `;
}
