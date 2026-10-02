/* Panel de administración */
(function(){
  var C=window.NC_CONFIG,S=window.NCStore,root=document.getElementById('admin');
  if(!root)return;
  var $=function(id){return document.getElementById(id)};
  var key='',all=[],started=false;
  try{key=sessionStorage.getItem('nc_key')||''}catch(e){}
  var EST=['nuevo','contactado','confirmada','cancelada'];
  var ES={nuevo:'Nuevo',contactado:'Contactado',confirmada:'Confirmada',cancelada:'Cancelada'};

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function todayGT(){
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:C.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};
    p.forEach(function(x){o[x.type]=x.value});return o.year+'-'+o.month+'-'+o.day;
  }
  function fDate(k){
    if(!k)return '';var a=k.split('-');
    return new Intl.DateTimeFormat('es-GT',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(Date.UTC(+a[0],+a[1]-1,+a[2])));
  }
  function f12(h){if(!h)return '';var a=h.split(':'),n=+a[0];return (n%12||12)+':'+a[1]+' '+(n>=12?'PM':'AM')}
  function fStamp(iso){
    var d=new Date(iso);if(isNaN(d))return '';
    return new Intl.DateTimeFormat('es-GT',{timeZone:C.timeZone,day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(d);
  }
  function waNum(p){var d=String(p).replace(/\D/g,'');return d.length===8?'502'+d:d}
  function waLink(r){
    var t='Hola '+r.nombre+', te escribimos de Nutrition Club'+(r.tipo==='cita'&&r.fecha?' para confirmar tu cita '+(r.modalidad==='virtual'?'virtual ':'')+'del '+fDate(r.fecha)+' a las '+f12(r.hora)+'.':' sobre tu solicitud.');
    return 'https://wa.me/'+waNum(r.telefono)+'?text='+encodeURIComponent(t);
  }
  var WA='<svg class="ico" width="16" height="16" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="'+"M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"+'"/></svg>';

  function msg(t){var m=$('a-msg');m.textContent=t||'';if(t)setTimeout(function(){if(m.textContent===t)m.textContent=''},3500)}
  function showLogin(err){$('panel').hidden=true;$('login').hidden=false;$('a-err').textContent=err||''}

  function load(){
    S.list(key).then(function(rows){
      all=rows||[];$('login').hidden=true;$('panel').hidden=false;render();
    }).catch(function(ex){
      if(ex&&ex.message==='auth'){key='';try{sessionStorage.removeItem('nc_key')}catch(e){}showLogin(key?'':'Clave incorrecta.')}
      else{$('panel').hidden=false;$('list').innerHTML='<div class="empty">No se pudieron cargar los registros. Revisa la conexión y toca Actualizar.</div>'}
    });
  }
  function filtered(){
    var q=$('a-q').value.trim().toLowerCase(),tp='',md=$('a-mod').value,es=$('a-est').value,o=$('a-ord').value;
    var rows=all.filter(function(r){
      if(tp&&r.tipo!==tp)return false;if(md&&(r.modalidad||'presencial')!==md)return false;if(es&&r.estado!==es)return false;
      if(q&&(r.nombre+' '+r.correo+' '+r.telefono).toLowerCase().indexOf(q)<0)return false;return true;
    });
    if(o==='cita')rows.sort(function(a,b){
      var ka=a.fecha?a.fecha+a.hora:'9999',kb=b.fecha?b.fecha+b.hora:'9999';return ka<kb?-1:ka>kb?1:0;
    });else rows.sort(function(a,b){return a.creado<b.creado?1:-1});
    return rows;
  }
  function stats(){
    var t=todayGT(),nuevos=0,prox=0,datos=0;
    all.forEach(function(r){
      if(r.estado==='nuevo')nuevos++;
      if(r.tipo==='datos')datos++;
      if(r.tipo==='cita'&&r.fecha>=t&&(r.estado==='nuevo'||r.estado==='confirmada'||r.estado==='contactado'))prox++;
    });
    $('stats').innerHTML=[['Registros',all.length],['Nuevos',nuevos],['Citas próximas',prox]].map(function(s){return '<div class="stat"><b>'+s[1]+'</b><span>'+s[0]+'</span></div>'}).join('');
  }
  function render(){
    stats();
    var rows=filtered();
    $('a-clear').hidden=(S.mode!=='local');
    $('a-count').textContent=rows.length+' de '+all.length+' registros';
    if(!rows.length){$('list').innerHTML='<div class="empty">'+(all.length?'Ningún registro coincide con los filtros.':'Todavía no hay registros. Aparecerán aquí cuando alguien llene el formulario de la página.')+'</div>';return}
    $('list').innerHTML=rows.map(function(r){
      var cita=r.tipo==='cita'&&r.fecha?'<span class="cita"><b>'+esc(fDate(r.fecha).replace(/^./,function(c){return c.toUpperCase()}))+'</b></span><span>'+esc(f12(r.hora))+'</span><span class="tag'+(r.modalidad==='virtual'?' virtual':'')+'">'+(r.modalidad==='virtual'?'Virtual':'Presencial')+'</span>':'<span class="tag">Solo datos</span>';
      var opts=EST.map(function(e){return '<option value="'+e+'"'+(r.estado===e?' selected':'')+'>'+ES[e]+'</option>'}).join('');
      return '<article class="rec" data-st="'+esc(r.estado)+'">'+
        '<div class="c" data-label="Paciente"><strong>'+esc(r.nombre)+'</strong><small>Registrado: '+esc(fStamp(r.creado))+'</small></div>'+
        '<div class="c" data-label="Contacto"><span>'+esc(r.correo)+'</span><a class="wa" href="'+waLink(r)+'" target="_blank" rel="noopener">'+WA+'<span>'+esc(r.telefono)+'</span></a></div>'+
        '<div class="c" data-label="Cita">'+cita+'</div>'+
        '<div class="c" data-label="Estado"><select data-id="'+esc(r.id)+'" aria-label="Estado de '+esc(r.nombre)+'">'+opts+'</select></div>'+
        (r.comentarios?'<div class="note"><b>Comentarios</b>'+esc(r.comentarios)+'</div>':'')+'</article>';
    }).join('');
  }
  $('list').addEventListener('change',function(e){
    var s=e.target.closest('select[data-id]');if(!s)return;
    var id=s.getAttribute('data-id'),v=s.value;
    S.setStatus(id,v,key).then(function(){
      all.forEach(function(r){if(r.id===id)r.estado=v});render();msg('Estado actualizado');
    }).catch(function(){msg('No se pudo actualizar. Intenta de nuevo.');load()});
  });
  ['a-q','a-mod','a-est','a-ord'].forEach(function(id){$(id).addEventListener('input',render)});
  $('a-refresh').addEventListener('click',function(){load();msg('Actualizado')});
  $('a-clear').addEventListener('click',function(){
    var b=$('a-clear');
    if(b.getAttribute('data-sure')!=='1'){b.setAttribute('data-sure','1');b.textContent='Toca de nuevo para borrar';setTimeout(function(){b.removeAttribute('data-sure');b.textContent='Borrar datos de prueba'},3500);return}
    S.clearDemo();b.removeAttribute('data-sure');b.textContent='Borrar datos de prueba';load();msg('Datos de prueba borrados');
  });
  $('a-csv').addEventListener('click',function(){
    var q=function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'};
    var head=['registrado','nombre','correo','telefono','fecha_cita','hora_cita','modalidad','estado','comentarios'];
    var lines=[head.join(',')].concat(filtered().map(function(r){return [r.creado,r.nombre,r.correo,r.telefono,r.fecha,r.hora,r.modalidad||'presencial',r.estado,r.comentarios].map(q).join(',')}));
    var text=lines.join('\n');
    try{navigator.clipboard.writeText(text).then(function(){msg('CSV copiado')},function(){msg('No se pudo copiar')})}catch(e){msg('No se pudo copiar')}
  });
  $('login').addEventListener('submit',function(e){
    e.preventDefault();key=$('a-key').value;if(!key)return;
    try{sessionStorage.setItem('nc_key',key)}catch(x){}
    S.list(key).then(function(rows){all=rows||[];$('login').hidden=true;$('panel').hidden=false;render()})
      .catch(function(){key='';try{sessionStorage.removeItem('nc_key')}catch(x){}showLogin('Clave incorrecta.')});
  });

  function start(){
    if(S.mode==='local'){$('demonote').hidden=false;load()}
    else if(key)load();else showLogin('');
  }
  window.NCAdmin={show:function(){started=true;start()}};
  if(!root.closest('[hidden]'))window.NCAdmin.show();
})();
