(() => {
  "use strict";

  if (sessionStorage.getItem("catalogAdminLoggedIn") !== "true") {
    window.location.replace("login.html");
    return;
  }

  const PRODUCTS_KEY = "catalogProducts";
  const SETTINGS_KEY = "catalogSettings";

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

  let products = readJSON(PRODUCTS_KEY, []);
  if (!Array.isArray(products)) products = [];

  let selectedImage = "";
  let logoImage = "";

  const form = document.getElementById("productForm");
  const imageInput = document.getElementById("productImage");
  const imagePreview = document.getElementById("imagePreview");
  const logoInput = document.getElementById("storeLogoImage");
  const logoPreview = document.getElementById("logoPreview");

  async function uploadImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("Selecione um arquivo de imagem válido.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Não foi possível enviar a imagem.");

    return result.path;
  }

  function saveProducts() {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  function renderProducts() {
    products = readJSON(PRODUCTS_KEY, []);
    if (!Array.isArray(products)) products = [];

    document.getElementById("adminProductCount").textContent =
      `${products.length} ${products.length === 1 ? "produto" : "produtos"}`;
    document.getElementById("adminEmptyState").classList.toggle("hidden", products.length > 0);

    document.getElementById("adminProductList").innerHTML = products.map(product => {
      const minimum = Math.max(1, Number(product.minQty) || 1);
      const unitPrice = Number(product.price) || 0;

      return `
        <article class="admin-product">
          ${product.image
            ? `<img src="${escapeHTML(product.image)}" alt="">`
            : `<div class="admin-product-placeholder">⌑</div>`}
          <div class="admin-product-info">
            <h3>${escapeHTML(product.name)}</h3>
            <p>${money(unitPrice)} por unidade · mínimo ${minimum} unidades · mínimo total ${money(unitPrice * minimum)}</p>
          </div>
          <div class="admin-product-actions">
            <button class="button button-light" type="button" data-edit="${escapeHTML(product.id)}">Editar</button>
            <button class="button button-danger" type="button" data-delete="${escapeHTML(product.id)}">Remover</button>
          </div>
        </article>`;
    }).join("");
  }

  function resetForm() {
    form.reset();
    document.getElementById("productId").value = "";
    document.getElementById("productMinQty").value = "1";
    document.getElementById("productFormTitle").textContent = "Adicionar produto";
    document.getElementById("submitProductButton").textContent = "Adicionar produto";
    document.getElementById("cancelEditButton").classList.add("hidden");
    imagePreview.classList.add("hidden");
    imagePreview.removeAttribute("src");
    selectedImage = "";
  }

  function startEdit(id) {
    const product = products.find(item => String(item.id) === String(id));
    if (!product) return;

    document.getElementById("productId").value = product.id;
    document.getElementById("productName").value = product.name || "";
    document.getElementById("productPrice").value = product.price || "";
    document.getElementById("productMinQty").value = Math.max(1, Number(product.minQty) || 1);
    document.getElementById("productDescription").value = product.description || "";
    selectedImage = product.image || "";

    if (selectedImage) {
      imagePreview.src = selectedImage;
      imagePreview.classList.remove("hidden");
    } else {
      imagePreview.classList.add("hidden");
    }

    document.getElementById("productFormTitle").textContent = "Editar produto";
    document.getElementById("submitProductButton").textContent = "Salvar alterações";
    document.getElementById("cancelEditButton").classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  imageInput.addEventListener("change", async () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    const message = document.getElementById("productMessage");
    message.textContent = "Enviando imagem…";

    try {
      selectedImage = await uploadImage(file);
      imagePreview.src = selectedImage;
      imagePreview.classList.remove("hidden");
      message.textContent = "Imagem enviada para assets/img.";
    } catch (error) {
      message.textContent = error.message;
      imageInput.value = "";
    }
  });

  logoInput.addEventListener("change", async () => {
    const file = logoInput.files?.[0];
    if (!file) return;

    const message = document.getElementById("settingsMessage");
    message.textContent = "Enviando logo…";

    try {
      logoImage = await uploadImage(file);
      logoPreview.src = logoImage;
      logoPreview.classList.remove("hidden");
      message.textContent = "Logo enviada para assets/img. Clique em “Salvar identidade” para aplicar.";
    } catch (error) {
      message.textContent = error.message;
      logoInput.value = "";
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const id = document.getElementById("productId").value;
    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const minQty = Number(document.getElementById("productMinQty").value);
    const description = document.getElementById("productDescription").value.trim();

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(minQty) || minQty < 1) {
      document.getElementById("productMessage").textContent =
        "Informe nome, preço válido e quantidade mínima inteira maior que zero.";
      return;
    }

    const oldProduct = id
      ? products.find(product => String(product.id) === String(id))
      : null;

    const product = {
      id: id || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
      name,
      price,
      minQty,
      description,
      image: selectedImage || oldProduct?.image || ""
    };

    if (id) {
      products = products.map(item => String(item.id) === String(id) ? product : item);
    } else {
      products.push(product);
    }

    saveProducts();
    renderProducts();
    resetForm();
    document.getElementById("productMessage").textContent = "Produto salvo com sucesso.";
  });

  document.getElementById("adminProductList").addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");

    if (editButton) startEdit(editButton.dataset.edit);

    if (deleteButton) {
      const product = products.find(item =>
        String(item.id) === String(deleteButton.dataset.delete)
      );
      if (!product || !confirm(`Remover "${product.name}"?`)) return;

      products = products.filter(item => String(item.id) !== String(product.id));
      saveProducts();

      const cart = readJSON("catalogCart", []);
      if (Array.isArray(cart)) {
        localStorage.setItem("catalogCart", JSON.stringify(
          cart.filter(item => String(item.id) !== String(product.id))
        ));
      }

      renderProducts();
      if (document.getElementById("productId").value === String(product.id)) resetForm();
    }
  });

  document.getElementById("cancelEditButton").addEventListener("click", resetForm);

  const settings = readJSON(SETTINGS_KEY, {
    pageTitle: "Bonés e chapéus para você",
    logoText: "Catálogo",
    logoImage: ""
  });

  document.getElementById("storeTitle").value = settings.pageTitle || "";
  document.getElementById("storeLogo").value = settings.logoText || "";
  logoImage = settings.logoImage || "";

  if (logoImage) {
    logoPreview.src = logoImage;
    logoPreview.classList.remove("hidden");
  }

  document.getElementById("removeLogoButton").addEventListener("click", () => {
    logoImage = "";
    logoInput.value = "";
    logoPreview.removeAttribute("src");
    logoPreview.classList.add("hidden");
    document.getElementById("settingsMessage").textContent =
      "Imagem removida. Salve a identidade para aplicar a alteração.";
  });

  document.getElementById("settingsForm").addEventListener("submit", event => {
    event.preventDefault();

    const pageTitle = document.getElementById("storeTitle").value.trim();
    const logoText = document.getElementById("storeLogo").value.trim();

    if (!pageTitle || !logoText) {
      document.getElementById("settingsMessage").textContent =
        "Preencha o título da página e o texto do logo.";
      return;
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      pageTitle,
      logoText,
      logoImage
    }));

    document.getElementById("settingsMessage").textContent = "Identidade da loja salva.";
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("catalogAdminLoggedIn");
    window.location.href = "login.html";
  });

  renderProducts();
})();
