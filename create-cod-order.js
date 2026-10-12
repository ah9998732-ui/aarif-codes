const {firestore,normalize,orderId,response,sendWhatsApp}=require("./_shared.cjs");
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const b=JSON.parse(event.body||"{}"), n=normalize(b);
  if(n.paymentMethod!=="cod") return response(400,{error:"COD payment method required"});
  const id=orderId(), now=new Date().toISOString();
  const order={orderId:id,...n,status:"Order received",paymentStatus:"COD due",eta:"Shop se update hoga",dispatchTime:"",history:[{status:"Order received",time:now}],createdAt:now};
  await firestore().collection("orders").doc(id).set(order);
  const notification=await sendWhatsApp(order,"new_order");
  return response(200,{order,notification});
 }catch(e){return response(400,{error:e.message||"Order save nahi ho saka"});}
};
