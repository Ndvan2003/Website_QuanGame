
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const uri = "mongodb://localhost:27017"; // Nếu dùng MongoDB local
const client = new MongoClient(uri);
const dbName = "QLQG";

async function startServer() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const stores = db.collection("gamestores");

    app.get("/api/gamestores", async (req, res) => {
      const result = await stores.find({}).toArray();
      res.json(result);
    });

    app.post("/api/gamestores", async (req, res) => {
      const data = req.body;
      const result = await stores.insertOne(data);
      res.status(201).json(result);
    });

    app.put("/api/gamestores/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await stores.updateOne({ _id: new ObjectId(id) }, { $set: data });
      res.json(result);
    });

    app.delete("/api/gamestores/:id", async (req, res) => {
      const id = req.params.id;
      const result = await stores.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

    app.listen(3000, () => {
      console.log("🚀 Server is running at http://localhost:3000");
    });
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err);
  }
}

startServer();
