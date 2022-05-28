// importing the
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
// require mongo client
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// dot env confiq
require("dotenv").config();
// using middleware
app.use(express.json());
app.use(cors());
// initialize the uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0acv4.mongodb.net/?retryWrites=true&w=majority`;
// creating the client
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
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
      console.log(Order);
      const querry = {
        id: Order.id,
      };
      const exits = await OrderCollection.findOne(querry);
      if (exits) {
        return res.send({ success: false, order: exits });
      }
      const result = await OrderCollection.insertOne(Order);
      res.send(result);
    });

    // user checking
    app.put("/user/:id", async (req, res) => {
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
    // getting my orders
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;

      const querry = { email: id };
      const cursor = await OrderCollection.find(querry);
      const result = await cursor.toArray();
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
