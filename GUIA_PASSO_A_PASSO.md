# 🚀 Guia Passo a Passo: Configuração do Bot da Guilda

Este guia ensina do zero como criar o seu bot no Discord, dar as permissões necessárias e colocá-lo para funcionar no seu servidor com seleção de cargos para **Aion 2**, **Dota 2**, **Conan Exiles** e **Valorant**.

---

## 1️⃣ Criar a Aplicação do Bot no Discord

1. Acesse o portal de desenvolvedores do Discord:
   👉 **[https://discord.com/developers/applications](https://discord.com/developers/applications)**
2. Faça login com a sua conta do Discord.
3. No canto superior direito, clique no botão azul **"New Application"**.
4. Dê um nome para a aplicação (exemplo: `Guild Master` ou o nome da sua guilda) e confirme.
5. Na aba lateral esquerda em **"General Information"**:
   - Copie o **APPLICATION ID** (Client ID) e guarde.

---

## 2️⃣ Configurar o Bot e Ativar as Intenções (MUITO IMPORTANTE)

1. No menu lateral esquerdo, clique na aba **"Bot"**.
2. Clique no botão **"Reset Token"** (ou "Copy Token" se aparecer) para gerar o **TOKEN** do bot.
   > ⚠️ **Atenção:** Guarde esse token em segredo! Ele é a senha do seu bot.
3. Role a página para baixo até a seção **"Privileged Gateway Intents"**:
   - ✅ Ative a opção **SERVER MEMBERS INTENT** *(Obrigatório para o bot detectar quando um novo membro entra no servidor)*.
   - ✅ Ative a opção **MESSAGE CONTENT INTENT**.
4. Clique no botão verde **"Save Changes"** no rodapé.

---

## 3️⃣ Convidar o Bot para o seu Servidor

1. No menu lateral esquerdo, clique em **"OAuth2"** ➔ **"URL Generator"**.
2. Na caixa **"SCOPES"**, marque as duas opções:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Na caixa **"BOT PERMISSIONS"** que abrirá abaixo, selecione:
   - ✅ `Administrator` *(Recomendado para não ter problemas de permissão)*
   - *(Ou se preferir permissões específicas: Gerenciar Cargos / Manage Roles, Ver Canais, Enviar Mensagens, Inserir Links).*
4. No final da página, copie a **"GENERATED URL"**.
5. Abra essa URL em uma nova aba do seu navegador, escolha o servidor da sua guilda e clique em **Autorizar**.

---

## 4️⃣ Preencher o arquivo `.env`

Abra o arquivo [.env](file:///c:/Users/hoffm/Desktop/dISCORD/.env) na pasta do bot e cole as suas credenciais:

```env
DISCORD_TOKEN=cole_seu_token_aqui
CLIENT_ID=cole_seu_application_id_aqui
GUILD_ID=cole_o_id_do_seu_servidor_aqui
```

> 💡 **Como pegar o ID do seu Servidor (GUILD_ID)?**
> 1. No Discord, vá em **Configurações de Usuário** (engrenagem) ➔ **Avançado** ➔ Ative o **Modo Desenvolvedor**.
> 2. Clique com o botão direito no ícone do servidor da sua guilda e selecione **"Copiar ID do Servidor"**.
> 3. Colocar o `GUILD_ID` faz com que os comandos (`/setup-cargos`, etc.) apareçam **instantaneamente** no servidor!

---

## 5️⃣ REGRA DE OURO: Hierarquia de Cargos no Discord

Para que qualquer bot consiga dar ou tirar cargos dos membros, **o cargo do bot precisa estar acima dos cargos que ele gerencia**.

1. No Discord, entre no seu servidor.
2. Vá em **Configurações do Servidor** ➔ **Cargos**.
3. Localize o cargo com o nome do seu Bot.
4. **Arraste o cargo do Bot para cima** de todos os cargos de jogos (Aion, Dota, Conan, Valorant).
5. Salve as alterações.

---

## 6️⃣ Iniciar o Bot

Você pode iniciar de duas formas:

### Opção A (Com 1 clique no Windows):
1. Dê um duplo clique no arquivo [`registrar-comandos.bat`](file:///c:/Users/hoffm/Desktop/dISCORD/registrar-comandos.bat) para registrar os comandos `/` no servidor.
2. Dê um duplo clique no arquivo [`iniciar.bat`](file:///c:/Users/hoffm/Desktop/dISCORD/iniciar.bat) para ligar o bot!

### Opção B (Pelo Terminal / Prompt):
```bash
npm.cmd run deploy
npm.cmd start
```

---

## 7️⃣ Comandos no Discord para Configurar seu Servidor

Depois que o bot estiver online, use os comandos no seu servidor:

1. **/criar-cargos**
   - Cria automaticamente no servidor todas as ~30 tags com cores temáticas:
     - Classes do Aion 2
     - Medalhas do Dota 2
     - Modos PvE / PvP do Conan Exiles
     - Todos os elos do Valorant
   - *(Economiza horas de trabalho manual criando cargo por cargo!)*

2. **/setup-cargos** (ou `/setup-cargos #canal`)
   - Envia o painel bonito e permanente com os menus dropdown para os membros escolherem seus cargos.
   - Crie um canal chamado `#escolha-de-cargos` ou `#registro` e use esse comando lá!

3. **/config-boas-vindas**
   - Escolha o canal de texto onde o bot deve anunciar novos membros.
   - Exemplo: `/config-boas-vindas canal:#boas-vindas enviar_dm:True`

Pronto! Agora qualquer pessoa que entrar receberá uma mensagem privada e uma notificação no canal para escolher suas tags!
