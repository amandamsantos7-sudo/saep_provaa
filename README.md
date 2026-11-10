# SAEPVision — Plataforma de compartilhamento de fotografias

Projeto desenvolvido com Node.js, Express, MySQL, HTML, CSS e JavaScript. Usa as tabelas `tb_usuario`, `tb_publicacao` e `tb_curtida` e os arquivos auxiliares fornecidos na atividade.

## Requisitos
- Node.js LTS instalado
- MySQL Server e MySQL Workbench instalados
- VS Code (opcional)

## Instalação no Windows
1. Extraia o ZIP. Abra a pasta `SAEPVision` no VS Code.
2. Abra o terminal do VS Code nessa pasta. Confirme que `package.json` e `server.js` aparecem ao executar `dir`.
3. Instale as dependências:
   ```powershell
   npm install
   ```
4. No MySQL Workbench, abra `database/saepvision.sql` e execute todo o script (ícone de raio). Ele cria o banco `saepvision` e as três tabelas.
5. Copie `.env.example` para `.env` na mesma pasta. No Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```
   Abra `.env` e preencha `DB_USER`, `DB_PASSWORD` e, se necessário, `DB_HOST`. Exemplo para MySQL local com usuário root sem senha: `DB_USER=root` e `DB_PASSWORD=`.
6. Importe os seis usuários do CSV e as nove fotografias:
   ```powershell
   npm run importar
   ```
7. Inicie o servidor:
   ```powershell
   npm run dev
   ```
8. Acesse http://localhost:3000. Deixe o terminal aberto enquanto utiliza o site.

## Contas de demonstração
Senha inicial de todas as contas importadas: `123456`.
- `fotografo1@email.com`
- `fotografo2@gmail.com`
- `fotografo3@gmail.com`
- `usuario1@gmail.com`
- `usuario2@gmail.com`
- `usuario3@gmail.com`

Os fotógrafos podem publicar imagens. Os usuários comuns podem explorar e curtir. A busca aceita título da foto, local ou nome/nome de usuário do fotógrafo.

## Testes rápidos
Em outro terminal, com o servidor ligado:
```powershell
Invoke-RestMethod http://localhost:3000/api/saude
Invoke-RestMethod http://localhost:3000/api/publicacoes
```
O endpoint de saúde deve retornar `servidor=ok` e `banco=conectado`. A lista de publicações deve retornar as fotografias importadas.

## Se as fotos não aparecerem
- Confirme que o servidor está executando dentro da pasta `SAEPVision`.
- Confirme que o arquivo `.env` existe e que a senha do MySQL está correta.
- Execute novamente `npm run importar` depois de executar o SQL. A importação evita duplicar as fotografias.
- Veja a mensagem do terminal do servidor. Um erro de conexão com MySQL impede a consulta da galeria.

## Arquivos auxiliares
Inclui o CSV dos usuários, imagens de perfil, nove fotografias, ícones SVG, diagrama ER e pacote da fonte Inter.
