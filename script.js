(function(){
  var b=document.getElementById('copy'),t=document.getElementById('mail');
  b.addEventListener('click',function(){
    var done=function(){b.textContent='Copiado';setTimeout(function(){b.textContent='Copiar correo'},1800)};
    var fb=function(){var r=document.createRange();r.selectNodeContents(t);var s=getSelection();s.removeAllRanges();s.addRange(r)};
    try{navigator.clipboard.writeText(t.textContent).then(done,fb)}catch(e){fb()}
  });
})();
