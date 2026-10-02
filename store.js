/* Almacenamiento de registros: Google Sheets (si hay sheetUrl) o este navegador (modo demo). */
(function(){
  var C=window.NC_CONFIG,LS='nc_registros_demo',mem=[];
  function lsGet(){try{var v=localStorage.getItem(LS);return v?JSON.parse(v):[]}catch(e){return mem}}
  function lsSet(a){mem=a;try{localStorage.setItem(LS,JSON.stringify(a))}catch(e){}}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function json(r){return r.json()}
  function post(body){return fetch(C.sheetUrl,{method:'POST',body:JSON.stringify(body)}).then(json)}
  var S={
    mode:C.sheetUrl?'sheet':'local',
    create:function(rec){
      if(S.mode==='sheet')return post({action:'create',rec:rec}).then(function(r){if(!r.ok)throw new Error(r.error||'error');return r.id});
      return new Promise(function(res,rej){
        var a=lsGet();
        if(rec.tipo==='cita'&&a.some(function(x){return x.tipo==='cita'&&x.estado!=='cancelada'&&x.fecha===rec.fecha&&x.hora===rec.hora}))return rej(new Error('taken'));
        var r={id:uid(),creado:new Date().toISOString(),tipo:rec.tipo,nombre:rec.nombre,correo:rec.correo,telefono:rec.telefono,fecha:rec.fecha||'',hora:rec.hora||'',modalidad:rec.modalidad||'presencial',comentarios:rec.comentarios||'',estado:'nuevo'};
        a.unshift(r);lsSet(a);res(r.id);
      });
    },
    taken:function(){
      if(S.mode==='sheet')return fetch(C.sheetUrl+'?action=taken').then(json).then(function(j){return j.taken||[]});
      return Promise.resolve(lsGet().filter(function(x){return x.tipo==='cita'&&x.estado!=='cancelada'&&x.fecha}).map(function(x){return x.fecha+' '+x.hora}));
    },
    list:function(key){
      if(S.mode==='sheet')return fetch(C.sheetUrl+'?action=list&key='+encodeURIComponent(key)).then(json).then(function(j){if(!j.ok)throw new Error(j.error||'error');return j.records});
      return Promise.resolve(lsGet());
    },
    setStatus:function(id,estado,key){
      if(S.mode==='sheet')return post({action:'status',key:key,id:id,estado:estado}).then(function(r){if(!r.ok)throw new Error(r.error||'error')});
      var a=lsGet();a.forEach(function(x){if(x.id===id)x.estado=estado});lsSet(a);return Promise.resolve();
    },
    clearDemo:function(){lsSet([])}
  };
  window.NCStore=S;
})();
