// Cargamos el archivo de configuración con los datos de conexión a la base de datos
const dbConfig = require("../config/db.config.js");

// Importamos Sequelize, el ORM que nos permite trabajar con PostgreSQL como objetos JS
const Sequelize = require("sequelize");

// Armamos las opciones de conexión de forma dinámica según el ambiente
const sequelizeOptions = {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
  dialect: dbConfig.dialect,

  // Configuración del pool de conexiones para optimizar el rendimiento
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
};

// Solo agregamos configuración SSL si el ambiente actual la requiere.
// Esto viene de dbConfig.ssl, que a su vez lee DB_SSL desde el .env correspondiente:
// en desarrollo local normalmente es "false"; en producción (Neon/Render) es "true".
if (dbConfig.ssl) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,             // La conexión debe usar SSL obligatoriamente
      rejectUnauthorized: false  // Acepta certificados autofirmados (útil en entornos no productivos)
    }
  };
}

const sequelize = dbConfig.URL
  ? new Sequelize(dbConfig.URL, sequelizeOptions)
  : new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, sequelizeOptions);

// Objeto db que exportaremos para acceder a Sequelize y los modelos desde el resto del proyecto
const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Registramos el modelo de cada modulo en modules
//users/
db.role = require("./users/roles/role.model.js")(sequelize, Sequelize);
db.user = require("./users/accounts/user.model.js")(sequelize, Sequelize);
db.employee = require("./users/employees/employee.model.js")(sequelize, Sequelize);
db.customer = require("./users/customers/customer.model.js")(sequelize, Sequelize);
db.address = require("./users/customers/address.model.js")(sequelize, Sequelize);

//catalog/
db.category = require("./catalog/categories/category.model.js")(sequelize, Sequelize);
db.brand = require("./catalog/brands/brand.model.js")(sequelize, Sequelize);
db.supplier = require("./catalog/suppliers/supplier.model.js")(sequelize, Sequelize);
db.product = require("./catalog/products/product.model.js")(sequelize, Sequelize);
db.productvariant = require("./catalog/products/productVariant.model.js")(sequelize, Sequelize);
db.productImage = require("./catalog/products/productImage.model.js")(sequelize, Sequelize);
db.productReview = require("./catalog/reviews/productReview.model.js")(sequelize, Sequelize);

//inventory/
db.stock = require("./inventory/stock.model.js")(sequelize, Sequelize);
db.inventoryMovement = require("./inventory/inventoryMovement.model.js")(sequelize, Sequelize);

//sales/
db.cart = require("./sales/carts/cart.model.js")(sequelize, Sequelize);
db.cartItem = require("./sales/carts/cartItem.model.js")(sequelize, Sequelize);
db.order = require("./sales/orders/order.model.js")(sequelize, Sequelize);
db.orderItem = require("./sales/orders/orderItem.model.js")(sequelize, Sequelize);
db.invoice = require("./sales/finance/invoice.model.js")(sequelize, Sequelize);
db.payment = require("./sales/finance/payment.model.js")(sequelize, Sequelize);

//marketing/
db.coupon = require("./marketing/coupons/coupon.model.js")(sequelize, Sequelize);
db.orderCupon = require("./marketing/coupons/orderCoupon.model.js")(sequelize, Sequelize);

//system/
db.auditlog = require("./system/audit/auditLog.model.js")(sequelize, Sequelize);


// ASOCIACIONES (equivalentes a los REFERENCES del SQL)


// roles -> users
db.roles.hasMany(db.users, { foreignKey: "role_id" });
db.users.belongsTo(db.roles, { foreignKey: "role_id" });

// users -> customers (1:1)
db.users.hasOne(db.customers, { foreignKey: "user_id" });
db.customers.belongsTo(db.users, { foreignKey: "user_id" });

// users -> employees (1:1)
db.users.hasOne(db.employees, { foreignKey: "user_id" });
db.employees.belongsTo(db.users, { foreignKey: "user_id" });

// users -> audit_logs
db.users.hasMany(db.auditLogs, { foreignKey: "user_id" });
db.auditLogs.belongsTo(db.users, { foreignKey: "user_id" });

// customers -> addresses
db.customers.hasMany(db.addresses, { foreignKey: "customer_id" });
db.addresses.belongsTo(db.customers, { foreignKey: "customer_id" });

// customers -> carts
db.customers.hasMany(db.carts, { foreignKey: "customer_id" });
db.carts.belongsTo(db.customers, { foreignKey: "customer_id" });

// customers -> orders
db.customers.hasMany(db.orders, { foreignKey: "customer_id" });
db.orders.belongsTo(db.customers, { foreignKey: "customer_id" });

// customers -> product_reviews
db.customers.hasMany(db.productReviews, { foreignKey: "customer_id" });
db.productReviews.belongsTo(db.customers, { foreignKey: "customer_id" });

// categories (auto-referencia: categoria padre)
db.categories.hasMany(db.categories, { foreignKey: "parent_category_id", as: "subcategories" });
db.categories.belongsTo(db.categories, { foreignKey: "parent_category_id", as: "parentCategory" });

// categories/brands/suppliers -> products
db.categories.hasMany(db.products, { foreignKey: "category_id" });
db.products.belongsTo(db.categories, { foreignKey: "category_id" });

db.brands.hasMany(db.products, { foreignKey: "brand_id" });
db.products.belongsTo(db.brands, { foreignKey: "brand_id" });

db.suppliers.hasMany(db.products, { foreignKey: "supplier_id" });
db.products.belongsTo(db.suppliers, { foreignKey: "supplier_id" });

// products -> product_variants / product_images / product_reviews
db.products.hasMany(db.productVariants, { foreignKey: "product_id" });
db.productVariants.belongsTo(db.products, { foreignKey: "product_id" });

db.products.hasMany(db.productImages, { foreignKey: "product_id" });
db.productImages.belongsTo(db.products, { foreignKey: "product_id" });

db.products.hasMany(db.productReviews, { foreignKey: "product_id" });
db.productReviews.belongsTo(db.products, { foreignKey: "product_id" });

// product_variants -> stock (1:1)
db.productVariants.hasOne(db.stock, { foreignKey: "product_variant_id" });
db.stock.belongsTo(db.productVariants, { foreignKey: "product_variant_id" });

// product_variants -> inventory_movements
db.productVariants.hasMany(db.inventoryMovements, { foreignKey: "product_variant_id" });
db.inventoryMovements.belongsTo(db.productVariants, { foreignKey: "product_variant_id" });

// employees -> inventory_movements / invoices
db.employees.hasMany(db.inventoryMovements, { foreignKey: "employee_id" });
db.inventoryMovements.belongsTo(db.employees, { foreignKey: "employee_id" });

db.employees.hasMany(db.invoices, { foreignKey: "employee_id" });
db.invoices.belongsTo(db.employees, { foreignKey: "employee_id" });

// carts -> cart_items
db.carts.hasMany(db.cartItems, { foreignKey: "cart_id" });
db.cartItems.belongsTo(db.carts, { foreignKey: "cart_id" });

// product_variants -> cart_items / order_items
db.productVariants.hasMany(db.cartItems, { foreignKey: "product_variant_id" });
db.cartItems.belongsTo(db.productVariants, { foreignKey: "product_variant_id" });

db.productVariants.hasMany(db.orderItems, { foreignKey: "product_variant_id" });
db.orderItems.belongsTo(db.productVariants, { foreignKey: "product_variant_id" });

// addresses -> orders
db.addresses.hasMany(db.orders, { foreignKey: "address_id" });
db.orders.belongsTo(db.addresses, { foreignKey: "address_id" });

// orders -> order_items / order_coupons / invoices
db.orders.hasMany(db.orderItems, { foreignKey: "order_id" });
db.orderItems.belongsTo(db.orders, { foreignKey: "order_id" });

db.orders.hasMany(db.orderCoupons, { foreignKey: "order_id" });
db.orderCoupons.belongsTo(db.orders, { foreignKey: "order_id" });

db.orders.hasOne(db.invoices, { foreignKey: "order_id" });
db.invoices.belongsTo(db.orders, { foreignKey: "order_id" });

// coupons -> order_coupons
db.coupons.hasMany(db.orderCoupons, { foreignKey: "coupon_id" });
db.orderCoupons.belongsTo(db.coupons, { foreignKey: "coupon_id" });

// invoices -> payments
db.invoices.hasMany(db.payments, { foreignKey: "invoice_id" });
db.payments.belongsTo(db.invoices, { foreignKey: "invoice_id" });



module.exports = db;