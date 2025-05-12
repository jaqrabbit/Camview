require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const { startStream, stopStream, restartCamera, rebootCamera, rebootAll } = require('./ffmpeg-manager');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const camsFile = './cams.json';

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/streams', express.static('streams'));
app.use('/thumbnails', express.static('streams'));

let cams = [];

// Load cameras from file
if (fs.existsSync(camsFile)) {
  cams = JSON.parse(fs.readFileSync(camsFile));
  cams.forEach(cam => startStream(cam.name, cam.url, io));
}

// Middleware for admin auth
app.use('/admin', (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (auth === 'Basic ' + Buffer.from('admin:' + process.env.ADMIN_PASSWORD).toString('base64')) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin Area"');
  res.status(401).send('Authentication required.');
});

// Dashboard View
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { cams });
});

// Admin View
app.get('/admin', (req, res) => {
  res.render('admin', { cams });
});

// Add Camera
app.post('/admin/add', (req, res) => {
  const { name, url } = req.body;
  if (!cams.find(c => c.name === name)) {
    cams.push({ name, url });
    fs.writeFileSync(camsFile, JSON.stringify(cams, null, 2));
    startStream(name, url, io);
  }
  res.redirect('/admin');
});

// Delete Camera
app.post('/admin/delete', (req, res) => {
  const { name } = req.body;
  cams = cams.filter(c => c.name !== name);
  fs.writeFileSync(camsFile, JSON.stringify(cams, null, 2));
  stopStream(name);
  res.redirect('/admin');
});

// Restart Camera Stream
app.post('/admin/restart', (req, res) => {
  const { name } = req.body;
  const cam = cams.find(c => c.name === name);
  if (cam) restartCamera(cam.name, cam.url, io);
  res.redirect('/admin');
});

// Reboot Camera Device
app.post('/admin/reboot-device', (req, res) => {
  const { name } = req.body;
  rebootCamera(name);
  res.redirect('/admin');
});

// Reboot All Devices
app.post('/admin/reboot-all', (req, res) => {
  rebootAll();
  res.redirect('/admin');
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));