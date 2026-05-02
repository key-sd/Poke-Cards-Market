// Constantes de configuración: IDs de Pokémon, precios por tipo y lista de legendarios para asignar precios especiales
const POKEMON_IDS = [
  1,4,7,25,39,52,54,63,66,74,
  79,81,92,94,104,116,131,133,143,147,
  152,155,158,175,196,197,243,244,245,249
];

const TYPE_PRICES = {
  fire:4.99, water:3.99, grass:3.49, electric:5.99,
  psychic:6.99, dragon:9.99, ice:4.49, dark:5.49,
  fairy:4.99, ghost:6.49, steel:5.49, normal:2.99,
  fighting:3.99, poison:3.49, ground:3.99, flying:4.49,
  bug:2.49, rock:3.49
};

const LEGENDARY = [144,145,146,149,150,151,243,244,245,249,250];

//Estado global de la aplicación: lista de cartas, filtros activos y cartas poseídas por el usuario
let allCards     = [];
let filteredCards= [];
let ownedIds     = new Set(JSON.parse(localStorage.getItem('pkm_owned') || '[]'));
let currentCard  = null;
let activeType   = 'all';
let searchTerm   = '';

// Ayuda a capitalizar los nombres de los Pokémon y tipos para una mejor presentación
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getPrice(types, id) {
  if (LEGENDARY.includes(id)) return 14.99;
  const t = types[0]?.type?.name || 'normal';
  return TYPE_PRICES[t] || 2.99;
}

function typeClass(t) { return `t-${t}`; }

// Carga los datos de las cartas desde la API, construye los objetos de carta con la información relevante y renderiza la cuadrícula
async function loadCards() {
  try {
    const results = await Promise.all(
      POKEMON_IDS.map(id =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
          .then(r => r.json())
          .catch(() => null)
      )
    );

    allCards = results.filter(Boolean).map(p => ({
      id:    p.id,
      name:  p.name,
      img:   p.sprites?.other?.['official-artwork']?.front_default
             || p.sprites?.front_default || '',
      types: p.types,
      stats: p.stats,
      price: getPrice(p.types, p.id),
      owned: ownedIds.has(p.id)
    }));

    buildTypeFilters();
    filteredCards = [...allCards];
    renderGrid();

    document.getElementById('market-loader').style.display = 'none';
    document.getElementById('cards-grid').style.display = 'grid';
    updateOwnedCount();

  } catch (err) {
    console.error('Error cargando Pokémon:', err);
    document.getElementById('market-loader').innerHTML =
      '<p style="color:#e05555">Error cargando cartas. Verifica tu conexión.</p>';
  }
}

// Aplica los filtros de tipo y búsqueda para actualizar la cuadrícula de cartas mostrada
function buildTypeFilters() {
  const types = new Set();
  allCards.forEach(c => c.types.forEach(t => types.add(t.type.name)));

  const wrap   = document.getElementById('filters-wrap');
  const search = wrap.querySelector('.search-wrap');

  types.forEach(t => {
    const btn = document.createElement('button');
    btn.className   = 'filter-btn';
    btn.textContent = capitalize(t);
    btn.onclick     = () => filterType(t, btn);
    wrap.insertBefore(btn, search);
  });
}

function filterType(type, btn) {
  activeType = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function filterSearch(val) {
  searchTerm = val.toLowerCase();
  applyFilters();
}

function applyFilters() {
  filteredCards = allCards.filter(c => {
    const matchType   = activeType === 'all' || c.types.some(t => t.type.name === activeType);
    const matchSearch = !searchTerm || c.name.includes(searchTerm);
    return matchType && matchSearch;
  });
  renderGrid();
}

// Renderiza la cuadrícula de cartas según los filtros aplicados y el estado de propiedad
function renderGrid() {
  const grid = document.getElementById('cards-grid');
  grid.innerHTML = '';

  if (!filteredCards.length) {
    grid.innerHTML = '<p style="color:#8899bb;padding:2rem">No se encontraron cartas.</p>';
    return;
  }

  filteredCards.forEach(card => {
    const isOwned = ownedIds.has(card.id);
    const el      = document.createElement('div');
    el.className  = `poke-card ${isOwned ? 'owned' : 'locked'}`;
    el.innerHTML  = `
      ${isOwned ? '<span class="owned-badge">✓ Tuya</span>' : ''}
      <div class="card-img-wrap">
        <img src="${card.img}" alt="${card.name}" loading="lazy"/>
        <div class="lock-icon">🔒</div>
      </div>
      <div class="card-info">
        <div class="card-name">${capitalize(card.name)}</div>
        <div class="card-types">
          ${card.types.map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`).join('')}
        </div>
        <div class="card-price">
          <span class="price">$${card.price}</span>
          <button class="buy-btn"
            ${isOwned ? 'disabled' : ''}
            onclick="openModal(event, ${card.id})">
            ${isOwned ? 'Adquirida' : 'Comprar'}
          </button>
        </div>
      </div>`;
    grid.appendChild(el);
  });
}

// Modal de compra y detalles de carta
function openModal(e, id) {
  e.stopPropagation();
  const card = allCards.find(c => c.id === id);
  if (!card || ownedIds.has(card.id)) return;

  currentCard = card;

  document.getElementById('m-img').src           = card.img;
  document.getElementById('m-name').textContent  = capitalize(card.name);
  document.getElementById('m-price').textContent = `$${card.price} USD`;

  document.getElementById('m-types').innerHTML = card.types
    .map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`)
    .join('');

  document.getElementById('m-stats').innerHTML =
    '<div class="stats-title">ESTADÍSTICAS</div>' +
    card.stats.slice(0, 4).map(s => `
      <div class="stat-row">
        <span class="stat-label">${s.stat.name.replace('-', ' ')}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar" style="width:${Math.min(s.base_stat, 150) / 150 * 100}%"></div>
        </div>
        <span class="stat-val">${s.base_stat}</span>
      </div>`).join('');

  document.getElementById('payment-status').innerHTML         = '';
  document.getElementById('paypal-button-container').innerHTML= '';
  document.getElementById('modal').style.display              = 'flex';

  initPayPal(card);
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  currentCard = null;
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal')) closeModal();
}

// Integra PayPal para procesar pagos reales con las credenciales sandbox
function initPayPal(card) {
  if (typeof paypal === 'undefined') {
    document.getElementById('paypal-button-container').innerHTML =
      `<p class="paypal-error">⚠️ PayPal SDK no cargado.</p>`;
    return;
  }

  paypal.Buttons({
    style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },

    // llama al servidor para crear la orden y obtener el ID que PayPal necesita
    createOrder: async () => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: card.price.toFixed(2),
          description: `PokéCard: ${capitalize(card.name)}`
        })
      });
      const order = await res.json();
      return order.id;
    },

    // llama al servidor para capturar la orden después de la aprobación del pago
    onApprove: async (data) => {
      setPaymentStatus('processing', '⏳ Procesando pago...');
      try {
        const res = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const details = await res.json();

        if (details.status === 'COMPLETED') {
          const name = details.payer?.name?.given_name || 'Entrenador';
          unlockCard(card, `✅ ¡Pago exitoso! Bienvenido ${name}, "${capitalize(card.name)}" es tuya.`);
        } else {
          setPaymentStatus('error', `❌ Estado inesperado: ${details.status}`);
        }
      } catch (err) {
        console.error(err);
        setPaymentStatus('error', '❌ Error al capturar el pago.');
      }
    },

    onError: (err) => {
      console.error('PayPal error:', err);
      setPaymentStatus('error', '❌ Error en el pago. La carta permanece bloqueada.');
    },

    onCancel: () => setPaymentStatus('error', '⚠️ Pago cancelado.')

  }).render('#paypal-button-container');
}



// Desbloqueo de carta tras pago exitoso: actualiza el estado de propiedad, muestra mensajes y actualiza la UI
function unlockCard(card, msg) {
  ownedIds.add(card.id);
  localStorage.setItem('pkm_owned', JSON.stringify([...ownedIds]));

  // Actualizar estado en memoria
  allCards      = allCards.map(c => c.id === card.id ? { ...c, owned: true } : c);
  filteredCards = filteredCards.map(c => c.id === card.id ? { ...c, owned: true } : c);

  setPaymentStatus('success', msg);
  document.getElementById('paypal-button-container').innerHTML = '';
  updateOwnedCount();
  renderGrid();
  showToast(msg, 'success');
  setTimeout(closeModal, 3000);
}

// actualiza el área de estado del modal con mensajes de éxito, error o procesamiento según el resultado del pago
function setPaymentStatus(type, msg) {
  document.getElementById('payment-status').innerHTML =
    `<div class="payment-status status-${type}">${msg}</div>`;
}

function showToast(msg, type) {
  const toast       = document.createElement('div');
  toast.className   = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateOwnedCount() {
  document.getElementById('owned-count').textContent = ownedIds.size;
}

// Manejo de pestañas para alternar entre el mercado y la vista de mis compras, renderizando la información relevante en cada una
function showTab(tab) {
  document.getElementById('view-market').style.display       = tab === 'market'      ? 'block' : 'none';
  document.getElementById('view-mypurchases').style.display  = tab === 'mypurchases' ? 'block' : 'none';
  document.getElementById('tab-market').classList.toggle('tab-active',      tab === 'market');
  document.getElementById('tab-mypurchases').classList.toggle('tab-active', tab === 'mypurchases');
  if (tab === 'mypurchases') renderPurchases();
}

/* muestra un resumen de las cartas adquiridas, el total invertido y una cuadrícula similar a la del mercado 
  pero solo con las cartas que el usuario ha comprado, deshabilitando los botones de compra para esas cartas*/
function renderPurchases() {
  const owned   = allCards.filter(c => ownedIds.has(c.id));
  const content = document.getElementById('purchases-content');

  if (!owned.length) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>No has comprado ninguna carta aún.</p>
        <button class="btn btn-primary" onclick="showTab('market')">Explorar mercado</button>
      </div>`;
    return;
  }

  const total = owned.reduce((acc, c) => acc + c.price, 0);

  content.innerHTML = `
    <div class="purchases-summary">
      <div class="summary-card">
        <div class="summary-label">Cartas adquiridas</div>
        <div class="summary-val">${owned.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total invertido</div>
        <div class="summary-val">$${total.toFixed(2)}</div>
      </div>
    </div>
    <div class="grid">
      ${owned.map(card => `
        <div class="poke-card owned">
          <span class="owned-badge">✓ Tuya</span>
          <div class="card-img-wrap">
            <img src="${card.img}" alt="${card.name}" loading="lazy"/>
          </div>
          <div class="card-info">
            <div class="card-name">${capitalize(card.name)}</div>
            <div class="card-types">
              ${card.types.map(t => `<span class="type-badge ${typeClass(t.type.name)}">${t.type.name}</span>`).join('')}
            </div>
            <div class="card-price">
              <span class="price">$${card.price}</span>
              <button class="buy-btn" disabled>Adquirida</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// arranca la aplicación cargando las cartas desde la API y renderizando el mercado
loadCards();