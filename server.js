let allProducts = [];

async function fetchProducts() {
    const response = await fetch('/api/products');
    allProducts = await response.json();
    renderProducts();
}

function renderProducts() {
    const list = document.getElementById('product-list');
    list.innerHTML = '';

    allProducts.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <img src="${product.image}" width="150">
            <h3>${product.name}</h3>
            <p>R$ ${product.price}</p>
            <button onclick="openProduct('${product._id}')">Ver Detalhes</button>
        `;
        list.appendChild(div);
    });
}

function openProduct(id) {
    const product = allProducts.find(p => p._id === id);
    if (!product) return;

    document.getElementById('modal-image').src = product.image;
    document.getElementById('modal-name').innerText = product.name;
    document.getElementById('modal-description').innerText = product.description;
    document.getElementById('modal-price').innerText = product.price;
    document.getElementById('modal-min').innerText = product.minQuantity || 1;
    
    document.getElementById('add-to-cart-btn').onclick = () => addToCart(product);
    document.getElementById('product-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item._id === product._id);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${product.name} adicionado ao carrinho!`);
}

fetchProducts();
