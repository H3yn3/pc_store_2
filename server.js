const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const multer = require("multer");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_LOGIN || !ADMIN_PASSWORD || !SESSION_SECRET) {
  console.error("Ошибка: заполните ADMIN_LOGIN, ADMIN_PASSWORD и SESSION_SECRET в .env");
  process.exit(1);
}

const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const productsPath = path.join(dataDir, "products.json");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(productsPath)) fs.writeFileSync(productsPath, "[]", "utf8");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax"
    }
  })
);

app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const safeName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Разрешены только JPG, PNG и WEBP"));
    }
    cb(null, true);
  }
});

function readProducts() {
  const raw = fs.readFileSync(productsPath, "utf8");
  return JSON.parse(raw);
}

function writeProducts(products) {
  fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), "utf8");
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }

  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Нет доступа" });
  }

  return res.redirect("/admin/login.html");
}

app.get("/api/products", (req, res) => {
  res.json(readProducts());
});

app.post("/api/order", (req, res) => {
  const order = {
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email,
    product: req.body.product,
    comment: req.body.comment,
    createdAt: new Date().toISOString()
  };

  console.log("Новая заявка:", order);

  // Здесь можно будет подключить CRM:
  // await sendToCRM(order);

  res.json({
    success: true,
    message: "Заявка принята"
  });
});

app.post("/api/admin/login", (req, res) => {
  const { login, password } = req.body;

  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.status(401).json({
    success: false,
    error: "Неверный логин или пароль"
  });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/admin/products", requireAdmin, (req, res) => {
  res.json(readProducts());
});

app.post("/api/admin/products", requireAdmin, upload.single("image"), (req, res) => {
  const products = readProducts();

  const newProduct = {
    id: "product-" + Date.now(),
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    image: req.file ? `/uploads/${req.file.filename}` : ""
  };

  products.push(newProduct);
  writeProducts(products);

  res.json({
    success: true,
    product: newProduct
  });
});

app.put("/api/admin/products/:id", requireAdmin, upload.single("image"), (req, res) => {
  const products = readProducts();
  const productIndex = products.findIndex((item) => item.id === req.params.id);

  if (productIndex === -1) {
    return res.status(404).json({ error: "Товар не найден" });
  }

  const oldProduct = products[productIndex];

  products[productIndex] = {
    ...oldProduct,
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    image: req.file ? `/uploads/${req.file.filename}` : oldProduct.image
  };

  writeProducts(products);

  res.json({
    success: true,
    product: products[productIndex]
  });
});

app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  let products = readProducts();
  products = products.filter((item) => item.id !== req.params.id);
  writeProducts(products);

  res.json({ success: true });
});

app.get("/admin/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "login.html"));
});

app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "admin.html"));
});

app.get("/admin/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Сайт запущен: http://localhost:${PORT}`);
  console.log(`Админка: http://localhost:${PORT}/admin`);
});
