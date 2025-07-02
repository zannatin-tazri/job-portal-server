const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3moahdm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db('jobPortal');
    const jobsCollection = db.collection('jobs');
    const jobApplicationCollection = db.collection('job_applications');
    const usersCollection = db.collection('users');

    // Root route
    app.get('/', (req, res) => {
      res.send("Job is falling from the sky!");
    });

    // ===================== USERS =====================

    app.post('/users', async (req, res) => {
      const user = req.body;
      try {
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(409).send({ message: 'User already exists' });
        }
        const result = await usersCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: 'Failed to save user', error });
      }
    });

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      try {
        if (email) {
          const user = await usersCollection.findOne({ email });
          return user
            ? res.send([user])
            : res.status(404).send({ message: 'User not found' });
        }
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve users', error });
      }
    });

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
        res.status(500).send({ message: "Failed to update user", error });
      }
    });

    // ===================== JOBS =====================

    app.post('/jobs', async (req, res) => {
      const job = req.body;
      const result = await jobsCollection.insertOne(job);
      res.send(result);
    });

    //  Updated Job Fetch Route: Case-insensitive match with at least 2 matching skills
    app.get('/jobs', async (req, res) => {
      try {
        const skillQuery = req.query.skills;

        if (!skillQuery) {
          const allJobs = await jobsCollection.find().toArray();
          return res.send(allJobs);
        }

        const inputSkills = skillQuery
          .split(',')
          .map(skill => skill.trim().toLowerCase());

        const allJobs = await jobsCollection.find().toArray();

        const filteredJobs = allJobs.filter(job => {
          const jobSkills = (job.requirements || []).map(s => s.toLowerCase());
          const matched = inputSkills.filter(skill => jobSkills.includes(skill));
          return matched.length >= 1;
        });

        res.send(filteredJobs);
      } catch (error) {
        console.error("Error filtering jobs:", error);
        res.status(500).send({ message: "Failed to filter jobs" });
      }
    });

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
        if (!job) {
          return res.status(404).send({ message: 'Job not found' });
        }
        res.send(job);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch job', error });
      }
    });

    // ===================== JOB APPLICATIONS =====================

    app.post('/job-applications', async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      res.send(result);
    });

    app.get('/job-applications', async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      try {
        const applications = await jobApplicationCollection.find(query).toArray();

        for (const app of applications) {
          const job = await jobsCollection.findOne({ _id: new ObjectId(app.job_id) });
          if (job) {
            app.title = job.title;
            app.company = job.company;
            app.company_logo = job.company_logo;
            app.location = job.location;
            app.salaryRange = job.salaryRange;
          }
        }

        res.send(applications);
      } catch (error) {
        res.status(500).send({ message: 'Failed to retrieve applications', error });
      }
    });

    app.delete('/job-applications/:id', async (req, res) => {
      const id = req.params.id;
      const result = await jobApplicationCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

  } catch (err) {
    console.error("Server error:", err);
  }
}

run().catch(console.dir);

// Start server
app.listen(port, () => {
  console.log(`Job Portal API running on port: ${port}`);
});
