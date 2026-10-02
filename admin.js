/* Panel de administración: login, calendario de citas, lista y confirmación por WhatsApp */
(function(){
  var C=window.NC_CONFIG,S=window.NCStore,root=document.getElementById('admin');
  if(!root)return;
  var $=function(id){return document.getElementById(id)};
  var token='',all=[];
  try{token=sessionStorage.getItem('nc_tok')||''}catch(e){}
  var EST=['nuevo','contactado','confirmada','cancelada'];
  var ES={nuevo:'Nuevo',contactado:'Contactado',confirmada:'Confirmada',cancelada:'Cancelada'};
  var MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var st={view:'cal',y:0,m:0,sel:null};
  var WAPATH="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z";
  var WA='<svg class="ico" width="18" height="18" viewBox="0 0 448 512" aria-hidden="true" focusable="false"><path fill="currentColor" d="'+WAPATH+'"/></svg>';

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pad(n){return ('0'+n).slice(-2)}
  function key(y,m,d){return y+'-'+pad(m+1)+'-'+pad(d)}
  function todayGT(){
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:C.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};
    p.forEach(function(x){o[x.type]=x.value});return o.year+'-'+o.month+'-'+o.day;
  }
  function parts(k){var a=k.split('-');return {y:+a[0],m:+a[1]-1,d:+a[2]}}
  function longDate(k){var p=parts(k);return new Intl.DateTimeFormat('es-GT',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(Date.UTC(p.y,p.m,p.d)))}
  function shortDate(k){var p=parts(k);return new Intl.DateTimeFormat('es-GT',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date(Date.UTC(p.y,p.m,p.d)))}
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function f12(h){if(!h)return '';var a=h.split(':'),n=+a[0];return (n%12||12)+':'+a[1]+' '+(n>=12?'PM':'AM')}
  function fStamp(iso){var d=new Date(iso);if(isNaN(d))return '';return new Intl.DateTimeFormat('es-GT',{timeZone:C.timeZone,day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(d)}
  function modLabel(r){return r.modalidad==='virtual'?'virtual':'presencial'}
  function waNum(p){var d=String(p).replace(/\D/g,'');return d.length===8?'502'+d:d}
  /* Mensaje predeterminado de confirmación */
  function waLink(r){
    var t='Hola '+r.nombre+', tu cita queda confirmada en la modalidad '+modLabel(r)+' el día '+longDate(r.fecha)+' a las '+f12(r.hora)+'.';
    return 'https://wa.me/'+waNum(r.telefono)+'?text='+encodeURIComponent(t);
  }
  function waBtn(r){return r.fecha?'<a class="btn wa" href="'+waLink(r)+'" target="_blank" rel="noopener">'+WA+'<span>Confirmar por WhatsApp</span></a>':''}
  function stSelect(r){
    return '<select data-id="'+esc(r.id)+'" aria-label="Estado de '+esc(r.nombre)+'">'+EST.map(function(e){return '<option value="'+e+'"'+(r.estado===e?' selected':'')+'>'+ES[e]+'</option>'}).join('')+'</select>';
  }
  function isActive(r){return r.tipo==='cita'&&r.fecha&&r.estado!=='cancelada'}
  function msg(t){var m=$('a-msg');m.textContent=t||'';if(t)setTimeout(function(){if(m.textContent===t)m.textContent=''},3500)}

  /* ---- sesión ---- */
  function showLogin(err){$('panel').hidden=true;$('logout').hidden=true;$('login').hidden=false;$('a-err').textContent=err||'';$('a-enter').disabled=false}
  function errText(ex){
    var c=ex&&ex.message;
    if(c==='auth')return 'Usuario o contraseña incorrectos.';
    if(c==='locked')return 'Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.';
    if(c==='config')return 'Falta configurar la contraseña en el servidor (ver LEEME).';
    return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
  }
  function load(){
    S.list(token).then(function(rows){
      all=rows||[];$('login').hidden=true;$('panel').hidden=false;$('logout').hidden=false;
      if(!st.y){
        /* abre en el día de hoy; si hoy no hay citas, en la próxima cita */
        var td=todayGT(),next=null;
        all.forEach(function(r){if(isActive(r)&&r.fecha>=td&&(!next||r.fecha<next))next=r.fecha});
        var sel=byDay()[td]&&byDay()[td].some(isActive)?td:(next||td),t=parts(sel);
        st.y=t.y;st.m=t.m;st.sel=sel;
      }
      render();
    }).catch(function(ex){
      if(ex&&ex.message==='auth'){token='';try{sessionStorage.removeItem('nc_tok')}catch(e){}showLogin('')}
      else{$('login').hidden=true;$('panel').hidden=false;$('logout').hidden=false;$('dayview').innerHTML='<div class="empty">No se pudieron cargar las citas. Toca Actualizar para reintentar.</div>'}
    });
  }
  $('login').addEventListener('submit',function(e){
    e.preventDefault();var u=$('a-user').value.trim(),p=$('a-pass').value;
    if(!u||!p){$('a-err').textContent='Escribe usuario y contraseña.';return}
    $('a-enter').disabled=true;$('a-err').textContent='';
    S.login(u,p).then(function(tk){
      token=tk;try{sessionStorage.setItem('nc_tok',tk)}catch(x){}
      $('a-pass').value='';load();
    }).catch(function(ex){$('a-pass').value='';showLogin(errText(ex))});
  });
  $('logout').addEventListener('click',function(){
    token='';all=[];try{sessionStorage.removeItem('nc_tok')}catch(e){}
    showLogin('');$('a-user').focus();
  });

  /* ---- calendario ---- */
  function byDay(){
    var m={};all.forEach(function(r){if(r.tipo==='cita'&&r.fecha){(m[r.fecha]=m[r.fecha]||[]).push(r)}});
    Object.keys(m).forEach(function(k){m[k].sort(function(a,b){return a.hora<b.hora?-1:a.hora>b.hora?1:0})});
    return m;
  }
  function renderCal(){
    var map=byDay(),t=todayGT(),y=st.y,m=st.m;
    $('a-month').textContent=cap(MONTHS[m])+' '+y;
    var first=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7,total=new Date(Date.UTC(y,m+1,0)).getUTCDate(),h='',i;
    for(i=0;i<first;i++)h+='<span></span>';
    for(i=1;i<=total;i++){
      var k=key(y,m,i),n=(map[k]||[]).filter(isActive).length;
      h+='<button type="button" class="acell'+(n?' busy':'')+(k===t?' today':'')+'" data-k="'+k+'" aria-pressed="'+(st.sel===k)+'" aria-label="'+esc(longDate(k))+(n?', '+n+(n===1?' cita':' citas'):', sin citas')+'"><span>'+i+'</span>'+(n?'<span class="n">'+n+'</span>':'')+'</button>';
    }
    $('a-cells').innerHTML=h;
  }
  function renderDay(){
    var dv=$('dayview');
    if(!st.sel){dv.innerHTML='<div class="empty">Elige un día del calendario.</div>';return}
    var rows=(byDay()[st.sel]||[]),n=rows.filter(isActive).length;
    var head='<h3>'+esc(cap(longDate(st.sel)))+'<span>'+(n?n+(n===1?' cita ocupada':' citas ocupadas'):'Sin citas este día')+'</span></h3>';
    if(!rows.length){dv.innerHTML=head+'<div class="empty">No hay citas este día. Todos los horarios están libres.</div>';return}
    dv.innerHTML=head+rows.map(function(r){
      return '<article class="appt" data-st="'+esc(r.estado)+'"><div class="top"><span class="time">'+esc(f12(r.hora))+'</span><span class="tag'+(modLabel(r)==='virtual'?' virtual':'')+'">'+(modLabel(r)==='virtual'?'Virtual':'Presencial')+'</span></div>'+
        '<div class="who"><strong>'+esc(r.nombre)+'</strong><small>'+esc(r.correo)+' · '+esc(r.telefono)+'</small></div>'+
        (r.comentarios?'<div class="who"><small>'+esc(r.comentarios)+'</small></div>':'')+
        '<div class="row">'+stSelect(r)+waBtn(r)+'</div></article>';
    }).join('');
  }
  $('a-cells').addEventListener('click',function(e){var b=e.target.closest('.acell');if(!b)return;st.sel=b.getAttribute('data-k');renderCal();renderDay();$('dayview').scrollIntoView({block:'nearest'})});
  $('a-prev').addEventListener('click',function(){st.m--;if(st.m<0){st.m=11;st.y--}renderCal()});
  $('a-next').addEventListener('click',function(){st.m++;if(st.m>11){st.m=0;st.y++}renderCal()});

  /* ---- lista ---- */
  function filtered(){
    var q=$('a-q').value.trim().toLowerCase(),md=$('a-mod').value,es=$('a-est').value,o=$('a-ord').value;
    var rows=all.filter(function(r){
      if(md&&modLabel(r)!==md)return false;if(es&&r.estado!==es)return false;
      if(q&&(r.nombre+' '+r.correo+' '+r.telefono).toLowerCase().indexOf(q)<0)return false;return true;
    });
    if(o==='cita')rows.sort(function(a,b){var ka=a.fecha?a.fecha+a.hora:'9999',kb=b.fecha?b.fecha+b.hora:'9999';return ka<kb?-1:ka>kb?1:0});
    else rows.sort(function(a,b){return a.creado<b.creado?1:-1});
    return rows;
  }
  function renderList(){
    var rows=filtered();
    $('a-count').textContent=rows.length+' de '+all.length+' registros';
    if(!rows.length){$('list').innerHTML='<div class="empty">'+(all.length?'Ningún registro coincide con los filtros.':'Todavía no hay registros. Aparecerán aquí cuando alguien reserve una cita.')+'</div>';return}
    $('list').innerHTML=rows.map(function(r){
      var cita=r.fecha?'<span class="cita"><b>'+esc(cap(shortDate(r.fecha)))+'</b></span><span>'+esc(f12(r.hora))+'</span><span class="tag'+(modLabel(r)==='virtual'?' virtual':'')+'">'+(modLabel(r)==='virtual'?'Virtual':'Presencial')+'</span>':'<span class="tag">Solo datos</span>';
      return '<article class="rec" data-st="'+esc(r.estado)+'">'+
        '<div class="c" data-label="Paciente"><strong>'+esc(r.nombre)+'</strong><small>Registrado: '+esc(fStamp(r.creado))+'</small></div>'+
        '<div class="c" data-label="Contacto"><span>'+esc(r.correo)+'</span><span>'+esc(r.telefono)+'</span></div>'+
        '<div class="c" data-label="Cita">'+cita+'</div>'+
        '<div class="c" data-label="Estado">'+stSelect(r)+waBtn(r)+'</div>'+
        (r.comentarios?'<div class="note"><b>Comentarios</b>'+esc(r.comentarios)+'</div>':'')+'</article>';
    }).join('');
  }
  function stats(){
    var t=todayGT(),nuevos=0,prox=0;
    all.forEach(function(r){if(r.estado==='nuevo')nuevos++;if(isActive(r)&&r.fecha>=t)prox++});
    $('stats').innerHTML=[['Registros',all.length],['Nuevos',nuevos],['Citas próximas',prox]].map(function(s){return '<div class="stat"><b>'+s[1]+'</b><span>'+s[0]+'</span></div>'}).join('');
  }
  function render(){
    stats();$('a-clear').hidden=(S.mode!=='local');
    renderCal();renderDay();renderList();
  }
  function setView(v){
    st.view=v;
    $('view-cal').hidden=(v!=='cal');$('view-list').hidden=(v!=='list');
    $('tab-cal').setAttribute('aria-selected',v==='cal');$('tab-list').setAttribute('aria-selected',v==='list');
  }
  $('tab-cal').addEventListener('click',function(){setView('cal')});
  $('tab-list').addEventListener('click',function(){setView('list')});

  function onStatus(e){
    var s=e.target.closest('select[data-id]');if(!s)return;
    var id=s.getAttribute('data-id'),v=s.value;
    S.setStatus(id,v,token).then(function(){
      all.forEach(function(r){if(r.id===id)r.estado=v});render();msg('Estado actualizado');
    }).catch(function(){msg('No se pudo actualizar. Intenta de nuevo.');load()});
  }
  $('list').addEventListener('change',onStatus);
  $('dayview').addEventListener('change',onStatus);
  ['a-q','a-mod','a-est','a-ord'].forEach(function(id){$(id).addEventListener('input',renderList)});
  $('a-refresh').addEventListener('click',function(){load();msg('Actualizado')});
  $('a-clear').addEventListener('click',function(){
    var b=$('a-clear');
    if(b.getAttribute('data-sure')!=='1'){b.setAttribute('data-sure','1');b.textContent='Toca de nuevo para borrar';setTimeout(function(){b.removeAttribute('data-sure');b.textContent='Borrar datos de prueba'},3500);return}
    S.clearDemo();b.removeAttribute('data-sure');b.textContent='Borrar datos de prueba';load();msg('Datos de prueba borrados');
  });
  $('a-csv').addEventListener('click',function(){
    var q=function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'};
    var head=['registrado','nombre','correo','telefono','fecha_cita','hora_cita','modalidad','estado','comentarios'];
    var lines=[head.join(',')].concat(filtered().map(function(r){return [r.creado,r.nombre,r.correo,r.telefono,r.fecha,r.hora,modLabel(r),r.estado,r.comentarios].map(q).join(',')}));
    try{navigator.clipboard.writeText(lines.join('\n')).then(function(){msg('CSV copiado')},function(){msg('No se pudo copiar')})}catch(e){msg('No se pudo copiar')}
  });

  function start(){
    if(S.mode==='local')$('demonote').hidden=false;
    if(token)load();else showLogin('');
  }
  window.NCAdmin={show:start};
  if(!root.closest('[hidden]'))start();
})();
