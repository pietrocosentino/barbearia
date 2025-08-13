# 🪒 Backend da DIFARIA style shapes

Backend completo para sistema de barbearia com integração ao Google Calendar para agendamentos automáticos.

## ✨ Funcionalidades

### 🗓️ Sistema de Agendamentos
- **Integração com Google Calendar**: Agendamentos automáticos no calendário
- **Validação de horários**: Verifica disponibilidade em tempo real
- **Prevenção de conflitos**: Evita agendamentos duplicados
- **Notificações automáticas**: Lembretes por e-mail e popup

### 🎯 Gestão de Serviços
- Cadastro de serviços com preços e duração
- Configuração automática de horários disponíveis
- Cálculo inteligente de slots de tempo

### 📞 Sistema de Contatos
- Formulário de contato integrado
- Preferências de comunicação
- Histórico de mensagens

### ⏰ Horários de Funcionamento
- Configuração flexível de horários
- Validação de dias úteis
- Suporte a múltiplos horários por dia

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ instalado
- Conta Google para integração com Calendar
- Acesso ao Google Cloud Console

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd difaria
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o Google Calendar
```bash
# Siga as instruções em GOOGLE_CALENDAR_SETUP.md
npm run authorize-google
```

### 4. Inicialize o banco de dados
```bash
npm run init-db
```

### 5. Inicie o servidor
```bash
npm run dev
```

## 🔧 Configuração do Google Calendar

A integração com o Google Calendar é **essencial** para o funcionamento do sistema de agendamentos.

### Passos rápidos:
1. **Criar projeto** no [Google Cloud Console](https://console.cloud.google.com/)
2. **Ativar Google Calendar API**
3. **Criar credenciais OAuth 2.0**
4. **Configurar arquivo** `config/credentials.json`
5. **Executar autorização**: `npm run authorize-google`

📖 **Documentação completa**: [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)

## 📱 Como Usar

### 1. Acesse a página de produtos
- Navegue para `/produtos`
- Cada serviço tem um botão "Agendar Agora"

### 2. Escolha o serviço
- Clique no botão de agendamento
- Modal abre com informações do serviço

### 3. Preencha os dados
- Nome, telefone, e-mail
- Selecione data e horário disponível
- Adicione observações (opcional)

### 4. Confirme o agendamento
- Sistema valida disponibilidade
- Cria evento no Google Calendar
- Salva no banco local
- Envia confirmação

## 🧪 Testando

### Teste da API
```bash
npm test
```

### Teste do Google Calendar
```bash
node test-google-calendar.js
```

### Teste manual com cURL
```bash
# Verificar configuração
curl http://localhost:3000/api/agendamentos-google/configuracao

# Ver horários disponíveis
curl "http://localhost:3000/api/agendamentos-google/horarios-disponiveis/2024-01-15/Corte"

# Criar agendamento
curl -X POST http://localhost:3000/api/agendamentos-google/agendar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","telefone":"(11)99999-9999","servico":"Corte","data":"2024-01-15","horario":"10:00"}'
```

## 📊 Estrutura da API

### Endpoints de Agendamento
- `GET /api/agendamentos-google/horarios-disponiveis/:data/:servico` - Horários disponíveis
- `POST /api/agendamentos-google/agendar` - Criar agendamento
- `GET /api/agendamentos-google/verificar-disponibilidade/:data/:horario/:servico` - Verificar slot
- `GET /api/agendamentos-google/eventos/:data` - Eventos de uma data
- `GET /api/agendamentos-google/configuracao` - Configurações do sistema

### Endpoints Existentes
- `GET /api/servicos` - Listar serviços
- `GET /api/agendamentos` - Listar agendamentos
- `POST /api/contatos` - Enviar mensagem de contato
- `GET /api/horarios` - Horários de funcionamento

## 🔐 Segurança

- **Helmet.js** para headers de segurança
- **Rate limiting** para prevenir spam
- **CORS** configurado para desenvolvimento
- **Validação** de dados em todas as entradas
- **Sanitização** de dados antes do banco

## 📁 Estrutura do Projeto

```
difaria/
├── config/                 # Configurações
│   ├── google-calendar.js  # Integração Google Calendar
│   └── credentials.json    # Credenciais Google (não commitar)
├── database/               # Banco de dados
│   ├── init.js            # Inicialização do banco
│   └── difaria.db         # Banco SQLite
├── routes/                 # Rotas da API
│   ├── agendamentos.js    # Agendamentos básicos
│   ├── agendamentos-google.js # Agendamentos Google Calendar
│   ├── servicos.js        # Gestão de serviços
│   ├── contatos.js        # Sistema de contatos
│   └── horarios.js        # Horários de funcionamento
├── scripts/                # Scripts utilitários
│   └── authorize-google.js # Autorização Google
├── js/                     # JavaScript frontend
│   └── agendamento.js     # Lógica de agendamento
├── server.js               # Servidor principal
├── package.json            # Dependências
└── README.md               # Este arquivo
```

## 🚨 Solução de Problemas

### Google Calendar não configurado
```bash
npm run authorize-google
```

### Erro de credenciais
- Verifique `config/credentials.json`
- Regenerar credenciais no Google Cloud Console

### Token expirado
```bash
npm run authorize-google
```

### Banco não inicializado
```bash
npm run init-db
```

## 🔄 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Servidor com nodemon
npm start                # Servidor em produção

# Banco de dados
npm run init-db          # Inicializar banco

# Google Calendar
npm run authorize-google # Configurar autorização

# Testes
npm test                 # Testar API
node test-google-calendar.js # Testar Google Calendar
```

## 📞 Suporte

Para problemas técnicos:
1. Verifique os logs do servidor
2. Consulte a documentação do Google Calendar
3. Verifique as configurações OAuth
4. Execute os testes de diagnóstico

## 📄 Licença

Este projeto é desenvolvido para uso interno da DIFARIA style shapes.

---

**Desenvolvido com ❤️ para a DIFARIA style shapes**

**⚠️ Importante**: A integração com Google Calendar é essencial. Configure corretamente seguindo o guia de setup.
