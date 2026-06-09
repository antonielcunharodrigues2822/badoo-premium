const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simulação de banco de dados em memória para testes offline
let usuariosTestes = [];

// Nome alterado na URI padrão para evitar associação com a marca anterior
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/namoroonline";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Banco de dados MongoDB conectado com sucesso!"))
    .catch(err => {
        console.log("Aviso: Rodando em MODO DE TESTE (Sem banco de dados local conectado).");
    });

// MODELO DE USUÁRIO ATUALIZADO COM OS NOVOS REQUISITOS DE SEGURANÇA
const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    dataNascimento: { type: Date, required: true },
    cpf: { type: String, required: true },
    genero: { type: String, required: true },
    foto: { type: String },
    statusConta: { type: String, enum: ['aprovado', 'banido'], default: 'aprovado' }
});

const User = mongoose.model('User', UserSchema);

// 1. ROTA DE CADASTRO COM ANTECENTES SIMULADOS E TRAVA DE IDADE
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, dataNascimento, cpf, genero, foto } = req.body;

        // VALIDAÇÃO 1: BARREIRA SEVERA DE IDADE NO SERVIDOR
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idadeCalculada = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idadeCalculada--;
        }

        if (idadeCalculada < 18) {
            return res.status(403).json({ erro: "Cadastro recusado. Apenas maiores de 18 anos são permitidos." });
        }

        // VALIDAÇÃO 2: TRAVA DE SEGURANÇA CONTRA ANTECEDENTES (SIMULADA POR CPF)
        // Se o CPF bater com a nossa simulação de risco, mudamos o status para banido
        let statusInicial = 'aprovado';
        
        // Exemplo de CPF simulado como bloqueado pelo sistema de checagem
        if (cpf === "11122233344" || cpf === "00000000000") {
            statusInicial = 'banido';
        }

        if (statusInicial === 'banido') {
            return res.status(403).json({ erro: "Sua conta não cumpre com os requisitos de segurança e termos de uso do app." });
        }

        const dadosNovoUsuario = { nome, dataNascimento, cpf, genero, foto, statusConta: statusInicial };

        // SALVAMENTO SELETIVO (BANCO OU MEMÓRIA)
        if (mongoose.connection.readyState === 1) {
            // Verifica se o CPF já existe no banco de dados real
            const usuarioExistente = await User.findOne({ cpf: cpf });
            if (usuarioExistente) {
                return res.status(400).json({ erro: "Este CPF já possui uma conta cadastrada." });
            }

            const novoUsuario = new User(dadosNovoUsuario);
            await novoUsuario.save();
            res.status(201).json({ mensagem: "Cadastrado com sucesso!", usuario: novoUsuario });
        } else {
            // Fluxo reserva de teste offline
            usuariosTestes.push(dadosNovoUsuario);
            res.status(201).json({ mensagem: "Cadastrado no Modo de Teste!", usuario: dadosNovoUsuario });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao processar o cadastro no servidor." });
    }
});

// 2. ROTA DE PERFIS (CORRIGIDA: Busca do MongoDB ou do array de testes)
app.get('/api/perfis', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            // Retorna apenas usuários aprovados e oculta CPFs por privacidade
            const perfisDoBanco = await User.find({ statusConta: 'aprovado' }).select('-cpf');
            res.json(perfisDoBanco);
        } else {
            // Filtra o array local para ignorar contas simuladas como banidas
            const perfisAprovadosTeste = usuariosTestes.filter(u => u.statusConta === 'aprovado');
            res.json(perfisAprovadosTeste);
        }
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar a lista de perfis." });
    }
});

// 3. ROTA DE CHAT 
app.post('/api/chat', (req, res) => {
    res.json({ mensagem: req.body.mensagem, filtrada: req.body.mensagem });
});

app.listen(PORT, () => {
    console.log("Servidor do Namoro Online rodando na porta " + PORT);
});