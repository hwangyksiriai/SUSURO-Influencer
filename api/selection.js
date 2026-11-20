const catalog = require('../lib/selection-catalog.json');

module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  const webhook = process.env.SELECTION_SHEET_WEBHOOK;
  const secret = process.env.SELECTION_SHEET_SECRET;
  if(req.method==='GET') return res.json({ready:Boolean(webhook && secret)});
  if(req.method!=='POST') return res.status(405).end();
  if(!webhook || !secret) return res.status(503).json({ok:false});
  const {id,handles}=req.body || {};
  if(typeof id!=='string' || !/^[a-f0-9-]{36}$/i.test(id) ||
      !Array.isArray(handles) || !handles.length || handles.length>catalog.length ||
      new Set(handles).size!==handles.length) return res.status(400).json({ok:false});
  const people=catalog.filter(person=>handles.includes(person.handle));
  if(people.length!==handles.length) return res.status(400).json({ok:false});
  const total=people.reduce((sum,person)=>sum+person.price,0);
  const submittedAt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'medium'}).format(new Date());
  const rows=people.map(({name,handle,price})=>[submittedAt,id,name,handle,'https://www.instagram.com/'+encodeURIComponent(handle)+'/',price,people.length,total]);
  try {
    const response=await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret,id,rows}),signal:AbortSignal.timeout(12000)});
    if(!response.ok || !(await response.json()).ok) return res.status(502).json({ok:false});
    return res.json({ok:true});
  } catch {
    return res.status(502).json({ok:false});
  }
};
