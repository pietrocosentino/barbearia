const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/difaria.db');

// Middleware para conectar ao banco
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// GET - Listar todos os horários de funcionamento
router.get('/', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      dia_semana,
      hora_inicio,
      hora_fim,
      ativo
    FROM horarios_funcionamento
    ORDER BY 
      CASE dia_semana
        WHEN 'Segunda-feira' THEN 1
        WHEN 'Terça-feira' THEN 2
        WHEN 'Quarta-feira' THEN 3
        WHEN 'Quinta-feira' THEN 4
        WHEN 'Sexta-feira' THEN 5
        WHEN 'Sábado' THEN 6
        WHEN 'Domingo' THEN 7
        ELSE 8
      END
  `;

  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar horários',
        message: err.message 
      });
    }
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
  });
});

// GET - Buscar horário por dia da semana
router.get('/dia/:dia', (req, res) => {
  const { dia } = req.params;
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      dia_semana,
      hora_inicio,
      hora_fim,
      ativo
    FROM horarios_funcionamento
    WHERE dia_semana = ?
  `;

  db.get(query, [dia], (err, row) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar horário',
        message: err.message 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        error: 'Horário não encontrado para este dia' 
      });
    }
    
    res.json({
      success: true,
      data: row
    });
  });
});

// GET - Verificar se a DIFARIA style shapes está aberta em uma data/hora específica
router.get('/verificar/:data/:hora', (req, res) => {
  const { data, hora } = req.params;
  const db = getDb();
  
  // Validar formato da data
  if (!moment(data, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ 
      error: 'Formato de data inválido. Use YYYY-MM-DD' 
    });
  }
  
  // Validar formato da hora
  if (!moment(hora, 'HH:mm', true).isValid()) {
    return res.status(400).json({ 
      error: 'Formato de hora inválido. Use HH:mm' 
    });
  }
  
  // Obter o dia da semana
  const dataMoment = moment(data);
  const diaSemana = dataMoment.format('dddd');
  
  // Mapear dias em português
  const diasMap = {
    'monday': 'Segunda-feira',
    'tuesday': 'Terça-feira',
    'wednesday': 'Quarta-feira',
    'thursday': 'Quinta-feira',
    'friday': 'Sexta-feira',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  
  const diaSemanaPT = diasMap[dataMoment.format('dddd').toLowerCase()];
  
  const query = `
    SELECT 
      id,
      dia_semana,
      hora_inicio,
      hora_fim,
      ativo
    FROM horarios_funcionamento
    WHERE dia_semana = ?
  `;

  db.get(query, [diaSemanaPT], (err, horario) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao verificar horário',
        message: err.message 
      });
    }
    
    if (!horario || !horario.ativo) {
      return res.json({
        success: true,
        data: {
          aberto: false,
          mensagem: 'DIFARIA style shapes fechada neste dia'
        }
      });
    }
    
    // Verificar se está dentro do horário de funcionamento
    const horaAtual = moment(hora, 'HH:mm');
    const horaInicio = moment(horario.hora_inicio, 'HH:mm');
    const horaFim = moment(horario.hora_fim, 'HH:mm');
    
    const estaAberto = horaAtual.isBetween(horaInicio, horaFim, 'minute', '[]');
    
    res.json({
      success: true,
      data: {
        aberto: estaAberto,
        dia_semana: horario.dia_semana,
        hora_inicio: horario.hora_inicio,
        hora_fim: horario.hora_fim,
        hora_verificada: hora,
        mensagem: estaAberto ? 'DIFARIA style shapes aberta' : 'DIFARIA style shapes fechada neste horário'
      }
    });
  });
});

// GET - Obter horários disponíveis para agendamento em uma data específica
router.get('/disponiveis/:data', (req, res) => {
  const { data } = req.params;
  const db = getDb();
  
  // Validar formato da data
  if (!moment(data, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ 
      error: 'Formato de data inválido. Use YYYY-MM-DD' 
    });
  }
  
  // Verificar se a data não é passada
  if (moment(data).isBefore(moment(), 'day')) {
    return res.status(400).json({
      error: 'Não é possível verificar disponibilidade para datas passadas'
    });
  }
  
  // Obter o dia da semana
  const dataMoment = moment(data);
  const diaSemana = dataMoment.format('dddd');
  
  // Mapear dias em português
  const diasMap = {
    'monday': 'Segunda-feira',
    'tuesday': 'Terça-feira',
    'wednesday': 'Quarta-feira',
    'thursday': 'Quinta-feira',
    'friday': 'Sexta-feira',
    'saturday': 'Sábado',
    'sunday': 'Domingo'
  };
  
  const diaSemanaPT = diasMap[dataMoment.format('dddd').toLowerCase()];
  
  // Verificar se a DIFARIA style shapes funciona neste dia
  db.get(`
    SELECT hora_inicio, hora_fim, ativo 
    FROM horarios_funcionamento 
    WHERE dia_semana = ?
  `, [diaSemanaPT], (err, horario) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao verificar horário de funcionamento',
        message: err.message
      });
    }
    
    if (!horario || !horario.ativo) {
      db.close();
      return res.json({
        success: true,
        data: {
          dia: data,
          dia_semana: diaSemanaPT,
          funcionamento: false,
          mensagem: 'DIFARIA style shapes não funciona neste dia',
          horarios_disponiveis: []
        }
      });
    }
    
    // Gerar horários disponíveis (intervalos de 30 minutos)
    const horariosDisponiveis = [];
    const horaInicio = moment(horario.hora_inicio, 'HH:mm');
    const horaFim = moment(horario.hora_fim, 'HH:mm');
    
    let horaAtual = horaInicio.clone();
    
    while (horaAtual.isBefore(horaFim)) {
      horariosDisponiveis.push(horaAtual.format('HH:mm'));
      horaAtual.add(30, 'minutes');
    }
    
    // Verificar agendamentos existentes para esta data
    db.all(`
      SELECT hora_agendamento, s.duracao
      FROM agendamentos a
      JOIN servicos s ON a.servico_id = s.id
      WHERE a.data_agendamento = ? AND a.status != 'cancelado'
      ORDER BY hora_agendamento
    `, [data], (err, agendamentos) => {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao verificar agendamentos existentes',
          message: err.message
        });
      }
      
      // Marcar horários ocupados
      const horariosOcupados = new Set();
      agendamentos.forEach(agendamento => {
        const horaInicio = moment(agendamento.hora_agendamento, 'HH:mm');
        const horaFim = horaInicio.clone().add(agendamento.duracao, 'minutes');
        
        let horaAtual = horaInicio.clone();
        while (horaAtual.isBefore(horaFim)) {
          horariosOcupados.add(horaAtual.format('HH:mm'));
          horaAtual.add(30, 'minutes');
        }
      });
      
      // Filtrar horários disponíveis
      const horariosLivres = horariosDisponiveis.filter(horario => 
        !horariosOcupados.has(horario)
      );
      
      res.json({
        success: true,
        data: {
          dia: data,
          dia_semana: diaSemanaPT,
          funcionamento: true,
          hora_inicio: horario.hora_inicio,
          hora_fim: horario.hora_fim,
          total_horarios: horariosDisponiveis.length,
          horarios_disponiveis: horariosLivres,
          horarios_ocupados: Array.from(horariosOcupados).sort(),
          agendamentos_existentes: agendamentos.length
        }
      });
    });
  });
});

// PUT - Atualizar horário de funcionamento
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    dia_semana,
    hora_inicio,
    hora_fim,
    ativo
  } = req.body;

  const db = getDb();

  // Verificar se o horário existe
  db.get('SELECT * FROM horarios_funcionamento WHERE id = ?', [id], (err, horario) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar horário',
        message: err.message
      });
    }

    if (!horario) {
      db.close();
      return res.status(404).json({
        error: 'Horário não encontrado'
      });
    }

    // Validar formato das horas se fornecidas
    if (hora_inicio && !moment(hora_inicio, 'HH:mm', true).isValid()) {
      db.close();
      return res.status(400).json({
        error: 'Formato de hora_inicio inválido. Use HH:mm'
      });
    }

    if (hora_fim && !moment(hora_fim, 'HH:mm', true).isValid()) {
      db.close();
      return res.status(400).json({
        error: 'Formato de hora_fim inválido. Use HH:mm'
      });
    }

    // Validar se hora_fim é posterior a hora_inicio
    if (hora_inicio && hora_fim) {
      const inicio = moment(hora_inicio, 'HH:mm');
      const fim = moment(hora_fim, 'HH:mm');
      
      if (!fim.isAfter(inicio)) {
        db.close();
        return res.status(400).json({
          error: 'Hora de fim deve ser posterior à hora de início'
        });
      }
    }

    // Atualizar horário
    const updateQuery = `
      UPDATE horarios_funcionamento SET
        dia_semana = COALESCE(?, dia_semana),
        hora_inicio = COALESCE(?, hora_inicio),
        hora_fim = COALESCE(?, hora_fim),
        ativo = COALESCE(?, ativo)
      WHERE id = ?
    `;

    db.run(updateQuery, [
      dia_semana || null,
      hora_inicio || null,
      hora_fim || null,
      ativo !== undefined ? ativo : null,
      id
    ], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao atualizar horário',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Horário atualizado com sucesso',
        changes: this.changes
      });
    });
  });
});

// PATCH - Ativar/Desativar horário
router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Verificar se o horário existe
  db.get('SELECT id, ativo FROM horarios_funcionamento WHERE id = ?', [id], (err, horario) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar horário',
        message: err.message
      });
    }

    if (!horario) {
      db.close();
      return res.status(404).json({
        error: 'Horário não encontrado'
      });
    }

    // Alternar status
    const novoStatus = horario.ativo ? 0 : 1;
    const statusText = novoStatus ? 'ativado' : 'desativado';

    db.run('UPDATE horarios_funcionamento SET ativo = ? WHERE id = ?', [novoStatus, id], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao alterar status do horário',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: `Horário ${statusText} com sucesso`,
        data: {
          id: parseInt(id),
          ativo: novoStatus
        }
      });
    });
  });
});

module.exports = router;
