const $ = s => document.querySelector(s);
let usuario = null;
const msg = texto => { $('#mensagem').textContent = texto || ''; };
async function api(url, options={}) {
  const r = await fetch(url, { credentials:'same-origin', ...options });
  const data = await r.json().catch(()=>({}));
  if (!r.ok) throw new Error(data.erro || 'Ocorreu um erro.');
  return data;
}
function modal(id, abrir=true){ $('#'+id).hidden = !abrir; }
function atualizarTopo(){
  $('#nomeUsuario').textContent = usuario?.nome || 'Visitante';
  $('#tipoUsuario').textContent = usuario ? (usuario.tipo === 'fotografo' ? 'Fotógrafo' : 'Usuário comum') : 'Explore fotografias';
  $('#avatar').textContent = usuario?.nome?.[0]?.toUpperCase() || '?';
  $('#loginBtn').hidden = !!usuario;
  $('#perfilBtn').hidden = !usuario;
  $('#novaFotoBtn').hidden = usuario?.tipo !== 'fotografo';
}
async function carregarSessao(){ const d=await api('/api/sessao'); usuario=d.usuario; atualizarTopo(); }
async function carregarFotos(termo=''){
  msg('Carregando fotografias...');
  try {
    const fotos=await api('/api/publicacoes'+(termo?'?q='+encodeURIComponent(termo):''));
    const galeria=$('#galeria'); galeria.innerHTML='';
    if(!fotos.length){galeria.innerHTML='<p class="vazio">Nenhuma fotografia encontrada.</p>';msg('');return;}
    fotos.forEach(f=>{
      const card=document.createElement('article');card.className='foto';
      const img=document.createElement('img');img.src=f.imagem;img.alt=f.titulo;
      img.title=`Foto tirada por: ${f.fotografo} | Local: ${f.localizacao}`;
      const info=document.createElement('div');info.className='foto-info';
      const h=document.createElement('h3');h.textContent=f.titulo;
      const local=document.createElement('p');local.textContent='Local: '+f.localizacao;
      const autor=document.createElement('p');autor.textContent='Foto tirada por: '+f.fotografo;
      const acoes=document.createElement('div');acoes.className='foto-acoes';
      const like=document.createElement('button');like.className='curtir'+(f.curtida_por_mim?' ativo':'');
      like.innerHTML=`♥ ${f.curtidas} curtidas`;
      like.onclick=async()=>{if(!usuario){modal('loginModal');return;}try{await api(`/api/publicacoes/${f.id}/curtir`,{method:'POST'});carregarFotos($('#busca').value.trim());}catch(e){msg(e.message);}};
      acoes.append(like);
      if(usuario?.id===f.usuario_id){const del=document.createElement('button');del.className='curtir';del.textContent='Excluir';del.onclick=async()=>{if(confirm('Deseja excluir esta publicação?')){try{await api(`/api/publicacoes/${f.id}`,{method:'DELETE'});carregarFotos($('#busca').value.trim());}catch(e){msg(e.message);}}};acoes.append(del);}
      info.append(h,local,autor,acoes);card.append(img,info);galeria.append(card);
    });msg('');
  } catch(e){msg(e.message || 'Não foi possível carregar as fotografias. Confira se o servidor e o banco estão funcionando.');}
}
$('#loginBtn').onclick=()=>modal('loginModal');
$('#perfilBtn').onclick=async()=>{
  if(!usuario)return;
  try{
    const p=await api('/api/usuarios/'+usuario.id);
    $('#perfilConteudo').innerHTML=`<h3>${p.nome}</h3><p>${p.email}</p><p>${p.curtidas} Likes</p><p>${p.publicacoes} Publicações</p>`;
    modal('perfilModal');
  }catch(e){msg(e.message);}
};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
$('#mostrarCadastro').onclick=()=>{$('#loginForm').hidden=true;$('.alternar').hidden=true;$('#cadastroForm').hidden=false;$('#modalTitulo').textContent='Cadastro';};
$('#mostrarLogin').onclick=()=>{$('#cadastroForm').hidden=true;$('#loginForm').hidden=false;$('.alternar').hidden=false;$('#modalTitulo').textContent='Login';};
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target);
  try{const d=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});usuario=d.usuario;atualizarTopo();modal('loginModal',false);e.target.reset();carregarFotos();}
  catch(err){alert(err.message);}
};
$('#cadastroForm').onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target);
  try{const d=await api('/api/cadastro',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f))});usuario=d.usuario;atualizarTopo();modal('loginModal',false);e.target.reset();carregarFotos();}
  catch(err){alert(err.message);}
};
$('#logoutBtn').onclick=async()=>{try{await api('/api/logout',{method:'POST'});usuario=null;atualizarTopo();modal('perfilModal',false);carregarFotos();}catch(e){alert(e.message);}};
$('#buscarBtn').onclick=()=>carregarFotos($('#busca').value.trim());
$('#busca').addEventListener('keydown',e=>{if(e.key==='Enter')carregarFotos(e.target.value.trim());});
$('#novaFotoBtn').onclick=()=>$('#formPublicacao').hidden=false;
$('#cancelarFoto').onclick=()=>{$('#formPublicacao').hidden=true;$('#fotoForm').reset();};
$('#fotoForm').onsubmit=async e=>{
  e.preventDefault();const data=new FormData(e.target);
  try{await api('/api/publicacoes',{method:'POST',body:data});e.target.reset();$('#formPublicacao').hidden=true;carregarFotos();}
  catch(err){alert(err.message);}
};
(async()=>{try{await carregarSessao();await carregarFotos();}catch(e){msg(e.message);}})();
