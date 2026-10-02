/**
 * Nutrition Club - registro de citas en Google Sheets.
 * 1) Crea una hoja de cálculo de Google nueva.
 * 2) Extensiones > Apps Script, pega este código y escribe en ADMIN_PASS la contraseña de administración.
 * 3) Implementar > Nueva implementación > Aplicación web.
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier persona.
 * 4) Copia la URL que termina en /exec y pégala en config.js (sheetUrl).
 * Cada vez que cambies este código: Implementar > Administrar implementaciones > Editar > Nueva versión.
 */
var ADMIN_USER='Admin';
var ADMIN_PASS='CAMBIA-ESTA-CONTRASEÑA'; // escribe la contraseña real SOLO aquí, dentro del editor de Apps Script. No la pegues en archivos que subas a GitHub.
var NOTIFY_EMAIL='';                 // opcional: correo que recibe un aviso por cada solicitud
var TZ='America/Guatemala';
var SHEET_NAME='Registros';
var HEAD=['id','creado','tipo','nombre','correo','telefono','fecha','hora','estado','modalidad','comentarios'];
var ESTADOS=['nuevo','contactado','confirmada','cancelada'];

function sh_(){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName(SHEET_NAME);
  if(!sh){sh=ss.insertSheet(SHEET_NAME);sh.appendRow(HEAD);sh.setFrozenRows(1);sh.getRange(1,1,1,HEAD.length).setFontWeight('bold')}
  return sh;
}
function out_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function rows_(){
  var sh=sh_(),n=sh.getLastRow();if(n<2)return [];
  return sh.getRange(2,1,n-1,HEAD.length).getValues().map(function(r){
    var o={};HEAD.forEach(function(h,i){o[h]=String(r[i]==null?'':r[i])});return o;
  });
}
function clean_(s,max){return String(s==null?'':s).replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max)}

function doGet(e){
  var p=(e&&e.parameter)||{};
  if(p.action==='taken'){
    return out_({ok:true,taken:rows_().filter(function(r){return r.tipo==='cita'&&r.estado!=='cancelada'&&r.fecha}).map(function(r){return r.fecha+' '+r.hora})});
  }
  return out_({ok:true});
}

function doPost(e){
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{
    var d=JSON.parse(e.postData.contents);
    if(d.action==='create')return create_(d.rec||{});
    if(d.action==='login')return login_(d);
    if(d.action==='list'){if(!authed_(d.token))return out_({ok:false,error:'auth'});return out_({ok:true,records:rows_().reverse()})}
    if(d.action==='status')return status_(d);
    return out_({ok:false,error:'bad'});
  }catch(err){return out_({ok:false,error:'server'})}
  finally{lock.releaseLock()}
}

function create_(r){
  if(r.web)return out_({ok:true});   // trampa para bots
  var rec={tipo:r.tipo==='cita'?'cita':'datos',nombre:clean_(r.nombre,120),correo:clean_(r.correo,120),telefono:clean_(r.telefono,30),fecha:'',hora:'',modalidad:r.modalidad==='virtual'?'virtual':'presencial',comentarios:clean_(r.comentarios,500)};
  if(rec.nombre.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(rec.correo)||rec.telefono.replace(/\D/g,'').length<8)return out_({ok:false,error:'invalid'});
  if(rec.tipo==='cita'){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha))||!/^\d{2}:\d{2}$/.test(String(r.hora)))return out_({ok:false,error:'invalid'});
    if(r.fecha<Utilities.formatDate(new Date(),TZ,'yyyy-MM-dd'))return out_({ok:false,error:'invalid'});
    var busy=rows_().some(function(x){return x.tipo==='cita'&&x.estado!=='cancelada'&&x.fecha===r.fecha&&x.hora===r.hora});
    if(busy)return out_({ok:false,error:'taken'});
    rec.fecha=r.fecha;rec.hora=r.hora;
  }
  var id=Utilities.getUuid().slice(0,8);
  var row=[id,new Date().toISOString(),rec.tipo,rec.nombre,rec.correo,rec.telefono,rec.fecha,rec.hora,'nuevo',rec.modalidad,rec.comentarios];
  var sh=sh_(),n=sh.getLastRow()+1;
  sh.getRange(n,1,1,HEAD.length).setNumberFormat('@').setValues([row]);  // texto plano: evita fórmulas
  if(NOTIFY_EMAIL){
    try{MailApp.sendEmail(NOTIFY_EMAIL,'Nueva solicitud: '+rec.nombre,
      (rec.tipo==='cita'?'Cita: '+rec.fecha+' '+rec.hora+'\n':'Solo dejó sus datos\n')+'Modalidad: '+rec.modalidad+'\nNombre: '+rec.nombre+'\nCorreo: '+rec.correo+'\nTeléfono: '+rec.telefono+(rec.comentarios?'\nComentarios: '+rec.comentarios:''))}catch(x){}
  }
  return out_({ok:true,id:id});
}

function login_(d){
  if(String(ADMIN_PASS).indexOf('CAMBIA')===0)return out_({ok:false,error:'config'});
  var cache=CacheService.getScriptCache(),fails=+(cache.get('fails')||0);
  if(fails>=5)return out_({ok:false,error:'locked'});          // 5 intentos fallidos = espera de 15 minutos
  if(String(d.user||'').toLowerCase()===String(ADMIN_USER).toLowerCase()&&String(d.pass||'')===String(ADMIN_PASS)){
    var tok=Utilities.getUuid()+Utilities.getUuid();
    cache.put('t_'+tok,'1',21600);                                // sesión de 6 horas
    cache.remove('fails');
    return out_({ok:true,token:tok});
  }
  cache.put('fails',String(fails+1),900);
  return out_({ok:false,error:'auth'});
}
function authed_(t){return !!t&&CacheService.getScriptCache().get('t_'+t)==='1'}

function status_(d){
  if(!authed_(d.token))return out_({ok:false,error:'auth'});
  if(ESTADOS.indexOf(d.estado)<0)return out_({ok:false,error:'invalid'});
  var sh=sh_(),n=sh.getLastRow();if(n<2)return out_({ok:false,error:'notfound'});
  var ids=sh.getRange(2,1,n-1,1).getValues();
  for(var i=0;i<ids.length;i++){
    if(String(ids[i][0])===String(d.id)){sh.getRange(i+2,HEAD.indexOf('estado')+1).setValue(d.estado);return out_({ok:true})}
  }
  return out_({ok:false,error:'notfound'});
}
