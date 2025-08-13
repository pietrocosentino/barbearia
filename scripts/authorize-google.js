const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurações
const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
];

const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/token.json');

// Interface de linha de comando
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para perguntar ao usuário
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// Função para autorizar o aplicativo
async function authorize() {
    try {
        console.log('🔧 Configurando autorização do Google Calendar...\n');
        
        // Verificar se o arquivo de credenciais existe
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            console.error('❌ Arquivo de credenciais não encontrado!');
            console.log('📁 Crie o arquivo config/credentials.json primeiro.');
            console.log('📖 Consulte o arquivo GOOGLE_CALENDAR_SETUP.md para instruções.\n');
            return;
        }
        
        // Carregar credenciais
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        if (!client_id || !client_secret) {
            console.error('❌ Credenciais inválidas no arquivo credentials.json');
            return;
        }
        
        // Criar cliente OAuth2
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        
        // Verificar se já existe um token válido
        if (fs.existsSync(TOKEN_PATH)) {
            try {
                const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
                oAuth2Client.setCredentials(token);
                
                // Verificar se o token ainda é válido
                const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
                await calendar.calendarList.list();
                
                console.log('✅ Token já existe e é válido!');
                console.log('📅 Google Calendar configurado com sucesso.\n');
                return;
                
            } catch (error) {
                console.log('⚠️  Token existente expirou. Gerando novo token...\n');
            }
        }
        
        // Gerar URL de autorização
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent'
        });
        
        console.log('🌐 Autorize este aplicativo seguindo estas etapas:\n');
        console.log('1️⃣  Copie e cole esta URL no seu navegador:');
        console.log(`   ${authUrl}\n`);
        console.log('2️⃣  Faça login com sua conta Google');
        console.log('3️⃣  Clique em "Permitir" para autorizar o aplicativo');
        console.log('4️⃣  Copie o código de autorização fornecido\n');
        
        // Solicitar código de autorização
        const code = await question('📝 Cole o código de autorização aqui: ');
        
        if (!code.trim()) {
            console.log('❌ Código de autorização não fornecido.');
            return;
        }
        
        // Trocar código por token
        console.log('\n🔄 Obtendo token de acesso...');
        
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Salvar token
        if (!fs.existsSync(path.dirname(TOKEN_PATH))) {
            fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
        }
        
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        
        console.log('✅ Token salvo com sucesso!');
        console.log('📁 Arquivo salvo em: config/token.json\n');
        
        // Testar conexão
        console.log('🧪 Testando conexão com o Google Calendar...');
        
        try {
            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            const response = await calendar.calendarList.list();
            
            console.log('✅ Conexão estabelecida com sucesso!');
            console.log(`📅 Calendários disponíveis: ${response.data.items.length}`);
            
            if (response.data.items.length > 0) {
                console.log('📋 Lista de calendários:');
                response.data.items.forEach((cal, index) => {
                    console.log(`   ${index + 1}. ${cal.summary} (${cal.id})`);
                });
            }
            
            console.log('\n🎉 Configuração concluída com sucesso!');
            console.log('🚀 O sistema de agendamentos está pronto para uso.\n');
            
        } catch (error) {
            console.error('❌ Erro ao testar conexão:', error.message);
            console.log('⚠️  Verifique as permissões da sua conta Google.');
        }
        
    } catch (error) {
        console.error('❌ Erro durante a autorização:', error.message);
        
        if (error.code === 'ENOENT') {
            console.log('📁 Verifique se o arquivo de credenciais existe.');
        } else if (error.code === 'EAUTH') {
            console.log('🔐 Erro de autenticação. Verifique suas credenciais.');
        }
        
        console.log('\n📖 Consulte o arquivo GOOGLE_CALENDAR_SETUP.md para instruções detalhadas.');
    } finally {
        rl.close();
    }
}

// Função para revogar autorização
async function revokeAuthorization() {
    try {
        console.log('🗑️  Revogando autorização do Google Calendar...\n');
        
        if (!fs.existsSync(TOKEN_PATH)) {
            console.log('ℹ️  Nenhum token encontrado para revogar.');
            return;
        }
        
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        oAuth2Client.setCredentials(token);
        
        // Revogar token
        await oAuth2Client.revokeToken(token.access_token);
        
        // Remover arquivo de token
        fs.unlinkSync(TOKEN_PATH);
        
        console.log('✅ Autorização revogada com sucesso!');
        console.log('🗂️  Arquivo de token removido.');
        console.log('🔒 Para usar novamente, execute este script para reautorizar.\n');
        
    } catch (error) {
        console.error('❌ Erro ao revogar autorização:', error.message);
    } finally {
        rl.close();
    }
}

// Função principal
async function main() {
    console.log('🎯 DIFARIA style shapes - Configuração do Google Calendar\n');
    
    const action = await question('Escolha uma ação:\n1. Autorizar aplicativo\n2. Revogar autorização\n\nDigite 1 ou 2: ');
    
    if (action === '1') {
        await authorize();
    } else if (action === '2') {
        await revokeAuthorization();
    } else {
        console.log('❌ Opção inválida.');
        rl.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { authorize, revokeAuthorization };
