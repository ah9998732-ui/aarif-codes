const admin = require("firebase-admin");
const crypto = require("crypto");
let db;
function firestore() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable missing");
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  if (!db) db = admin.firestore();
  return db;
}
const PRICE = {
 "sprite-2l": ["Sprite","2 L",735], "thumsup-2l":["Thums Up","2 L",860],
 "maaza-1500":["Maaza","1.5 L",860], "sprite-1l":["Sprite","1 L",720],
 "thumsup-1l":["Thums Up","1 L",720], "maaza-850":["Maaza","850 ml",720],
 "sprite-750":["Sprite","750 ml",920], "thumsup-750":["Thums Up","750 ml",920],
 "maaza-600":["Maaza","600 ml",920], "sprite-250":["Sprite","250 ml",530],
 "thumsup-250":["Thums Up","250 ml",530], "maaza-250":["Maaza","250 ml",570],
 "sprite-can":["Sprite Can","Can",1040], "thumsup-can":["Thums Up Can","Can",1040],
 "fanta-can":["Fanta Can","Can",1040], "maaza-tp-180":["Maaza TP","180 ml",380],
 "kinley-2l":["Kinley Water","2 L",200], "kinley-1l":["Kinley Water","1 L",180],
 "kinley-500":["Kinley Water","500 ml",180], "soda-750":["Soda","750 ml",365],
 "diet-coke-can":["Diet Coca-Cola","Can",1040]
};
function normalize(payload) {
  const c=payload?.customer||{};
  const name=String(c.name||"").trim(), phone=String(c.phone||"").replace(/\D/g,""), address=String(c.address||"").trim();
  if(name.length<2 || phone.length!==10 || address.length<5) throw new Error("Customer name, 10-digit mobile aur poora address zaroori hai.");
  if(!Array.isArray(payload.items)||!payload.items.length||payload.items.length>40) throw new Error("Cart khaali hai ya invalid hai.");
  const items=payload.items.map(it=>{
    const p=PRICE[it.productId];
    const quantity=Number(it.quantity);
    if(!p||!Number.isInteger(quantity)||quantity<1||quantity>500) throw new Error("Invalid product/quantity.");
    return {productId:it.productId,name:p[0],size:p[1],unitPrice:p[2],quantity,lineTotal:p[2]*quantity};
  });
  const total=items.reduce((s,i)=>s+i.lineTotal,0);
  if(total<1||total>5000000) throw new Error("Order total invalid.");
  return {name,phone,address,note:String(c.note||"").slice(0,500),paymentMethod:String(c.paymentMethod||"cod"),items,total};
}
function orderId(){return "MS-"+crypto.randomBytes(4).toString("hex").toUpperCase();}
function response(statusCode, body){
 const allowed=process.env.OWNER_ORIGIN||"";
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
 if(allowed) headers["Access-Control-Allow-Origin"]=allowed;
 return {statusCode,headers,body:statusCode===204?"":JSON.stringify(body)};
}
async function sendWhatsApp(order, eventType="status"){
 const id=process.env.WA_PHONE_NUMBER_ID, token=process.env.WA_ACCESS_TOKEN, template=process.env.WA_TEMPLATE_NAME, lang=process.env.WA_TEMPLATE_LANGUAGE||"en_US";
 if(!id||!token||!template) return {sent:false,reason:"WhatsApp Cloud API not configured"};
 // Requires an approved WhatsApp template with three BODY text parameters: order ID, status, ETA.
 const payload={messaging_product:"whatsapp",to:"91"+String(order.phone||"").replace(/\D/g,""),type:"template",template:{name:template,language:{code:lang},components:[{type:"body",parameters:[{type:"text",text:String(order.orderId||"")},{type:"text",text:String(order.status||eventType)},{type:"text",text:String(order.eta||"Shop se update hoga")}]}]}};
 try{const r=await fetch(`https://graph.facebook.com/v22.0/${id}/messages`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok) throw new Error(d.error?.message||"WhatsApp API failed");return {sent:true};}
 catch(e){console.error("WhatsApp notification failed:",e.message);return {sent:false,reason:e.message};}
}
function checkAdmin(pin){return Boolean(process.env.ADMIN_PIN)&&String(pin||"")===process.env.ADMIN_PIN;}
module.exports={firestore,normalize,orderId,response,checkAdmin,sendWhatsApp};
