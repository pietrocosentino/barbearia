const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/difaria.db');

// Middleware para conectar ao banco
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// GET - Listar todos os agendamentos
router.get('/', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      a.id,
      a.cliente_nome,
      a.cliente_telefone,
      a.cliente_email,
      a.servico_id,
      s.nome as servico_nome,
      s.preco as servico_preco,
      a.data_agendamento,
      a.hora_agendamento,
      a.status,
      a.observacoes,
      a.created_at
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    ORDER BY a.data_agendamento DESC, a.hora_agendamento ASC
  `;

  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar agendamentos',
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

// GET - Buscar agendamento por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const query = `
    SELECT 
      a.*,
      s.nome as servico_nome,
      s.preco as servico_preco
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.id = ?
  `;

  db.get(query, [id], (err, row) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar agendamento',
        message: err.message 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        error: 'Agendamento não encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: row
    });
  });
});

// GET - Buscar agendamentos por data
router.get('/data/:data', (req, res) => {
  const { data } = req.params;
  const db = getDb();
  
  // Validar formato da data
  if (!moment(data, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({ 
      error: 'Formato de data inválido. Use YYYY-MM-DD' 
    });
  }
  
  const query = `
    SELECT 
      a.id,
      a.cliente_nome,
      a.cliente_telefone,
      a.cliente_email,
      a.servico_id,
      s.nome as servico_nome,
      s.preco as servico_preco,
      a.data_agendamento,
      a.hora_agendamento,
      a.status,
      a.observacoes
    FROM agendamentos a
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.data_agendamento = ?
    ORDER BY a.hora_agendamento ASC
  `;

  db.all(query, [data], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar agendamentos',
        message: err.message 
      });
    }
    
    res.json({
      success: true,
      data: rows,
      total: rows.length,
      data_busca: data
    });
  });
});

// POST - Criar novo agendamento
router.post('/', (req, res) => {
  const {
    cliente_nome,
    cliente_telefone,
    cliente_email,
    servico_id,
    data_agendamento,
    hora_agendamento,
    observacoes
  } = req.body;

  // Validações
  if (!cliente_nome || !cliente_telefone || !servico_id || !data_agendamento || !hora_agendamento) {
    return res.status(400).json({
      error: 'Campos obrigatórios não preenchidos',
      required: ['cliente_nome', 'cliente_telefone', 'servico_id', 'data_agendamento', 'hora_agendamento']
    });
  }

  // Validar formato da data
  if (!moment(data_agendamento, 'YYYY-MM-DD', true).isValid()) {
    return res.status(400).json({
      error: 'Formato de data inválido. Use YYYY-MM-DD'
    });
  }

  // Validar formato da hora
  if (!moment(hora_agendamento, 'HH:mm', true).isValid()) {
    return res.status(400).json({
      error: 'Formato de hora inválido. Use HH:mm'
    });
  }

  // Verificar se a data não é passada
  if (moment(data_agendamento).isBefore(moment(), 'day')) {
    return res.status(400).json({
      error: 'Não é possível agendar para datas passadas'
    });
  }

  const db = getDb();

  // Verificar se o serviço existe
  db.get('SELECT id, duracao FROM servicos WHERE id = ? AND ativo = 1', [servico_id], (err, servico) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao verificar serviço',
        message: err.message
      });
    }

    if (!servico) {
      db.close();
      return res.status(400).json({
        error: 'Serviço não encontrado ou inativo'
      });
    }

    // Verificar disponibilidade do horário
    const horaInicio = moment(hora_agendamento, 'HH:mm');
    const horaFim = horaInicio.clone().add(servico.duracao, 'minutes');

    // Verificar se há conflito com outros agendamentos
    const checkQuery = `
      SELECT COUNT(*) as count FROM agendamentos 
      WHERE data_agendamento = ? 
      AND status != 'cancelado'
      AND (
        (hora_agendamento <= ? AND hora_agendamento + (SELECT duracao FROM servicos WHERE id = ?) > ?)
        OR (hora_agendamento < ? AND hora_agendamento + (SELECT duracao FROM servicos WHERE id = ?) >= ?)
      )
    `;

    db.get(checkQuery, [
      data_agendamento, 
      horaInicio.format('HH:mm'), 
      servico_id, 
      horaInicio.format('HH:mm'),
      horaFim.format('HH:mm'),
      servico_id,
      horaFim.format('HH:mm')
    ], (err, result) => {
      if (err) {
        db.close();
        return res.status(500).json({
          error: 'Erro ao verificar disponibilidade',
          message: err.message
        });
      }

      if (result.count > 0) {
        db.close();
        return res.status(409).json({
          error: 'Horário não disponível para este serviço'
        });
      }

      // Inserir agendamento
      const insertQuery = `
        INSERT INTO agendamentos (
          cliente_nome, cliente_telefone, cliente_email, 
          servico_id, data_agendamento, hora_agendamento, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(insertQuery, [
        cliente_nome,
        cliente_telefone,
        cliente_email || null,
        servico_id,
        data_agendamento,
        hora_agendamento,
        observacoes || null
      ], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({
            error: 'Erro ao criar agendamento',
            message: err.message
          });
        }

        res.status(201).json({
          success: true,
          message: 'Agendamento criado com sucesso',
          data: {
            id: this.lastID,
            cliente_nome,
            cliente_telefone,
            cliente_email,
            servico_id,
            data_agendamento,
            hora_agendamento,
            observacoes
          }
        });
      });
    });
  });
});

// PUT - Atualizar agendamento
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    cliente_nome,
    cliente_telefone,
    cliente_email,
    servico_id,
    data_agendamento,
    hora_agendamento,
    status,
    observacoes
  } = req.body;

  const db = getDb();

  // Verificar se o agendamento existe
  db.get('SELECT * FROM agendamentos WHERE id = ?', [id], (err, agendamento) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar agendamento',
        message: err.message
      });
    }

    if (!agendamento) {
      db.close();
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }

    // Atualizar agendamento
    const updateQuery = `
      UPDATE agendamentos SET
        cliente_nome = COALESCE(?, cliente_nome),
        cliente_telefone = COALESCE(?, cliente_telefone),
        cliente_email = COALESCE(?, cliente_email),
        servico_id = COALESCE(?, servico_id),
        data_agendamento = COALESCE(?, data_agendamento),
        hora_agendamento = COALESCE(?, hora_agendamento),
        status = COALESCE(?, status),
        observacoes = COALESCE(?, observacoes)
      WHERE id = ?
    `;

    db.run(updateQuery, [
      cliente_nome || null,
      cliente_telefone || null,
      cliente_email || null,
      servico_id || null,
      data_agendamento || null,
      hora_agendamento || null,
      status || null,
      observacoes || null,
      id
    ], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao atualizar agendamento',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        changes: this.changes
      });
    });
  });
});

// DELETE - Cancelar agendamento
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Verificar se o agendamento existe
  db.get('SELECT * FROM agendamentos WHERE id = ?', [id], (err, agendamento) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar agendamento',
        message: err.message
      });
    }

    if (!agendamento) {
      db.close();
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }

    // Cancelar agendamento (soft delete)
    db.run('UPDATE agendamentos SET status = ? WHERE id = ?', ['cancelado', id], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao cancelar agendamento',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Agendamento cancelado com sucesso',
        changes: this.changes
      });
    });
  });
});

module.exports = router;
