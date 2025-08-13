const { 
    authenticateGoogle, 
    getCalendarClient, 
    getAvailableTimeSlots,
    isTimeSlotAvailable,
    createCalendarEvent,
    GOOGLE_CALENDAR_CONFIG 
} = require('./config/google-calendar');

// Função para testar a configuração
async function testGoogleCalendarSetup() {
    console.log('🧪 Testando configuração do Google Calendar...\n');
    
    try {
        // Testar autenticação
        console.log('1️⃣  Testando autenticação...');
        const auth = await authenticateGoogle();
        
        if (!auth) {
            console.log('❌ Google Calendar não configurado.');
            console.log('📖 Execute: npm run authorize-google');
            console.log('📖 Consulte: GOOGLE_CALENDAR_SETUP.md\n');
            return false;
        }
        
        console.log('✅ Autenticação bem-sucedida!\n');
        
        // Testar cliente do calendário
        console.log('2️⃣  Testando cliente do calendário...');
        const calendar = await getCalendarClient();
        console.log('✅ Cliente do calendário criado!\n');
        
        // Testar configurações
        console.log('3️⃣  Verificando configurações...');
        console.log('📅 ID do Calendário:', GOOGLE_CALENDAR_CONFIG.CALENDAR_ID);
        console.log('⏰ Horário de funcionamento:', GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.start, '-', GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.end);
        console.log('🌍 Timezone:', GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.timezone);
        console.log('📋 Serviços configurados:', Object.keys(GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS).length);
        console.log('⏱️  Intervalo entre agendamentos:', GOOGLE_CALENDAR_CONFIG.APPOINTMENT_INTERVAL, 'minutos');
        console.log('✅ Configurações verificadas!\n');
        
        // Testar obtenção de horários disponíveis
        console.log('4️⃣  Testando obtenção de horários disponíveis...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        console.log('📅 Data de teste:', dateStr);
        const availableSlots = await getAvailableTimeSlots(dateStr, 'Corte');
        
        if (availableSlots.length > 0) {
            console.log('✅ Horários disponíveis encontrados:', availableSlots.length);
            console.log('⏰ Primeiros horários:', availableSlots.slice(0, 5).map(slot => slot.time).join(', '));
        } else {
            console.log('⚠️  Nenhum horário disponível para esta data');
        }
        console.log('');
        
        // Testar verificação de disponibilidade
        console.log('5️⃣  Testando verificação de disponibilidade...');
        if (availableSlots.length > 0) {
            const testTime = availableSlots[0].time;
            const isAvailable = await isTimeSlotAvailable(dateStr, testTime, 'Corte');
            console.log(`⏰ Horário ${testTime}: ${isAvailable ? '✅ Disponível' : '❌ Indisponível'}`);
        }
        console.log('');
        
        console.log('🎉 Todos os testes passaram!');
        console.log('🚀 O Google Calendar está configurado e funcionando.\n');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro durante os testes:', error.message);
        console.log('\n🔧 Soluções possíveis:');
        console.log('1. Execute: npm run authorize-google');
        console.log('2. Verifique o arquivo config/credentials.json');
        console.log('3. Consulte: GOOGLE_CALENDAR_SETUP.md\n');
        return false;
    }
}

// Função para testar criação de evento
async function testEventCreation() {
    console.log('🎯 Testando criação de evento...\n');
    
    try {
        const testData = {
            nome: 'Cliente Teste',
            telefone: '(11) 99999-9999',
            email: 'teste@email.com',
            servico: 'Corte',
            data: '2024-01-15',
            horario: '10:00',
            observacoes: 'Agendamento de teste - Pode ser removido'
        };
        
        console.log('📝 Dados do teste:', testData);
        
        const result = await createCalendarEvent(testData);
        
        if (result.success) {
            console.log('✅ Evento criado com sucesso!');
            console.log('🆔 ID do evento:', result.eventId);
            console.log('🔗 Link do evento:', result.eventLink);
            console.log('\n⚠️  Lembre-se de remover este evento de teste do calendário!');
        } else {
            console.log('❌ Erro ao criar evento:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Erro durante teste de criação:', error.message);
    }
}

// Função principal
async function main() {
    console.log('🎯 DIFARIA style shapes - Teste do Google Calendar\n');
    
    const setupOk = await testGoogleCalendarSetup();
    
    if (setupOk) {
        console.log('🤔 Deseja testar a criação de um evento? (s/n)');
        process.stdin.once('data', async (data) => {
            const answer = data.toString().trim().toLowerCase();
            
            if (answer === 's' || answer === 'sim' || answer === 'y' || answer === 'yes') {
                await testEventCreation();
            } else {
                console.log('✅ Teste concluído sem criação de evento.');
            }
            
            process.exit(0);
        });
    } else {
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testGoogleCalendarSetup, testEventCreation };
