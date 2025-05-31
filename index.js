const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port=process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors());
app.use(express.json());







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3moahdm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //job related apis
    const jobsCollection=client.db('jobPortal').collection('jobs');
    const jobApplicationCollection=client.db('jobPortal').collection('job_applications');
    const usersCollection=client.db('jobPortal').collection('users');



    // Save new user
 // POST: Save a new user
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log("Registering user:", user);

      try {
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          console.log("User already exists:", user.email);
          return res.status(409).send({ message: 'User already exists' });
        }

        const result = await usersCollection.insertOne(user);
        console.log("User saved with ID:", result.insertedId);
        res.status(201).send(result);
      } catch (error) {
        console.error("Failed to save user:", error);
        res.status(500).send({ message: 'Failed to save user', error });
      }
    });

    // GET: Get user by email or all users
    app.get('/users', async (req, res) => {
      const email = req.query.email;

      try {
        if (email) {
          const user = await usersCollection.findOne({ email });
          if (!user) {
            return res.status(404).send({ message: 'User not found' });
          }
          return res.send([user]);
        }

        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error("Failed to retrieve users:", error);
        res.status(500).send({ message: 'Failed to retrieve users', error });
      }
    });

    //adding role for recruiter

  app.patch('/users/:email', async (req, res) => {
  const email = req.params.email;
  const updateFields = req.body;

  try {
    const result = await usersCollection.updateOne(
      { email },
      { $set: updateFields }
    );
    res.send(result);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Failed to update user" });
  }
});



    app.get('/jobs', async(req,res)=>{
        const cursor=jobsCollection.find();
        const result=await cursor.toArray();
        res.send(result);
    })

    app.get('/jobs/:id', async(req, res)=>{
        const id=req.params.id;
        const query={ _id: new ObjectId(id) }
        const result= await jobsCollection.findOne(query);
        res.send(result);
        })

    app.post('/jobs', async (req, res) => {
    const job = req.body;
    const result = await jobsCollection.insertOne(job);
    res.send(result);
});

        //job application apis

        app.get('/job-applications',async(req,res)=>{
          const email=req.query.email;
          const query={applicant_email:email}
          const result = await jobApplicationCollection.find(query).toArray();

          //fokira way
          for(const application of result){
            console.log(application.job_id);
            const query1={_id: new ObjectId(application.job_id)}
            const job=await jobsCollection.findOne(query1);
            if(job){
              application.title=job.title;
              application.company=job.company;
              application.company_logo=job.company_logo;
              application.location=job.location;
              application.salaryRange=job.salaryRange;
            }
          }
          res.send(result);
        })
        app.post('/job-applications', async(req,res)=>{
          const application = req.body;
          const result=await jobApplicationCollection.insertOne(application);
          res.send(result);
        })

        app.delete('/job-applications/:id', async (req, res) => {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const result = await jobApplicationCollection.deleteOne(query);
          res.send(result);
      });
      

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req, res)=>{
    res.send("job is falling from the sky")
})

app.listen(port,()=>{
    console.log(`job is waiting at port : ${port} `)
})
