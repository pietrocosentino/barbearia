const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { 
    getAvailableTimeSlots, 
    isTimeSlotAvailable, 
    createCalendarEvent,
    getEventsByDate,
    GOOGLE_CALENDAR_CONFIG 
} = require('../config/google-calendar');

// Configuração do banco de dados
const dbPath = path.join(__dirname, '../database/difaria.db');

// Middleware para verificar se o Google Calendar está configurado
const checkGoogleCalendarSetup = async (req, res, next) => {
    try {
        const { authenticateGoogle } = require('../config/google-calendar');
        const auth = await authenticateGoogle();
        
        if (!auth) {
            return res.status(503).json({
                success: false,
                message: 'Google Calendar não configurado. Configure as credenciais primeiro.',
                setupRequired: true
            });
        }
        
        next();
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Erro ao verificar configuração do Google Calendar',
            error: error.message
        });
    }
};

// GET /api/agendamentos-google/horarios-disponiveis/:data/:servico
// Obter horários disponíveis para uma data e serviço específicos
router.get('/horarios-disponiveis/:data/:servico', checkGoogleCalendarSetup, async (req, res) => {
    try {
        const { data, servico } = req.params;
        
        // Validar formato da data (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de data inválido. Use YYYY-MM-DD'
            });
        }
        
        // Validar se a data não é passada
        const selectedDate = new Date(data);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível agendar para datas passadas'
            });
        }
        
        // Validar se a data não é muito distante
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + GOOGLE_CALENDAR_CONFIG.MAX_ADVANCE_BOOKING);
        
        if (selectedDate > maxDate) {
            return res.status(400).json({
                success: false,
                message: `Agendamentos permitidos apenas até ${maxDate.toISOString().split('T')[0]}`
            });
        }
        
        // Verificar se é dia útil (segunda a sexta)
        const dayOfWeek = selectedDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return res.status(400).json({
                success: false,
                message: 'Agendamentos disponíveis apenas de segunda a sexta-feira'
            });
        }
        
        // Obter horários disponíveis
        const availableSlots = await getAvailableTimeSlots(data, servico);
        
        if (availableSlots.length === 0) {
            return res.json({
                success: true,
                data: data,
                servico: servico,
                horarios: [],
                message: 'Nenhum horário disponível para esta data'
            });
        }
        
        res.json({
            success: true,
            data: data,
            servico: servico,
            horarios: availableSlots,
            configuracao: {
                horarioInicio: GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.start,
                horarioFim: GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS.end,
                duracaoServico: GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS[servico] || 30,
                intervalo: GOOGLE_CALENDAR_CONFIG.APPOINTMENT_INTERVAL
            }
        });
        
    } catch (error) {
        console.error('Erro ao obter horários disponíveis:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// POST /api/agendamentos-google/agendar
// Criar um novo agendamento
router.post('/agendar', checkGoogleCalendarSetup, async (req, res) => {
    try {
        const { nome, telefone, email, servico, data, horario, observacoes } = req.body;
        
        // Validações básicas
        if (!nome || !telefone || !servico || !data || !horario) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos'
            });
        }
        
        // Validar formato da data e horário
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horario)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de data ou horário inválido'
            });
        }
        
        // Verificar se o horário ainda está disponível
        const isAvailable = await isTimeSlotAvailable(data, horario, servico);
        if (!isAvailable) {
            return res.status(409).json({
                success: false,
                message: 'Este horário não está mais disponível. Escolha outro horário.'
            });
        }
        
        // Criar evento no Google Calendar
        const calendarResult = await createCalendarEvent({
            nome,
            telefone,
            email,
            servico,
            data,
            horario,
            observacoes
        });
        
        if (!calendarResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao criar agendamento no calendário',
                error: calendarResult.error
            });
        }
        
        // Salvar no banco de dados local
        const db = new sqlite3.Database(dbPath);
        
        const insertQuery = `
            INSERT INTO agendamentos (nome, telefone, email, servico, data, horario, observacoes, google_event_id, google_event_link, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertQuery, [
            nome,
            telefone,
            email,
            servico,
            data,
            horario,
            observacoes || '',
            calendarResult.eventId,
            calendarResult.eventLink,
            'confirmado'
        ], function(err) {
            db.close();
            
            if (err) {
                console.error('Erro ao salvar no banco:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Agendamento criado no calendário, mas erro ao salvar localmente',
                    error: err.message
                });
            }
            
            res.status(201).json({
                success: true,
                message: 'Agendamento criado com sucesso!',
                agendamento: {
                    id: this.lastID,
                    nome,
                    telefone,
                    email,
                    servico,
                    data,
                    horario,
                    observacoes,
                    googleEventId: calendarResult.eventId,
                    googleEventLink: calendarResult.eventLink,
                    status: 'confirmado'
                }
            });
        });
        
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/agendamentos-google/verificar-disponibilidade/:data/:horario/:servico
// Verificar se um horário específico está disponível
router.get('/verificar-disponibilidade/:data/:horario/:servico', checkGoogleCalendarSetup, async (req, res) => {
    try {
        const { data, horario, servico } = req.params;
        
        // Validar formato da data e horário
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horario)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de data ou horário inválido'
            });
        }
        
        // Verificar disponibilidade
        const isAvailable = await isTimeSlotAvailable(data, horario, servico);
        
        res.json({
            success: true,
            data: data,
            horario: horario,
            servico: servico,
            disponivel: isAvailable,
            duracaoServico: GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS[servico] || 30
        });
        
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/agendamentos-google/eventos/:data
// Obter todos os eventos de uma data específica
router.get('/eventos/:data', checkGoogleCalendarSetup, async (req, res) => {
    try {
        const { data } = req.params;
        
        // Validar formato da data
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de data inválido. Use YYYY-MM-DD'
            });
        }
        
        // Obter eventos da data
        const events = await getEventsByDate(data);
        
        // Formatar eventos para resposta
        const formattedEvents = events.map(event => ({
            id: event.id,
            titulo: event.summary,
            descricao: event.description,
            inicio: event.start.dateTime,
            fim: event.end.dateTime,
            link: event.htmlLink
        }));
        
        res.json({
            success: true,
            data: data,
            eventos: formattedEvents,
            total: formattedEvents.length
        });
        
    } catch (error) {
        console.error('Erro ao obter eventos da data:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor',
            error: error.message
        });
    }
});

// GET /api/agendamentos-google/configuracao
// Obter configurações do Google Calendar
router.get('/configuracao', (req, res) => {
    res.json({
        success: true,
        configuracao: {
            horariosFuncionamento: GOOGLE_CALENDAR_CONFIG.BUSINESS_HOURS,
            servicos: GOOGLE_CALENDAR_CONFIG.SERVICE_DURATIONS,
            intervaloAgendamentos: GOOGLE_CALENDAR_CONFIG.APPOINTMENT_INTERVAL,
            antecedenciaMinima: GOOGLE_CALENDAR_CONFIG.MIN_ADVANCE_BOOKING,
            antecedenciaMaxima: GOOGLE_CALENDAR_CONFIG.MAX_ADVANCE_BOOKING
        }
    });
});

module.exports = router;
