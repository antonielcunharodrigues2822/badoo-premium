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

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/badoo";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Banco de dados conectado!"))
    .catch(err => {
        console.log("Aviso: Rodando em MODO DE TESTE (Sem banco de dados local).");
    });

// MODELO DE USUÁRIO
const UserSchema = new mongoose.Schema({
    nome: String,
    idade: Number,
    genero: String,
    foto: String
});

const User = mongoose.model('User', UserSchema);

// 1. ROTA DE CADASTRO (Atualizada para aceitar modo de teste)
app.post('/api/cadastro', async (req, res) => {
    try {
        const dadosUsuario = req.body;

        // Se o banco estiver conectado, salva nele. Se não, usa a memória local para testes.
        if (mongoose.connection.readyState === 1) {
            const novoUsuario = new User(dadosUsuario);
            await novoUsuario.save();
            res.status(201).json({ mensagem: "Cadastrado com sucesso!", usuario: novoUsuario });
        } else {
            usuariosTestes.push(dadosUsuario);
            res.status(201).json({ mensagem: "Cadastrado no Modo de Teste!", usuario: dadosUsuario });
        }
    } catch (error) {
        res.status(500).json({ erro: "Erro ao processar cadastro" });
    }
});

// 2. ROTA DE PERFIS (Evita erro de rota vazia)
app.get('/api/perfis', (req, res) => {
    res.json(usuariosTestes);
});

// 3. ROTA DE CHAT (Evita erro de rota vazia)
app.post('/api/chat', (req, res) => {
    res.json({ mensagem: req.body.mensagem, filtrada: req.body.mensagem });
});

app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT);
});