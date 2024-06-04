require('dotenv').config();
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
// Middleware

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())


// My Middleware 

const verifyUser = (req, res, next) =>{
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({ message: 'UnAuthorized' })
    }

    jwt.verify(token, process.env.SECRET_TOKEN, (err, decode)=>{
        if(err){
            return res.status(401).send({message: 'UnAuthorized'})
        }
        req.user = decode;
        next()
    })

    // next()

}


// Routes

app.get('/', (req, res) => {
  res.send('Your Car service was successfully running')
})


// MongoDB routes

console.log(process.env.DB_USER);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oqwbmox.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.connect();
        const serviceCollections = client.db('CarServices').collection('services');
        const BookingCollections = client.db('CarServices').collection('bookings');

        // Jwt authorization

        app.post('/jwt', async (req, res) => {
            const user = await req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.SECRET_TOKEN, {expiresIn: '12 hours'});
            res
            .cookie('token', token, {
                httpOnly: true,
                secure: false
            })
            .send({success: true})
        })



        // Car services

    //    get services data from mongodb server
    app.get('/services', async(req, res)=>{
        const data = await serviceCollections.find().toArray();
        res.send(data);
    })

    // get specific services data from mongodb server
    app.get('/services/:id', async(req, res)=>{
        const id =await req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await serviceCollections.findOne(query);
        res.send(result);
        
    })

    // User Bookings service

    // post service booking
        
    app.post('/bookings', async(req, res)=>{
        
        const bookings = req.body;
        const result = await BookingCollections.insertOne(bookings);
        res.send(result);
    })

    // get specific user Bookings service
    app.get('/bookings', verifyUser,  async(req, res)=>{
        const currentUser = req.user;
        
        const email = req.query.email;
        if (currentUser.email !== email){
            return res.status(401).send({ message: 'UnAuthorized' })
        }


        let query = {}

        if (req.query?.email){
            query = { email: req.query?.email}
        }

        const result = await BookingCollections.find(query).toArray();
        res.send(result);

    })

    // bookings status update   

    app.patch('/bookings/:id', async(req, res)=>{
        const id = req.params.id;
        const query = { _id : new ObjectId(id)}
        const update = {
            $set : {
                status : 'Approved'
            }
        }
        const result = await BookingCollections.updateOne(query, update);
        res.send(result);
    })

    // Remove bookings

    app.delete('/bookings/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await BookingCollections.deleteOne(query);
        res.send(result);
    })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.listen(port, ()=>{
    console.log('car service server listening on port', `http://localhost:${port}`);
})