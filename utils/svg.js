const fs = require('fs')
const path = require('path')
const https = require('https')
const mimeType = require('mime-types')
const Fontmin = require('fontmin')
const b2a = require('b3b').b2a
const NodeCache = require('node-cache')
const md5 = require('md5')
const pino = require('pino')
const util = require('./index')
const { SKIN_URL, SKIN_LEN, BASE_GLYPH } = require('./routes')
const { GI, ZZZ } = require('./tpl')

const woff2Cache = new NodeCache({ stdTTL: 60 * 60 * 24 * 365 })
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

async function convertToBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const mimeType = res.headers['content-type'];
        if (mimeType.includes('image/jpeg')) {
          resolve(`data:image/jpeg;base64,${base64}`);
        } else if (mimeType.includes('image/png')) {
            resolve(`data:image/png;base64,${base64}`);
        } else {
          convertToBase64(url.replace('jpg', 'png'))
          .then(result => resolve(result))
          .catch(err => reject(err));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function randomArr(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function range(start, end) {
  if (start > end) [end, start] = [start, end]
  return Array.from(new Array(parseInt(end)).keys()).slice(parseInt(start))
}

const txt2woff2 = (text) => {
  const key = '__woff2__' + md5(text);

  return new Promise((resolve, reject) => {
    const cachedData = woff2Cache.get(key);
    if (cachedData) {
      logger.info('Retrieved font subset from cache %s', key);
      resolve(cachedData);
    } else {
      const fontmin = new Fontmin()
        .src('assets/fonts/HYWenHei-55W.ttf')
        .use(Fontmin.glyph({
          text: BASE_GLYPH[game] + text,
          hinting: false
        }))
        .use(Fontmin.ttf2woff({
          deflate: true
        }));

      fontmin.run(function (err, files) {
        if (err) {
          reject(err);
        } else if (files && files.length > 0) {
          // console.log('Generated files by Fontmin:', files.map(f => f.path));
          const fontFile = files[1] && files[1].contents ? files[1] : files[0];
          
          if (fontFile && fontFile.contents) {
            const woff2 = b2a(fontFile.contents);
            woff2Cache.set(key, woff2);
            resolve(woff2);
          } else {
            reject(new Error("Expected font file not found in the Fontmin output."));
          }
        } else {
          reject(new Error("No files generated by Fontmin."));
        }
      });
    }
  });
};

const svg = async ({ game, data, skin = 0, detail = false }) => {
  // '2,5,9' -> [2, 5, 9]
  // '3-5' -> [3, 4, 5]
  // '3-5,7,9,12-15' -> [3, 4, 5, 7, 9, 12, 13, 14, 15]

  if (skin.includes(',')) {
    const skinArr = skin.split(',').reduce((arr, cur) => {
      if (cur) {
        if (cur.includes('-')) {
          const [start, end] = cur.split('-')
          arr = arr.concat(range(start, end))
        } else {
          arr = arr.concat(parseInt(cur))
        }
      }
      return arr
    }, [])
    skin = randomArr(skinArr)

  } else if (skin.includes('-')) {
    const [start, end] = skin.split('-')
    const skinArr = range(start, end)
    skin = randomArr(skinArr)

  } else if (skin === 'rand') {
    skin = random(0, SKIN_LEN[game])

  } else if (skin <= 0  || skin > SKIN_LEN[game]-1) {
    skin = 0
  }

  if (game == 'gi') game = 'gs';
  if (game == 'hsr') game = 'hi';

  const woff2 = await txt2woff2(data.nickname)
  const bg = await convertToBase64(`${skinURL}/${game}/skin/${skin}.jpg`)

  return new Promise((resolve, reject) => {
    const functions = {
      "gs": gi
  };
    const tpl = functions[game](bg, woff2, detail)

    resolve(util.render(tpl, data))
  })
}

module.exports = svg
