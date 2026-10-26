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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Conectado'))
  .catch(err => console.error('Erro MongoDB:', err));

const Product = mongoose.model('Product', {
  name: String,
  price: Number,
  description: String,
  imageUrl: String
});

const Admin = mongoose.model('Admin', { password: { type: String, required: true } });

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const admin = await Admin.findOne();
  if (admin && admin.password === password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

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

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const imageFile = req.file;

    const formData = new FormData();
    formData.append('image', imageFile.buffer, { filename: imageFile.originalname });

    const imgbbResponse = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`, formData, {
      headers: formData.getHeaders()
    });

    const imageUrl = imgbbResponse.data.data.url;
    const product = new Product({ name, price, description, imageUrl });
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
