// Required packages
const mongoose = require("mongoose");
const products = require("./products");

// Schema definition
const productSchema = new mongoose.Schema({
  id: Number,
  marca: String,
  modelo: String,
  comentario: String,
  imagen: String,
  categoria: String,
  precio: Number,
  stock: Number,
});

// Model definition
const Product = mongoose.model("Product", productSchema);

// Check if products collection is populated, if not, populate it
Product.findOne({}, function (err, docs) {
  if (docs) {
    console.log("already populated");
  } else {
    Product.insertMany(products, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        console.log("Registrado con éxito.");
        mongoose.disconnect();
      }
    });
  }
});

// Export product model
module.exports = Product;
