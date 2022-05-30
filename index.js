// importing the
const express = require("express");
const app = express();
const port = process.env.PORT || 4200;
const cors = require("cors");
const jwt = require("jsonwebtoken");
// require mongo client
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// dot env confiq
require("dotenv").config();
// using middleware
app.use(express.json());
// app.use(cors());
app.use(
  cors({
    origin: true,
    optionsSuccessStatus: 200,
    credentials: true,
  })
);
//cors
// const corsConfig = {
//   origin: true,
//   credentials: true,
// };
// app.use(cors(corsConfig));
// app.options("*", cors(corsConfig));

// const corsConfig = {
//   origin: "*",
//   credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE"],
// };
// app.use(cors(corsConfig));
// app.options("*", cors(corsConfig));
// app.use(express.json());
// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept,authorization"
//   );
//   next();
// });

// initialize the uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0acv4.mongodb.net/?retryWrites=true&w=majority`;
// creating the client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// very jtw middleware
function verifyJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorizes access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCES_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}
// connecting the client
async function run() {
  try {
    await client.connect();
    console.log("connected");
    // product collection server
    const ProductsCollection = client
      .db("tool_manufacturer")
      .collection("products");
    const OrderCollection = client.db("tool_manufacturer").collection("orders");
    const UserCollection = client.db("tool_manufacturer").collection("users");
    // product get req
    app.get("/products", async (req, res) => {
      const querry = {};
      const cursor = ProductsCollection.find(querry);
      const products = await cursor.toArray();
      res.send(products);
    });
    // single product get req
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const querry = { _id: ObjectId(id) };
      const cursor = await ProductsCollection.findOne(querry);

      res.send(cursor);
    });
    // orders post api
    app.post("/order", async (req, res) => {
      const Order = req.body;

      const querry = {
        product: Order.product,
        email: Order.email,
      };
      const exits = await OrderCollection.findOne(querry);
      if (exits) {
        return res.send({ success: false, order: exits });
      }
      const result = await OrderCollection.insertOne(Order);
      res.send(result);
    });
    // add items
    app.post("/products", async (req, res) => {
      const Item = req.body;

      const querry = {
        name: Item.name,
      };
      const exits = await ProductsCollection.findOne(querry);
      if (exits) {
        return res.send({ success: false, order: exits });
      }
      const result = await ProductsCollection.insertOne(Item);
      res.send(result);
    });
    // delete items
    app.delete("/products/:id", async (req, res) => {
      const name = req.params.id;
      const querry = {
        name: name,
      };
      const result = await ProductsCollection.deleteOne(querry);
      res.send(result);
    });
    // get users
    app.get("/users", verifyJwt, async (req, res) => {
      const users = await UserCollection.find().toArray();
      res.send(users);
    });
    // user checking
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await UserCollection.updateOne(filter, updateDoc, option);
      const token = jwt.sign({ email: email }, process.env.ACCES_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      res.send({ result, accesToken: token });
    });
    app.delete("/user/:email", async (req, res) => {
      const email = req.params.email;

      const filter = { email: email };

      const result = await UserCollection.deleteOne(filter);

      res.send(result);
    });

    // making user admin
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requesterAccount = await UserCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: email };

        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await UserCollection.updateOne(filter, updateDoc);

        res.send(result);
      } else {
        res.status(403).send({ message: "Unauthorized Acces" });
      }
    });
    // is user or not
    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await UserCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      if (isAdmin) {
        res.send({ admin: isAdmin });
      } else {
        res.send({ admin: false });
      }
    });
    // getting my orders
    app.get("/orders/:id", verifyJwt, async (req, res) => {
      const id = req.params.id;
      const decoded = req.decoded.email;
      if (id === decoded) {
        const querry = { email: id };
        const cursor = OrderCollection.find(querry);
        const result = await cursor.toArray();
        res.send(result);
      } else {
        return res.status(404).send({ message: "Forbidden Acces" });
      }
    });
    // admin : getting order
    app.get("/orders", verifyJwt, async (req, res) => {
      const users = await OrderCollection.find().toArray();
      res.send(users);
    });
    // add reviews
    const ReviewCollection = client
      .db("tool_manufacturer")
      .collection("review");
    app.post("/userReviews", async (req, res) => {
      const Order = req.body;

      const querry = {
        name: Order.name,
      };
      const exits = await ReviewCollection.findOne(querry);
      if (exits) {
        return res.send({ success: false, order: exits });
      }
      const result = await ReviewCollection.insertOne(Order);
      res.send(result);
    });
    // get reviews
    app.get("/userReviews", async (req, res) => {
      const querry = {};
      const cursor = ReviewCollection.find(querry);
      const review = await cursor.toArray();
      res.send(review);
    });
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("connected");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
