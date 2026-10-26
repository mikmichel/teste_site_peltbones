if (localStorage.getItem('isAdmin') !== 'true') {
  window.location.href = 'login.html';
}

document.getElementById('logoutButton').addEventListener('click', () => {
  localStorage.removeItem('isAdmin');
  window.location.href = 'index.html';
});

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const oldPassword = document.getElementById('oldPass').value;
  const newPassword = document.getElementById('newPass').value;

  const response = await fetch('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword })
  });

  if (response.ok) {
    alert('Senha alterada com sucesso!');
  } else {
    alert('Erro ao alterar senha!');
  }
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('name').value);
  formData.append('price', document.getElementById('price').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('image', document.getElementById('imageFile').files[0]);

  const response = await fetch('/api/products', {
    method: 'POST',
    body: formData
  });

  if (response.ok) {
    alert('Produto cadastrado!');
    loadProducts();
  }
});

async function loadProducts() {
  const response = await fetch('/api/products');
  const products = await response.json();
  const grid = document.getElementById('adminProductGrid');
  grid.innerHTML = products.map(p => `
    <div class="product-item" style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border:1px solid #ccc; padding:10px;">
      <img src="${p.imageUrl}" width="50">
      <span>${p.name} - R$ ${p.price}</span>
      <button onclick="deleteProduct('${p._id}')">Excluir</button>
    </div>
  `).join('');
}

async function deleteProduct(id) {
  if (confirm('Excluir produto?')) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }
}

loadProducts();
