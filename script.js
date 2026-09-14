// slider
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('#dots span');
let idx=0, timer;
function show(i){
  slides.forEach(s=>s.classList.remove('active'));
  dots.forEach(d=>d.classList.remove('active'));
  idx=(i+slides.length)%slides.length;
  slides[idx].classList.add('active');
  dots[idx].classList.add('active');
}
function next(){ show(idx+1) }
function prev(){ show(idx-1) }
document.getElementById('next').addEventListener('click',()=>{ next(); reset() });
document.getElementById('prev').addEventListener('click',()=>{ prev(); reset() });
dots.forEach((d,i)=> d.addEventListener('click',()=>{ show(i); reset() }));
function reset(){ clearInterval(timer); timer=setInterval(next,5000); }
timer=setInterval(next,5000);

// mega menu
const catBtn=document.getElementById('catBtn');
const mega=document.getElementById('mega');
let megaOpen=false;
catBtn.addEventListener('click',()=>{ megaOpen=!megaOpen; mega.classList.toggle('open',megaOpen); });
document.addEventListener('click',(e)=>{ if(!e.target.closest('.main-nav')){ megaOpen=false; mega.classList.remove('open'); }});

// mobile nav
const menuToggle=document.getElementById('menuToggle');
const navLinks=document.getElementById('navLinks');
menuToggle.addEventListener('click',()=> navLinks.classList.toggle('open'));

// search filter
const searchInput=document.getElementById('searchInput');
const searchCat=document.getElementById('searchCat');
const allCards=document.querySelectorAll('.p-card');
function filterSearch(){
  const q=searchInput.value.toLowerCase().trim();
  const cat=searchCat.value;
  allCards.forEach(c=>{
    const title=c.querySelector('h3')?.textContent.toLowerCase()||'';
    const inCat = cat==='All Categories' || (cat==='Mobile Phones' && title.includes('iphone')||title.includes('samsung')||title.includes('galaxy')) || (cat==='Computers' && (title.includes('macbook')||title.includes('dell')||title.includes('hp')||title.includes('lenovo'))) || title.toLowerCase().includes(cat.toLowerCase());
    const matchQ = !q || title.includes(q);
    const show = matchQ && (cat==='All Categories' ? true : (title.includes(cat.toLowerCase().slice(0,4)) || cat==='All Categories' || title.includes(q) ));
    // simpler: if cat is Mobile Phones filter to iphone/samsung, else show
    let visible = matchQ;
    if(cat==='Mobile Phones') visible = matchQ && (title.includes('iphone')||title.includes('samsung')||title.includes('galaxy')||title.includes('watch'));
    else if(cat==='Computers') visible = matchQ && (title.includes('macbook')||title.includes('dell')||title.includes('hp')||title.includes('lenovo')||title.includes('airpod'));
    else if(cat!=='All Categories') visible = matchQ && title.includes(cat.toLowerCase());
    c.style.display = visible ? '' : 'none';
  });
}
searchInput.addEventListener('input', filterSearch);
searchCat.addEventListener('change', filterSearch);
document.getElementById('searchBtn').addEventListener('click', filterSearch);
searchInput.addEventListener('keydown', e=>{ if(e.key==='Enter') filterSearch() });

// wishlist
document.querySelectorAll('.wish').forEach(b=>{
  b.addEventListener('click',()=>{
    b.classList.toggle('active');
    const icon=b.querySelector('i');
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
    const count=document.querySelector('.wish-count');
    const active=document.querySelectorAll('.wish.active').length;
    count.textContent=active;
    toast(b.classList.contains('active')?'Added to wishlist':'Removed from wishlist');
  });
});

// cart
let cart=[];
const cartCount=document.getElementById('cartCount');
const cartCount2=document.getElementById('cartCount2');
const cartItems=document.getElementById('cartItems');
const cartTotal=document.getElementById('cartTotal');
const drawer=document.getElementById('cartDrawer');
const overlay=document.getElementById('overlay');
function openCart(){ drawer.classList.add('open'); overlay.classList.add('open'); }
function closeCart(){ drawer.classList.remove('open'); overlay.classList.remove('open'); }
document.getElementById('cartBtn').addEventListener('click', (e)=>{ e.preventDefault(); openCart(); });
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('continueShop').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);

function formatN(n){ return '₦'+Number(n).toLocaleString('en-NG')+'.00'; }
function renderCart(){
  cartCount.textContent=cart.reduce((s,i)=>s+i.qty,0);
  cartCount2.textContent=cart.reduce((s,i)=>s+i.qty,0);
  document.querySelector('.cart-action strong').textContent=formatN(cart.reduce((s,i)=>s+i.price*i.qty,0));
  if(cart.length===0){ cartItems.innerHTML='<p class="empty">Your cart is empty.</p>'; cartTotal.textContent='₦0.00'; return; }
  cartItems.innerHTML='';
  let total=0;
  cart.forEach((item,idx)=>{
    total+=item.price*item.qty;
    const div=document.createElement('div');
    div.className='cart-item';
    div.innerHTML=`
      <img src="https://images.unsplash.com/photo-1592899677977-9bb10ba128a1?q=80&w=200&auto=format&fit=crop" alt="">
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <small>${formatN(item.price)} each</small>
        <div class="qty">
          <button class="dec">−</button><span>${item.qty}</span><button class="inc">+</button>
          <span class="remove">Remove</span>
        </div>
        <div class="cart-item-price">${formatN(item.price*item.qty)}</div>
      </div>
    `;
    div.querySelector('.inc').addEventListener('click',()=>{ item.qty++; renderCart(); });
    div.querySelector('.dec').addEventListener('click',()=>{ item.qty=Math.max(1,item.qty-1); renderCart(); });
    div.querySelector('.remove').addEventListener('click',()=>{ cart.splice(idx,1); renderCart(); toast('Removed from cart'); });
    cartItems.appendChild(div);
  });
  cartTotal.textContent=formatN(total);
}
document.querySelectorAll('.add-cart').forEach(btn=>{
  btn.addEventListener('click',()=>{
    if(btn.textContent.includes('Select options')){ toast('Please select variant on product page'); return; }
    if(btn.textContent.includes('Out of Stock')) return;
    const name=btn.dataset.name;
    const price=Number(btn.dataset.price);
    const found=cart.find(c=>c.name===name);
    if(found) found.qty++;
    else cart.push({name,price,qty:1});
    renderCart();
    openCart();
    toast(name+' added to cart');
  });
});

// toast
const toastEl=document.getElementById('toast');
let toastTimer;
function toast(msg){
  toastEl.textContent=msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=> toastEl.classList.remove('show'),2200);
}

// reviews slider
const reviewsTrack=document.getElementById('reviewsTrack');
let revIdx=0;
function updateReviews(){
  if(!reviewsTrack) return;
  const cardW=356;
  const wrapW=reviewsTrack.parentElement.offsetWidth;
  const visible=Math.floor(wrapW/cardW) || 1;
  const maxIdx=Math.max(0, reviewsTrack.children.length - visible);
  revIdx=Math.min(Math.max(revIdx,0), maxIdx);
  reviewsTrack.style.transform=`translateX(${-revIdx*cardW}px)`;
}
document.getElementById('revNext')?.addEventListener('click',()=>{ revIdx++; updateReviews(); });
document.getElementById('revPrev')?.addEventListener('click',()=>{ revIdx--; updateReviews(); });
window.addEventListener('resize', updateReviews);
setInterval(()=>{ if(reviewsTrack){ revIdx=(revIdx+1)%Math.max(1, reviewsTrack.children.length-2); updateReviews(); } },4000);
updateReviews();

// smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const href=a.getAttribute('href');
    if(href.length>1){
      const target=document.querySelector(href);
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth', block:'start'}); navLinks.classList.remove('open'); }
    }
  });
});
