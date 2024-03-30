
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const nodemailer = require('nodemailer');
const multer = require('multer');

const app = express();
const port = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'realestate',
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err);
    return;
  }
  console.log('Connected to MySQL!');
});

app.use(session({
  secret: 'your_secret_key',
  resave: true,
  saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
// Middleware to check if the user is logged in
const requireLogin = (req, res, next) => {
  if (req.session && req.session.username) {
    // User is logged in, allow the request to continue
    next();
  } else {
    // User is not logged in, redirect to the login page
    res.redirect('/signup'); // You may want to change this to your login page
  }
};

// Property model
const Property = {
  create: (property, callback) => {
    const query = 'INSERT INTO properties SET ?';
    connection.query(query, property, callback);
  },
  getAll: (callback) => {
    const query = 'SELECT * FROM properties';
    connection.query(query, callback);
  },
  getAllByOwner: (ownerUsername, callback) => {
    const query = 'SELECT * FROM properties WHERE ownerUsername = ?';
    connection.query(query, [ownerUsername], callback);
  },
  delete: (propertyId, callback) => {
    const query = 'DELETE FROM properties WHERE id = ?';
    connection.query(query, [propertyId], callback);
  },
};

// Middleware for handling file uploads using multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// Property upload route
app.post('/api/addProperty', requireLogin, upload.single('propertyImage'), (req, res) => {
  const { propertyName, propertyPrice, propertyLocation, ownerEmail, phoneNo } = req.body;
  const propertyImage = req.file.filename;

  const newProperty = {
    propertyName,
    propertyImage,
    propertyPrice,
    propertyLocation,
    ownerUsername: req.session.username,
    ownerEmail,
    phoneNo,
  };

  Property.create(newProperty, (err) => {
    if (err) {
      console.error('Error adding property:', err);
      res.status(500).json({ message: 'Error adding property' });
    } else {
      res.status(201).json({ message: 'Property added successfully', property: newProperty });
    }
  });
});


// Property retrieval route
app.get('/api/getProperties', (req, res) => {
  Property.getAll((err, properties) => {
    if (err) {
      console.error('Error fetching properties:', err);
      res.status(500).json({ message: 'Error fetching properties' });
    } else {
      res.json(properties);
    }
  });
});
app.get('/api/getPropertiesByOwner', requireLogin, (req, res) => {
  const ownerUsername = req.session.username;

  Property.getAllByOwner(ownerUsername, (err, properties) => {
    if (err) {
      console.error('Error fetching properties:', err);
      res.status(500).json({ message: 'Error fetching properties' });
    } else {
      res.json(properties);
    }
  });
});

app.delete('/api/deleteProperty/:propertyId', requireLogin, (req, res) => {
  const propertyId = req.params.propertyId;

  Property.delete(propertyId, (err) => {
    if (err) {
      console.error('Error deleting property:', err);
      res.status(500).json({ message: 'Error deleting property' });
    } else {
      res.status(200).json({ message: 'Property deleted successfully' });
    }
  });
});

// Import necessary modules and set up your server

// Define your route handlers
app.get('/check-login', (req, res) => {
  // Check if the user is authenticated
  if (req.session.username) {
    // User is logged in, send a success response
    res.status(200).send('User is logged in');
  } else {
    // User is not logged in, send an error response
    res.status(401).send('User is not logged in');
  }
});

// Rest of your existing routes...
// Contact form route
app.post('/submit_form', (req, res) => {
  const { name, email, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sohamlkhanvilkar@gmail.com', // Replace with your Gmail email
      pass: 'yury ztab ewpx vynx' // Replace with your Gmail password
    }
  });

  const mailOptions = {
    from: email,
    to: 'sohamlkhanvilkar@gmail.com', // Replace with your email
    subject: 'New Contact Form Submission',
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      console.log('Email sent: ' + info.response);
      // res.send('Message submitted successfully! To the company');
      // res.send('Thanks for contacting with us');
      res.redirect('/contact');
    }
  });
});

app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/dashboard', requireLogin, (req, res) => {
  const ownerUsername = req.session.username;

  Property.getAllByOwner(ownerUsername, (err, properties) => {
    if (err) {
      console.error('Error fetching properties:', err);
      res.status(500).json({ message: 'Error fetching properties' });
    } else {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    }
  });
});


app.post('/submit/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  // Check in login_data table
  const loginQuery = 'SELECT * FROM login_data WHERE username = ? AND password = ?';
  connection.query(loginQuery, [username, password], (loginErr, loginResults) => {
    if (loginErr) {
      console.error('Error querying login_data in MySQL: ', loginErr);
      res.sendStatus(500);
      return;
    }

    // Check in signup_data table
    const signupQuery = 'SELECT * FROM signup_data WHERE username = ? AND password = ?';
    connection.query(signupQuery, [username, password], (signupErr, signupResults) => {
      if (signupErr) {
        console.error('Error querying signup_data in MySQL: ', signupErr);
        res.sendStatus(500);
        return;
      }

      if (loginResults.length > 0 || signupResults.length > 0) {
        // Username and password are correct in either login_data or signup_data
        // Set the session to indicate that the user is logged in
        req.session.username = username;
        res.redirect('/dashboard'); // Redirect to the dashboard
      } else {
        // Incorrect username or password in both tables
        res.status(401).send('Unsuccessful Login');
      }
    });
  });
});

app.post('/submit/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const query = 'INSERT INTO signup_data (username, password) VALUES (?, ?)';
  connection.query(query, [username, password], (err, results) => {
    if (err) {
      console.error('Error inserting data into MySQL: ', err);
      res.sendStatus(500);
      return;
    }
    console.log('Data inserted into MySQL!');
    res.redirect('/signup');
  });
});


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

