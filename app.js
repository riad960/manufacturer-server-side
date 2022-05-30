const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors({ origin: "*" }));
app.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.idddr.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      console.log(err);
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// start function start here
async function start() {
  try {
    await client.connect();
    const itemCollection = client.db("products").collection("item");
    const reviewCollection = client.db("products").collection("review");
    const orderCollection = client.db("products").collection("order");
    const userCollection = client.db("products").collection("user");
    const paymentCollection = client.db("products").collection("payment");

    console.log("Connected to MongoDB and woking");

    // get all items
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const items = req.body;
      const Price = items.quantity;
      const amount = Price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.get("/items", async (req, res) => {
      const query = {};
      const cursor = itemCollection.find(query);
      const item = await cursor.toArray();
      res.send(item);
    });

    app.get("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const singleTool = await itemCollection.findOne(query);
      res.send(singleTool);
    });

    app.get("/review", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const review = await cursor.toArray();
      res.send(review);
    });

    app.get("/order", verifyJWT, async (req, res) => {
      const buyerEmail = req.query.buyerEmail;
      const decodedEmail = req.decoded.email;
      if (buyerEmail === decodedEmail) {
        const query = { buyerEmail: buyerEmail };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });

    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    // patch
    app.patch("/order/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });

    // post function start here

    app.post("/review", async (req, res) => {
      const review = req.body;
      await reviewCollection.insertOne(review);
      res.send(review);
    });

    app.post("/order", async (req, res) => {
      const order = req.body;
      await orderCollection.insertOne(order);
      res.send(order);
    });

    app.post("/tool", async (req, res) => {
      const newTool = req.body;
      const result = await itemCollection.insertOne(newTool);
      res.send(result);
    });

    // put function start here
    // verifyJWT,

    app.put("/user/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const requesterEmail = req.decoded.email;
      const requesterRole = await userCollection.findOne({
        email: requesterEmail,
      });
      if (requesterRole.role === "admin") {
        const filter = { email: email };
        const updateDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        return res.send(result);
      } else {
        return res.status(403).send({ message: "Forbidden access" });
      }
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" }
      );
      res.send({ result, token });
    });

    // delete function start here

    app.delete("/tool/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await itemCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/user/:email", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
start();

// main route here | get all data

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
