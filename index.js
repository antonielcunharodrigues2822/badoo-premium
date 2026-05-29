const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function filtrarMensagem(texto) {
    const regexTelefone = /(\(?\d{2}\)?\s?)?(\d{4,5}\s?-?\s?\d{4})/g;
    const regexPalavrasChave = /(whatsapp|whats|wpp|insta|instagram|numero|num|contato|chama)/gi;
    const regexPorExtenso = /(zero|um|dois|tres|quatro|cinco|seis|meia|sete|oito|nove|dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)(\s+(zero|um|dois|tres|quatro|cinco|seis|meia|sete|oito|nove|dez|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)){2,}/gi;

    let filtrado = texto;
    if (regexTelefone.test(filtrado) || regexPalavrasChave.test(filtrado) || regexPorExtenso.test(filtrado)) {
        filtrado = "[NÚMERO/CONTATO BLOQUEADO - Pague R$ 05,00 para desbloquear]";
    }
    return filtrado;
}

app.post('/api/chat', (req, res) => {
    const { mensagem } = req.body;
    const processada = filtrarMensagem(mensagem);
    res.json({ filtrada: processada });
});

app.listen(PORT, () => {
    console.log(Servidor ativo na porta ${PORT});
});
