const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração limpa e direta do CORS para evitar bloqueios de rede no Render
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simulação de banco de dados em memória para testes offline
let usuariosTestes = [];

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/namoroonline";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Banco de dados MongoDB conectado com sucesso!"))
    .catch(err => {
        console.log("Aviso: Rodando em MODO DE TESTE (Sem banco de dados local conectado).");
    });

// MODELO DE USUÁRIO
const UserSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    dataNascimento: { type: Date, required: true },
    cpf: { type: String, required: true }, 
    genero: { type: String, required: true },
    foto: { type: String },
    statusConta: { type: String, enum: ['aprovado', 'banido'], default: 'aprovado' }
});

const User = mongoose.model('User', UserSchema);

// ROTA DE DIAGNÓSTICO: Ajuda a testar se o servidor acordou no Render
app.get('/', (req, res) => {
    res.send("Servidor do Namoro Online está LIGADO e funcionando com sucesso!");
});

// 1. ROTA DE CADASTRO COM TRAVA DE IDADE
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, dataNascimento, cpf, genero, foto } = req.body;
        const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '';

        // VALIDAÇÃO 1: BARREIRA DE IDADE
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

        // VALIDAÇÃO 2: TRAVA DE SEGURANÇA (SIMULADA POR CPF)
        if (cpfLimpo === "11122233344" || cpfLimpo === "00000000000") {
            return res.status(403).json({ erro: "Sua conta não cumpre com os requisitos de segurança e termos de uso do app." });
        }

        const dadosNovoUsuario = { nome, dataNascimento, cpf: cpfLimpo, genero, foto, statusConta: 'aprovado' };

        if (mongoose.connection.readyState === 1) {
            const usuarioExistente = await User.findOne({ cpf: cpfLimpo });
            if (usuarioExistente) {
                return res.status(400).json({ erro: "Este CPF já possui uma conta cadastrada." });
            }

            const novoUsuario = new User(dadosNovoUsuario);
            await novoUsuario.save();
            
            const resposta = novoUsuario.toObject();
            delete resposta.cpf;

            res.status(201).json({ mensagem: "Cadastrado com sucesso!", usuario: resposta });
        } else {
            const cpfExisteTeste = usuariosTestes.some(u => u.cpf === cpfLimpo);
            if (cpfExisteTeste) {
                return res.status(400).json({ erro: "Este CPF já possui uma conta cadastrada." });
            }

            usuariosTestes.push(dadosNovoUsuario);
            
            const { cpf: _, ...usuarioSemCpf } = dadosNovoUsuario;
            res.status(201).json({ mensagem: "Cadastrado no Modo de Teste!", usuario: usuarioSemCpf });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: "Erro ao processar o cadastro no servidor." });
    }
});

// 2. ROTA DE PERFIS
app.get('/api/perfis', async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const perfisDoBanco = await User.find({ statusConta: 'aprovado' }).select('-cpf');
            res.json(perfisDoBanco);
        } else {
            const perfisAprovadosTeste = usuariosTestes
                .filter(u => u.statusConta === 'aprovado')
                .map(({ cpf, ...resto }) => resto);
            res.json(perfisAprovadosTeste);
        }
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar a lista de perfis." });
    }
});

// 3. ROTA DE CHAT APERFEIÇOADA
app.post('/api/chat', (req, res) => {
    try {
        let { mensagem } = req.body;

        if (!mensagem) {
            return res.status(400).json({ erro: "Mensagem vazia." });
        }

        const mensagemNormalizada = mensagem.toLowerCase().replace(/[\s\-\.\,\_\*\/]/g, '');
        const apenasNumeros = mensagem.replace(/\D/g, '');

        if (apenasNumeros.length >= 8 && apenasNumeros.length <= 12) {
            return res.json({ 
                mensagem: "Mensagem bloqueada por segurança.", 
                filtrada: "🚫 [Sistema]: Compartilhar números de telefone antes de desbloquear o Premium é proibido pelas diretrizes da comunidade." 
            });
        }

        const numerosExtenso = [
            'zero', 'um', 'dois', 'tres', 'três', 'quatro', 'cinco', 
            'seis', 'sete', 'oito', 'nove', 'dez', 'meia'
        ];
        
        let contadorNumeros = 0;
        numerosExtenso.forEach(num => {
            const ocorrencias = mensagemNormalizada.split(num).length - 1;
            contadorNumeros += ocorrencias;
        });

        if (contadorNumeros >= 4) {
            return res.json({ 
                mensagem: "Mensagem bloqueada por segurança.", 
                filtrada: "🚫 [Sistema]: Tentativa de burlar o sistema enviando telefone por extenso detectada." 
            });
        }

        res.json({ mensagem: mensagem, filtrada: mensagem });

    } catch (error) {
        res.status(500).json({ erro: "Erro ao processar mensagem no chat." });
    }
});

app.listen(PORT, () => {
    console.log("Servidor do Namoro Online rodando na porta " + PORT);
});
