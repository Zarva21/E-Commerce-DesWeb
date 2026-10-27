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
db.productVariant = require("./catalog/products/productVariant.model.js")(sequelize, Sequelize);
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
db.orderCoupon = require("./marketing/coupons/orderCoupon.model.js")(sequelize, Sequelize);

//system/
db.auditLog = require("./system/audit/auditLog.model.js")(sequelize, Sequelize);


// ASOCIACIONES (equivalentes a los REFERENCES del SQL)


// roles -> users
db.role.hasMany(db.user, { foreignKey: "role_id" });
db.user.belongsTo(db.role, { foreignKey: "role_id" });

// users -> customers (1:1)
db.user.hasOne(db.customer, { foreignKey: "user_id" });
db.customer.belongsTo(db.user, { foreignKey: "user_id" });

// users -> employees (1:1)
db.user.hasOne(db.employee, { foreignKey: "user_id" });
db.employee.belongsTo(db.user, { foreignKey: "user_id" });

// users -> audit_logs
db.user.hasMany(db.auditLog, { foreignKey: "user_id" });
db.auditLog.belongsTo(db.user, { foreignKey: "user_id" });

// customers -> addresses
db.customer.hasMany(db.address, { foreignKey: "customer_id" });
db.address.belongsTo(db.customer, { foreignKey: "customer_id" });

// customers -> carts
db.customer.hasMany(db.cart, { foreignKey: "customer_id" });
db.cart.belongsTo(db.customer, { foreignKey: "customer_id" });

// customers -> orders
db.customer.hasMany(db.order, { foreignKey: "customer_id" });
db.order.belongsTo(db.customer, { foreignKey: "customer_id" });

db.customer.hasMany(db.coupon, { foreignKey: "customer_id" });
db.coupon.belongsTo(db.customer, { foreignKey: "customer_id" });

// customers -> product_reviews
db.customer.hasMany(db.productReview, { foreignKey: "customer_id" });
db.productReview.belongsTo(db.customer, { foreignKey: "customer_id" });

// categories (auto-referencia: categoria padre)
db.category.hasMany(db.category, { foreignKey: "parent_category_id", as: "subcategories" });
db.category.belongsTo(db.category, { foreignKey: "parent_category_id", as: "parentCategory" });

// categories/brands/suppliers -> products
db.category.hasMany(db.product, { foreignKey: "category_id" });
db.product.belongsTo(db.category, { foreignKey: "category_id" });

db.brand.hasMany(db.product, { foreignKey: "brand_id" });
db.product.belongsTo(db.brand, { foreignKey: "brand_id" });

db.supplier.hasMany(db.product, { foreignKey: "supplier_id" });
db.product.belongsTo(db.supplier, { foreignKey: "supplier_id" });

// products -> product_variants / product_images / product_reviews
db.product.hasMany(db.productVariant, { foreignKey: "product_id" });
db.productVariant.belongsTo(db.product, { foreignKey: "product_id" });

db.product.hasMany(db.productImage, { foreignKey: "product_id" });
db.productImage.belongsTo(db.product, { foreignKey: "product_id" });

db.product.hasMany(db.productReview, { foreignKey: "product_id" });
db.productReview.belongsTo(db.product, { foreignKey: "product_id" });

// product_variants -> stock (1:1)
db.productVariant.hasOne(db.stock, { foreignKey: "product_variant_id" });
db.stock.belongsTo(db.productVariant, { foreignKey: "product_variant_id" });

// product_variants -> inventory_movements
db.productVariant.hasMany(db.inventoryMovement, { foreignKey: "product_variant_id" });
db.inventoryMovement.belongsTo(db.productVariant, { foreignKey: "product_variant_id" });

// employees -> inventory_movements / invoices
db.employee.hasMany(db.inventoryMovement, { foreignKey: "employee_id" });
db.inventoryMovement.belongsTo(db.employee, { foreignKey: "employee_id" });

db.employee.hasMany(db.invoice, { foreignKey: "employee_id" });
db.invoice.belongsTo(db.employee, { foreignKey: "employee_id" });

// carts -> cart_items
db.cart.hasMany(db.cartItem, { foreignKey: "cart_id" });
db.cartItem.belongsTo(db.cart, { foreignKey: "cart_id" });

// product_variants -> cart_items / order_items
db.productVariant.hasMany(db.cartItem, { foreignKey: "product_variant_id" });
db.cartItem.belongsTo(db.productVariant, { foreignKey: "product_variant_id" });

db.productVariant.hasMany(db.orderItem, { foreignKey: "product_variant_id" });
db.orderItem.belongsTo(db.productVariant, { foreignKey: "product_variant_id" });

// addresses -> orders
db.address.hasMany(db.order, { foreignKey: "address_id" });
db.order.belongsTo(db.address, { foreignKey: "address_id" });

// orders -> order_items / order_coupons / invoices
db.order.hasMany(db.orderItem, { foreignKey: "order_id" });
db.orderItem.belongsTo(db.order, { foreignKey: "order_id" });

db.order.hasMany(db.orderCoupon, { foreignKey: "order_id" });
db.orderCoupon.belongsTo(db.order, { foreignKey: "order_id" });

db.order.hasOne(db.invoice, { foreignKey: "order_id" });
db.invoice.belongsTo(db.order, { foreignKey: "order_id" });

// coupons -> order_coupons
db.coupon.hasMany(db.orderCoupon, { foreignKey: "coupon_id" });
db.orderCoupon.belongsTo(db.coupon, { foreignKey: "coupon_id" });

// invoices -> payments
db.invoice.hasMany(db.payment, { foreignKey: "invoice_id" });
db.payment.belongsTo(db.invoice, { foreignKey: "invoice_id" });



module.exports = db;