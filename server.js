const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const upload = multer();

app.use(express.json());
app.use(express.static('public'));

// MODELOS
const Product = mongoose.model('Product', {
  name: String,
  price: Number,
  description: String,
  imageUrl: String
});

const Admin = mongoose.model('Admin', { password: { type: String, required: true } });

// CONEXÃO COM MONGODB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Conectado com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// --- ROTA DE DIAGNÓSTICO (A la chave para resolver o problema) ---
app.get('/debug', async (req, res) => {
  const status = {
    mongoConectado: mongoose.connection.readyState === 1 ? "SIM" : "NÃO",
    senhaEnvConfigurada: process.env.ADMIN_PASSWORD ? "SIM" : "NÃO",
    chaveImgBBConfigurada: process.env.IMGBB_API_KEY ? "SIM" : "NÃO",
    adminNoBanco: "Verificando..."
  };
  
  const admin = await Admin.findOne();
  status.adminNoBanco = admin ? "SIM" : "NÃO";
  
  res.send(`
    <h1>Diagnóstico do Sistema</h1>
    <p><b>MongoDB Conectado:</b> ${status.mongoConectado}</p>
    <p><b>Senha no .env configurada:</b> ${status.senhaEnvConfigurada}</p>
    <p><b>Chave ImgBB configurada:</b> ${status.chaveImgBBConfigurada}</p>
    <p><b>Usuário Admin existe no Banco:</b> ${status.adminNoBanco}</p>
    <hr>
    <p><b>Como resolver:</b></p>
    <ul>
      <li>Se MongoDB estiver NÃO: Verifique a MONGO_URI e o Network Access (0.0.0.0/0) no Atlas.</li>
      <li>Se Senha no .env estiver NÃO: Você esqueceu de adicionar ADMIN_PASSWORD no painel do Render.</li>
      <li>Se Admin no Banco estiver NÃO: Acesse <a href="/reset-admin">/reset-admin</a> para criar a senha.</li>
    </ul>
  `);
});

// --- ROTA DE RESET DE SENHA ---
app.get('/reset-admin', async (req, res) => {
  try {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) return res.send("Erro: Adicione ADMIN_PASSWORD no painel do Render primeiro!");
    
    await Admin.deleteMany({}); 
    await Admin.create({ password: password });
    res.send(`✅ Sucesso! Senha resetada para a senha do seu .env.`);
  } catch (error) {
    res.status(500).send("Erro ao resetar: " + error.message);
  }
});

// ROTA DE LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;
    const admin = await Admin.findOne();
    
    // Tenta senha do banco, se não tiver banco, tenta a do .env
    if ((admin && admin.password === password) || (!admin && password === process.env.ADMIN_PASSWORD)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Senha incorreta' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro interno' });
  }
});

// ROTA: ALTERAR SENHA
app.post('/api/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const admin = await Admin.findOne();
  if (admin && admin.password === oldPassword) {
    admin.password = newPassword;
    await admin.save();
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

// ROTA: PRODUTOS
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const formData = new FormData();
    formData.append('image', req.file.buffer, { filename: req.file.originalname });

    const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, formData, {
      headers: formData.getHeaders()
    });

    const product = new Product({ name, price, description, imageUrl: imgbbResponse.data.data.url });
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.listen(process.env.PORT || 3000, () => console.log(`Servidor rodando na porta ${process.env.PORT || 3000}`));
