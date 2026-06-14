// Dados do Projeto — coleta e distribui para os módulos de cálculo

/* Consumo per capita e hints por tipo de edificação (NBR 5626 / NBR 7229) */
const PADROES_TIPO = {
  'residencial-unifamiliar':  { consumo: 200, hint: 'NBR 5626 — Residencial unifamiliar: 150–300 L/hab·dia' },
  'residencial-multifamiliar':{ consumo: 150, hint: 'NBR 5626 — Residencial multifamiliar: 100–200 L/hab·dia' },
  'comercial':                { consumo: 50,  hint: 'NBR 5626 — Comercial / escritório: 50–100 L/func·dia' },
  'industrial':               { consumo: 70,  hint: 'NBR 5626 — Industrial: 70–100 L/func·dia' },
  'hospitalar':               { consumo: 300, hint: 'NBR 5626 — Hospitalar: 250–400 L/leito·dia' },
  'escolar':                  { consumo: 50,  hint: 'NBR 5626 — Escolar: 50 L/aluno·dia' },
  'hotel':                    { consumo: 250, hint: 'NBR 5626 — Hotel: 200–300 L/hóspede·dia' },
};

function atualizarPadroesTipo() {
  const tipo = document.getElementById('proj-tipo').value;
  const padrao = PADROES_TIPO[tipo];
  if (!padrao) return;
  document.getElementById('proj-consumo-pc').value = padrao.consumo;
  document.getElementById('proj-consumo-hint').textContent = padrao.hint;
}

/* Recalcula C quando áreas mudam */
(function () {
  function recalcC() {
    const total = parseFloat(document.getElementById('proj-area-total').value) || 0;
    const imp   = parseFloat(document.getElementById('proj-area-impermeavel').value) || 0;
    if (total <= 0) return;
    const ratio = Math.min(imp / total, 1);
    // C composto: impermeável = 0,90, permeável = 0,20
    const C = (ratio * 0.90 + (1 - ratio) * 0.20).toFixed(2);
    document.getElementById('proj-coef-c').value = C;
    const pct = (ratio * 100).toFixed(0);
    document.getElementById('proj-imp-hint').textContent =
      `Taxa de impermeabilização: ${pct}% — C composto ≈ ${C}`;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('proj-area-total').addEventListener('input', recalcC);
    document.getElementById('proj-area-impermeavel').addEventListener('input', recalcC);
    recalcC();
  });
})();

function aplicarDadosProjeto() {
  const hab      = document.getElementById('proj-habitantes').value;
  const consumo  = document.getElementById('proj-consumo-pc').value;
  const retorno  = document.getElementById('proj-coef-retorno').value;
  const k1       = document.getElementById('proj-k1').value;
  const k2       = document.getElementById('proj-k2').value;
  const incendio = document.getElementById('proj-reserva-incendio').value;
  const C        = document.getElementById('proj-coef-c').value;
  const tr       = document.getElementById('proj-tr').value;
  const tc       = document.getElementById('proj-tc').value;
  const cidade   = document.getElementById('proj-cidade-idf').value;
  const areaHa   = ((parseFloat(document.getElementById('proj-area-total').value) || 0) / 10000).toFixed(4);

  // ── Módulo Água ────────────────────────────────────────────
  setVal('num-habitantes',    hab);
  setVal('consumo-per-capita', consumo);
  setVal('reserva-incendio',  incendio);

  // ── Módulo Esgoto ──────────────────────────────────────────
  setVal('esg-habitantes',    hab);
  setVal('esg-consumo',       consumo);
  setVal('esg-coef-retorno',  retorno);
  setVal('esg-k1',            k1);
  setVal('esg-k2',            k2);

  // ── Módulo Drenagem ────────────────────────────────────────
  setSelectVal('rc-c',        C);
  setVal('rc-a',              areaHa);
  setSelectVal('idf-cidade',  cidade);
  setSelectVal('idf-tr',      tr);
  setVal('idf-tc',            tc);
  setVal('tp-declividade',    '0.005');  // padrão mínimo; ajustável

  // Sincronizar select de cidade no painel IDF e atualizar coeficientes
  if (typeof atualizarCoeficientesIDF === 'function') atualizarCoeficientesIDF();

  // ── Banner de confirmação ──────────────────────────────────
  const nome = document.getElementById('proj-nome').value.trim() || 'Projeto';
  const banner = document.getElementById('projeto-resumo-banner');
  banner.className = 'projeto-banner projeto-banner-ok';
  banner.innerHTML = `
    <strong>&#10003; Dados aplicados com sucesso</strong> — <em>${escHtml(nome)}</em><br>
    <span>
      ${hab} hab &bull; ${consumo} L/hab·dia &bull;
      C1 = ${retorno}% &bull; K1 = ${k1} &bull; K2 = ${k2} &bull;
      Área = ${(parseFloat(areaHa)*10000).toFixed(0)} m² &bull;
      C = ${C} &bull; TR = ${tr} anos &bull; Cidade: ${cidadeNome(cidade)}
    </span>`;

  // Ir para a aba de água como próximo passo sugerido
  // (não navega automaticamente para não surpreender o usuário)
}

function limparDadosProjeto() {
  const ids = [
    'proj-nome','proj-responsavel','proj-endereco','proj-obs',
    'proj-habitantes','proj-unidades','proj-pavimentos',
    'proj-consumo-pc','proj-coef-retorno','proj-area-total',
    'proj-area-impermeavel','proj-reserva-incendio','proj-k1','proj-k2','proj-tc',
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('proj-data').value = '';
  const banner = document.getElementById('projeto-resumo-banner');
  banner.className = 'projeto-banner hidden';
  banner.innerHTML = '';
}

/* Auxiliares */
function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  // Tentar correspondência exata
  for (let i = 0; i < el.options.length; i++) {
    if (el.options[i].value === String(val)) { el.selectedIndex = i; return; }
  }
  // Correspondência numérica aproximada para selects de número
  const num = parseFloat(val);
  let bestIdx = 0, bestDiff = Infinity;
  for (let i = 0; i < el.options.length; i++) {
    const diff = Math.abs(parseFloat(el.options[i].value) - num);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  el.selectedIndex = bestIdx;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cidadeNome(val) {
  const map = {
    'sao-paulo':'São Paulo','rio-de-janeiro':'Rio de Janeiro',
    'belo-horizonte':'Belo Horizonte','curitiba':'Curitiba',
    'porto-alegre':'Porto Alegre','salvador':'Salvador','recife':'Recife',
    'florianopolis':'Florianópolis','joinville':'Joinville',
    'blumenau':'Blumenau','chapeco':'Chapecó',
    'criciuma':'Criciúma','itajai':'Itajaí',
  };
  return map[val] || val;
}
