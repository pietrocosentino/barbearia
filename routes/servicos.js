const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../database/difaria.db');

// Middleware para conectar ao banco
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// GET - Listar todos os serviços
router.get('/', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      nome,
      descricao,
      preco,
      duracao,
      ativo,
      created_at
    FROM servicos
    ORDER BY nome ASC
  `;

  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar serviços',
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

// GET - Listar apenas serviços ativos
router.get('/ativos', (req, res) => {
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      nome,
      descricao,
      preco,
      duracao
    FROM servicos
    WHERE ativo = 1
    ORDER BY nome ASC
  `;

  db.all(query, [], (err, rows) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar serviços ativos',
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

// GET - Buscar serviço por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  
  const query = `
    SELECT 
      id,
      nome,
      descricao,
      preco,
      duracao,
      ativo,
      created_at
    FROM servicos
    WHERE id = ?
  `;

  db.get(query, [id], (err, row) => {
    db.close();
    
    if (err) {
      return res.status(500).json({ 
        error: 'Erro ao buscar serviço',
        message: err.message 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        error: 'Serviço não encontrado' 
      });
    }
    
    res.json({
      success: true,
      data: row
    });
  });
});

// POST - Criar novo serviço
router.post('/', (req, res) => {
  const {
    nome,
    descricao,
    preco,
    duracao
  } = req.body;

  // Validações
  if (!nome || !preco) {
    return res.status(400).json({
      error: 'Nome e preço são campos obrigatórios',
      required: ['nome', 'preco']
    });
  }

  // Validar preço
  if (isNaN(preco) || preco <= 0) {
    return res.status(400).json({
      error: 'Preço deve ser um número positivo'
    });
  }

  // Validar duração (opcional, padrão 30 minutos)
  const duracaoFinal = duracao && !isNaN(duracao) ? parseInt(duracao) : 30;
  if (duracaoFinal <= 0) {
    return res.status(400).json({
      error: 'Duração deve ser um número positivo'
    });
  }

  const db = getDb();

  // Verificar se já existe um serviço com o mesmo nome
  db.get('SELECT id FROM servicos WHERE nome = ?', [nome], (err, existing) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao verificar serviço existente',
        message: err.message
      });
    }

    if (existing) {
      db.close();
      return res.status(409).json({
        error: 'Já existe um serviço com este nome'
      });
    }

    // Inserir novo serviço
    const insertQuery = `
      INSERT INTO servicos (nome, descricao, preco, duracao)
      VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [
      nome,
      descricao || null,
      preco,
      duracaoFinal
    ], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao criar serviço',
          message: err.message
        });
      }

      res.status(201).json({
        success: true,
        message: 'Serviço criado com sucesso',
        data: {
          id: this.lastID,
          nome,
          descricao,
          preco,
          duracao: duracaoFinal
        }
      });
    });
  });
});

// PUT - Atualizar serviço
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    nome,
    descricao,
    preco,
    duracao,
    ativo
  } = req.body;

  const db = getDb();

  // Verificar se o serviço existe
  db.get('SELECT * FROM servicos WHERE id = ?', [id], (err, servico) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar serviço',
        message: err.message
      });
    }

    if (!servico) {
      db.close();
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Verificar se o nome já existe em outro serviço
    if (nome && nome !== servico.nome) {
      db.get('SELECT id FROM servicos WHERE nome = ? AND id != ?', [nome, id], (err, existing) => {
        if (err) {
          db.close();
          return res.status(500).json({
            error: 'Erro ao verificar nome duplicado',
            message: err.message
          });
        }

        if (existing) {
          db.close();
          return res.status(409).json({
            error: 'Já existe outro serviço com este nome'
          });
        }

        updateServico();
      });
    } else {
      updateServico();
    }

    function updateServico() {
      // Validar preço se fornecido
      if (preco !== undefined && (isNaN(preco) || preco <= 0)) {
        db.close();
        return res.status(400).json({
          error: 'Preço deve ser um número positivo'
        });
      }

      // Validar duração se fornecida
      if (duracao !== undefined && (isNaN(duracao) || duracao <= 0)) {
        db.close();
        return res.status(400).json({
          error: 'Duração deve ser um número positivo'
        });
      }

      // Atualizar serviço
      const updateQuery = `
        UPDATE servicos SET
          nome = COALESCE(?, nome),
          descricao = COALESCE(?, descricao),
          preco = COALESCE(?, preco),
          duracao = COALESCE(?, duracao),
          ativo = COALESCE(?, ativo)
        WHERE id = ?
      `;

      db.run(updateQuery, [
        nome || null,
        descricao !== undefined ? descricao : null,
        preco !== undefined ? preco : null,
        duracao !== undefined ? duracao : null,
        ativo !== undefined ? ativo : null,
        id
      ], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({
            error: 'Erro ao atualizar serviço',
            message: err.message
          });
        }

        res.json({
          success: true,
          message: 'Serviço atualizado com sucesso',
          changes: this.changes
        });
      });
    }
  });
});

// DELETE - Desativar serviço (soft delete)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Verificar se o serviço existe
  db.get('SELECT * FROM servicos WHERE id = ?', [id], (err, servico) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar serviço',
        message: err.message
      });
    }

    if (!servico) {
      db.close();
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Verificar se há agendamentos ativos para este serviço
    db.get(`
      SELECT COUNT(*) as count FROM agendamentos 
      WHERE servico_id = ? AND status != 'cancelado'
    `, [id], (err, result) => {
      if (err) {
        db.close();
        return res.status(500).json({
          error: 'Erro ao verificar agendamentos',
          message: err.message
        });
      }

      if (result.count > 0) {
        db.close();
        return res.status(400).json({
          error: 'Não é possível desativar um serviço que possui agendamentos ativos'
        });
      }

      // Desativar serviço
      db.run('UPDATE servicos SET ativo = 0 WHERE id = ?', [id], function(err) {
        db.close();
        
        if (err) {
          return res.status(500).json({
            error: 'Erro ao desativar serviço',
            message: err.message
          });
        }

        res.json({
          success: true,
          message: 'Serviço desativado com sucesso',
          changes: this.changes
        });
      });
    });
  });
});

// PATCH - Ativar/Desativar serviço
router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  // Verificar se o serviço existe
  db.get('SELECT id, ativo FROM servicos WHERE id = ?', [id], (err, servico) => {
    if (err) {
      db.close();
      return res.status(500).json({
        error: 'Erro ao buscar serviço',
        message: err.message
      });
    }

    if (!servico) {
      db.close();
      return res.status(404).json({
        error: 'Serviço não encontrado'
      });
    }

    // Alternar status
    const novoStatus = servico.ativo ? 0 : 1;
    const statusText = novoStatus ? 'ativado' : 'desativado';

    db.run('UPDATE servicos SET ativo = ? WHERE id = ?', [novoStatus, id], function(err) {
      db.close();
      
      if (err) {
        return res.status(500).json({
          error: 'Erro ao alterar status do serviço',
          message: err.message
        });
      }

      res.json({
        success: true,
        message: `Serviço ${statusText} com sucesso`,
        data: {
          id: parseInt(id),
          ativo: novoStatus
        }
      });
    });
  });
});

module.exports = router;
