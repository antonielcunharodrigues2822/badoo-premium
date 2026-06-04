const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/badoo";
mongoose.connect(MONGO_URI)
    .then(() => console.log("Banco de dados conectado!"))
    .catch(err => {
        console.log("Erro no banco (Rodando sem DB online):", err.message);
    });

// MODELO DE USUÁRIO
const UserSchema = new mongoose.Schema({
    nome: String,
    idade: Number,
    genero: String,
    foto: String,
    bio: String,
    likes: [String],
    matches: [String]
});

const User = mongoose.model('User', UserSchema);

// 1. ROTA DE CADASTRO
app.post('/api/cadastro', async (req, res) => {
    try {
        const novoUsuario = new User(req.body);
        await novoUsuario.save();
        res.status(201).json({ mensagem: "Cadastrado com sucesso!", usuario: novoUsuario });
    } catch (error) {
        res.status(500).json({ erro: "Erro ao salvar no banco" });
    }
});

app.listen(PORT, () => {
    console.log(Servidor rodando na porta ${PORT});
});