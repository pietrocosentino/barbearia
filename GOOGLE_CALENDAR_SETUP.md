# 🔧 Configuração do Google Calendar para DIFARIA style shapes

Este documento explica como configurar a integração com o Google Calendar para o sistema de agendamentos.

## 📋 Pré-requisitos

- Conta Google (Gmail)
- Acesso ao Google Cloud Console
- Node.js instalado no servidor

## 🚀 Passo a Passo para Configuração

### 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Calendar:
   - Vá para "APIs e Serviços" > "Biblioteca"
   - Procure por "Google Calendar API"
   - Clique em "Ativar"

### 2. Configurar Credenciais OAuth 2.0

1. Vá para "APIs e Serviços" > "Credenciais"
2. Clique em "Criar Credenciais" > "ID do Cliente OAuth 2.0"
3. Configure a tela de consentimento OAuth:
   - Nome do aplicativo: "DIFARIA style shapes"
   - E-mail de suporte: seu e-mail
   - Domínios autorizados: localhost (para desenvolvimento)
4. Configure as credenciais OAuth:
   - Tipo de aplicativo: "Aplicativo da área de trabalho"
   - Nome: "DIFARIA Calendar Integration"
5. Anote o **Client ID** e **Client Secret**

### 3. Configurar Arquivo de Credenciais

1. Crie o arquivo `config/credentials.json` com o seguinte conteúdo:

```json
{
  "installed": {
    "client_id": "SEU_CLIENT_ID_AQUI.apps.googleusercontent.com",
    "project_id": "seu-projeto-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "SEU_CLIENT_SECRET_AQUI",
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
  }
}
```

2. Substitua `SEU_CLIENT_ID_AQUI` e `SEU_CLIENT_SECRET_AQUI` pelos valores reais

### 4. Autorizar o Aplicativo

1. Execute o script de autorização:
   ```bash
   node scripts/authorize-google.js
   ```

2. Siga as instruções no terminal:
   - Copie a URL fornecida
   - Cole no navegador
   - Faça login com sua conta Google
   - Autorize o aplicativo
   - Copie o código de autorização
   - Cole no terminal

3. O script criará automaticamente o arquivo `config/token.json`

### 5. Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Google Calendar
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=America/Sao_Paulo
```

## 🔐 Segurança

- **NUNCA** compartilhe suas credenciais
- **NUNCA** commite os arquivos `credentials.json` e `token.json` no Git
- Use variáveis de ambiente para configurações sensíveis
- Configure corretamente as permissões OAuth

## 📅 Configurações do Calendário

### Horários de Funcionamento
- **Início**: 08:00
- **Fim**: 18:00
- **Dias**: Segunda a Sexta-feira
- **Fuso horário**: America/Sao_Paulo

### Duração dos Serviços
- **Corte**: 30 minutos
- **Barba**: 30 minutos
- **Corte + Barba**: 60 minutos
- **Sobrancelha**: 15 minutos
- **Pacote Completo**: 75 minutos

### Intervalos de Agendamento
- **Intervalo entre agendamentos**: 15 minutos
- **Antecedência mínima**: 2 horas
- **Antecedência máxima**: 30 dias

## 🧪 Testando a Integração

### 1. Verificar Status
```bash
curl http://localhost:3000/api/agendamentos-google/configuracao
```

### 2. Verificar Horários Disponíveis
```bash
curl "http://localhost:3000/api/agendamentos-google/horarios-disponiveis/2024-01-15/Corte"
```

### 3. Criar Agendamento de Teste
```bash
curl -X POST http://localhost:3000/api/agendamentos-google/agendar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Cliente Teste",
    "telefone": "(11) 99999-9999",
    "email": "teste@email.com",
    "servico": "Corte",
    "data": "2024-01-15",
    "horario": "10:00",
    "observacoes": "Agendamento de teste"
  }'
```

## 🚨 Solução de Problemas

### Erro: "Google Calendar não configurado"
- Verifique se os arquivos `credentials.json` e `token.json` existem
- Execute novamente o script de autorização
- Verifique as permissões dos arquivos

### Erro: "Credenciais inválidas"
- Verifique se o Client ID e Client Secret estão corretos
- Regenerar credenciais no Google Cloud Console
- Verificar se a API do Calendar está ativada

### Erro: "Token expirado"
- Execute novamente o script de autorização
- O token pode ter expirado (normal após 1 hora de inatividade)

### Erro: "Permissão negada"
- Verificar se o calendário tem permissões de escrita
- Verificar se a conta tem permissões adequadas

## 📱 Uso no Frontend

O sistema está configurado para funcionar automaticamente:

1. **Botões de Agendamento**: Aparecem em cada serviço na página de produtos
2. **Modal de Agendamento**: Abre ao clicar em "Agendar Agora"
3. **Validação em Tempo Real**: Verifica disponibilidade antes de confirmar
4. **Integração Automática**: Cria eventos no Google Calendar automaticamente

## 🔄 Manutenção

### Renovar Token
```bash
node scripts/authorize-google.js
```

### Verificar Logs
```bash
tail -f logs/app.log
```

### Backup de Configurações
```bash
cp config/credentials.json config/credentials.json.backup
cp config/token.json config/token.json.backup
```

## 📞 Suporte

Para problemas técnicos:
- Verifique os logs do servidor
- Consulte a documentação da API do Google Calendar
- Verifique as configurações OAuth no Google Cloud Console

---

**⚠️ Importante**: Esta integração é essencial para o funcionamento do sistema de agendamentos. Mantenha as credenciais seguras e atualizadas.
