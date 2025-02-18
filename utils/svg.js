const fs = require('fs')
const path = require('path')
const Fontmin = require('fontmin')
const b2a = require('b3b').b2a
const NodeCache = require('node-cache')
const md5 = require('md5')
const util = require('./index')
const pino = require('pino')
const { SKIN_LEN, BASE_GLYPH } = require('./routes')
const { HI3, GI, HSR, ZZZ } = require('./tpl')

const woff2Cache = new NodeCache({ stdTTL: 60 * 60 * 24 * 365 })
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

function base64Img(game, index) {
  const ext = game == "gs" ? "jpg" : "png";
  const mineType = game == "gs" ? "image/jpeg" : "image/png";
  const image = fs.readFileSync(path.join(__dirname, `../assets/img/${game}/skin/${index}.${ext}`));
  return `data:${mineType};base64,${image.toString("base64")}`;
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

const txt2woff2 = (game, text) => {
  const key = `__game__${game}__woff2__${md5(text)}`

  return new Promise((resolve, reject) => {
    const cachedData = woff2Cache.get(key);
      if (cachedData) {
        logger.info('Retrieved font subset from cache %s', key);
        resolve(cachedData);
      } else {
        const fontmin = new Fontmin()
        .src(path.join(__dirname, `../public/assets/fonts/${game}.ttf`))
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
            const fontFile = files[1] && files[1].contents ? files[1] : files[0];
            
            if (fontFile && fontFile.contents) {
              const woff2 = b2a(fontFile.contents);
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
  if (game == 'hsr') game = 'sr';

  const woff2 = await txt2woff2(game, data.nickname)

  return new Promise((resolve, reject) => {
    const functions = {
      'hi3': HI3,
      'gs': GI,
      'sr': HSR,
      'zzz': ZZZ
  };
    const tpl = functions[game](base64Img(game, skin), woff2, detail)

    resolve(util.render(tpl, data))
  })
}

module.exports = svg