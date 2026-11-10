require('dotenv').config();
const fs=require('fs'),path=require('path'),mysql=require('mysql2/promise'),bcrypt=require('bcryptjs');
async function main(){
 const db=await mysql.createConnection({host:process.env.DB_HOST||'localhost',user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',database:process.env.DB_NAME||'saepvision'});
 const lines=fs.readFileSync(path.join(__dirname,'database','tb_usuario.csv'),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const headers=lines.shift().split(',');
 for(const line of lines){const vals=line.split(','),u=Object.fromEntries(headers.map((h,i)=>[h,vals[i]])),hash=await bcrypt.hash(u.senha,10);
  await db.execute(`INSERT INTO tb_usuario (id_usuario,nome,nome_usuario,email,senha,imagem_usuario,tipo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)
   ON DUPLICATE KEY UPDATE nome=VALUES(nome),email=VALUES(email),senha=VALUES(senha),imagem_usuario=VALUES(imagem_usuario),tipo=VALUES(tipo)`,
   [u.id_usuario,u.nome,u.nome_usuario,u.email,hash,'/assets/imagens_usuarios/'+u.imagem_usuario,u.tipo,u.created_at,u.updated_at]);
 }
 const photos=[['Fotografia 1',1,'foto1.jpg'],['Fotografia 2',1,'foto2.jpg'],['Fotografia 3',1,'foto3.jpg'],['Fotografia 4',2,'foto4.jpg'],['Fotografia 5',2,'foto5.jpg'],['Fotografia 6',2,'foto6.jpg'],['Fotografia 7',3,'foto7.jpg'],['Fotografia 8',3,'foto8.jpg'],['Fotografia 9',3,'foto9.jpg']];
 for(const [title,uid,file] of photos) await db.execute(`INSERT INTO tb_publicacao (titulo_imagem,local_foto,id_usuario,url_fotografia)
  SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM tb_publicacao WHERE url_fotografia=?)`,
  [title,'Local não informado',uid,'/assets/fotografias/'+file,'/assets/fotografias/'+file]);
 await db.end();console.log('Usuários e fotografias auxiliares importados.');
}
main().catch(e=>{console.error(e);process.exit(1);});
