(function(){
  var CONFIG=window.NC_CONFIG,Store=window.NCStore;
  var $=function(id){return document.getElementById(id)};
  var form=$('bookform'),daysEl=$('days'),slotsEl=$('slots'),doneEl=$('done');
  var MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var state={mode:'cita',date:null,time:null,vy:0,vm:0,taken:{}};

  function nowGT(){
    var p=new Intl.DateTimeFormat('en-CA',{timeZone:CONFIG.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),o={};
    p.forEach(function(x){o[x.type]=x.value});
    return {y:+o.year,m:+o.month-1,d:+o.day,mins:(+o.hour)*60+(+o.minute)};
  }
  function key(y,m,d){return y+'-'+('0'+(m+1)).slice(-2)+'-'+('0'+d).slice(-2)}
  function dowOf(y,m,d){return new Date(Date.UTC(y,m,d)).getUTCDay()}
  function toMin(s){var a=s.split(':');return +a[0]*60+ +a[1]}
  function fmt24(t){return ('0'+Math.floor(t/60)).slice(-2)+':'+('0'+t%60).slice(-2)}
  function fmt(mins){var h=Math.floor(mins/60),m=mins%60,ap=h>=12?'PM':'AM',h12=h%12||12;return h12+':'+('0'+m).slice(-2)+' '+ap}
  function slotsFor(y,m,d){
    var n=nowGT(),isToday=(key(y,m,d)===key(n.y,n.m,n.d)),out=[];
    CONFIG.blocks.forEach(function(b){
      for(var t=toMin(b[0]);t+CONFIG.slotMinutes<=toMin(b[1]);t+=CONFIG.slotMinutes){
        if(isToday&&t<n.mins+CONFIG.leadMinutes)continue;
        if(state.taken[key(y,m,d)+' '+fmt24(t)])continue;
        out.push(t);
      }
    });
    return out;
  }
  function maxKey(){
    var n=nowGT(),dt=new Date(Date.UTC(n.y,n.m,n.d+CONFIG.maxDays));
    return key(dt.getUTCFullYear(),dt.getUTCMonth(),dt.getUTCDate());
  }
  function dayOk(y,m,d){
    var n=nowGT(),k=key(y,m,d);
    if(k<key(n.y,n.m,n.d)||k>maxKey())return false;
    if(CONFIG.daysOpen.indexOf(dowOf(y,m,d))<0)return false;
    return slotsFor(y,m,d).length>0;
  }
  function longDate(y,m,d){
    return new Intl.DateTimeFormat('es-GT',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(Date.UTC(y,m,d)));
  }

  function renderCal(){
    var n=nowGT(),y=state.vy,m=state.vm;
    $('monthlabel').textContent=MONTHS[m]+' '+y;
    $('prev').disabled=(y===n.y&&m===n.m);
    $('next').disabled=(key(m===11?y+1:y,(m+1)%12,1)>maxKey());
    var first=(dowOf(y,m,1)+6)%7,total=new Date(Date.UTC(y,m+1,0)).getUTCDate(),html='',i;
    for(i=0;i<first;i++)html+='<span class="day blank"></span>';
    for(i=1;i<=total;i++){
      var k=key(y,m,i),ok=dayOk(y,m,i),cls='day'+(k===key(n.y,n.m,n.d)?' today':'');
      html+='<button type="button" class="'+cls+'" data-d="'+i+'" aria-pressed="'+(state.date===k)+'" aria-label="'+longDate(y,m,i)+(ok?'':' (no disponible)')+'"'+(ok?'':' disabled')+'>'+i+'</button>';
    }
    daysEl.innerHTML=html;
  }
  function renderSlots(){
    if(!state.date){
      $('slotstitle').textContent='Elige un día para ver los horarios';slotsEl.innerHTML='';
      $('slothint').textContent='Solo puedes elegir fechas desde hoy en adelante.';return;
    }
    var a=state.date.split('-'),y=+a[0],m=+a[1]-1,d=+a[2],list=slotsFor(y,m,d);
    $('slotstitle').textContent='Horarios para '+longDate(y,m,d);
    slotsEl.innerHTML=list.map(function(t){
      var v=fmt24(t);
      return '<button type="button" class="slot" data-t="'+v+'" aria-pressed="'+(state.time===v)+'">'+fmt(t)+'</button>';
    }).join('');
    $('slothint').textContent='Hora de Guatemala. Cada cita dura 30 minutos.';
  }

  daysEl.addEventListener('click',function(e){
    var b=e.target.closest('.day[data-d]');if(!b||b.disabled)return;
    state.date=key(state.vy,state.vm,+b.getAttribute('data-d'));state.time=null;
    renderCal();renderSlots();$('formerr').textContent='';
  });
  slotsEl.addEventListener('click',function(e){
    var b=e.target.closest('.slot');if(!b)return;
    state.time=b.getAttribute('data-t');renderSlots();$('formerr').textContent='';
  });
  $('prev').addEventListener('click',function(){state.vm--;if(state.vm<0){state.vm=11;state.vy--}renderCal()});
  $('next').addEventListener('click',function(){state.vm++;if(state.vm>11){state.vm=0;state.vy++}renderCal()});

  function setMode(v){
    state.mode=v;
    $('schedule').hidden=(v!=='cita');
    $('cols').className=(v==='cita')?'cols':'cols single';
    
    $('formerr').textContent='';
  }
  form.addEventListener('change',function(e){
    if(e.target.name==='modalidad')$('mo-hint').textContent=(e.target.value==='virtual')?'Por videollamada. La clínica te enviará los detalles de conexión.':'En la clínica, CC Zona Portales, nivel 3, local 6.';
  });
  $('f-note').addEventListener('input',function(){$('note-count').textContent=this.value.length+' / 500'});

  function setErr(id,msg){
    var inp=$('f-'+id);$('e-'+id).textContent=msg||'';
    if(msg)inp.setAttribute('aria-invalid','true');else inp.removeAttribute('aria-invalid');
    return !msg;
  }
  function validate(){
    var name=$('f-name').value.trim(),email=$('f-email').value.trim(),phone=$('f-phone').value.trim(),digits=phone.replace(/\D/g,'');
    var a=setErr('name',name.length<2?'Escribe tu nombre.':'');
    var b=setErr('email',/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)?'':'Escribe un correo válido, por ejemplo nombre@correo.com.');
    var c=setErr('phone',(digits.length>=8&&digits.length<=13)?'':'Escribe un teléfono de 8 dígitos o más.');
    return a&&b&&c;
  }
  ['name','email','phone'].forEach(function(k){$('f-'+k).addEventListener('input',function(){if($('e-'+k).textContent)validate()})});

  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function build(data){
    var lines=[];
    if(data.when){lines.push('Hola, soy '+data.name+'. Quiero agendar una cita en Nutrition Club.','Fecha: '+data.when.date,'Hora: '+data.when.time)}
    else lines.push('Hola, soy '+data.name+'. Les dejo mis datos para que me contacten de Nutrition Club.');
    lines.push('Modalidad: '+data.modalidad,'Correo: '+data.email,'Teléfono: '+data.phone);
    if(data.note)lines.push('Comentarios: '+data.note);
    return lines.join('\n');
  }
  function showDone(data,sent){
    var link='https://wa.me/'+CONFIG.whatsapp+'?text='+encodeURIComponent(build(data));
    var rows='<div><dt>Nombre</dt><dd>'+esc(data.name)+'</dd></div>'+
      (data.when?'<div><dt>Fecha</dt><dd>'+esc(data.when.date)+'</dd></div><div><dt>Hora</dt><dd>'+esc(data.when.time)+'</dd></div>':'')+
      '<div><dt>Modalidad</dt><dd>'+esc(data.modalidad)+'</dd></div><div><dt>Correo</dt><dd>'+esc(data.email)+'</dd></div><div><dt>Teléfono</dt><dd>'+esc(data.phone)+'</dd></div>'+
      (data.note?'<div><dt>Comentarios</dt><dd>'+esc(data.note)+'</dd></div>':'');
    var intro=sent?'Recibimos tus datos. La clínica te escribirá para confirmar'+(data.when?' tu cita':'')+'.'
      :'Tu solicitud quedó guardada en este navegador (modo demo). Para que la clínica la reciba, envíala también por WhatsApp.';
    doneEl.innerHTML='<h3>'+(sent?'Solicitud enviada':'Casi listo')+'</h3><p>'+intro+'</p><dl class="sum">'+rows+'</dl>'+
      '<div class="links"><a class="btn'+(sent?' ghost':'')+'" href="'+link+'" target="_blank" rel="noopener">'+(sent?'Escribir por WhatsApp':'Enviar por WhatsApp')+'</a>'+
      '<button type="button" class="btn ghost" id="again">Hacer otra solicitud</button></div>';
    form.hidden=true;doneEl.hidden=false;
    $('again').addEventListener('click',function(){
      doneEl.hidden=true;form.hidden=false;form.reset();$('note-count').textContent='0 / 500';$('mo-hint').textContent='En la clínica, CC Zona Portales, nivel 3, local 6.';state.date=null;state.time=null;setMode('cita');renderCal();renderSlots();
    });
    doneEl.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function refreshTaken(){
    Store.taken().then(function(list){
      var m={};list.forEach(function(k){m[k]=1});state.taken=m;
      if(state.date&&state.time&&m[state.date+' '+state.time])state.time=null;
      renderCal();renderSlots();
    }).catch(function(){});
  }

  form.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=validate(),err=$('formerr');err.textContent='';
    if(state.mode==='cita'&&(!state.date||!state.time)){err.textContent=!state.date?'Elige un día en el calendario.':'Elige una hora disponible.';ok=false}
    if(!ok){if(!err.textContent)err.textContent='Revisa los campos marcados.';return}
    var data={name:$('f-name').value.trim(),email:$('f-email').value.trim(),phone:$('f-phone').value.trim(),when:null,modalidad:form.elements.modalidad.value==='virtual'?'Virtual':'Presencial',note:$('f-note').value.trim()};
    var rec={tipo:state.mode,nombre:data.name,correo:data.email,telefono:data.phone,modalidad:data.modalidad.toLowerCase(),comentarios:data.note,fecha:'',hora:'',web:$('f-web').value};
    if(state.mode==='cita'){
      var a=state.date.split('-'),t=toMin(state.time);
      var ld=longDate(+a[0],+a[1]-1,+a[2]);data.when={date:ld.charAt(0).toUpperCase()+ld.slice(1),time:fmt(t)};rec.fecha=state.date;rec.hora=state.time;
    }
    var btn=$('submitbtn');btn.disabled=true;
    Store.create(rec).then(function(){showDone(data,Store.mode==='sheet');refreshTaken()})
      .catch(function(ex){
        if(ex&&ex.message==='taken'){err.textContent='Ese horario ya fue reservado. Elige otra hora.';state.time=null;refreshTaken()}
        else err.textContent='No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.';
      }).then(function(){btn.disabled=false});
  });

  var n=nowGT();state.vy=n.y;state.vm=n.m;
  renderCal();renderSlots();refreshTaken();
})();
