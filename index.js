const express = require('express')
const compression = require('compression')
const path = require('path')
const pino = require('pino');
const { getRoleInfo, userInfo } = require('./userInfo')
const svg = require('./utils/svg')

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express()
app.use(express.static('public'))
app.use(compression())
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
  res.render('index')
});

const CACHE_0 = 'max-age=0, no-cache, no-store, must-revalidate'
const CACHE_10800 = 'max-age=10800'

const genshin_Card = (req, res, detail = false) => { 
  const { game, skin, uid } = req.params;
  logger.info('收到請求 game:%s uid:%s, skin:%s', game, uid, skin);

  userInfo(game, uid, detail)
    .then(data => svg({game, data, skin, detail }))
    .then(svgImage => {
      res.set({
        'content-type': 'image/svg+xml',
        'cache-control': isNaN(skin) ? CACHE_0 : CACHE_10800,
      });
      res.send(svgImage);
    })
    .catch(err => {
      res.json({
        msg: err,
        code: -1,
      });
    });
};
app.get('/:game/:skin/:uid\.png', (req, res) => genshin_Card(req, res));
app.get('/:detail/:game/:skin/:uid\.png', (req, res) => genshin_Card(req, res, true));

app.get('/heart-beat', (req, res) => {
  res.set({
    'cache-control': 'max-age=0, no-cache, no-store, must-revalidate'
  })

  res.json({
    msg: 'alive',
    code: 0
  })

  logger.info('heart-beat')
});

const listener = app.listen(3000, () => {
  require("dotenv").config();
  logger.info('Your app is listening on port ' + listener.address().port)
})