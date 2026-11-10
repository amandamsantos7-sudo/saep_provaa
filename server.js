require('dotenv').config();
const express=require('express'), session=require('express-session'), cors=require('cors');
const path=require('path'), fs=require('fs'), mysql=require('mysql2/promise');
const bcrypt=require('bcryptjs'), multer=require('multer');
const app=express(), PORT=process.env.PORT||3000;
const uploadDir=path.join(__dirname,'uploads');
if(!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir,{recursive:true});
const pool=mysql.createPool({host:process.env.DB_HOST||'localhost',user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'saepvision',waitForConnections:true,connectionLimit:10});
app.use(cors({origin:true,credentials:true})); app.use(express.json()); app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'saepvision-local-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',maxAge:8*60*60*1000}}));
app.use('/uploads',express.static(uploadDir)); app.use(express.static(path.join(__dirname,'public')));
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,uploadDir),filename:(_,f,cb)=>cb(null,Date.now()+'-'+f.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))});
const upload=multer({storage,limits:{fileSize:8*1024*1024},fileFilter:(_,f,cb)=>{const ok=/\.(jpg|jpeg|png|gif|webp)$/i.test(f.originalname);cb(ok?null:new Error('Formato inválido. Use JPG, JPEG, PNG, GIF ou WEBP.'),ok);}});
const auth=(req,res,next)=>req.session.user?next():res.status(401).json({erro:'Faça login para continuar.'});
app.get('/api/saude',async(req,res)=>{try{await pool.query('SELECT 1');res.json({servidor:'ok',banco:'conectado'});}catch(e){res.status(503).json({servidor:'ok',banco:'indisponivel',erro:e.message});}});
app.get('/api/sessao',(req,res)=>res.json({usuario:req.session.user||null}));
app.post('/api/cadastro',async(req,res)=>{try{
 const {nome,email,senha,tipo}=req.body;
 if(!nome||!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!senha)return res.status(400).json({erro:'Informe nome, e-mail válido e senha.'});
 if(!['comum','fotografo'].includes(tipo))return res.status(400).json({erro:'Tipo de usuário inválido.'});
 const hash=await bcrypt.hash(senha,10), username=nome.trim().toLowerCase().replace(/\s+/g,'_');
 const [r]=await pool.execute('INSERT INTO tb_usuario (nome,nome_usuario,email,senha,tipo) VALUES (?,?,?,?,?)',[nome.trim(),username,email.trim().toLowerCase(),hash,tipo==='comum'?'usuario':'fotografo']);
 req.session.user={id:r.insertId,nome:nome.trim(),email:email.trim().toLowerCase(),tipo};res.status(201).json({mensagem:'Cadastro realizado.',usuario:req.session.user});
 }catch(e){res.status(e.code==='ER_DUP_ENTRY'?409:500).json({erro:e.code==='ER_DUP_ENTRY'?'E-mail ou nome de usuário já cadastrado.':'Erro ao cadastrar usuário.'});}});
app.post('/api/login',async(req,res)=>{try{
 const email=String(req.body.email||'').trim().toLowerCase(),senha=String(req.body.senha||'');
 const [rows]=await pool.execute('SELECT * FROM tb_usuario WHERE email=?',[email]);
 if(!rows.length||!(await bcrypt.compare(senha,rows[0].senha)))return res.status(401).json({erro:'Usuário não encontrado ou senha incorreta.'});
 const u=rows[0];req.session.user={id:u.id_usuario,nome:u.nome,email:u.email,tipo:u.tipo==='usuario'?'comum':'fotografo',foto_perfil:u.imagem_usuario};res.json({mensagem:'Login realizado.',usuario:req.session.user});
 }catch{res.status(500).json({erro:'Erro ao realizar login.'});}});
app.post('/api/logout',auth,(req,res)=>req.session.destroy(()=>res.json({mensagem:'Sessão encerrada.'})));
app.get('/api/publicacoes',async(req,res)=>{try{
 const termo=String(req.query.q||req.query.fotografo||'').trim();
 const where=termo?' WHERE p.titulo_imagem LIKE ? OR p.local_foto LIKE ? OR u.nome LIKE ? OR u.nome_usuario LIKE ? ':'';
 const params=termo?[`%${termo}%`,`%${termo}%`,`%${termo}%`,`%${termo}%`]:[];
 const [rows]=await pool.execute(`SELECT p.id_publicacao AS id,p.titulo_imagem AS titulo,p.local_foto AS localizacao,p.url_fotografia AS imagem,p.created_at AS criado_em,u.id_usuario AS usuario_id,u.nome AS fotografo,
 (SELECT COUNT(*) FROM tb_curtida c WHERE c.id_publicacao=p.id_publicacao) AS curtidas,
 EXISTS(SELECT 1 FROM tb_curtida c2 WHERE c2.id_publicacao=p.id_publicacao AND c2.id_usuario=?) AS curtida_por_mim
 FROM tb_publicacao p JOIN tb_usuario u ON u.id_usuario=p.id_usuario ${where} ORDER BY p.created_at DESC`,[req.session.user?.id||0,...params]);res.json(rows);
 }catch(e){console.error(e);res.status(500).json({erro:'Não foi possível carregar as fotografias.'});}});
app.post('/api/publicacoes',auth,upload.single('imagem'),async(req,res)=>{try{
 if(req.session.user.tipo!=='fotografo')return res.status(403).json({erro:'Somente fotógrafos podem publicar fotografias.'});
 const {titulo,localizacao}=req.body;if(!titulo||!localizacao||!req.file)return res.status(400).json({erro:'Preencha todos os campos e escolha uma imagem.'});
 const imagem='/uploads/'+req.file.filename;const [r]=await pool.execute('INSERT INTO tb_publicacao (titulo_imagem,local_foto,id_usuario,url_fotografia) VALUES (?,?,?,?)',[titulo.trim(),localizacao.trim(),req.session.user.id,imagem]);
 res.status(201).json({mensagem:'Fotografia publicada.',id:r.insertId});
 }catch(e){res.status(500).json({erro:e.message||'Erro ao publicar fotografia.'});}});
app.post('/api/publicacoes/:id/curtir',auth,async(req,res)=>{try{
 const id=Number(req.params.id),uid=req.session.user.id,[old]=await pool.execute('SELECT id_curtida FROM tb_curtida WHERE id_usuario=? AND id_publicacao=?',[uid,id]);
 if(old.length){await pool.execute('DELETE FROM tb_curtida WHERE id_usuario=? AND id_publicacao=?',[uid,id]);return res.json({curtida:false});}
 await pool.execute('INSERT INTO tb_curtida (id_usuario,id_publicacao) VALUES (?,?)',[uid,id]);res.json({curtida:true});
 }catch{res.status(500).json({erro:'Não foi possível registrar a curtida.'});}});
app.get('/api/usuarios/:id',async(req,res)=>{try{
 const id=Number(req.params.id),[u]=await pool.execute('SELECT id_usuario AS id,nome,email,tipo,imagem_usuario AS foto_perfil FROM tb_usuario WHERE id_usuario=?',[id]);
 if(!u.length)return res.status(404).json({erro:'Fotógrafo não encontrado.'});
 const [st]=await pool.execute('SELECT COUNT(DISTINCT p.id_publicacao) AS publicacoes,COUNT(c.id_curtida) AS curtidas FROM tb_publicacao p LEFT JOIN tb_curtida c ON c.id_publicacao=p.id_publicacao WHERE p.id_usuario=?',[id]);
 res.json({...u[0],...st[0]});
 }catch{res.status(500).json({erro:'Erro ao consultar perfil.'});}});
app.delete('/api/publicacoes/:id',auth,async(req,res)=>{try{
 const [r]=await pool.execute('DELETE FROM tb_publicacao WHERE id_publicacao=? AND id_usuario=?',[Number(req.params.id),req.session.user.id]);
 if(!r.affectedRows)return res.status(404).json({erro:'Publicação não encontrada ou não pertence a você.'});res.json({mensagem:'Publicação excluída.'});
 }catch{res.status(500).json({erro:'Erro ao excluir publicação.'});}});
app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>res.status(400).json({erro:err.message||'Arquivo inválido.'}));
(async()=>{try{await pool.query('SELECT 1');console.log('MySQL conectado com sucesso!');}catch(e){console.error('Falha na conexão MySQL:',e.message);}app.listen(PORT,()=>console.log(`SAEPVision rodando em http://localhost:${PORT}`));})();
