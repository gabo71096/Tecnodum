// Required packages
const _ = require("lodash");
const passport = require("passport");
const router = require("express").Router();
const User = require("../models/user");
const Product = require("../public/javascripts/loadDB");

// Secure Cookie Options
const cookieOptions = {
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

// Home route
router.get("/", function (req, res) {
  res.render("index");
});

// About route
router.get("/about", function (req, res) {
  res.render("about");
});

// Help route
router.get("/help", function (req, res) {
  res.render("help");
});

// Store get route
router.get("/store", function (req, res) {
  // Adding filters to render products view
  const filter = [];

  if (req.query.filter === "almacenamiento") {
    filter.push("Almacenamiento");
  } else if (req.query.filter === "accesorios") {
    filter.push("Mouse", "Teclado");
  } else if (req.query.filter === "procesadores") {
    filter.push("Procesador");
  } else if (req.query.filter === "memorias") {
    filter.push("RAM");
  }

  if (filter.length === 0) {
    // If no filters, show all products
    Product.find({}, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        res.render("store", { docs: docs });
      }
    });
  } else {
    // Else, show filtered products
    Product.find({ categoria: { $in: filter } }, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        res.render("store", { docs: docs });
      }
    });
  }
});

// Inventory get route
router.get("/inventory", function (req, res) {
  // Show all available products in inventory
  Product.find({}, function (err, docs) {
    if (err) {
      console.log(err);
    } else {
      res.render("inventory", { name: req.user.name, docs: docs });
    }
  });
});

// Add Products route
router
  .route("/addproducts")
  .get(function (req, res) {
    // Get last ID and pass it to addproducts view for the next added product.
    Product.findOne({}, { id: 1 })
      .sort({ id: -1 })
      .exec(function (err, doc) {
        if (err) {
          console.log(err);
        } else {
          if (doc) {
            // If there are products in DB, pass last id plus 1
            res.render("addproducts", {
              name: req.user.name,
              message: false,
              id: ++doc.id,
            });
          } else {
            // Else pass id = 1
            res.render("addproducts", {
              name: req.user.name,
              message: false,
              id: 1,
            });
          }
        }
      });
  })
  .post(function (req, res) {
    // Add product to DB and render page with success message and id plus 1.
    Product.insertMany(
      {
        id: req.body.id,
        marca: _.startCase(req.body.marca),
        modelo: _.startCase(req.body.modelo),
        comentario: _.capitalize(req.body.comentario),
        categoria: req.body.categoria,
        precio: req.body.precio,
        stock: req.body.stock,
      },
      function (err, docs) {
        if (err) {
          console.log(err);
        } else {
          console.log("Success");
          res.render("addproducts", {
            name: req.user.name,
            message: "Añadido con éxito.",
            id: ++req.body.id,
          });
        }
      }
    );
  });

// Google auth, redirects to home when authenticated
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/tecnodum",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  function (req, res) {
    res.redirect("/");
  }
);

// Login route
router
  .route("/login")
  .get(function (req, res) {
    if (req.isAuthenticated()) {
      if (req.user.role === "admin") {
        // If user is authenticated and is admin, render admin page
        res.render("admin", {
          name: req.user.name,
          email: req.user.username,
          role: req.user.role,
        });
      } else {
        // if user is authenticated and not admin, render account page
        res.render("account", {
          name: req.user.name,
          email: req.user.username,
          role: req.user.role,
        });
      }
    } else {
      // Else rendender login page
      res.render("login", { errors: req.flash("error") });
    }
  })
  .post(
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    function (req, res) {
      res.redirect("/");
    }
  );

// Register route
router
  .route("/register")
  .get(function (req, res) {
    res.render("register", {
      errors: false,
    });
  })
  .post(function (req, res) {
    // check if both passwords match and register, else render register page again and send error.
    if (req.body.password === req.body.password2) {
      User.register(
        {
          name: _.startCase(req.body.name),
          username: req.body.username,
        },
        req.body.password,
        function (err) {
          if (err) {
            // If any error, render register page again and send error
            console.log(err);
            res.render("register", {
              errors: "Email ya registrado",
            });
          }
          // If everything goes OK, authenticate.
          passport.authenticate("local")(req, res, function () {
            res.redirect("/");
          });
        }
      );
    } else {
      res.render("register", {
        errors: "Contraseñas no coinciden",
      });
    }
  });

// Logout route
router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

// Product Showcase Route
router
  .route("/product/:product")
  .get(function (req, res) {
    // get id from url and find product with matching id, then render product page.
    const id = req.params.product.split("-")[0];

    Product.findOne({ id: id }, function (err, doc) {
      if (err) {
        console.log(err);
      } else {
        res.render("product", {
          doc: doc,
          message: false,
        });
      }
    });
  })
  .post(function (req, res) {
    if (req.user) {
      // If logged in, add product to user's shopping cart
      const id = "shoppingCart." + req.params.product.split("-")[0];

      // If product id exists in user's shopping cart, increase by req.quantity, else create and increase.
      User.updateOne(
        { username: req.user.username },
        { $inc: { [id]: parseInt(req.body.quantity) } },
        function (err, doc) {
          if (err) {
            console.log(err);
          }
        }
      );

      // Find product with matching id and render product page with success message.
      Product.findOne(
        { id: req.params.product.split("-")[0] },
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            res.render("product", {
              doc: doc,
              message: "Añadido correctamente.",
            });
          }
        }
      );
    } else {
      // If not logged in add product to cookies shopping cart
      const id = req.params.product.split("-")[0];

      if (req.cookies.shoppingCart) {
        // If there are shopping cart cookies created, add to existing
        const shoppingCart = req.cookies.shoppingCart;

        // Check if ID already exists in cookie
        if (shoppingCart.hasOwnProperty(id)) {
          // If true, add to existing
          shoppingCart[id] += parseInt(req.body.quantity);
          res.cookie("shoppingCart", shoppingCart, cookieOptions);
        } else {
          // Else, create new entry
          shoppingCart[id] = parseInt(req.body.quantity);
          res.cookie("shoppingCart", shoppingCart, cookieOptions);
        }
      } else {
        // If there aren't cookies, create them
        res.cookie(
          "shoppingCart",
          { [id]: parseInt(req.body.quantity) },
          cookieOptions
        );
      }

      // Find product with matching id and render product page with success message.
      Product.findOne(
        { id: req.params.product.split("-")[0] },
        function (err, doc) {
          if (err) {
            console.log(err);
          } else {
            res.render("product", {
              doc: doc,
              message: "Añadido correctamente.",
            });
          }
        }
      );
    }
  });

// Cart route
router
  .route("/cart")
  .get(async function (req, res) {
    // empty array that will contain products and quantity
    const prodAndQty = [];

    // if user is authenticated, save to doc, else, request cookie.
    if (req.user) {
      // Save user to doc to access it's properties
      const doc = await User.findOne({ username: req.user.username });

      if (doc.shoppingCart) {
        // save user shopping cart entries in variable and calculate it's length
        const prodEntries = Object.entries(doc.shoppingCart);
        const shoppingLength = prodEntries.length;

        // populate prodAndQty with product info from DB, using ids contained in prodEntries
        for (let i = 0; i < shoppingLength; i++) {
          const prod = await Product.findOne({ id: prodEntries[i][0] });
          prodAndQty.push([prod, prodEntries[i][1]]);
        }

        // render cart view passing user info, shopping cart entries qty and prodAndQty array
        res.render("cart", { doc: doc, qty: shoppingLength, prod: prodAndQty });
      } else {
        res.render("cart", { doc: doc, qty: false, prod: false });
      }
    } else {
      if (req.cookies.shoppingCart) {
        // save cookies shopping cart entries in variable and calculate it's length
        const prodEntries = Object.entries(req.cookies.shoppingCart);
        const shoppingLength = prodEntries.length;

        // populate prodAndQty with product info from DB, using ids contained in prodEntries
        for (let i = 0; i < shoppingLength; i++) {
          const prod = await Product.findOne({ id: prodEntries[i][0] });
          prodAndQty.push([prod, prodEntries[i][1]]);
        }

        // Render cart view as guest, passing shopping cart entries.
        res.render("cart", {
          doc: { name: "Guest" },
          qty: shoppingLength,
          prod: prodAndQty,
        });
      } else {
        res.render("cart", { doc: { name: "Guest" }, qty: false, prod: false });
      }
    }
  })
  .post(async function (req, res) {
    // empty array that will contain products and quantity
    const prodAndQty = [];

    // if user is authenticated, unset prod and qty from shopping cart
    if (req.user) {
      // id used as variable to unset field from user DB
      const deleteId = "shoppingCart." + req.body.remove;

      // Update user, unset shopping cart field using id
      User.updateOne(
        { username: req.user.username },
        { $unset: { [deleteId]: "" } },
        function (err, doc) {
          if (err) {
            console.log(err);
          }
        }
      );

      // save user to doc
      const doc = await User.findOne({ username: req.user.username });

      // save user shopping cart entries in variable and calculate it's length
      const prodEntries = Object.entries(doc.shoppingCart);
      const shoppingLength = prodEntries.length;

      // populate prodAndQty with product info from DB, using ids contained in prodEntries
      for (let i = 0; i < shoppingLength; i++) {
        const prod = await Product.findOne({ id: prodEntries[i][0] });
        prodAndQty.push([prod, prodEntries[i][1]]);
      }

      // Render cart with updated shoppingcart
      res.render("cart", { doc: doc, qty: shoppingLength, prod: prodAndQty });
    } else {
      // id used as variable to unset field from user DB
      const deleteId = req.body.remove;

      // Check if there are entries in cookies shopping cart
      if (req.cookies.shoppingCart) {
        // save shopping cart to variable and delete requested id.
        const shoppingCart = req.cookies.shoppingCart;
        delete shoppingCart[deleteId];

        // update shoppingcart cookie
        res.cookie("shoppingCart", shoppingCart, cookieOptions);

        // save cookies shopping cart entries in variable and calculate it's length
        const prodEntries = Object.entries(shoppingCart);
        const shoppingLength = prodEntries.length;

        // populate prodAndQty with product info from DB, using ids contained in prodEntries
        for (let i = 0; i < shoppingLength; i++) {
          const prod = await Product.findOne({ id: prodEntries[i][0] });
          prodAndQty.push([prod, prodEntries[i][1]]);
        }

        // Render cart with updated shoppingcart
        res.render("cart", {
          doc: { name: "Guest" },
          qty: shoppingLength,
          prod: prodAndQty,
        });
      } else {
        res.render("cart", { doc: { name: "Guest" }, qty: false, prod: false });
      }
    }
  });

// Export all routes
module.exports = router;
