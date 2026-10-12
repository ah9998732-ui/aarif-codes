// Firebase web config (safe to expose, but secure access with Firestore Rules).
// Fill these values from Firebase Console > Project settings > Your apps.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDoc, doc, query, where, getDocs, updateDoc, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PASTE_FIREBASE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_MESSAGING_SENDER_ID",
  appId: "PASTE_APP_ID"
};
const RAZORPAY_KEY_ID = "rzp_test_replace_me"; // Public key ID only; never put secret here.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const products = [
 {id:"sprite-2l",name:"Sprite",size:"2 L",price:735,unit:"wholesale unit"},
 {id:"thumsup-2l",name:"Thums Up",size:"2 L",price:860,unit:"wholesale unit"},
 {id:"maaza-1500",name:"Maaza",size:"1.5 L",price:860,unit:"wholesale unit"},
 {id:"sprite-1l",name:"Sprite",size:"1 L",price:720,unit:"wholesale unit"},
 {id:"thumsup-1l",name:"Thums Up",size:"1 L",price:720,unit:"wholesale unit"},
 {id:"maaza-850",name:"Maaza",size:"850 ml",price:720,unit:"wholesale unit"},
 {id:"sprite-750",name:"Sprite",size:"750 ml",price:920,unit:"wholesale unit"},
 {id:"thumsup-750",name:"Thums Up",size:"750 ml",price:920,unit:"wholesale unit"},
 {id:"maaza-600",name:"Maaza",size:"600 ml",price:920,unit:"wholesale unit"},
 {id:"sprite-250",name:"Sprite",size:"250 ml",price:530,unit:"wholesale unit"},
 {id:"thumsup-250",name:"Thums Up",size:"250 ml",price:530,unit:"wholesale unit"},
 {id:"maaza-250",name:"Maaza",size:"250 ml",price:570,unit:"wholesale unit"},
 {id:"sprite-can",name:"Sprite Can",size:"Can",price:1040,unit:"wholesale unit"},
 {id:"thumsup-can",name:"Thums Up Can",size:"Can",price:1040,unit:"wholesale unit"},
 {id:"fanta-can",name:"Fanta Can",size:"Can",price:1040,unit:"wholesale unit"},
 {id:"maaza-tp-180",name:"Maaza TP",size:"180 ml",price:380,unit:"wholesale unit"},
 {id:"kinley-2l",name:"Kinley Water",size:"2 L",price:200,unit:"wholesale unit"},
 {id:"kinley-1l",name:"Kinley Water",size:"1 L",price:180,unit:"wholesale unit"},
 {id:"kinley-500",name:"Kinley Water",size:"500 ml",price:180,unit:"wholesale unit"},
 {id:"soda-750",name:"Soda",size:"750 ml",price:365,unit:"wholesale unit"},
 {id:"diet-coke-can",name:"Diet Coca-Cola",size:"Can",price:1040,unit:"wholesale unit"}
];
const cart = new Map();
let lastTracking = null; let trackingTimer = null;
const rupees = n => "₹" + Number(n).toLocaleString("en-IN");
const $ = id => document.getElementById(id);
const safe = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function total(){ return [...cart].reduce((sum,[id,qty])=>sum+products.find(p=>p.id===id).price*qty,0); }
function renderProducts(){
  $("products").innerHTML=products.map(p=>`<article class="product"><div class="product-art" aria-hidden="true">🥤</div><div class="product-info"><h3>${safe(p.name)}</h3><div class="size">${safe(p.size)}</div><div class="price">${rupees(p.price)} <small>/ peti</small></div><button class="btn secondary" data-add="${p.id}">Add to cart</button></div></article>`).join("");
}
function renderCart(){
 $("cart-count").textContent=[...cart.values()].reduce((a,b)=>a+b,0);
 $("cart-lines").innerHTML=cart.size?[...cart].map(([id,q])=>{const p=products.find(x=>x.id===id);return `<div class="cart-line"><div><strong>${safe(p.name)} · ${safe(p.size)}</strong><div class="hint">${rupees(p.price)} × ${q} = ${rupees(p.price*q)}</div></div><div class="qty"><button type="button" data-dec="${id}" aria-label="Decrease">−</button><b>${q}</b><button type="button" data-inc="${id}" aria-label="Increase">+</button></div></div>`}).join(""):'<p class="hint">Cart mein product add karein.</p>';
 $("cart-total").textContent=rupees(total());
}
$("products").addEventListener("click",e=>{const id=e.target.dataset.add;if(id){cart.set(id,(cart.get(id)||0)+1);renderCart();}});
$("cart-lines").addEventListener("click",e=>{const id=e.target.dataset.inc||e.target.dataset.dec;if(!id)return;const q=(cart.get(id)||0)+(e.target.dataset.inc?1:-1);if(q<=0)cart.delete(id);else cart.set(id,q);renderCart();});
function makeItems(){return [...cart].map(([id,quantity])=>{const p=products.find(x=>x.id===id);return {productId:id,name:p.name,size:p.size,unitPrice:p.price,quantity,lineTotal:p.price*quantity};});}
function receiptHtml(o){return `<h3>Order ${safe(o.orderId)}</h3><p class="status">${safe(o.status)}</p><p><b>Customer:</b> ${safe(o.name)} · ${safe(o.phone)}</p><p><b>Address:</b> ${safe(o.address)}</p><p><b>Payment:</b> ${safe(o.paymentMethod)} / ${safe(o.paymentStatus)}</p><div class="timeline">${(o.items||[]).map(i=>`<div>${safe(i.name)} ${safe(i.size)} × ${i.quantity} — ${rupees(i.lineTotal)}</div>`).join("")}</div><p><b>Total: ${rupees(o.total)}</b></p><p>Expected delivery: ${safe(o.eta||"Shop se update hoga")}</p>`;}
$("checkout-form").addEventListener("submit",async e=>{
 e.preventDefault(); if(!cart.size){alert("Pehle cart mein product add karein.");return;}
 const btn=$("place-order");btn.disabled=true;btn.textContent="Processing…";
 try{
   const f=new FormData(e.target); const customer={name:String(f.get("name")).trim(),phone:String(f.get("phone")).trim(),address:String(f.get("address")).trim(),note:String(f.get("note")||"").trim(),paymentMethod:String(f.get("paymentMethod"))};
   const payload={customer,items:makeItems(),total:total()};
   if(customer.paymentMethod==="online"){
     const r=await fetch("/.netlify/functions/create-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
     const data=await r.json();if(!r.ok)throw new Error(data.error||"Payment start nahi ho saka.");
     const options={key:RAZORPAY_KEY_ID,order_id:data.razorpayOrderId,amount:data.amount,currency:"INR",name:"Manoj Sweets & Cold Drink",description:"Wholesale order",prefill:{name:customer.name,contact:customer.phone},handler:async response=>{
       try{const vr=await fetch("/.netlify/functions/verify-payment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,razorpayOrderId:data.razorpayOrderId,razorpayPaymentId:response.razorpay_payment_id,razorpaySignature:response.razorpay_signature})});const vd=await vr.json();if(!vr.ok)throw new Error(vd.error||"Verification failed");showConfirmation(vd.order);cart.clear();renderCart();e.target.reset();}catch(err){$("checkout-result").innerHTML=`<div class="result danger">Payment response mila, lekin verification/order save confirm nahi hua. Order ID aur payment reference ke saath shop se sampark karein. ${safe(err.message)}</div>`;}
     },modal:{ondismiss:()=>{btn.disabled=false;btn.textContent="Place order";}}};
     new window.Razorpay(options).open();
   } else {
     const r=await fetch("/.netlify/functions/create-cod-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
     const data=await r.json();if(!r.ok)throw new Error(data.error||"Order save nahi hua.");
     showConfirmation(data.order);cart.clear();renderCart();e.target.reset();
   }
 }catch(err){$("checkout-result").innerHTML=`<div class="result danger">${safe(err.message)}<p class="tiny">Agar Firebase configuration abhi fill nahi ki hai to README follow karein.</p></div>`;}
 finally{btn.disabled=false;btn.textContent="Place order";}
});
function showConfirmation(o){$("checkout-result").innerHTML=`<div class="result"><p class="eyebrow">ORDER RECEIVED</p><h3>Order confirmation</h3>${receiptHtml(o)}<p class="hint">Tracking ke liye Order ID aur registered mobile number sambhal kar rakhein.</p><button class="btn secondary" id="print-receipt" type="button">Print / Save PDF receipt</button></div>`;$("print-receipt").onclick=()=>{const w=window.open("","_blank");if(!w){alert("Print ke liye browser pop-up allow karein.");return;}w.document.write(`<html><head><title>Receipt ${safe(o.orderId)}</title><style>body{font:16px Arial;padding:28px;color:#111}h3{margin-top:0}.timeline div{padding:7px;border-bottom:1px solid #ddd}</style></head><body><h2>Manoj Sweets & Cold Drink Madarpur</h2>${receiptHtml(o)}<script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();};}
function renderTracking(o){const res=$("tracking-result");res.innerHTML=`<div class="result"><p class="eyebrow">LIVE ORDER STATUS</p>${receiptHtml(o)}<div class="timeline">${(o.history||[]).map(h=>`<div class="active">${safe(h.status)} — ${safe(h.time||"")}${h.eta?` · ETA ${safe(h.eta)}`:""}</div>`).join("")}</div><p class="hint tiny">Status tab khula hone par lagbhag har 20 second mein refresh hota hai.</p></div>`;}
async function refreshTracking(){if(!lastTracking)return;try{const r=await fetch("/.netlify/functions/track-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(lastTracking)});const d=await r.json();if(r.ok)renderTracking(d.order);}catch(_){} }
$("track-form").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);const res=$("tracking-result");res.innerHTML='<p class="hint">Searching…</p>';try{const r=await fetch("/.netlify/functions/track-order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:String(f.get("orderId")).trim(),phone:String(f.get("phone")).trim()})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Order nahi mila");lastTracking={orderId:String(f.get("orderId")).trim(),phone:String(f.get("phone")).trim()};renderTracking(d.order);if(trackingTimer)clearInterval(trackingTimer);trackingTimer=setInterval(()=>{if(lastTracking && document.visibilityState==="visible") refreshTracking();},20000);}catch(err){res.innerHTML=`<div class="result danger">${safe(err.message)}</div>`;}});
renderProducts();renderCart();
