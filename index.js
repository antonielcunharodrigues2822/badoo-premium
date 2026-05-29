const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

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
        res.status(500).json({ erro: error.message });
    }
});

// 2. ROTA PARA BUSCAR PERFIS (FEED DO BADOO)
app.get('/api/perfis', async (req, res) => {
    const perfis = await User.find();
    res.json(perfis);
});

// 3. ROTA DE LIKE E MATCH AUTOMÁTICO
app.post('/api/like', async (req, res) => {
    const { meuId, idPerfil } = req.body;
    
    const usuarioAlvo = await User.findById(idPerfil);
    let deuMatch = false;

    if (usuarioAlvo.likes.includes(meuId)) {
        deuMatch = true;
        await User.findByIdAndUpdate(meuId, { $push: { matches: idPerfil, likes: idPerfil } });
        await User.findByIdAndUpdate(idPerfil, { $push: { matches: meuId } });
    } else {
        await User.findByIdAndUpdate(meuId, { $push: { likes: idPerfil } });
    }

    res.json({ match: deuMatch, mensagem: deuMatch ? "Você tem um novo Match! 🎉" : "Like enviado!" });
});

// ROTA ANTIGA DE CHAT
app.get('/api/chat', (req, res) => {
    res.json({ mensagem: "Rota de chat ativa!" });
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log("Servidor ativo na porta " + PORT));
}

module.exports = app;