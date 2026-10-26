async function fetchProducts() {
  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    const productGrid = document.getElementById('productGrid');
    const productCount = document.getElementById('productCount');
    
    if (products.length === 0) {
      document.getElementById('emptyProducts').classList.remove('hidden');
      return;
    }

    productCount.textContent = `${products.length} produtos`;
    productGrid.innerHTML = products.map(product => `
      <div class="product-card">
        <img src="${product.imageUrl}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>R$ ${product.price}</p>
        <button onclick="addToCart('${product._id}')">Adicionar</button>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
}

fetchProducts();
// Aqui você mantém sua função de addToCart e WhatsApp que já possuía
