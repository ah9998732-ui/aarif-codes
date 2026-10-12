const {firestore,response}=require("./_shared.cjs");
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const b=JSON.parse(event.body||"{}"), id=String(b.orderId||"").trim().toUpperCase(), phone=String(b.phone||"").replace(/\D/g,"");
  if(!/^MS-[A-F0-9]{8}$/.test(id)||phone.length!==10) return response(400,{error:"Order ID ya mobile number sahi nahi hai"});
  const snap=await firestore().collection("orders").doc(id).get();
  if(!snap.exists||snap.data().phone!==phone) return response(404,{error:"Is Order ID aur mobile ka order nahi mila"});
  const o=snap.data();
  return response(200,{order:{orderId:o.orderId,name:o.name,phone:o.phone,address:o.address,items:o.items,total:o.total,status:o.status,paymentMethod:o.paymentMethod,paymentStatus:o.paymentStatus,eta:o.eta,dispatchTime:o.dispatchTime,history:o.history||[]}});
 }catch(e){return response(400,{error:"Order track nahi ho saka"});}
};
