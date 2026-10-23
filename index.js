(() => {
  "use strict";

  const STORAGE = {
    products: "catalogProducts",
    settings: "catalogSettings",
    cart: "catalogCart"
  };

  // Troque pelo telefone da loja: código do país + DDD + número.
  const WHATSAPP_NUMBER = "5511999999999";

  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const money = value => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  let products = readJSON(STORAGE.products, []);
  let settings = readJSON(STORAGE.settings, {
    pageTitle: "Bonés e chapéus para você",
    logoText: "Catálogo",
    logoImage: ""
  });
  let cart = readJSON(STORAGE.cart, []);

  if (!Array.isArray(products)) products = [];
  if (!Array.isArray(cart)) cart = [];

  const productGrid = document.getElementById("productGrid");
  const productDialog = document.getElementById("productDialog");
  const cartDialog = document.getElementById("cartDialog");

  function getMinimum(product) {
    return Math.max(1, Number(product.minQty) || 1);
  }

  function getUnitPrice(product) {
    return Number(product.price) || 0;
  }

  function getItemTotal(product, sets) {
    return getUnitPrice(product) * getMinimum(product) * Number(sets || 1);
  }

  function applySettings() {
    const pageTitle = settings.pageTitle || "Bonés e chapéus para você";
    const logoText = settings.logoText || "Catálogo";

    document.title = pageTitle;
    document.getElementById("pageTitle").textContent = pageTitle;
    document.getElementById("logoText").textContent = logoText;
    document.getElementById("footerStoreName").textContent = logoText;

    const logo = document.getElementById("brandLogo");
    const mark = document.getElementById("brandMark");

    if (settings.logoImage) {
      logo.src = settings.logoImage;
      logo.classList.remove("hidden");
      mark.classList.add("hidden");
    } else {
      logo.removeAttribute("src");
      logo.classList.add("hidden");
      mark.classList.remove("hidden");
    }
  }

  async function removeProductsWithMissingImages() {
    try {
      const response = await fetch("/api/images");
      if (!response.ok) return;

      const files = await response.json();
      const existingPaths = new Set(files.map(file => `/assets/img/${file}`));

      const keptProducts = products.filter(product => {
        if (!product.image) return true;

        // Compatibilidade com produtos antigos que usavam imagens Base64.
        if (product.image.startsWith("data:image/")) return true;

        return existingPaths.has(product.image);
      });

      if (keptProducts.length !== products.length) {
        products = keptProducts;
        localStorage.setItem(STORAGE.products, JSON.stringify(products));

        const validIds = new Set(products.map(product => String(product.id)));
        cart = cart.filter(item => validIds.has(String(item.id)));
        localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
      }
    } catch (error) {
      console.error("Não foi possível verificar as imagens:", error);
    }
  }

  function renderProducts() {
    products = readJSON(STORAGE.products, []);
    if (!Array.isArray(products)) products = [];

    document.getElementById("productCount").textContent =
      `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
    document.getElementById("emptyProducts").classList.toggle("hidden", products.length > 0);

    productGrid.innerHTML = products.map(product => {
      const minimum = getMinimum(product);
      const image = product.image
        ? `<img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">`
        : `<div class="product-placeholder" aria-label="Sem imagem">⌑</div>`;

      return `
        <article class="product-card">
          <button class="product-image-button" type="button" data-details="${escapeHTML(product.id)}"
            aria-label="Ver detalhes de ${escapeHTML(product.name)}">${image}</button>
          <div class="product-card-body">
            <h3>${escapeHTML(product.name)}</h3>
            <p class="product-price">${money(getUnitPrice(product))} <span class="muted">por unidade</span></p>
            <p class="muted">Pedido mínimo: ${minimum} unidades · total mínimo ${money(getItemTotal(product, 1))}</p>
            <div class="product-actions">
              <button class="button button-light" type="button" data-details="${escapeHTML(product.id)}">Detalhes</button>
              <button class="button button-primary" type="button" data-add="${escapeHTML(product.id)}">Adicionar</button>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  function updateCartCount() {
    cart = readJSON(STORAGE.cart, []);
    if (!Array.isArray(cart)) cart = [];

    const count = cart.reduce((sum, item) => {
      const product = products.find(p => String(p.id) === String(item.id));
      return sum + (product ? getMinimum(product) * (Number(item.sets) || 0) : 0);
    }, 0);

    document.getElementById("cartCount").textContent = count;
  }

  function addToCart(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;

    const existing = cart.find(item => String(item.id) === String(id));
    if (existing) existing.sets = (Number(existing.sets) || 0) + 1;
    else cart.push({ id: product.id, sets: 1 });

    localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
    updateCartCount();
  }

  function showDetails(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;

    const minimum = getMinimum(product);
    const image = product.image
      ? `<img class="detail-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}">`
      : `<div class="detail-image product-placeholder">⌑</div>`;

    document.getElementById("productDetails").innerHTML = `
      ${image}
      <div class="detail-content">
        <p class="eyebrow">Detalhes do produto</p>
        <h2>${escapeHTML(product.name)}</h2>
        <p class="product-price">${money(getUnitPrice(product))} <span class="muted">por unidade</span></p>
        <p class="muted">Pedido mínimo: ${minimum} unidades. Total mínimo: ${money(getItemTotal(product, 1))}.</p>
        <p class="description">${escapeHTML(product.description || "Consulte a loja para mais informações.")}</p>
        <button class="button button-primary" type="button" data-add="${escapeHTML(product.id)}">Adicionar ao carrinho</button>
      </div>`;

    productDialog.showModal();
  }

  function renderCart() {
    cart = readJSON(STORAGE.cart, []);
    if (!Array.isArray(cart)) cart = [];
    products = readJSON(STORAGE.products, []);
    if (!Array.isArray(products)) products = [];

    const validItems = cart.filter(item =>
      products.some(product => String(product.id) === String(item.id))
    );

    if (validItems.length !== cart.length) {
      cart = validItems;
      localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
    }

    const itemsContainer = document.getElementById("cartItems");

    if (!cart.length) {
      itemsContainer.innerHTML = `<p class="empty-state">Seu carrinho está vazio.</p>`;
    } else {
      itemsContainer.innerHTML = cart.map(item => {
        const product = products.find(p => String(p.id) === String(item.id));
        if (!product) return "";

        const minimum = getMinimum(product);
        const sets = Math.max(1, Number(item.sets) || 1);
        const units = minimum * sets;
        const total = getItemTotal(product, sets);

        return `
          <article class="cart-item">
            <div class="cart-item-info">
              <strong>${escapeHTML(product.name)}</strong>
              <span class="muted">${units} unidade(s) × ${money(getUnitPrice(product))} = ${money(total)}</span>
              <span class="muted">Mínimo: ${minimum} unidade(s) por conjunto</span>
            </div>
            <div class="cart-controls">
              <button class="quantity-button" type="button" data-change="-1" data-id="${escapeHTML(product.id)}" aria-label="Diminuir conjuntos">−</button>
              <span>${sets} conjunto(s)</span>
              <button class="quantity-button" type="button" data-change="1" data-id="${escapeHTML(product.id)}" aria-label="Aumentar conjuntos">+</button>
              <button class="remove-button" type="button" data-remove="${escapeHTML(product.id)}">Remover</button>
            </div>
          </article>`;
      }).join("");
    }

    const total = cart.reduce((sum, item) => {
      const product = products.find(p => String(p.id) === String(item.id));
      return sum + (product ? getItemTotal(product, item.sets) : 0);
    }, 0);

    document.getElementById("cartTotal").textContent = money(total);
    updateCartCount();
  }

  function changeSets(id, amount) {
    const item = cart.find(entry => String(entry.id) === String(id));
    if (!item) return;

    item.sets = (Number(item.sets) || 1) + amount;
    if (item.sets < 1) cart = cart.filter(entry => String(entry.id) !== String(id));

    localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
    renderCart();
  }

  function sendOrder() {
    renderCart();

    const messageElement = document.getElementById("cartMessage");
    if (!cart.length) {
      messageElement.textContent = "Adicione produtos antes de enviar o pedido.";
      return;
    }

    const name = document.getElementById("customerName").value.trim();
    const lines = cart.map(item => {
      const product = products.find(p => String(p.id) === String(item.id));
      if (!product) return "";

      const sets = Number(item.sets) || 1;
      const units = getMinimum(product) * sets;
      const total = getItemTotal(product, sets);

      return [
        `• ${product.name}`,
        `  Quantidade: ${units} unidade(s)`,
        `  Valor: ${money(total)}`
      ].join("\n");
    }).filter(Boolean);

    const total = cart.reduce((sum, item) => {
      const product = products.find(p => String(p.id) === String(item.id));
      return sum + (product ? getItemTotal(product, item.sets) : 0);
    }, 0);

    const message = [
      "Olá! Gostaria de fazer este pedido:",
      name ? `Nome: ${name}` : "",
      "",
      ...lines,
      "",
      `Total do pedido: ${money(total)}`
    ].filter(line => line !== "").join("\n");

    const number = WHATSAPP_NUMBER.replace(/\D/g, "");
    if (!number) {
      messageElement.textContent = "Configure o número de WhatsApp da loja no arquivo index.js.";
      return;
    }

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener"
    );
  }

  document.addEventListener("click", event => {
    const detailsButton = event.target.closest("[data-details]");
    const addButton = event.target.closest("[data-add]");
    const closeButton = event.target.closest("[data-close]");
    const changeButton = event.target.closest("[data-change]");
    const removeButton = event.target.closest("[data-remove]");

    if (detailsButton) showDetails(detailsButton.dataset.details);

    if (addButton) {
      addToCart(addButton.dataset.add);
      if (productDialog.open) productDialog.close();
    }

    if (closeButton) document.getElementById(closeButton.dataset.close).close();

    if (changeButton) changeSets(changeButton.dataset.id, Number(changeButton.dataset.change));

    if (removeButton) {
      cart = cart.filter(item => String(item.id) !== String(removeButton.dataset.remove));
      localStorage.setItem(STORAGE.cart, JSON.stringify(cart));
      renderCart();
    }
  });

  document.getElementById("openCartButton").addEventListener("click", () => {
    renderCart();
    cartDialog.showModal();
  });

  document.getElementById("sendOrderButton").addEventListener("click", sendOrder);

  window.addEventListener("storage", event => {
    if ([STORAGE.products, STORAGE.settings].includes(event.key)) {
      settings = readJSON(STORAGE.settings, settings);
      applySettings();
      renderProducts();
    }
    if (event.key === STORAGE.cart) updateCartCount();
  });

  async function initialize() {
    settings = readJSON(STORAGE.settings, settings);
    products = readJSON(STORAGE.products, []);
    if (!Array.isArray(products)) products = [];

    await removeProductsWithMissingImages();
    applySettings();
    renderProducts();
    updateCartCount();
  }

  initialize();
})();
