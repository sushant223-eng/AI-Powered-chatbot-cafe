const menu = [
  { id: 'flat-white', category: 'coffee', label: 'Coffee', name: 'House Flat White', description: 'Chocolatey, silky & seriously comforting.', price: 220 },
  { id: 'orange-espresso', category: 'coffee', label: 'Coffee', name: 'Orange Espresso', description: 'Double shot, orange tonic, tiny bit of magic.', price: 260 },
  { id: 'miso-toast', category: 'plates', label: 'All-day plate', name: 'Miso Mushroom Toast', description: 'Sourdough, whipped tofu, sesame & herbs.', price: 420 },
  { id: 'egg-sandwich', category: 'plates', label: 'All-day plate', name: 'Soft Egg Sandwich', description: 'Jammy egg, cheddar, greens & chilli crisp.', price: 380 },
  { id: 'cardamom-bun', category: 'sweet', label: 'From the bakery', name: 'Cardamom Morning Bun', description: 'Pulled warm from the oven. Best shared, maybe.', price: 190 },
  { id: 'olive-oil-cake', category: 'sweet', label: 'From the bakery', name: 'Olive Oil Cake', description: 'Citrus crumb, crème fraîche & a little salt.', price: 260 }
];

const webhookUrl = '/api/chat';
let cart = [];
let toastTimer;
const $ = (selector) => document.querySelector(selector);

function currency(value) { return `₹${value.toLocaleString('en-IN')}`; }

function renderMenu(filter = 'all') {
  $('#menu-grid').innerHTML = menu.map(item => `
    <article class="menu-item ${filter !== 'all' && item.category !== filter ? 'hidden' : ''}">
      <div><p class="item-label">${item.label}</p><h3 class="item-name">${item.name}</h3><p class="item-description">${item.description}</p></div>
      <div class="item-action"><span class="item-price">${currency(item.price)}</span><button class="add-button" data-add="${item.id}" aria-label="Add ${item.name} to order">+</button></div>
    </article>`).join('');
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  $('#cart-count').textContent = count;
  $('#cart-total').textContent = currency(total);
  $('#cart-items').innerHTML = cart.length ? cart.map(item => `
    <div class="cart-line"><div><h4>${item.name}</h4><p>${item.quantity} × ${currency(item.price)}</p></div><div class="line-right"><strong>${currency(item.quantity * item.price)}</strong><br><button class="remove-item" data-remove="${item.id}">Remove</button></div></div>`).join('') : '<p class="empty-cart">Your order is waiting for a favourite.</p>';
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function openPanel(id) { $(`#${id}`).classList.add('open'); $(`#${id}`).setAttribute('aria-hidden', 'false'); $('#overlay').classList.add('show'); }
function closePanel(id) { $(`#${id}`).classList.remove('open'); $(`#${id}`).setAttribute('aria-hidden', 'true'); $('#overlay').classList.remove('show'); }
function openReservation() { $('#reservation-modal').classList.add('open'); $('#reservation-modal').setAttribute('aria-hidden','false'); }
function closeReservation() { $('#reservation-modal').classList.remove('open'); $('#reservation-modal').setAttribute('aria-hidden','true'); }

function addMessage(text, role, isTyping = false) {
  const node = document.createElement('div'); node.className = `message ${role}${isTyping ? ' typing' : ''}`; node.textContent = text;
  $('#chat-messages').append(node); $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight; return node;
}

function extractReply(data) {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return extractReply(data[0]);
  if (data && typeof data === 'object') return data.reply || data.message || data.output || data.text || data.response || 'Thanks! Our team will be in touch shortly.';
  return 'Thanks! Our team will be in touch shortly.';
}

async function sendChat(message) {
  const typing = addMessage('Morrow is thinking…', 'bot', true);
  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, source: 'morrow-and-mint-website', timestamp: new Date().toISOString() }) });
    let data;
    const raw = await response.text();
    try { data = JSON.parse(raw); } catch { data = raw; }
    if (!response.ok) throw new Error(extractReply(data) || 'Service unavailable');
    typing.remove(); addMessage(extractReply(data), 'bot');
  } catch (error) {
    typing.remove();
    addMessage('I’m taking a quick coffee break. Please try again in a moment, or call us at +91 80 5555 0184.', 'bot');
    console.error('Chat webhook error:', error);
  }
}

renderMenu(); renderCart();

document.addEventListener('click', (event) => {
  const add = event.target.closest('[data-add]');
  const remove = event.target.closest('[data-remove]');
  const filter = event.target.closest('.filter');
  const close = event.target.closest('[data-close]');
  const quickAsk = event.target.closest('[data-ask]');
  if (add) { const item = menu.find(entry => entry.id === add.dataset.add); const found = cart.find(entry => entry.id === item.id); found ? found.quantity++ : cart.push({ ...item, quantity: 1 }); renderCart(); showToast(`${item.name} added to your order.`); }
  if (remove) { cart = cart.filter(item => item.id !== remove.dataset.remove); renderCart(); }
  if (filter) { document.querySelectorAll('.filter').forEach(button => { button.classList.toggle('active', button === filter); button.setAttribute('aria-selected', button === filter); }); renderMenu(filter.dataset.filter); }
  if (close) { const target = close.dataset.close; target === 'reservation-modal' ? closeReservation() : closePanel(target); }
  if (quickAsk) { const message = quickAsk.dataset.ask; addMessage(message, 'user'); sendChat(message); }
});

$('#open-cart').addEventListener('click', () => openPanel('cart-panel'));
$('#chat-fab').addEventListener('click', () => openPanel('chat-panel'));
$('#overlay').addEventListener('click', () => { closePanel('chat-panel'); closePanel('cart-panel'); });
$('#open-reservation').addEventListener('click', openReservation);
$('#open-reservation-2').addEventListener('click', openReservation);
$('#open-story').addEventListener('click', () => { document.querySelector('#story').scrollIntoView({ behavior: 'smooth' }); });
$('#checkout').addEventListener('click', () => { if (!cart.length) return showToast('Choose something delicious first.'); cart = []; renderCart(); closePanel('cart-panel'); showToast('Order received — see you at the counter!'); });
$('#reservation-form').addEventListener('submit', (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); closeReservation(); event.currentTarget.reset(); showToast(`Thanks, ${form.get('name')}! Your table request is in.`); });
$('#chat-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#chat-input'); const message = input.value.trim(); if (!message) return; input.value = ''; addMessage(message, 'user'); sendChat(message); });
$('#reservation-modal').addEventListener('click', event => { if (event.target === $('#reservation-modal')) closeReservation(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closePanel('chat-panel'); closePanel('cart-panel'); closeReservation(); } });
// Unique session ID
let sessionId = localStorage.getItem('chatSessionId');

if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem('chatSessionId', sessionId);
}
