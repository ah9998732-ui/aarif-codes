const {firestore,response,checkAdmin,sendWhatsApp}=require("./_shared.cjs");
const ALLOWED=["Order received","Accepted","Preparing","Dispatched","Out for delivery","Delivered","Rejected"];
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const b=JSON.parse(event.body||"{}");if(!checkAdmin(b.pin)) return response(401,{error:"Owner PIN incorrect"});
  if(!/^MS-[A-F0-9]{8}$/.test(String(b.orderId||""))||!ALLOWED.includes(b.status)) return response(400,{error:"Invalid order/status"});
  const db=firestore(), ref=db.collection("orders").doc(b.orderId), snap=await ref.get();
  if(!snap.exists) return response(404,{error:"Order not found"});
  const old=snap.data(), now=new Date().toISOString();
  const patch={status:b.status,eta:String(b.eta||"").slice(0,100),dispatchTime:String(b.dispatchTime||"").slice(0,100),paymentStatus:["Pending","Paid","COD due","Refunded"].includes(b.paymentStatus)?b.paymentStatus:old.paymentStatus,history:[...(old.history||[]),{status:b.status,time:now,eta:String(b.eta||"").slice(0,100),dispatchTime:String(b.dispatchTime||"").slice(0,100)}]};
  await ref.update(patch);
  const updated={...old,...patch};
  const notification=await sendWhatsApp(updated,"status_update");
  const list=await db.collection("orders").orderBy("createdAt","desc").limit(100).get();
  return response(200,{orders:list.docs.map(d=>d.data()),notification});
 }catch(e){return response(400,{error:e.message||"Order update nahi hua"});}
};
