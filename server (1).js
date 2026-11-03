// Server Safari Racer: menyajikan index.html + relay multiplayer via WebSocket.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const FILES={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/manifest.json':['manifest.json','application/manifest+json'],'/sw.js':['sw.js','text/javascript'],'/icon-192.png':['icon-192.png','image/png'],'/icon-512.png':['icon-512.png','image/png']};
const srv=http.createServer((q,s)=>{const f=FILES[q.url.split('?')[0]]||FILES['/'];fs.readFile(path.join(__dirname,f[0]),(e,d)=>{s.writeHead(e?500:200,{'Content-Type':f[1],'Cache-Control':'no-cache'});s.end(d)})});
const wss=new WebSocketServer({server:srv});
const rooms=[];let nid=1;
const tx=(r,o,ex)=>r.ps.forEach(p=>p!==ex&&p.ws.readyState===1&&p.ws.send(JSON.stringify(o)));
const info=r=>r.ps.map(p=>({id:p.id,n:p.n,col:p.col,ty:p.ty,slot:p.slot}));
wss.on('connection',ws=>{
  const p={ws,id:nid++};let r=null;
  ws.on('message',d=>{
    let m;try{m=JSON.parse(d)}catch(e){return}
    if(m.t==='join'&&!r){
      Object.assign(p,{n:String(m.n||'Pemain').slice(0,12),col:m.col|0,ty:String(m.ty||'std').slice(0,4)});
      const map=m.map|0;
      r=rooms.find(o=>!o.on&&o.map===map&&o.ps.length<4);
      if(!r){r={map,ps:[],on:false,tm:null,left:10};rooms.push(r)}
      const used=r.ps.map(o=>o.slot);p.slot=[0,1,2,3].find(i=>!used.includes(i));
      r.ps.push(p);ws.send(JSON.stringify({t:'you',id:p.id}));
      tx(r,{t:'lobby',players:info(r)});
      if(r.ps.length>=2&&!r.tm){
        r.left=10;
        r.tm=setInterval(()=>{
          r.left--;tx(r,{t:'lobby',players:info(r),left:r.left});
          if(r.left<=0){clearInterval(r.tm);r.on=true;tx(r,{t:'start',players:info(r)})}
        },1000);
      }
    }else if(r&&(m.t==='s'||m.t==='trap')){m.id=p.id;tx(r,m,p)}
    else if(r&&m.t==='hit'){const o=r.ps.find(x=>x.id===m.to);if(o&&o.ws.readyState===1)o.ws.send(JSON.stringify({t:'hit',s:Math.min(+m.s||1,2)}))}
  });
  ws.on('close',()=>{
    if(!r)return;
    r.ps=r.ps.filter(x=>x!==p);tx(r,{t:'left',id:p.id});
    if(!r.on&&r.ps.length<2&&r.tm){clearInterval(r.tm);r.tm=null}
    if(!r.ps.length){clearInterval(r.tm);rooms.splice(rooms.indexOf(r),1)}
    else if(!r.on)tx(r,{t:'lobby',players:info(r)});
  });
});
const PORT=process.env.PORT||3000;
srv.listen(PORT,()=>console.log('Safari Racer jalan di http://localhost:'+PORT));
