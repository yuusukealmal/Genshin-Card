const request = require('request')
const { format } = require('date-fns')

function http(options) {
  return new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) {
        reject(error)
      }
      resolve(body)

    })
  })
  .catch(error => console.error(error))
}

const webhook = (title, msg, color) =>
  http({
      method:"POST",
      url: process.env.WEBHOOK,
      json: {
          "embeds": [
              {
                  "title": title,
                  "description": "```" + msg + "```",
                  "color": color,
                  "timestamp": format(new Date().setHours(+8), 'yyyy-MM-dd HH:mm:ss')
              }
          ]
      },
      headers: {
          "Content-Type": "application/json"
      }
  })

module.exports = {
  http,
  webhook
}