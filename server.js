const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

let cams = [];
const camsPath = path.join(__dirname, 'cams.json');
if (fs.existsSync(camsPath)) {
  cams = JSON.parse(fs.readFileSync(camsPath));
}

app.get('/', (req, res) => {
  res.render('view');
});

app.get('/admin', (req, res) => {
  res.render('admin', { cams });
});

app.post('/admin/add', (req, res) => {
  const { name, stream } = req.body;
  cams.push({ name, stream });
  fs.writeFileSync(camsPath, JSON.stringify(cams, null, 2));
  res.redirect('/admin');
});

app.get('/api/cams', (req, res) => {
  res.json(cams);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});