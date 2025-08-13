const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco de dados
const dbPath = path.join(__dirname, 'difaria.db');

// Criar conexão com o banco
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// Habilitar foreign keys
db.run('PRAGMA foreign_keys = ON');

// Criar tabelas
const createTables = () => {
  // Tabela de serviços
  db.run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco DECIMAL(10,2) NOT NULL,
      duracao INTEGER DEFAULT 30,
      ativo BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela servicos:', err.message);
    } else {
      console.log('✅ Tabela servicos criada/verificada');
    }
  });

  // Tabela de horários de funcionamento
  db.run(`
    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_semana TEXT NOT NULL,
      hora_inicio TEXT NOT NULL,
      hora_fim TEXT NOT NULL,
      ativo BOOLEAN DEFAULT 1
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela horarios_funcionamento:', err.message);
    } else {
      console.log('✅ Tabela horarios_funcionamento criada/verificada');
    }
  });

  // Tabela de agendamentos
  db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT,
      servico TEXT NOT NULL,
      data DATE NOT NULL,
      horario TEXT NOT NULL,
      observacoes TEXT,
      google_event_id TEXT,
      google_event_link TEXT,
      status TEXT DEFAULT 'confirmado',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela agendamentos:', err.message);
    } else {
      console.log('✅ Tabela agendamentos criada/verificada');
    }
  });

  // Tabela de contatos
  db.run(`
    CREATE TABLE IF NOT EXISTS contatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      telefone TEXT NOT NULL,
      preferencia_contato TEXT DEFAULT 'whatsapp',
      mensagem TEXT NOT NULL,
      horario_preferido TEXT,
      receber_novidades BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela contatos:', err.message);
    } else {
      console.log('✅ Tabela contatos criada/verificada');
    }
  });
};

// Inserir dados iniciais
const insertInitialData = () => {
  // Inserir serviços padrão
  const servicos = [
    { nome: 'Corte', descricao: 'Na tesoura ou na máquina', preco: 40.00, duracao: 30 },
    { nome: 'Barba', descricao: 'Barboterapia', preco: 40.00, duracao: 30 },
    { nome: 'Corte + Barba', descricao: 'Pacote cabelo e barba', preco: 70.00, duracao: 60 },
    { nome: 'Sobrancelha', descricao: 'Na navalha', preco: 7.00, duracao: 15 },
    { nome: 'Corte + Barba + Sobrancelha', descricao: 'Pacote completo', preco: 85.00, duracao: 75 }
  ];

  servicos.forEach(servico => {
    db.run(`
      INSERT OR IGNORE INTO servicos (nome, descricao, preco, duracao)
      VALUES (?, ?, ?, ?)
    `, [servico.nome, servico.descricao, servico.preco, servico.duracao], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir serviço:', err.message);
      }
    });
  });

  // Inserir horários de funcionamento
  const horarios = [
    { dia: 'Segunda-feira', inicio: '08:00', fim: '20:00' },
    { dia: 'Terça-feira', inicio: '08:00', fim: '20:00' },
    { dia: 'Quarta-feira', inicio: '08:00', fim: '20:00' },
    { dia: 'Quinta-feira', inicio: '08:00', fim: '20:00' },
    { dia: 'Sexta-feira', inicio: '08:00', fim: '20:00' },
    { dia: 'Sábado', inicio: '08:00', fim: '20:00' },
    { dia: 'Domingo', inicio: '00:00', fim: '00:00', ativo: 0 }
  ];

  horarios.forEach(horario => {
    db.run(`
      INSERT OR IGNORE INTO horarios_funcionamento (dia_semana, hora_inicio, hora_fim, ativo)
      VALUES (?, ?, ?, ?)
    `, [horario.dia, horario.inicio, horario.fim, horario.ativo !== undefined ? horario.ativo : 1], (err) => {
      if (err) {
        console.error('❌ Erro ao inserir horário:', err.message);
      }
    });
  });

  console.log('✅ Dados iniciais inseridos');
};

// Executar inicialização
const initDatabase = () => {
  createTables();
  
  // Aguardar um pouco para as tabelas serem criadas
  setTimeout(() => {
    insertInitialData();
    
    // Fechar conexão após inserir dados
    setTimeout(() => {
      db.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar banco:', err.message);
        } else {
          console.log('✅ Banco de dados inicializado com sucesso!');
          console.log('📁 Arquivo do banco:', dbPath);
        }
      });
    }, 1000);
  }, 1000);
};

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase();
}

module.exports = { db, initDatabase };
