const {firestore,response,checkAdmin}=require("./_shared.cjs");
exports.handler=async(event)=>{
 if(event.httpMethod==="OPTIONS") return response(204,{});
 if(event.httpMethod!=="POST") return response(405,{error:"Method not allowed"});
 try{
  const b=JSON.parse(event.body||"{}");if(!checkAdmin(b.pin)) return response(401,{error:"Owner PIN incorrect"});
  const snap=await firestore().collection("orders").orderBy("createdAt","desc").limit(100).get();
  return response(200,{orders:snap.docs.map(d=>d.data())});
 }catch(e){return response(400,{error:e.message||"Orders load nahi hue"});}
};
