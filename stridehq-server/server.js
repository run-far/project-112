import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app=express();
app.use(cors({origin:process.env.FRONTEND_ORIGIN?.split(',')||true}));
app.use(express.json());

app.get('/health',(_,res)=>res.json({ok:true,service:'stridehq-server'}));

app.post('/api/strava/exchange',async(req,res)=>{
  try{
    const {code}=req.body;
    if(!code)return res.status(400).json({error:'code missing'});
    const body=new URLSearchParams({client_id:process.env.STRAVA_CLIENT_ID,client_secret:process.env.STRAVA_CLIENT_SECRET,code,grant_type:'authorization_code'});
    const r=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json(data);
    res.json(data);
  }catch(error){res.status(500).json({error:error.message})}
});

app.get('/api/strava/activities',async(req,res)=>{
  try{
    const token=req.headers.authorization?.replace(/^Bearer\s+/,'');
    if(!token)return res.status(401).json({error:'token missing'});
    const r=await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=100&page=1',{headers:{authorization:`Bearer ${token}`}});
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json(data);
    res.json(data);
  }catch(error){res.status(500).json({error:error.message})}
});

app.listen(process.env.PORT||8787,()=>console.log(`StrideHQ server on ${process.env.PORT||8787}`));
