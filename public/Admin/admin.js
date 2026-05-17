const productForm = document.getElementById("productForm");
const adminProducts = document.getElementById("adminProducts");
const adminMessage = document.getElementById("adminMessage");
const saveButton = document.getElementById("saveButton");
const resetButton = document.getElementById("resetButton");

const productId = document.getElementById("productId");
const productName = document.getElementById("productName");
const productDescription = document.getElementById("productDescription");
const productPrice = document.getElementById("productPrice");
const productImage = document.getElementById("productImage");

async function loadAdminProducts() {
  const response = await fetch("/api/admin/products");

  if (response.status === 401) {
    window.location.href = "/admin/login.html";
    return;
  }

  const products = await response.json();

  adminProducts.innerHTML = "";

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";

    card.innerHTML = `
      ${
        product.image
          ? `<img class="product-photo" src="${product.image}" alt="${product.name}">`
          : `<div class="product-image">PC</div>`
      }
      <h3>${product.name}</h3>
      <p>${product.description}</p>
      <strong>${product.price}</strong>
      <button class="btn btn-outline" type="button" data-action="edit">Редактировать</button>
      <button class="btn" type="button" data-action="delete">Удалить</button>
    `;

    card.querySelector('[data-action="edit"]').addEventListener("click", () => {
      productId.value = product.id;
      productName.value = product.name;
      productDescription.value = product.description;
      productPrice.value = product.price;
      saveButton.textContent = "Сохранить изменения";
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmed = confirm(`Удалить товар "${product.name}"?`);

      if (!confirmed) return;

      await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE"
      });

      adminMessage.textContent = "Товар удалён";
      loadAdminProducts();
    });

    adminProducts.appendChild(card);
  });
}

productForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const formData = new FormData(productForm);
  const id = productId.value;

  const url = id ? `/api/admin/products/${id}` : "/api/admin/products";
  const method = id ? "PUT" : "POST";

  const response = await fetch(url, {
    method,
    body: formData
  });

  if (!response.ok) {
    adminMessage.textContent = "Ошибка сохранения товара";
    return;
  }

  productForm.reset();
  productId.value = "";
  saveButton.textContent = "Добавить товар";
  adminMessage.textContent = id ? "Товар обновлён" : "Товар добавлен";

  loadAdminProducts();
});

resetButton.addEventListener("click", () => {
  productForm.reset();
  productId.value = "";
  saveButton.textContent = "Добавить товар";
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  await fetch("/api/admin/logout", {
    method: "POST"
  });

  window.location.href = "/admin/login.html";
});

loadAdminProducts();