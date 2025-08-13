# 🚀 Configuração Rápida do Google Calendar

## ⚡ Configuração Automatizada (Recomendado)

Execute o comando abaixo para configuração automatizada:

```bash
npm run setup-google
```

Este comando irá:
- ✅ Criar arquivo de credenciais
- ✅ Configurar variáveis de ambiente
- ✅ Executar processo de autorização
- ✅ Testar a conexão

---

## 🔧 Configuração Manual

### 1. Criar Projeto no Google Cloud Console

1. Acesse: [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Habilite a **Google Calendar API**
4. Configure **OAuth consent screen**
5. Crie **OAuth 2.0 Client ID** (tipo: Desktop app)

### 2. Configurar Credenciais

1. Copie o `Client ID` e `Client Secret`
2. Edite `config/google-credentials.json`:
   ```json
   {
     "installed": {
       "client_id": "SEU_CLIENT_ID_REAL.apps.googleusercontent.com",
       "client_secret": "SEU_CLIENT_SECRET_REAL",
       "project_id": "seu-projeto-id",
       "auth_uri": "https://accounts.google.com/o/oauth2/auth",
       "token_uri": "https://oauth2.googleapis.com/token",
       "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
       "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
     }
   }
   ```

### 3. Executar Autorização

```bash
npm run authorize-google
```

### 4. Testar Funcionalidade

1. Reinicie o servidor: `npm run dev`
2. Acesse: http://localhost:3000/produtos
3. Clique em "Agendar Agora" em qualquer serviço
4. Selecione data e horário
5. Preencha os dados e confirme

---

## 🧪 Testes

### Teste da API
```bash
npm test
```

### Teste do Google Calendar
```bash
node test-google-calendar.js
```

---

## 🔍 Solução de Problemas

### Erro: "Google Calendar não configurado"
- Verifique se `config/google-credentials.json` existe
- Execute `npm run authorize-google`
- Verifique se `config/google-token.json` foi criado

### Erro: "Invalid credentials"
- Verifique se as credenciais estão corretas
- Regenere as credenciais no Google Cloud Console
- Execute `npm run authorize-google` novamente

### Erro: "Calendar not found"
- Verifique se o `GOOGLE_CALENDAR_ID` está correto
- Use "primary" para o calendário principal
- Verifique permissões da conta Google

---

## 📱 Funcionalidades Disponíveis

✅ **Agendamento Online**: Cliente escolhe serviço, data e horário
✅ **Validação de Horários**: Verifica disponibilidade em tempo real
✅ **Integração Google Calendar**: Eventos criados automaticamente
✅ **Validação de Datas**: Fins de semana e horários de funcionamento
✅ **Interface Responsiva**: Funciona em desktop e mobile
✅ **Notificações**: Confirmação de agendamento

---

## 🎯 Próximos Passos

1. **Personalizar Horários**: Edite `config/google-calendar.js`
2. **Adicionar Serviços**: Modifique `GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS`
3. **Configurar Notificações**: Implemente webhooks para confirmações
4. **Dashboard Admin**: Crie interface para gerenciar agendamentos
5. **Relatórios**: Implemente sistema de relatórios e analytics

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Execute os testes: `npm test`
3. Verifique a documentação completa: `GOOGLE_CALENDAR_SETUP.md`
4. Teste a API diretamente: `node test-api.js`
