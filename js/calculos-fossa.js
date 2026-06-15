// Cálculos de Fossa Séptica, Filtro Anaeróbio e Sumidouro
// Referências: NBR 7229:2022 e NBR 13969:1997

/* ============================================================
   1. FOSSA SÉPTICA — NBR 7229
   ============================================================ */

/** Preenche q e Lf automaticamente ao selecionar tipo de contribuição */
function atualizarContribuicaoFossa() {
  const sel = document.getElementById('fs-tipo');
  if (!sel) return;
  const idx = parseInt(sel.value);
  const dado = TAB_CONTRIBUICAO[idx];
  if (!dado) return;

  const qEl = document.getElementById('fs-q');
  const lfEl = document.getElementById('fs-lf');
  if (qEl) qEl.value = dado.q;
  if (lfEl) lfEl.value = dado.lf;

  const hint = document.getElementById('fs-tipo-hint');
  if (hint) hint.textContent = `${dado.grupo} — Unidade: ${dado.unidade} — q = ${dado.q} L/un·dia | Lf = ${dado.lf} L/un·dia`;
}

function calcularFossaSeptica() {
  const N       = parseFloat(document.getElementById('fs-n').value);
  const q       = parseFloat(document.getElementById('fs-q').value);
  const Lf      = parseFloat(document.getElementById('fs-lf').value);
  const anos    = parseInt(document.getElementById('fs-anos').value);
  const faixaTemp = document.getElementById('fs-temp').value;   // 'frio'|'medio'|'quente'
  const formato = document.getElementById('fs-formato').value;  // 'retangular'|'circular'
  const H       = parseFloat(document.getElementById('fs-h').value);
  const el      = document.getElementById('resultado-fossa');

  if (!N || !q || !Lf || !H || N <= 0 || q <= 0 || Lf <= 0 || H < 1) {
    mostrarErro(el, 'Preencha todos os campos. H mínimo = 1,0 m; N, q e Lf devem ser positivos.');
    return;
  }

  // T — Tempo de detenção pela Tabela 13 (vazão × temperatura)
  const qDia = N * q;   // L/dia
  const T = buscarDetencaoTemp(qDia, faixaTemp);

  // K — Taxa de acumulação de lodo pela Tabela 11 (anos × temperatura)
  const K = buscarAcumuloLodo(anos, faixaTemp);

  // V = 1000 + N × (q × T + K × Lf)  [litros]
  const V_calc = 1000 + N * (q * T + K * Lf);
  const V_min  = N <= 5 ? 1500 : 2500;   // L — mínimo NBR 7229
  const V      = Math.max(V_calc, V_min);
  const V_m3   = V / 1000;

  // Verificar profundidade útil — Tabela 12
  const faixaH = buscarProfundidade(V_m3);
  let avisoH = '';
  if (H < faixaH.hMin) {
    avisoH = `&#9888; Altura útil ${fmt(H, 2)} m está abaixo do mínimo normativo (${fmt(faixaH.hMin, 2)} m) para este volume — ajuste H.`;
  } else if (H > faixaH.hMax) {
    avisoH = `&#9888; Altura útil ${fmt(H, 2)} m excede o máximo normativo (${fmt(faixaH.hMax, 2)} m) para este volume — considere reduzir H.`;
  } else {
    avisoH = `&#10003; Altura útil dentro da faixa normativa: ${fmt(faixaH.hMin, 2)} – ${fmt(faixaH.hMax, 2)} m (Tab. 12 — NBR 7229).`;
  }

  // Dimensões conforme formato
  let dimHTML = '';
  if (formato === 'circular') {
    // Secção circular: V = (π/4) × D² × H  →  D = √(4V / (π × H))
    const D = Math.sqrt(4 * V_m3 / (Math.PI * H));
    dimHTML = `
      <tr><td>Formato</td><td>Cilíndrico (circular)</td></tr>
      <tr><td>Diâmetro interno (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Borda livre</td><td>0,30 m</td></tr>
      <tr><td>Altura total</td><td>${fmt(H + 0.30, 2)} m</td></tr>`;
    el.innerHTML += '';  // será substituído abaixo
  } else {
    // Seção retangular: L = 2B, V = L × B × H = 2B² × H  →  B = √(V / (2H))
    const B = Math.sqrt(V_m3 / (2 * H));
    const L = 2 * B;
    dimHTML = `
      <tr><td>Formato</td><td>Prismático retangular</td></tr>
      <tr><td>Comprimento (L)</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura (B)</td><td>${fmt(B, 2)} m  (proporção L/B = 2:1)</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Borda livre</td><td>0,30 m</td></tr>
      <tr><td>Altura total</td><td>${fmt(H + 0.30, 2)} m</td></tr>`;
  }

  const usouMin = V_calc < V_min;
  const msgMin  = usouMin
    ? `&#9888; Volume calculado (${fmt(V_calc / 1000, 3)} m³) < mínimo de ${V_min} L — adotado ${V_min} L (NBR 7229).`
    : `&#10003; Volume calculado supera o mínimo normativo (${V_min} L).`;

  const faixaLabel = { frio: '≤ 10°C (fria)', medio: '10–20°C (temperada)', quente: '> 20°C (quente)' };

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Fossa Séptica</h4>
    <div class="result-main">
      <div><div class="label">Volume adotado</div><div class="value">${fmt(V_m3, 3)} m³</div></div>
      <div><div class="label">T (detenção)</div><div class="value">${fmt(T, 2)} dias</div></div>
      <div><div class="label">K (lodo)</div><div class="value">${K} dias</div></div>
    </div>
    <table class="result-table">
      <tr><td>Fórmula</td><td>V = 1000 + N × (q × T + K × Lf)  [litros]</td></tr>
      <tr><td>Número de pessoas / usuários (N)</td><td>${N}</td></tr>
      <tr><td>Contribuição per capita (q)</td><td>${fmt(q)} L/un·dia <em>(Tab. 9 — NBR 7229)</em></td></tr>
      <tr><td>Contribuição de lodo fresco (Lf)</td><td>${fmt(Lf, 2)} L/un·dia <em>(Tab. 9 — NBR 7229)</em></td></tr>
      <tr><td>Contribuição diária total (N×q)</td><td>${fmt(qDia)} L/dia</td></tr>
      <tr><td>Temperatura do mês mais frio</td><td>${faixaLabel[faixaTemp]}</td></tr>
      <tr><td>Tempo de detenção (T)</td><td>${fmt(T, 2)} dias <em>(Tab. 13 — NBR 7229)</em></td></tr>
      <tr><td>Intervalo entre limpezas</td><td>${anos} ano(s)</td></tr>
      <tr><td>Taxa de acumulação de lodo (K)</td><td>${K} dias <em>(Tab. 11 — NBR 7229)</em></td></tr>
      <tr><td>Volume calculado</td><td>${fmt(V_calc / 1000, 3)} m³  (${fmt(V_calc)} L)</td></tr>
      <tr><td>Volume mínimo NBR 7229</td><td>${V_min} L</td></tr>
      <tr><td><strong>Volume adotado</strong></td><td><strong>${fmt(V_m3, 3)} m³ = ${fmt(V)} L</strong></td></tr>
      ${dimHTML}
      <tr><td>Faixa de H útil admissível (Tab. 12)</td><td>${fmt(faixaH.hMin, 2)} – ${fmt(faixaH.hMax, 2)} m</td></tr>
    </table>
    <p class="status-msg">${msgMin}</p>
    <p class="status-msg">${avisoH}</p>
    <p class="status-msg">&#9432; Verifique distância mínima de 1,5 m de qualquer edificação (NBR 7229 §5.4).</p>`;
}

/* ============================================================
   2. FILTRO ANAERÓBIO — NBR 7229
   ============================================================ */
function calcularFiltroAnaerobio() {
  const Q     = parseFloat(document.getElementById('fa-q').value);
  const Tf    = parseFloat(document.getElementById('fa-tf').value);
  const h_mat = parseFloat(document.getElementById('fa-hmat').value);
  const forma = document.getElementById('fa-forma').value;
  const el    = document.getElementById('resultado-filtro');

  if (!Q || !Tf || !h_mat || Q <= 0 || Tf < 6 || h_mat < 0.8) {
    mostrarErro(el, 'Tf mínimo = 6 h; altura do material filtrante mínimo = 0,80 m.');
    return;
  }

  const V_m3   = (Q / 1000) * (Tf / 24);
  const V_min  = 0.5;
  const V_adot = Math.max(V_m3, V_min);
  const Area   = V_adot / h_mat;

  const h_entrada = 0.30;
  const h_borda   = 0.30;
  const H_total   = h_entrada + h_mat + h_borda;

  let dimHTML = '';
  if (forma === 'circular') {
    const D = Math.sqrt(4 * Area / Math.PI);
    dimHTML = `
      <tr><td>Formato</td><td>Circular</td></tr>
      <tr><td>Diâmetro (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td>Área transversal</td><td>${fmt(Area, 3)} m²</td></tr>`;
  } else {
    const B = Math.sqrt(Area / 2);
    const L = 2 * B;
    dimHTML = `
      <tr><td>Formato</td><td>Retangular (L = 2B)</td></tr>
      <tr><td>Comprimento (L)</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura (B)</td><td>${fmt(B, 2)} m  (proporção L/B = 2:1)</td></tr>
      <tr><td>Área transversal</td><td>${fmt(Area, 3)} m²</td></tr>`;
  }

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Filtro Anaeróbio</h4>
    <div class="result-main">
      <div><div class="label">Volume útil</div><div class="value">${fmt(V_adot, 3)} m³</div></div>
      <div><div class="label">Altura total</div><div class="value">${fmt(H_total, 2)} m</div></div>
    </div>
    <table class="result-table">
      <tr><td>Fórmula</td><td>V = Q × Tf / 24  [m³]</td></tr>
      <tr><td>Vazão diária Q</td><td>${fmt(Q)} L/dia</td></tr>
      <tr><td>Tempo de detenção Tf</td><td>${Tf} h</td></tr>
      <tr><td>Volume calculado</td><td>${fmt(V_m3, 4)} m³</td></tr>
      <tr><td><strong>Volume adotado</strong></td><td><strong>${fmt(V_adot, 3)} m³</strong></td></tr>
      ${dimHTML}
      <tr><td>Câmara de entrada</td><td>${fmt(h_entrada, 2)} m</td></tr>
      <tr><td>Material filtrante</td><td>${fmt(h_mat, 2)} m</td></tr>
      <tr><td>Borda livre</td><td>${fmt(h_borda, 2)} m</td></tr>
      <tr><td><strong>Altura total</strong></td><td><strong>${fmt(H_total, 2)} m</strong></td></tr>
    </table>
    <p class="status-msg">&#10003; Material filtrante: pedra britada nº 4 ou nº 5 (NBR 7229 §8.2).</p>
    <p class="status-msg">&#9432; Fluxo ascendente — entrada pela parte inferior, saída pela superior.</p>`;
}

/* ============================================================
   3. SUMIDOURO — NBR 13969
   ============================================================ */

function atualizarModoSumidouro() {
  const modo = document.getElementById('su-modo').value;
  const blocoSolo  = document.getElementById('su-bloco-solo');
  const blocoPerc  = document.getElementById('su-bloco-perc');
  if (blocoSolo) blocoSolo.style.display = modo === 'solo' ? '' : 'none';
  if (blocoPerc) blocoPerc.style.display = modo === 'perc' ? '' : 'none';
}

function atualizarTaxaInfiltracao() {
  const taxa = document.getElementById('su-solo').value;
  document.getElementById('su-taxa').value = taxa;
}

function calcularTaxaPercolacaoSumidouro() {
  const perc = parseFloat(document.getElementById('su-perc-taxa').value);
  const el   = document.getElementById('su-perc-aplic');
  if (!perc || perc <= 0) { if (el) el.value = ''; return; }
  const aplic = buscarTaxaPercolacao(perc);  // m³/m²·d
  const aplicL = aplic * 1000;               // L/m²·d
  if (el) el.value = fmt(aplicL, 1).replace(',', '.');
}

function calcularSumidouro() {
  const Q    = parseFloat(document.getElementById('su-q').value);
  const tipo = document.getElementById('su-tipo').value;
  const modo = document.getElementById('su-modo').value;
  const el   = document.getElementById('resultado-sumidouro');

  if (!Q || Q <= 0) {
    mostrarErro(el, 'Preencha a vazão diária com valor positivo.');
    return;
  }

  let i = 0;     // L/m²·dia
  let origemI = '';

  if (modo === 'solo') {
    i = parseFloat(document.getElementById('su-taxa').value);
    const soloLabel = document.getElementById('su-solo').selectedOptions[0].text;
    origemI = `Por tipo de solo: ${soloLabel}`;
  } else {
    const perc = parseFloat(document.getElementById('su-perc-taxa').value);
    if (!perc || perc <= 0) {
      mostrarErro(el, 'Informe a taxa de percolação (min/m).');
      return;
    }
    const aplic = buscarTaxaPercolacao(perc);   // m³/m²·d
    i = aplic * 1000;                           // L/m²·d
    origemI = `Por ensaio de percolação: ${fmt(perc, 0)} min/m → ${fmt(aplic, 3)} m³/m²·d = ${fmt(i, 1)} L/m²·d (Tab. 14 — NBR 13969)`;
  }

  if (!i || i <= 0) {
    mostrarErro(el, 'Taxa de infiltração inválida. Verifique os dados de solo / percolação.');
    return;
  }

  const A_nec = Q / i;   // m²
  let detalhes = '';
  let alertas  = '';

  if (tipo === 'poco') {
    const D = parseFloat(document.getElementById('su-d').value);
    if (!D || D < 1.0) { mostrarErro(el, 'Diâmetro do poço mínimo = 1,0 m (NBR 13969).'); return; }
    const H_nec  = A_nec / (Math.PI * D);
    const H_adot = Math.ceil(H_nec * 10) / 10;
    alertas = H_adot > 3.0
      ? `&#9888; Profundidade (${fmt(H_adot, 2)} m) excede 3,0 m (NBR 13969 §6.2). Considere aumentar D ou usar múltiplos poços.`
      : `&#10003; Profundidade dentro do limite de 3,0 m (NBR 13969).`;
    detalhes = `
      <tr><td>Tipo</td><td>Poço absorvente cilíndrico</td></tr>
      <tr><td>Área de infiltração necessária</td><td>${fmt(A_nec, 2)} m²</td></tr>
      <tr><td>Fórmula</td><td>H = A / (π × D)</td></tr>
      <tr><td>Diâmetro adotado (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td><strong>Profundidade necessária (H)</strong></td><td><strong>${fmt(H_adot, 2)} m</strong></td></tr>
      <tr><td>Profundidade máxima NBR 13969</td><td>3,0 m</td></tr>`;
    el.innerHTML = `
      <h4>Resultados — Sumidouro (Poço Absorvente)</h4>
      <div class="result-main">
        <div><div class="label">Diâmetro</div><div class="value">Ø ${fmt(D, 2)} m</div></div>
        <div><div class="label">Profundidade</div><div class="value">${fmt(H_adot, 2)} m</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão diária (Q)</td><td>${fmt(Q)} L/dia</td></tr>
        <tr><td>Taxa de infiltração (i)</td><td>${fmt(i, 1)} L/m²·dia</td></tr>
        <tr><td>Origem da taxa</td><td>${origemI}</td></tr>
        ${detalhes}
      </table>
      <p class="status-msg">${alertas}</p>
      <p class="status-msg">&#9432; Distâncias mínimas: 3 m de edificações, 15 m de poços d'água, 1,5 m do lençol freático (NBR 13969).</p>`;

  } else {
    const B = parseFloat(document.getElementById('su-larg').value);
    if (!B || B < 0.4) { mostrarErro(el, 'Largura da vala mínima = 0,40 m (NBR 13969).'); return; }
    const L_adot = Math.ceil((A_nec / B) * 10) / 10;
    alertas = `&#10003; Vala dimensionada conforme NBR 13969.`;
    detalhes = `
      <tr><td>Tipo</td><td>Vala de infiltração</td></tr>
      <tr><td>Área de fundo necessária</td><td>${fmt(A_nec, 2)} m²</td></tr>
      <tr><td>Fórmula</td><td>L = A / B</td></tr>
      <tr><td>Largura adotada (B)</td><td>${fmt(B, 2)} m</td></tr>
      <tr><td><strong>Comprimento necessário (L)</strong></td><td><strong>${fmt(L_adot, 2)} m</strong></td></tr>`;
    el.innerHTML = `
      <h4>Resultados — Sumidouro (Vala de Infiltração)</h4>
      <div class="result-main">
        <div><div class="label">Largura</div><div class="value">${fmt(B, 2)} m</div></div>
        <div><div class="label">Comprimento</div><div class="value">${fmt(L_adot, 2)} m</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão diária (Q)</td><td>${fmt(Q)} L/dia</td></tr>
        <tr><td>Taxa de infiltração (i)</td><td>${fmt(i, 1)} L/m²·dia</td></tr>
        <tr><td>Origem da taxa</td><td>${origemI}</td></tr>
        ${detalhes}
      </table>
      <p class="status-msg">${alertas}</p>
      <p class="status-msg">&#9432; Profundidade: 0,60–1,20 m, com camada de brita no fundo (NBR 13969 §6.3).</p>`;
  }

  document.getElementById('resultado-sumidouro').className = 'resultado resultado-ok';
}
