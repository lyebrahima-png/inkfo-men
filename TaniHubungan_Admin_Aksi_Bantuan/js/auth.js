/* Autentikasi TaniHubungan melalui API PHP dan MariaDB. */
(function(){
  'use strict';
  var msg=document.getElementById('auth-message');
  function show(text,error){
    msg.textContent=text;
    msg.classList.toggle('error',!!error);
    msg.style.display='block';
  }
  async function submitAuth(form,action){
    var data=new FormData(form);
    var payload={};
    data.forEach(function(value,key){payload[key]=String(value).trim();});
    try{
      var response=await fetch('api/auth.php?action='+action,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify(payload)
      });
      var result=await response.json();
      if(!response.ok)throw new Error(result.error||'Permintaan autentikasi gagal.');
      if(action==='register'){
        show(result.message||'Pendaftaran berhasil. Silakan masuk.');
        form.reset();
        return;
      }

      try{
        localStorage.setItem('tanihubungan-session',JSON.stringify(result.user));
      }catch(storageError){
        console.error('Sesi tampilan tidak dapat disimpan di browser.',storageError);
      }
      var destinations={Admin:'admin-dashboard.php',Petani:'petani-dashboard.php',Pembeli:'pembeli-dashboard.php'};
      window.location.href=destinations[result.user.role]||'index.php';
    }catch(error){
      console.error('Autentikasi gagal:',error);
      show(error.message||'Server tidak dapat dihubungi. Pastikan Apache dan MariaDB aktif.',true);
    }
  }

  var login=document.getElementById('login-form');
  if(login)login.addEventListener('submit',function(event){
    event.preventDefault();
    submitAuth(login,'login');
  });

  var register=document.getElementById('register-form');
  if(register){
    var requestedRole=new URLSearchParams(window.location.search).get('role');
    var roleSelect=register.querySelector('[name="role"]');
    if(roleSelect&&['Petani','Pembeli'].includes(requestedRole))roleSelect.value=requestedRole;
    register.addEventListener('submit',function(event){
      event.preventDefault();
      submitAuth(register,'register');
    });
  }
})();
