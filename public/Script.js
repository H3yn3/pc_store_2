const orderModal = document.getElementById("orderModal");
const modalProductName = document.getElementById("modalProductName");
const productInput = document.getElementById("productInput");
const catalogContainer = document.getElementById("catalogContainer");
const orderForm = document.getElementById("orderForm");
const formMessage = document.getElementById("formMessage");

let selectedProduct = "";

function scrollToSection(id) {
  const element = document.getElementById(id);

  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openOrderModal(productName) {
  selectedProduct = productName;

  if (modalProductName) {
    modalProductName.textContent = `Выбранный товар: ${productName}`;
  }

  if (orderModal) {
    orderModal.classList.add("is-open");
  }
}

function closeOrderModal() {
  if (orderModal) {
    orderModal.classList.remove("is-open");
  }
}

function goToOrderForm() {
  if (productInput) {
    productInput.value = selectedProduct;
  }

  closeOrderModal();
  scrollToSection("order");
}

async function loadProducts() {
  if (!catalogContainer) {
    return;
  }

  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Не удалось загрузить товары");
    }

    const products = await response.json();

    catalogContainer.innerHTML = "";

    if (!Array.isArray(products) || products.length === 0) {
      catalogContainer.innerHTML = `
        <p class="form-note">Товары пока не добавлены.</p>
      `;
      return;
    }

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";

      const safeName = escapeHtml(product.name);
      const safeDescription = escapeHtml(product.description);
      const safePrice = escapeHtml(product.price);
      const safeImage = escapeHtml(product.image);

      card.innerHTML = `
        ${
          safeImage
            ? `<img class="product-photo" src="${safeImage}" alt="${safeName}">`
            : `<div class="product-image">PC</div>`
        }
        <h3>${safeName}</h3>
        <p>${safeDescription}</p>
        <strong>${safePrice}</strong>
        <button class="btn" type="button">Купить</button>
      `;

      const buyButton = card.querySelector("button");

      buyButton.addEventListener("click", () => {
        openOrderModal(product.name);
      });

      catalogContainer.appendChild(card);
    });
  } catch (error) {
    console.error(error);

    catalogContainer.innerHTML = `
      <p class="form-note">Ошибка загрузки товаров. Проверьте, запущен ли сервер.</p>
    `;
  }
}

if (orderForm) {
  orderForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    try {
      const formData = new FormData(event.target);

      const response = await fetch("/api/order", {
        method: "POST",
        body: new URLSearchParams(formData)
      });

      if (!response.ok) {
        throw new Error("Ошибка отправки заявки");
      }

      const result = await response.json();

      if (formMessage) {
        formMessage.textContent = result.message || "Заявка отправлена";
      }

      event.target.reset();
    } catch (error) {
      console.error(error);

      if (formMessage) {
        formMessage.textContent = "Не удалось отправить заявку. Попробуйте позже.";
      }
    }
  });
}

loadProducts();