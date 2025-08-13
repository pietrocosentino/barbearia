const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Configurações do Google Calendar
const GOOGLE_CALENDAR_CONFIG = {
    // ID do calendário da barbearia (será criado ou configurado)
    CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'primary',
    
    // Configurações de horário de funcionamento
    BUSINESS_HOURS: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo'
    },
    
    // Duração padrão dos serviços (em minutos)
    SERVICE_DURATIONS: {
        'Corte': 30,
        'Barba': 30,
        'Corte + Barba': 60,
        'Sobrancelha': 15,
        'Corte + Barba + Sobrancelha': 75
    },
    
    // Intervalo entre agendamentos (em minutos)
    APPOINTMENT_INTERVAL: 15,
    
    // Tempo de antecedência mínimo para agendamento (em horas)
    MIN_ADVANCE_BOOKING: 2,
    
    // Tempo máximo de antecedência para agendamento (em dias)
    MAX_ADVANCE_BOOKING: 30
};

// Função para autenticar com o Google
async function authenticateGoogle() {
    try {
        // Verificar se existe arquivo de credenciais
        const credentialsPath = path.join(__dirname, 'google-credentials.json');
        const tokenPath = path.join(__dirname, 'google-token.json');
        
        if (!fs.existsSync(credentialsPath)) {
            throw new Error('Arquivo de credenciais não encontrado. Configure o Google Calendar primeiro.');
        }
        
        const credentials = JSON.parse(fs.readFileSync(credentialsPath));
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        
        // Verificar se existe token salvo
        if (fs.existsSync(tokenPath)) {
            const token = JSON.parse(fs.readFileSync(tokenPath));
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        }
        
        // Se não há token, retornar null para indicar necessidade de autorização
        return null;
        
    } catch (error) {
        console.error('Erro na autenticação do Google:', error.message);
        return null;
    }
}

// Função para obter o cliente do Google Calendar
async function getCalendarClient() {
    const auth = await authenticateGoogle();
    if (!auth) {
        throw new Error('Autenticação do Google Calendar necessária');
    }
    
    return google.calendar({ version: 'v3', auth });
}

// Função para verificar se uma data/hora está disponível
async function isTimeSlotAvailable(date, time, serviceName) {
    try {
        const calendar = await getCalendarClient();
        const serviceDuration = GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS[serviceName] || 30;
        
        // Converter para objetos Date
        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);
        
        // Verificar conflitos no calendário
        const response = await calendar.events.list({
            calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
            timeMin: startDateTime.toISOString(),
            timeMax: endDateTime.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        // Se não há eventos, o horário está disponível
        return response.data.items.length === 0;
        
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        return false;
    }
}

// Função para obter horários disponíveis em uma data
async function getAvailableTimeSlots(date, serviceName) {
    try {
        const calendar = await getCalendarClient();
        const serviceDuration = GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS[serviceName] || 30;
        
        // Horários de funcionamento
        const businessStart = new Date(`${date}T${GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.start}`);
        const businessEnd = new Date(`${date}T${GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.end}`);
        
        // Obter eventos existentes no dia
        const response = await calendar.events.list({
            calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
            timeMin: businessStart.toISOString(),
            timeMax: businessEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        const existingEvents = response.data.items || [];
        const availableSlots = [];
        
        // Gerar slots de horário disponíveis
        let currentTime = new Date(businessStart);
        
        while (currentTime < businessEnd) {
            const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
            
            // Verificar se o slot não conflita com eventos existentes
            const hasConflict = existingEvents.some(event => {
                const eventStart = new Date(event.start.dateTime);
                const eventEnd = new Date(event.end.dateTime);
                
                return (currentTime < eventEnd && slotEnd > eventStart);
            });
            
            if (!hasConflict) {
                availableSlots.push({
                    time: currentTime.toTimeString().slice(0, 5),
                    available: true
                });
            }
            
            // Avançar para o próximo slot
            currentTime = new Date(currentTime.getTime() + GOOGLE_CALENDAR_CONFIG.APPOINTMENT_INTERVAL * 60000);
        }
        
        return availableSlots;
        
    } catch (error) {
        console.error('Erro ao obter horários disponíveis:', error);
        return [];
    }
}

// Função para criar um agendamento no Google Calendar
async function createCalendarEvent(appointmentData) {
    try {
        const calendar = await getCalendarClient();
        const serviceDuration = GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS[appointmentData.servico] || 30;
        
        const startDateTime = new Date(`${appointmentData.data}T${appointmentData.horario}`);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);
        
        const event = {
            summary: `Agendamento - ${appointmentData.servico}`,
            description: `Cliente: ${appointmentData.nome}\nTelefone: ${appointmentData.telefone}\nServiço: ${appointmentData.servico}`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.timezone,
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.timezone,
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 1 dia antes
                    { method: 'popup', minutes: 60 }, // 1 hora antes
                ],
            },
        };
        
        const response = await calendar.events.insert({
            calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
            resource: event,
        });
        
        return {
            success: true,
            eventId: response.data.id,
            eventLink: response.data.htmlLink
        };
        
    } catch (error) {
        console.error('Erro ao criar evento no calendário:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Função para obter eventos de uma data específica
async function getEventsByDate(date) {
    try {
        const calendar = await getCalendarClient();
        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59`);
        
        const response = await calendar.events.list({
            calendarId: GOOGLE_CALENDAR_CONFIG.CALENDAR_ID,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });
        
        return response.data.items || [];
        
    } catch (error) {
        console.error('Erro ao obter eventos da data:', error);
        return [];
    }
}

module.exports = {
    GOOGLE_CALENDAR_CONFIG,
    authenticateGoogle,
    getCalendarClient,
    isTimeSlotAvailable,
    getAvailableTimeSlots,
    createCalendarEvent,
    getEventsByDate
};
