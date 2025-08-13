const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/difaria.db');

// Middleware para conectar ao banco
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// GET - Listar todos os contatos
router.get('/', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      nome,
      email,
      telefone,
      preferencia_contato,
      mensagem,
      horario_preferido,
      receber_novidades,
      created_at
    FROM contatos
    ORDER BY created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar contatos',
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

// GET - Buscar contato por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      nome,
      email,
      telefone,
      preferencia_contato,
      mensagem,
      horario_preferido,
      receber_novidades,
      created_at
    FROM contatos
    WHERE id = ?
  `;

  db.get(query, [id], (err, row) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar contato',
        message: err.message 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        error: 'Contato não encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: row
    });
  });
});

// POST - Criar novo contato
router.post('/', (req, res) => {
  const {
    nome,
    email,
    telefone,
    preferencia_contato,
    mensagem,
    horario_preferido,
    receber_novidades
  } = req.body;

  // Validações
  if (!nome || !email || !telefone || !mensagem) {
    return res.status(400).json({
      error: 'Nome, email, telefone e mensagem são campos obrigatórios',
      required: ['nome', 'email', 'telefone', 'mensagem']
    });
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Formato de email inválido'
    });
  }

  // Validar telefone (formato básico)
  const telefoneRegex = /^[\d\s\(\)\-\+]+$/;
  if (!telefoneRegex.test(telefone)) {
    return res.status(400).json({
      error: 'Formato de telefone inválido'
    });
  }

  // Validar preferência de contato
  const preferenciasValidas = ['email', 'telefone', 'whatsapp'];
  const preferenciaFinal = preferencia_contato && preferenciasValidas.includes(preferencia_contato) 
    ? preferencia_contato 
    : 'whatsapp';

  // Validar horário preferido
  const horariosValidos = ['Manhã', 'Tarde', 'Noite'];
  const horarioFinal = horario_preferido && horariosValidos.includes(horario_preferido) 
    ? horario_preferido 
    : null;

  // Converter receber_novidades para boolean
  const receberNovidades = receber_novidades === true || receber_novidades === 'true' || receber_novidades === 1;

  const db = getDb();

  // Inserir novo contato
  const insertQuery = `
    INSERT INTO contatos (
      nome, email, telefone, preferencia_contato, 
      mensagem, horario_preferido, receber_novidades
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(insertQuery, [
    nome,
    email,
    telefone,
    preferenciaFinal,
    mensagem,
    horarioFinal,
    receberNovidades ? 1 : 0
  ], function(err) {
    db.close();
    
    if (err) {
      return res.status(500).json({
        error: 'Erro ao criar contato',
        message: err.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.',
      data: {
        id: this.lastID,
        nome,
        email,
        telefone,
        preferencia_contato: preferenciaFinal,
        mensagem,
        horario_preferido: horarioFinal,
        receber_novidades: receberNovidades
      }
    });
  });
});

// PUT - Atualizar contato
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    nome,
    email,
    telefone,
    preferencia_contato,
    mensagem,
    horario_preferido,
    receber_novidades
  } = req.body;

  const db = getDb();

  // Verificar se o contato existe
  db.get('SELECT * FROM contatos WHERE id = ?', [id], (err, contato) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar contato',
        message: err.message
      });
    }

    if (!contato) {
      db.close();
      return res.status(404).json({
        error: 'Contato não encontrado'
      });
    }

    // Validações se os campos forem fornecidos
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      db.close();
      return res.status(400).json({
        error: 'Formato de email inválido'
      });
    }

    if (telefone && !/^[\d\s\(\)\-\+]+$/.test(telefone)) {
      db.close();
      return res.status(400).json({
        error: 'Formato de telefone inválido'
      });
    }

    // Validar preferência de contato se fornecida
    const preferenciasValidas = ['email', 'telefone', 'whatsapp'];
    let preferenciaFinal = null;
    if (preferencia_contato) {
      if (!preferenciasValidas.includes(preferencia_contato)) {
        db.close();
        return res.status(400).json({
          error: 'Preferência de contato inválida'
        });
      }
      preferenciaFinal = preferencia_contato;
    }

    // Validar horário preferido se fornecido
    const horariosValidos = ['Manhã', 'Tarde', 'Noite'];
    let horarioFinal = null;
    if (horario_preferido) {
      if (!horariosValidos.includes(horario_preferido)) {
        db.close();
        return res.status(400).json({
          error: 'Horário preferido inválido'
        });
      }
      horarioFinal = horario_preferido;
    }

    // Atualizar contato
    const updateQuery = `
      UPDATE contatos SET
        nome = COALESCE(?, nome),
        email = COALESCE(?, email),
        telefone = COALESCE(?, telefone),
        preferencia_contato = COALESCE(?, preferencia_contato),
        mensagem = COALESCE(?, mensagem),
        horario_preferido = COALESCE(?, horario_preferido),
        receber_novidades = COALESCE(?, receber_novidades)
      WHERE id = ?
    `;

    db.run(updateQuery, [
      nome || null,
      email || null,
      telefone || null,
      preferenciaFinal,
      mensagem || null,
      horarioFinal,
      receber_novidades !== undefined ? (receber_novidades ? 1 : 0) : null,
      id
    ], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao atualizar contato',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Contato atualizado com sucesso',
        changes: this.changes
      });
    });
  });
});

// DELETE - Excluir contato
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Verificar se o contato existe
  db.get('SELECT * FROM contatos WHERE id = ?', [id], (err, contato) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar contato',
        message: err.message
      });
    }

    if (!contato) {
      db.close();
      return res.status(404).json({
        error: 'Contato não encontrado'
      });
    }

    // Excluir contato
    db.run('DELETE FROM contatos WHERE id = ?', [id], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao excluir contato',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: 'Contato excluído com sucesso',
        changes: this.changes
      });
    });
  });
});

// GET - Estatísticas dos contatos
router.get('/stats/overview', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      COUNT(*) as total_contatos,
      COUNT(CASE WHEN receber_novidades = 1 THEN 1 END) as receber_novidades,
      COUNT(CASE WHEN preferencia_contato = 'whatsapp' THEN 1 END) as preferem_whatsapp,
      COUNT(CASE WHEN preferencia_contato = 'email' THEN 1 END) as preferem_email,
      COUNT(CASE WHEN preferencia_contato = 'telefone' THEN 1 END) as preferem_telefone,
      COUNT(CASE WHEN horario_preferido = 'Manhã' THEN 1 END) as preferem_manha,
      COUNT(CASE WHEN horario_preferido = 'Tarde' THEN 1 END) as preferem_tarde,
      COUNT(CASE WHEN horario_preferido = 'Noite' THEN 1 END) as preferem_noite
    FROM contatos
  `;

  db.get(query, [], (err, stats) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar estatísticas',
        message: err.message 
      });
    }
    
    res.json({
      success: true,
      data: stats
    });
  });
});

module.exports = router;
