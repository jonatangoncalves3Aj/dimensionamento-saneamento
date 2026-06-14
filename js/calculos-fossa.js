// Cálculos de Fossa Séptica, Filtro Anaeróbio e Sumidouro
// Referências: NBR 7229:2022 e NBR 13969:1997

/* ============================================================
   1. FOSSA SÉPTICA — NBR 7229
   ============================================================ */
function calcularFossaSeptica() {
  const N  = parseFloat(document.getElementById('fs-n').value);
  const C  = parseFloat(document.getElementById('fs-c').value);
  const T  = parseFloat(document.getElementById('fs-t').value);
  const K  = parseFloat(document.getElementById('fs-k').value);
  const Lf = parseFloat(document.getElementById('fs-lf').value);
  const H  = parseFloat(document.getElementById('fs-h').value);
  const el = document.getElementById('resultado-fossa');

  if (!N || !C || !T || !K || !Lf || !H || N <= 0 || C <= 0 || T < 0.5 || H < 1) {
    mostrarErro(el, 'Preencha todos os campos. T mínimo = 0,5 dia; H mínimo = 1,0 m.');
    return;
  }

  // V = N × (C × T + K × Lf)  [litros]
  const V_calc = N * (C * T + K * Lf);
  const V_min  = N <= 5 ? 1500 : 1000;   // L — NBR 7229 Tabela 4
  const V      = Math.max(V_calc, V_min); // litros
  const V_m3   = V / 1000;               // m³

  // Dimensões retangulares: proporção L = 2B, Volume = L × B × H
  // V = 2B² × H  →  B = √(V / (2H))
  const B = Math.sqrt(V_m3 / (2 * H));
  const L = 2 * B;

  // Altura total = útil + borda livre (0,30 m)
  const H_total = H + 0.30;

  // Aviso de volume mínimo
  const usouMin = V_calc < V_min;
  const msgMin  = usouMin
    ? `&#9888; Volume calculado (${fmt(V_calc / 1000, 3)} m³) < mínimo de ${V_min} L — adotado ${V_min} L (NBR 7229).`
    : `&#10003; Volume calculado supera o mínimo normativo (${V_min} L).`;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Fossa Séptica</h4>
    <div class="result-main">
      <div><div class="label">Volume adotado</div><div class="value">${fmt(V_m3, 3)} m³ (${fmt(V)} L)</div></div>
      <div><div class="label">Dimensões</div><div class="value">${fmt(L, 2)} × ${fmt(B, 2)} × ${fmt(H, 2)} m</div></div>
    </div>
    <table class="result-table">
      <tr><td>Fórmula</td><td>V = N × (C × T + K × Lf)</td></tr>
      <tr><td>Volume calculado</td><td>${fmt(V_calc / 1000, 3)} m³ (${fmt(V_calc)} L)</td></tr>
      <tr><td>Volume mínimo NBR 7229</td><td>${V_min} L</td></tr>
      <tr><td><strong>Volume adotado</strong></td><td><strong>${fmt(V_m3, 3)} m³ = ${fmt(V)} L</strong></td></tr>
      <tr><td>Comprimento (L)</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura (B)</td><td>${fmt(B, 2)} m  —  proporção L/B = 2:1</td></tr>
      <tr><td>Altura útil (H_util)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Borda livre</td><td>0,30 m</td></tr>
      <tr><td>Altura total (H_total)</td><td>${fmt(H_total, 2)} m</td></tr>
      <tr><td>Intervalo entre limpezas</td><td>K = ${K} dias</td></tr>
    </table>
    <p class="status-msg">${msgMin}</p>
    <p class="status-msg">&#9432; Verifique distância mínima de 1,5 m de qualquer edificação (NBR 7229 §5.4).</p>`;
}

/* ============================================================
   2. FILTRO ANAERÓBIO — NBR 7229
   ============================================================ */
function calcularFiltroAnaerobio() {
  const Q     = parseFloat(document.getElementById('fa-q').value);    // L/dia
  const Tf    = parseFloat(document.getElementById('fa-tf').value);   // horas
  const h_mat = parseFloat(document.getElementById('fa-hmat').value); // m
  const forma = document.getElementById('fa-forma').value;
  const el    = document.getElementById('resultado-filtro');

  if (!Q || !Tf || !h_mat || Q <= 0 || Tf < 6 || h_mat < 0.8) {
    mostrarErro(el, 'Tf mínimo = 6 h; altura do material filtrante mínimo = 0,80 m.');
    return;
  }

  // V_filtro = Q [m³/dia] × (Tf / 24)
  const V_m3   = (Q / 1000) * (Tf / 24);    // m³
  const V_min  = 0.5;                         // m³ — mínimo absoluto
  const V_adot = Math.max(V_m3, V_min);

  // Área transversal = V_util / h_mat
  const Area = V_adot / h_mat;

  // Altura total = câmara entrada + mat. filtrante + borda livre
  const h_entrada = 0.30;  // m
  const h_borda   = 0.30;  // m
  const H_total   = h_entrada + h_mat + h_borda;

  let dimHTML = '';
  if (forma === 'circular') {
    const D = Math.sqrt(4 * Area / Math.PI);
    dimHTML = `
      <tr><td>Diâmetro (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td>Área transversal</td><td>${fmt(Area, 3)} m²</td></tr>`;
  } else {
    const B = Math.sqrt(Area / 2);
    const L = 2 * B;
    dimHTML = `
      <tr><td>Comprimento (L)</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura (B)</td><td>${fmt(B, 2)} m  —  proporção L/B = 2:1</td></tr>
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
      <tr><td>Fórmula</td><td>V = Q × Tf / 24</td></tr>
      <tr><td>Vazão diária Q</td><td>${fmt(Q)} L/dia</td></tr>
      <tr><td>Tempo de detenção Tf</td><td>${Tf} h</td></tr>
      <tr><td>Volume calculado</td><td>${fmt(V_m3, 4)} m³</td></tr>
      <tr><td><strong>Volume adotado</strong></td><td><strong>${fmt(V_adot, 3)} m³</strong></td></tr>
      ${dimHTML}
      <tr><td>Câmara de entrada (abaixo)</td><td>${fmt(h_entrada, 2)} m</td></tr>
      <tr><td>Altura do material filtrante</td><td>${fmt(h_mat, 2)} m</td></tr>
      <tr><td>Borda livre (acima)</td><td>${fmt(h_borda, 2)} m</td></tr>
      <tr><td><strong>Altura total</strong></td><td><strong>${fmt(H_total, 2)} m</strong></td></tr>
    </table>
    <p class="status-msg">&#10003; Material filtrante: pedra britada nº 4 ou nº 5 (NBR 7229 §8.2).</p>
    <p class="status-msg">&#9432; Fluxo ascendente — entrada pela parte inferior, saída pela superior.</p>`;
}

/* ============================================================
   3. SUMIDOURO — NBR 13969
   ============================================================ */
function atualizarTaxaInfiltracao() {
  const taxa = document.getElementById('su-solo').value;
  document.getElementById('su-taxa').value = taxa;
}

function calcularSumidouro() {
  const Q    = parseFloat(document.getElementById('su-q').value);     // L/dia
  const i    = parseFloat(document.getElementById('su-taxa').value);  // L/m²·dia
  const tipo = document.getElementById('su-tipo').value;
  const D    = parseFloat(document.getElementById('su-d').value);     // m (poço)
  const B    = parseFloat(document.getElementById('su-larg').value);  // m (vala)
  const el   = document.getElementById('resultado-sumidouro');

  if (!Q || !i || Q <= 0 || i <= 0) {
    mostrarErro(el, 'Preencha a vazão e a taxa de infiltração com valores positivos.');
    return;
  }

  // Área de infiltração necessária: A = Q / i
  const A_nec = Q / i;  // m²

  let detalhes = '';
  let alertas  = '';

  if (tipo === 'poco') {
    if (!D || D < 1.0) { mostrarErro(el, 'Diâmetro do poço mínimo = 1,0 m (NBR 13969).'); return; }
    // Área lateral do poço: A_lat = π × D × H  →  H = A / (π × D)
    const H_nec   = A_nec / (Math.PI * D);
    const H_adot  = Math.ceil(H_nec * 10) / 10;  // arredondar para cima em 0,1 m
    const H_max   = 3.0;

    alertas = H_adot > H_max
      ? `&#9888; Profundidade necessária (${fmt(H_adot, 2)} m) excede o máximo de 3,0 m (NBR 13969 §6.2). Considere aumentar o diâmetro ou usar múltiplos poços.`
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
        <tr><td>Vazão diária Q</td><td>${fmt(Q)} L/dia</td></tr>
        <tr><td>Taxa de infiltração i</td><td>${i} L/m²·dia</td></tr>
        ${detalhes}
      </table>
      <p class="status-msg">${alertas}</p>
      <p class="status-msg">&#9432; Distâncias mínimas: 3 m de edificações, 15 m de poços d'água, 1,5 m do lençol freático (NBR 13969).</p>`;

  } else {
    // Vala de infiltração: A_fundo = B × L  →  L = A / B
    if (!B || B < 0.4) { mostrarErro(el, 'Largura da vala mínima = 0,40 m (NBR 13969).'); return; }
    const L_nec  = A_nec / B;
    const L_adot = Math.ceil(L_nec * 10) / 10;

    detalhes = `
      <tr><td>Tipo</td><td>Vala de infiltração</td></tr>
      <tr><td>Área de fundo necessária</td><td>${fmt(A_nec, 2)} m²</td></tr>
      <tr><td>Fórmula</td><td>L = A / B</td></tr>
      <tr><td>Largura adotada (B)</td><td>${fmt(B, 2)} m</td></tr>
      <tr><td><strong>Comprimento necessário (L)</strong></td><td><strong>${fmt(L_adot, 2)} m</strong></td></tr>`;

    alertas = `&#10003; Vala dimensionada conforme NBR 13969.`;

    el.innerHTML = `
      <h4>Resultados — Sumidouro (Vala de Infiltração)</h4>
      <div class="result-main">
        <div><div class="label">Largura</div><div class="value">${fmt(B, 2)} m</div></div>
        <div><div class="label">Comprimento</div><div class="value">${fmt(L_adot, 2)} m</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão diária Q</td><td>${fmt(Q)} L/dia</td></tr>
        <tr><td>Taxa de infiltração i</td><td>${i} L/m²·dia</td></tr>
        ${detalhes}
      </table>
      <p class="status-msg">${alertas}</p>
      <p class="status-msg">&#9432; Profundidade da vala: 0,60–1,20 m, com camada de brita no fundo (NBR 13969 §6.3).</p>`;
  }

  document.getElementById('resultado-sumidouro').className = 'resultado resultado-ok';
}
