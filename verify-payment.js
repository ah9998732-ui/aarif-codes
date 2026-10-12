const crypto=require("crypto");
const Razorpay=require("razorpay");
const {firestore,normalize,orderId,response,sendWhatsApp}=require("./_shared.cjs");
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const b=JSON.parse(event.body||"{}"), n=normalize(b);
  if(!process.env.RAZORPAY_KEY_SECRET||!process.env.RAZORPAY_KEY_ID) return response(503,{error:"Payment verification configured nahi hai"});
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(String(b.razorpayOrderId)+"|"+String(b.razorpayPaymentId)).digest("hex");
  const a=Buffer.from(expected), c=Buffer.from(String(b.razorpaySignature||""));
  if(a.length!==c.length||!crypto.timingSafeEqual(a,c)) return response(400,{error:"Payment signature verify nahi hua"});
  const rp=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const [payment,razorpayOrder]=await Promise.all([rp.payments.fetch(String(b.razorpayPaymentId)),rp.orders.fetch(String(b.razorpayOrderId))]);
  if(payment.order_id!==razorpayOrder.id||razorpayOrder.id!==String(b.razorpayOrderId)||Number(razorpayOrder.amount)!==n.total*100||Number(payment.amount)!==n.total*100||payment.status!=="captured") {
    return response(400,{error:"Payment amount/status verify nahi hua. Agar paisa kata hai to payment reference sambhal kar shop se sampark karein."});
  }
  const id=orderId(), now=new Date().toISOString();
  const order={orderId:id,...n,status:"Order received",paymentStatus:"Paid",razorpayOrderId:String(b.razorpayOrderId),razorpayPaymentId:String(b.razorpayPaymentId),eta:"Shop se update hoga",dispatchTime:"",history:[{status:"Order received",time:now}],createdAt:now};
  await firestore().collection("orders").doc(id).set(order);
  const notification=await sendWhatsApp(order,"new_order");
  return response(200,{order,notification});
 }catch(e){return response(400,{error:e.message||"Payment verify nahi ho saka"});}
};
