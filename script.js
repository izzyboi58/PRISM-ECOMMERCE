/* PRISM — shared script. Safe on every page (home, product pages, checkout). */
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

/* ---------- toast (guarded) ---------- */
const toastEl = $('#toast');
let toastTimer;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
}

/* ---------- hero slider (home only) ---------- */
const slides = $$('.slide');
const dots = $$('#dots span');
let idx = 0, timer;
function show(i) {
  if (!slides.length) return;
  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  idx = (i + slides.length) % slides.length;
  slides[idx]?.classList.add('active');
  dots[idx]?.classList.add('active');
}
const next = () => show(idx + 1);
const prev = () => show(idx - 1);
function reset() { clearInterval(timer); if (slides.length > 1) timer = setInterval(next, 5000); }
$('#next')?.addEventListener('click', () => { next(); reset(); });
$('#prev')?.addEventListener('click', () => { prev(); reset(); });
dots.forEach((d, i) => d.addEventListener('click', () => { show(i); reset(); }));
reset();

/* ---------- mega menu & mobile nav ---------- */
const catBtn = $('#catBtn');
const mega = $('#mega');
let megaOpen = false;
catBtn?.addEventListener('click', () => { megaOpen = !megaOpen; mega?.classList.toggle('open', megaOpen); });
document.addEventListener('click', e => {
  if (megaOpen && !e.target.closest('.main-nav')) { megaOpen = false; mega?.classList.remove('open'); }
});
const menuToggle = $('#menuToggle');
const navLinks = $('#navLinks');
menuToggle?.addEventListener('click', () => navLinks?.classList.toggle('open'));

/* ---------- search filter ---------- */
const searchInput = $('#searchInput');
const searchCat = $('#searchCat');
const allCards = $$('.p-card');
function filterSearch() {
  if (!searchInput) return;
  const q = searchInput.value.toLowerCase().trim();
  const cat = searchCat?.value || 'All Categories';
  allCards.forEach(c => {
    const title = (c.querySelector('h3')?.textContent || '').toLowerCase();
    let visible = !q || title.includes(q);
    if (cat === 'Mobile Phones') visible = visible && /iphone|samsung|galaxy|watch/.test(title);
    else if (cat === 'Computers') visible = visible && /macbook|dell|hp|lenovo|airpod|xps/.test(title);
    else if (cat === 'Accessories') visible = visible && /anker|power|watch|earbud|speaker|charger|stylepod/.test(title);
    else if (cat !== 'All Categories') visible = visible && title.includes(cat.toLowerCase());
    c.style.display = visible ? '' : 'none';
  });
}
searchInput?.addEventListener('input', filterSearch);
searchCat?.addEventListener('change', filterSearch);
$('#searchBtn')?.addEventListener('click', filterSearch);
searchInput?.addEventListener('keydown', e => { if (e.key === 'Enter') filterSearch(); });

/* ---------- wishlist ---------- */
$$('.wish').forEach(b => {
  b.addEventListener('click', () => {
    b.classList.toggle('active');
    const icon = b.querySelector('i');
    icon?.classList.toggle('fa-regular');
    icon?.classList.toggle('fa-solid');
    const count = $('.wish-count');
    if (count) count.textContent = $$('.wish.active').length;
    toast(b.classList.contains('active') ? 'Added to wishlist' : 'Removed from wishlist');
  });
});

/* ---------- cart (persisted in localStorage) ---------- */
let cart = [];
try { cart = JSON.parse(localStorage.getItem('prism_cart') || '[]'); } catch (e) { cart = []; }
if (!Array.isArray(cart)) cart = [];
function saveCart() { localStorage.setItem('prism_cart', JSON.stringify(cart)); }

const cartCount = $('#cartCount');
const cartCount2 = $('#cartCount2');
const cartItems = $('#cartItems');
const cartTotal = $('#cartTotal');
const drawer = $('#cartDrawer');
const overlay = $('#overlay');
const hasCartUI = !!(cartCount && cartItems && drawer);

function openCart() { drawer?.classList.add('open'); overlay?.classList.add('open'); }
function closeCart() { drawer?.classList.remove('open'); overlay?.classList.remove('open'); }

$('#cartBtn')?.addEventListener('click', e => { e.preventDefault(); openCart(); });
$('#closeCart')?.addEventListener('click', closeCart);
$('#continueShop')?.addEventListener('click', closeCart);
overlay?.addEventListener('click', closeCart);

function formatN(n) { return '₦' + Number(n).toLocaleString('en-NG') + '.00'; }
function renderCart() {
  saveCart();
  const totalQty = cart.reduce((s, i) => s + (Number(i.qty) || 1), 0);
  const totalPrice = cart.reduce((s, i) => s + Number(i.price) * (Number(i.qty) || 1), 0);
  if (cartCount) cartCount.textContent = totalQty;
  if (cartCount2) cartCount2.textContent = totalQty;
  const cartActionTotal = $('.cart-action strong');
  if (cartActionTotal) cartActionTotal.textContent = formatN(totalPrice);

  if (!cartItems) return;
  if (!cart.length) {
    cartItems.innerHTML = '<p class="empty">Your cart is empty.</p>';
    if (cartTotal) cartTotal.textContent = '₦0.00';
    return;
  }
  cartItems.innerHTML = '';
  cart.forEach((item, i) => {
    const qty = Number(item.qty) || 1;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="https://images.unsplash.com/photo-1592899677977-9bb10ba128a1?q=80&w=200&auto=format&fit=crop" alt="">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <small>${formatN(item.price)} each</small>
        <div class="qty">
          <button class="dec" aria-label="decrease quantity">−</button><span>${qty}</span><button class="inc" aria-label="increase quantity">+</button>
          <span class="remove">Remove</span>
        </div>
        <div class="cart-item-price">${formatN(item.price * qty)}</div>
      </div>`;
    $('.inc', div)?.addEventListener('click', () => { item.qty = qty + 1; renderCart(); });
    $('.dec', div)?.addEventListener('click', () => { item.qty = Math.max(1, qty - 1); renderCart(); });
    $('.remove', div)?.addEventListener('click', () => { cart.splice(i, 1); renderCart(); toast('Removed from cart'); });
    cartItems.appendChild(div);
  });
  if (cartTotal) cartTotal.textContent = formatN(totalPrice);
}

$$('.add-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.textContent || '';
    if (text.includes('Select options')) { toast('Please select variant on product page'); return; }
    if (text.includes('Out of Stock')) { toast('This item is out of stock'); return; }
    const name = btn.dataset.name || (btn.closest('.p-card')?.querySelector('h3')?.textContent || '').trim();
    const price = Number(btn.dataset.price) || 0;
    if (!name || !price) { toast('Product details missing'); return; }
    const found = cart.find(c => c.name === name);
    if (found) found.qty = (Number(found.qty) || 1) + 1;
    else cart.push({ name, price, qty: 1 });
    renderCart();
    openCart();
    toast(name + ' added to cart');
  });
});

if (hasCartUI) renderCart();

/* ---------- checkout button ---------- */
$('.checkout')?.addEventListener('click', () => {
  if (!cart.length) { toast('Your cart is empty.'); return; }
  closeCart();
  window.location.href = 'checkout.html';
});

/* ---------- reviews slider ---------- */
const reviewsTrack = $('#reviewsTrack');
let revIdx = 0;
function updateReviews() {
  if (!reviewsTrack) return;
  const cardW = 356;
  const wrapW = reviewsTrack.parentElement?.offsetWidth || 0;
  const visible = Math.max(1, Math.floor(wrapW / cardW));
  const maxIdx = Math.max(0, reviewsTrack.children.length - visible);
  revIdx = Math.min(Math.max(revIdx, 0), maxIdx);
  reviewsTrack.style.transform = `translateX(${-revIdx * cardW}px)`;
}
$('#revNext')?.addEventListener('click', () => { revIdx++; updateReviews(); });
$('#revPrev')?.addEventListener('click', () => { revIdx--; updateReviews(); });
window.addEventListener('resize', updateReviews);
if (reviewsTrack) setInterval(() => {
  revIdx = (revIdx + 1) % Math.max(1, reviewsTrack.children.length - 2);
  updateReviews();
}, 4000);
updateReviews();

/* ---------- smooth scroll for in-page links ---------- */
$$('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    const target = $(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks?.classList.remove('open');
    }
  });
});
