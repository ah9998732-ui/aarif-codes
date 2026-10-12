const Razorpay=require("razorpay");
const {normalize,response}=require("./_shared.cjs");
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const n=normalize(JSON.parse(event.body||"{}"));
  if(n.paymentMethod!=="online") return response(400,{error:"Online payment required"});
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET) return response(503,{error:"Online payment abhi configure nahi hai. COD use karein."});
  const rp=new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
  const order=await rp.orders.create({amount:n.total*100,currency:"INR",receipt:"ms-"+Date.now(),notes:{phone:n.phone}});
  return response(200,{razorpayOrderId:order.id,amount:order.amount,currency:order.currency});
 }catch(e){return response(400,{error:e.message||"Payment start nahi ho saka"});}
};
