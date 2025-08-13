const axios = require('axios');

// Configuração base
const API_BASE = 'http://localhost:3000/api';

// Função para testar a API
async function testarAPI() {
  console.log('🧪 Iniciando testes da API da DIFARIA style shapes...\n');

  try {
    // 1. Testar listagem de serviços
    console.log('1️⃣ Testando listagem de serviços...');
    const servicos = await axios.get(`${API_BASE}/servicos`);
    console.log(`✅ Serviços encontrados: ${servicos.data.total}`);
    console.log('📋 Serviços:', servicos.data.data.map(s => `${s.nome} - R$ ${s.preco}`).join(', '));
    console.log('');

    // 2. Testar listagem de horários
    console.log('2️⃣ Testando listagem de horários...');
    const horarios = await axios.get(`${API_BASE}/horarios`);
    console.log(`✅ Horários encontrados: ${horarios.data.total}`);
    console.log('📅 Horários:', horarios.data.data.map(h => `${h.dia_semana}: ${h.hora_inicio}-${h.hora_fim}`).join(', '));
    console.log('');

    // 3. Testar verificação de horário específico
    console.log('3️⃣ Testando verificação de horário...');
    const hoje = new Date().toISOString().split('T')[0];
    const verificarHorario = await axios.get(`${API_BASE}/horarios/verificar/${hoje}/14:30`);
    console.log(`✅ Verificação: ${verificarHorario.data.data.mensagem}`);
    console.log('');

    // 4. Testar horários disponíveis
    console.log('4️⃣ Testando horários disponíveis...');
    const horariosDisponiveis = await axios.get(`${API_BASE}/horarios/disponiveis/${hoje}`);
    console.log(`✅ Funcionamento: ${horariosDisponiveis.data.data.funcionamento ? 'Sim' : 'Não'}`);
    if (horariosDisponiveis.data.data.funcionamento) {
      console.log(`📊 Horários disponíveis: ${horariosDisponiveis.data.data.horarios_disponiveis.length}`);
    }
    console.log('');

    // 5. Testar criação de contato
    console.log('5️⃣ Testando criação de contato...');
    const novoContato = await axios.post(`${API_BASE}/contatos`, {
      nome: 'João Teste',
      email: 'joao.teste@email.com',
      telefone: '(11) 99999-9999',
      preferencia_contato: 'whatsapp',
      mensagem: 'Teste da API - Gostaria de saber sobre horários',
      horario_preferido: 'Tarde',
      receber_novidades: true
    });
    console.log(`✅ Contato criado: ${novoContato.data.message}`);
    console.log(`🆔 ID do contato: ${novoContato.data.data.id}`);
    console.log('');

    // 6. Testar criação de agendamento
    console.log('6️⃣ Testando criação de agendamento...');
    const novoAgendamento = await axios.post(`${API_BASE}/agendamentos`, {
      cliente_nome: 'Pedro Teste',
      cliente_telefone: '(11) 88888-8888',
      cliente_email: 'pedro.teste@email.com',
      servico_id: 1, // Corte
      data_agendamento: hoje,
      hora_agendamento: '15:00',
      observacoes: 'Teste da API - Corte tradicional'
    });
    console.log(`✅ Agendamento criado: ${novoAgendamento.data.message}`);
    console.log(`🆔 ID do agendamento: ${novoAgendamento.data.data.id}`);
    console.log('');

    // 7. Testar listagem de agendamentos
    console.log('7️⃣ Testando listagem de agendamentos...');
    const agendamentos = await axios.get(`${API_BASE}/agendamentos`);
    console.log(`✅ Agendamentos encontrados: ${agendamentos.data.total}`);
    console.log('📋 Agendamentos:', agendamentos.data.data.map(a => 
      `${a.cliente_nome} - ${a.servico_nome} (${a.data_agendamento} ${a.hora_agendamento})`
    ).join(', '));
    console.log('');

    // 8. Testar estatísticas de contatos
    console.log('8️⃣ Testando estatísticas de contatos...');
    const statsContatos = await axios.get(`${API_BASE}/contatos/stats/overview`);
    console.log(`✅ Total de contatos: ${statsContatos.data.data.total_contatos}`);
    console.log(`📧 Preferem email: ${statsContatos.data.data.preferem_email}`);
    console.log(`📱 Preferem WhatsApp: ${statsContatos.data.data.preferem_whatsapp}`);
    console.log(`📞 Preferem telefone: ${statsContatos.data.data.preferem_telefone}`);
    console.log('');

    console.log('🎉 Todos os testes foram executados com sucesso!');
    console.log('🚀 A API está funcionando perfeitamente!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dica: Certifique-se de que o servidor está rodando em http://localhost:3000');
      console.log('   Execute: npm run dev');
    }
  }
}

// Função para testar endpoints específicos
async function testarEndpoint(endpoint, method = 'GET', data = null) {
  try {
    let response;
    
    switch (method.toUpperCase()) {
      case 'GET':
        response = await axios.get(`${API_BASE}${endpoint}`);
        break;
      case 'POST':
        response = await axios.post(`${API_BASE}${endpoint}`, data);
        break;
      case 'PUT':
        response = await axios.put(`${API_BASE}${endpoint}`, data);
        break;
      case 'DELETE':
        response = await axios.delete(`${API_BASE}${endpoint}`);
        break;
      default:
        throw new Error(`Método HTTP não suportado: ${method}`);
    }
    
    console.log(`✅ ${method} ${endpoint}:`, response.data);
    return response.data;
    
  } catch (error) {
    console.error(`❌ ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Função para mostrar menu de testes
function mostrarMenu() {
  console.log('\n🔧 Menu de Testes da API da DIFARIA style shapes');
  console.log('=====================================');
  console.log('1. Executar todos os testes');
  console.log('2. Testar serviços');
  console.log('3. Testar horários');
  console.log('4. Testar contatos');
  console.log('5. Testar agendamentos');
  console.log('6. Testar endpoint específico');
  console.log('0. Sair');
  console.log('=====================================');
}

// Função principal
async function main() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  while (true) {
    mostrarMenu();
    const opcao = await question('\nEscolha uma opção: ');

    try {
      switch (opcao) {
        case '1':
          await testarAPI();
          break;
        case '2':
          await testarEndpoint('/servicos');
          break;
        case '3':
          await testarEndpoint('/horarios');
          break;
        case '4':
          await testarEndpoint('/contatos');
          break;
        case '5':
          await testarEndpoint('/agendamentos');
          break;
        case '6':
          const endpoint = await question('Digite o endpoint (ex: /servicos/1): ');
          const method = await question('Digite o método HTTP (GET, POST, PUT, DELETE): ');
          let data = null;
          if (['POST', 'PUT'].includes(method.toUpperCase())) {
            const dataStr = await question('Digite os dados JSON (opcional): ');
            if (dataStr) {
              try {
                data = JSON.parse(dataStr);
              } catch (e) {
                console.log('❌ JSON inválido, usando dados padrão');
              }
            }
          }
          await testarEndpoint(endpoint, method, data);
          break;
        case '0':
          console.log('👋 Saindo...');
          rl.close();
          return;
        default:
          console.log('❌ Opção inválida!');
      }
    } catch (error) {
      console.log('❌ Erro:', error.message);
    }

    await question('\nPressione Enter para continuar...');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  // Verificar se axios está instalado
  try {
    require.resolve('axios');
    main();
  } catch (e) {
    console.log('❌ Axios não está instalado. Instale com: npm install axios');
    console.log('💡 Ou execute apenas: npm run dev');
  }
}

module.exports = {
  testarAPI,
  testarEndpoint
};
