require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Certifique-se que seus HTMLs estão na pasta /public

const upload = multer({ storage: multer.memoryStorage() });

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Esquema de Produto (Incluindo Quantidade Mínima)
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    image: String,
    minQuantity: { type: Number, default: 1 }
});
const Product = mongoose.model('Product', productSchema);

// Esquema de Admin
const adminSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String }
});
const Admin = mongoose.model('Admin', adminSchema);

// Rota de Diagnóstico
app.get('/debug', (req, res) => {
    res.send(`
        <h1>Debug Page</h1>
        <p>MongoDB Connected: ${mongoose.connection.readyState === 1 ? 'true' : 'false'}</p>
        <p>MONGO_URI exists: ${!!process.env.MONGO_URI}</p>
        <p>ADMIN_PASSWORD exists: ${!!process.env.ADMIN_PASSWORD}</p>
        <p>IMGBB_API_KEY exists: ${!!process.env.IMGBB_API_KEY}</p>
    `);
});

// Rota para Forçar Reset de Admin (Acesse isso no navegador após deploy)
app.get('/reset-admin', async (req, res) => {
    try {
        await Admin.deleteMany({});
        await Admin.create({ username: 'admin', password: process.env.ADMIN_PASSWORD });
        res.send('✅ Admin resetado com sucesso! Use a senha do .env para logar.');
    } catch (err) {
        res.status(500).send('Erro ao resetar admin: ' + err.message);
    }
});

// Login Admin
app.post('/api/login', async (req, res) => {
    const { password } = req.body;
    const admin = await Admin.findOne({ username: 'admin' });
    if (admin && admin.password === password) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Senha incorreta' });
    }
});

// Cadastro de Produto com ImgBB
app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.image;

        if (req.file) {
            const formData = new FormData();
            formData.append('image', req.file.buffer, { filename: 'upload.jpg' });

            const response = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, formData, {
                headers: formData.getHeaders()
            });
            imageUrl = response.data.data.url;
        }

        const newProduct = new Product({
            name: req.body.name,
            price: req.body.price,
            description: req.body.description,
            minQuantity: req.body.minQuantity,
            image: imageUrl
        });

        await newProduct.save();
        res.json({ success: true, product: newProduct });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Listar Produtos
app.get('/api/products', async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Deletar Produto
app.delete('/api/products/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
