const crypto = require('crypto')

const randomStr = (length) => {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const randomInt = (min, max) => {
  // [min, max)
  return Math.floor(Math.random() * (max - min)) + min;
}

const getQueryParam = (data) => {
  if (data === undefined) {
    return "";
  }
  const arr = [];
  for (let key of Object.keys(data)) {
    arr.push(`${key}=${data[key]}`);
  }
  return arr.join("&");
}

const getDS = () => {
  const salt = '6s25p5ox5y14umn1p61aqyyvbvvl3lrt';
  const time = Math.floor(Date.now() / 1000);

  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let random = '';
  for (let i = 0; i < 6; i++) {
    random += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  const hash = crypto.createHash('md5')
    .update(`salt=${salt}&t=${time}&r=${random}`)
    .digest('hex');

  return `${time},${random},${hash}`;
}
const render = (template, context) => {

  var tokenReg = /(\\)?\{\{([^\{\}\\]+)(\\)?\}\}/g;

  return template.replace(tokenReg, function (word, slash1, token, slash2) {
    if (slash1 || slash2) {
      return word.replace('\\', '');
    }

    var variables = token.replace(/\s/g, '').split('.');
    var currentObject = context;
    var i, length, variable;

    for (i = 0, length = variables.length; i < length; ++i) {
      variable = variables[i];
      currentObject = currentObject[variable];
      if (currentObject === undefined || currentObject === null) return '';
    }
    return currentObject;
  });
}

module.exports = {
  randomStr,
  render,
  getDS
}