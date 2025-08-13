#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🚀 Configuração do Google Calendar para DIFARIA style shapes');
console.log('=' .repeat(60));

// Função para fazer perguntas ao usuário
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Função para criar arquivo de credenciais
async function createCredentialsFile() {
    console.log('\n📋 Configuração das Credenciais OAuth 2.0');
    console.log('Você precisa ter criado um projeto no Google Cloud Console');
    console.log('e habilitado a Google Calendar API.\n');

    const clientId = await question('🔑 Client ID (ex: 123456789.apps.googleusercontent.com): ');
    const clientSecret = await question('🔐 Client Secret: ');
    const projectId = await question('🏗️  Project ID: ');

    const credentials = {
        "installed": {
            "client_id": clientId,
            "project_id": projectId,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": clientSecret,
            "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
        }
    };

    const credentialsPath = path.join(__dirname, '../config/google-credentials.json');
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    
    console.log('✅ Arquivo de credenciais criado com sucesso!');
    return true;
}

// Função para criar arquivo .env
async function createEnvFile() {
    console.log('\n🌍 Configuração das Variáveis de Ambiente');
    
    const calendarId = await question('📅 ID do Calendário (deixe vazio para usar "primary"): ') || 'primary';
    const timezone = await question('⏰ Timezone (deixe vazio para "America/Sao_Paulo"): ') || 'America/Sao_Paulo';

    const envContent = `# Configurações do Google Calendar
GOOGLE_CALENDAR_ID=${calendarId}
GOOGLE_CALENDAR_TIMEZONE=${timezone}
`;

    const envPath = path.join(__dirname, '../google-calendar.env');
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Arquivo de variáveis de ambiente criado!');
    return true;
}

// Função para executar autorização
async function runAuthorization() {
    console.log('\n🔐 Executando processo de autorização...');
    console.log('Isso abrirá uma URL no navegador para você autorizar o app.\n');
    
    try {
        const { execSync } = require('child_process');
        execSync('npm run authorize-google', { stdio: 'inherit' });
        console.log('✅ Autorização concluída com sucesso!');
        return true;
    } catch (error) {
        console.log('❌ Erro na autorização. Execute manualmente: npm run authorize-google');
        return false;
    }
}

// Função principal
async function main() {
    try {
        console.log('📁 Verificando estrutura de arquivos...');
        
        // Criar diretório config se não existir
        const configDir = path.join(__dirname, '../config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        // Verificar se já existe arquivo de credenciais
        const credentialsPath = path.join(configDir, 'google-credentials.json');
        if (fs.existsSync(credentialsPath)) {
            const useExisting = await question('📋 Arquivo de credenciais já existe. Usar existente? (s/n): ');
            if (useExisting.toLowerCase() !== 's') {
                await createCredentialsFile();
            }
        } else {
            await createCredentialsFile();
        }

        // Criar arquivo .env
        await createEnvFile();

        // Executar autorização
        const authSuccess = await runAuthorization();

        if (authSuccess) {
            console.log('\n🎉 Configuração do Google Calendar concluída com sucesso!');
            console.log('\n📋 Próximos passos:');
            console.log('1. Reinicie o servidor: npm run dev');
            console.log('2. Teste a funcionalidade na página de produtos');
            console.log('3. Clique em "Agendar Agora" em qualquer serviço');
        } else {
            console.log('\n⚠️  Configuração parcialmente concluída.');
            console.log('Execute manualmente: npm run authorize-google');
        }

    } catch (error) {
        console.error('❌ Erro durante a configuração:', error.message);
    } finally {
        rl.close();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { createCredentialsFile, createEnvFile, runAuthorization };
