// Configurações da API
const API_BASE_URL = 'http://localhost:3000/api';

// Elementos do DOM
const modal = document.getElementById('modal-agendamento');
const closeBtn = document.querySelector('.close');
const form = document.getElementById('form-agendamento');
const dataInput = document.getElementById('data');
const horarioSelect = document.getElementById('data');
const loadingDiv = document.getElementById('loading');
const mensagemDiv = document.getElementById('mensagem');

// Variáveis globais
let servicoSelecionado = '';
let precoServico = '';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupDateValidation();
});

// Configurar event listeners
function setupEventListeners() {
    // Botões de agendamento
    document.querySelectorAll('.btn-agendar').forEach(btn => {
        btn.addEventListener('click', function() {
            const servico = this.getAttribute('data-servico');
            const preco = this.getAttribute('data-preco');
            abrirModal(servico, preco);
        });
    });

    // Fechar modal
    closeBtn.addEventListener('click', fecharModal);
    
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            fecharModal();
        }
    });

    // Mudança de data
    dataInput.addEventListener('change', function() {
        if (this.value && servicoSelecionado) {
            carregarHorariosDisponiveis(this.value, servicoSelecionado);
        }
    });

    // Envio do formulário
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        enviarAgendamento();
    });
}

// Configurar validação de datas
function setupDateValidation() {
    const hoje = new Date();
    const dataMinima = new Date(hoje.getTime() + (2 * 60 * 60 * 1000)); // 2 horas à frente
    const dataMaxima = new Date(hoje.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 dias à frente
    
    dataInput.min = dataMinima.toISOString().split('T')[0];
    dataInput.max = dataMaxima.toISOString().split('T')[0];
    
    // Desabilitar fins de semana
    dataInput.addEventListener('input', function() {
        const selectedDate = new Date(this.value);
        const dayOfWeek = selectedDate.getDay();
        
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            this.setCustomValidity('Agendamentos disponíveis apenas de segunda a sexta-feira');
        } else {
            this.setCustomValidity('');
        }
    });
}

// Abrir modal de agendamento
function abrirModal(servico, preco) {
    servicoSelecionado = servico;
    precoServico = preco;
    
    // Atualizar informações no modal
    document.getElementById('servico-selecionado').textContent = servico;
    document.getElementById('preco-servico').textContent = preco;
    
    // Limpar formulário
    form.reset();
    horarioSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
    
    // Limpar mensagens
    limparMensagens();
    
    // Mostrar modal
    modal.style.display = 'block';
    modal.classList.add('show');
    
    // Focar no primeiro campo
    document.getElementById('nome').focus();
}

// Fechar modal
function fecharModal() {
    modal.style.display = 'none';
    modal.classList.remove('show');
    
    // Limpar variáveis
    servicoSelecionado = '';
    precoServico = '';
    
    // Limpar formulário
    form.reset();
    limparMensagens();
}

// Carregar horários disponíveis
async function carregarHorariosDisponiveis(data, servico) {
    try {
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/agendamentos-google/horarios-disponiveis/${data}/${encodeURIComponent(servico)}`);
        const data = await response.json();
        
        if (data.success) {
            preencherHorarios(data.horarios);
        } else {
            mostrarMensagem('erro', data.message || 'Erro ao carregar horários disponíveis');
        }
        
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        mostrarMensagem('erro', 'Erro de conexão. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Preencher select de horários
function preencherHorarios(horarios) {
    const horarioSelect = document.getElementById('horario');
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
    
    if (horarios.length === 0) {
        horarioSelect.innerHTML = '<option value="">Nenhum horário disponível</option>';
        horarioSelect.disabled = true;
        return;
    }
    
    horarios.forEach(horario => {
        const option = document.createElement('option');
        option.value = horario.time;
        option.textContent = horario.time;
        horarioSelect.appendChild(option);
    });
    
    horarioSelect.disabled = false;
}

// Enviar agendamento
async function enviarAgendamento() {
    try {
        // Validar formulário
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Coletar dados do formulário
        const formData = new FormData(form);
        const agendamentoData = {
            nome: formData.get('nome'),
            telefone: formData.get('telefone'),
            email: formData.get('email') || '',
            servico: servicoSelecionado,
            data: formData.get('data'),
            horario: formData.get('horario'),
            observacoes: formData.get('observacoes') || ''
        };
        
        // Verificar se o horário ainda está disponível
        const disponibilidade = await verificarDisponibilidade(
            agendamentoData.data, 
            agendamentoData.horario, 
            agendamentoData.servico
        );
        
        if (!disponibilidade.disponivel) {
            mostrarMensagem('erro', 'Este horário não está mais disponível. Escolha outro horário.');
            return;
        }
        
        // Enviar agendamento
        mostrarLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/agendamentos-google/agendar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agendamentoData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarMensagem('sucesso', 'Agendamento realizado com sucesso! Você receberá uma confirmação em breve.');
            
            // Limpar formulário
            form.reset();
            
            // Fechar modal após 3 segundos
            setTimeout(() => {
                fecharModal();
            }, 3000);
            
        } else {
            mostrarMensagem('erro', result.message || 'Erro ao realizar agendamento');
        }
        
    } catch (error) {
        console.error('Erro ao enviar agendamento:', error);
        mostrarMensagem('erro', 'Erro de conexão. Tente novamente.');
    } finally {
        mostrarLoading(false);
    }
}

// Verificar disponibilidade de um horário específico
async function verificarDisponibilidade(data, horario, servico) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/agendamentos-google/verificar-disponibilidade/${data}/${horario}/${encodeURIComponent(servico)}`
        );
        const result = await response.json();
        
        if (result.success) {
            return {
                disponivel: result.disponivel,
                duracaoServico: result.duracaoServico
            };
        } else {
            return { disponivel: false, duracaoServico: 0 };
        }
        
    } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        return { disponivel: false, duracaoServico: 0 };
    }
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    if (mostrar) {
        loadingDiv.classList.remove('hidden');
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
    } else {
        loadingDiv.classList.add('hidden');
        form.style.opacity = '1';
        form.style.pointerEvents = 'auto';
    }
}

// Mostrar mensagem
function mostrarMensagem(tipo, texto) {
    mensagemDiv.textContent = texto;
    mensagemDiv.className = `mensagem ${tipo}`;
    mensagemDiv.classList.remove('hidden');
    
    // Auto-ocultar mensagens de sucesso após 5 segundos
    if (tipo === 'sucesso') {
        setTimeout(() => {
            mensagemDiv.classList.add('hidden');
        }, 5000);
    }
}

// Limpar mensagens
function limparMensagens() {
    mensagemDiv.classList.add('hidden');
    mensagemDiv.textContent = '';
    mensagemDiv.className = 'mensagem hidden';
}

// Função para formatar telefone
function formatarTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 11) {
        if (value.length <= 2) {
            value = `(${value}`;
        } else if (value.length <= 6) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        } else if (value.length <= 10) {
            value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
        } else {
            value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
        }
    }
    
    input.value = value;
}

// Aplicar formatação de telefone
document.addEventListener('DOMContentLoaded', function() {
    const telefoneInput = document.getElementById('telefone');
    if (telefoneInput) {
        telefoneInput.addEventListener('input', function() {
            formatarTelefone(this);
        });
    }
});

// Função para validar e-mail
function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validação em tempo real
document.addEventListener('DOMContentLoaded', function() {
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            if (this.value && !validarEmail(this.value)) {
                this.setCustomValidity('E-mail inválido');
            } else {
                this.setCustomValidity('');
            }
        });
    }
});

// Função para verificar se o Google Calendar está configurado
async function verificarStatusGoogleCalendar() {
    try {
        const response = await fetch(`${API_BASE_URL}/agendamentos-google/configuracao`);
        const result = await response.json();
        
        if (result.success) {
            console.log('Google Calendar configurado:', result.configuracao);
            return true;
        } else {
            console.warn('Google Calendar não configurado');
            return false;
        }
        
    } catch (error) {
        console.error('Erro ao verificar status do Google Calendar:', error);
        return false;
    }
}

// Verificar status na inicialização
document.addEventListener('DOMContentLoaded', function() {
    verificarStatusGoogleCalendar();
});
