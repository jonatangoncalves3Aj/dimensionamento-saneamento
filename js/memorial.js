// memorial.js — Geração do Memorial de Cálculo imprimível

function gerarMemorial() {
  const el = document.getElementById('memorial-conteudo');
  if (!el) return;

  // ── Dados do projeto ──
  const nome       = (document.getElementById('proj-nome')?.value       || '').trim();
  const responsavel= (document.getElementById('proj-responsavel')?.value || '').trim();
  const dataProj   = (document.getElementById('proj-data')?.value        || '').trim();
  const endereco   = (document.getElementById('proj-endereco')?.value    || '').trim();
  const tipo       = (document.getElementById('proj-tipo')?.value        || '').trim();
  const habitantes = (document.getElementById('proj-habitantes')?.value  || '').trim();
  const pavimentos = (document.getElementById('proj-pavimentos')?.value  || '').trim();
  const obs        = (document.getElementById('proj-obs')?.value         || '').trim();

  const hoje = new Date().toLocaleDateString('pt-BR');

  // ── Coletar resultados de cada módulo ──
  const modulos = [
    { id: 'resultado-demanda-agua',    titulo: 'Água Fria — Demanda (NBR 5626)'              },
    { id: 'resultado-diametro-agua',   titulo: 'Água Fria — Diâmetro de Tubulação'           },
    { id: 'resultado-hazen',           titulo: 'Água Fria — Perda de Carga (Hazen-Williams)' },
    { id: 'resultado-esgoto',          titulo: 'Esgotamento Sanitário (NBR 9649)'            },
    { id: 'resultado-drenagem',        titulo: 'Drenagem Pluvial (NBR 10844)'                },
    { id: 'resultado-predial',         titulo: 'Esgoto Predial — UHC (NBR 8160)'            },
    { id: 'resultado-fossa',           titulo: 'Fossa Séptica (NBR 7229)'                   },
    { id: 'resultado-filtro',          titulo: 'Filtro Anaeróbio (NBR 7229)'                },
    { id: 'resultado-sumidouro',       titulo: 'Sumidouro (NBR 13969)'                      },
  ];

  const secoes = modulos.map(m => {
    const orig = document.getElementById(m.id);
    if (!orig || !orig.classList.contains('resultado-ok')) return '';
    return `
      <div class="memorial-secao">
        <h3 class="memorial-modulo-titulo">${m.titulo}</h3>
        <div class="memorial-modulo-corpo">${orig.innerHTML}</div>
      </div>`;
  }).filter(Boolean).join('');

  if (!secoes) {
    el.innerHTML = '<p class="memorial-aviso">&#9888; Nenhum cálculo realizado ainda. Execute os cálculos nas abas correspondentes e volte aqui para gerar o memorial.</p>';
    return;
  }

  el.innerHTML = `
    <div class="memorial-doc" id="memorial-doc-inner">

      <div class="memorial-header-doc">
        <div class="memorial-logo-row">
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#1a4a8a"/>
            <path d="M20 8 C20 8 12 16 12 22 C12 27.5 15.5 31 20 31 C24.5 31 28 27.5 28 22 C28 16 20 8 20 8Z" fill="#4fc3f7"/>
            <path d="M20 14 C20 14 15 19 15 23 C15 25.8 17.2 28 20 28 C22.8 28 25 25.8 25 23 C25 19 20 14 20 14Z" fill="#fff" opacity="0.5"/>
          </svg>
          <div>
            <h1 class="memorial-titulo-principal">Memorial de Cálculo</h1>
            <p class="memorial-subtitulo">Dimensionamento de Instalações Prediais Sanitárias</p>
          </div>
        </div>

        <table class="memorial-dados-projeto">
          <tr>
            <td><strong>Projeto:</strong></td>
            <td>${nome || '(não informado)'}</td>
            <td><strong>Data:</strong></td>
            <td>${dataProj || hoje}</td>
          </tr>
          <tr>
            <td><strong>Responsável:</strong></td>
            <td>${responsavel || '(não informado)'}</td>
            <td><strong>Tipo:</strong></td>
            <td>${tipo || '(não informado)'}</td>
          </tr>
          <tr>
            <td><strong>Endereço:</strong></td>
            <td colspan="3">${endereco || '(não informado)'}</td>
          </tr>
          ${habitantes ? `<tr><td><strong>Habitantes/usuários:</strong></td><td>${habitantes}</td><td><strong>Pavimentos:</strong></td><td>${pavimentos || '—'}</td></tr>` : ''}
          ${obs ? `<tr><td><strong>Observações:</strong></td><td colspan="3">${obs}</td></tr>` : ''}
        </table>

        <p class="memorial-disclaimer">
          Este memorial é gerado automaticamente pela ferramenta de dimensionamento sanitário com base nos dados inseridos e nas normas NBR 5626, NBR 8160, NBR 9649, NBR 10844, NBR 7229 e NBR 13969.
          Os resultados têm caráter orientativo e devem ser verificados por profissional habilitado.
        </p>
      </div>

      <hr class="memorial-hr" />

      ${secoes}

      <div class="memorial-rodape">
        <p>Gerado em ${hoje} por <strong>Dimensionamento de Saneamento</strong> — Ferramenta de Apoio à Engenharia Sanitária</p>
        <p>Normas de referência: ABNT NBR 5626, NBR 8160, NBR 9649, NBR 10844, NBR 7229:2022, NBR 13969:1997</p>
      </div>

    </div>
  `;
}

function imprimirMemorial() {
  gerarMemorial();
  const conteudo = document.getElementById('memorial-conteudo');
  if (!conteudo || !conteudo.querySelector('.memorial-doc')) {
    alert('Gere o memorial antes de imprimir.');
    return;
  }
  window.print();
}

function limparMemorial() {
  const el = document.getElementById('memorial-conteudo');
  if (el) el.innerHTML = '<p class="memorial-aviso">Clique em <strong>Gerar Memorial</strong> para consolidar os resultados de todos os módulos.</p>';
}
