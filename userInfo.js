const pino = require('pino');
const NodeCache = require("node-cache")
const http = require('./utils/http')
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const index = require('./utils/index');
const roleIdCache = new NodeCache({ stdTTL: 60 * 60 * 24 * 365 });
const userAgents = require('user-agents');
const randomUserAgent = new userAgents({ deviceCategory: 'desktop' }).toString(); // this will break if hoyolab starts to tie tokens to user agents

const __API = {
  FETCH_ROLE_ID: 'https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard',
  FETCH_ROLE_INDEX: {
    'hi3' : 'https://bbs-api-os.hoyolab.com/game_record/honkai3rd/api/index', 
    'gi' : 'https://bbs-api-os.hoyolab.com/game_record/genshin/api/index',
    'hsr' : 'https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/index',
    'zzz' : 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/index'
  }
}

const getRoleInfo = (uid) => {
  const key = `__uid__${uid}`

  return new Promise((resolve, reject) => {

    http({
      method: "GET",
      url: __API.FETCH_ROLE_ID + `?uid=${uid}`,
      headers: {
        "User-Agent": randomUserAgent,
        "Accept": "application/json, text/plain, */*",
        "x-rpc-language": "en-us",
        'x-rpc-client_type': 5,
        'x-rpc-app_version': '1.5.0',
        'DS': index.getDS(""),
        "Cookie": `${process.env.HOYOLAB_TOKENV2 == "true" ? "ltoken_v2" : "ltoken"}=${process.env.HOYOLAB_TOKEN};${process.env.HOYOLAB_TOKENV2 == "true" ? "ltuid_v2" : "ltuid"}=${process.env.HOYOLAB_ID};` // HoYoLAB only cares about the LToken and LTUID cookies
      }
    })
      .then(resp => {
        resp = JSON.parse(resp)
        console.log(resp)
        if (resp.retcode === 0) {
          if (resp.data.list && resp.data.list.length > 0) {
            const roleInfo = resp.data.list.find(_ => _.game_id === 2)

            if (!roleInfo) {
              logger.warn('無角色數據, uid %s', uid)
              reject('無角色數據，請檢查輸入的米哈遊通行證ID是否有誤（非遊戲內的UID）和是否設置了公開角色信息，若操作無誤則可能是被米哈遊屏蔽，請第二天再試')
            }

            const { game_role_id, nickname, region, region_name } = roleInfo

            logger.info('首次获取角色信息, uid %s, game_role_id %s, nickname %s, region %s, region_name %s', uid, game_role_id, nickname, region, region_name)

            roleIdCache.set(key, roleInfo)

            resolve(roleInfo)
          } else {
            logger.warn('無角色數據, uid %s', uid)
            reject('無角色數據，請檢查輸入的米哈遊通行證ID是否有誤（非遊戲內的UID）和是否設置了公開角色信息，若操作無誤則可能是被米哈遊屏蔽，請第二天再試')
          }
        } else {
          logger.error('取得角色ID介面報錯 %s', resp.message)
          reject(resp.message)
        }
      })
      .catch(err => {
        logger.error('取得角色ID介面請求報錯 %o', err)
      })
    }
  )
}

const userInfo = (game ,uid, detail=false) => {
  return new Promise((resolve, reject) => {
    console.log(game, uid, detail)
    getRoleInfo(uid)
      .then(roleInfo => {
        const { game_role_id, region } = roleInfo
        if (detail) {
          http({
            method: "GET",
            url: __API.FETCH_ROLE_INDEX[game] + `?role_id=${game_role_id}&server=${region}`,
            headers: {
              "User-Agent": randomUserAgent,
              "Accept": "application/json, text/plain, */*",
              "x-rpc-language": "en-us",
              "Cookie": `${process.env.HOYOLAB_TOKENV2 == "true" ? "ltoken_v2" : "ltoken"}=${process.env.HOYOLAB_TOKEN};${process.env.HOYOLAB_TOKENV2 == "true" ? "ltuid_v2" : "ltuid"}=${process.env.HOYOLAB_ID};` // HoYoLAB only cares about the LToken and LTUID cookies
            }
          })
            .then(resp => {
              resp = JSON.parse(resp)
              console.log(resp)
              if (resp.retcode === 0) {
                const { world_explorations } = resp.data
                const percentage = Math.min((world_explorations.reduce((total, next) => total + next.exploration_percentage, 0) / world_explorations.length / 10000 * 1000).toFixed(1), 100)
                const world_exploration = percentage

                const data = {
                  uid: game_role_id,
                  world_exploration,
                  ...resp.data.stats,
                  ...roleInfo
                }
                resolve(data)

              } else {
                logger.error('取得角色詳情介面報錯 %s', JSON.stringify(resp))
                reject(resp.message)
              }
            })
            .catch(err => {
              logger.warn(err)
              reject(err)
            })
        } else {
          const [active_day_number, avatar_number, achievement_number, spiral_abyss] = roleInfo.data

          const parsed = {
            active_day_number: active_day_number.value,
            avatar_number: avatar_number.value,
            achievement_number: achievement_number.value,
            spiral_abyss: spiral_abyss.value
          }

          const data = {
            uid: game_role_id,
            ...parsed,
            ...roleInfo
          }
          resolve(data)
        }
      })
      .catch(err => {
        logger.warn(err)
        reject(err)
      })
    }
  )
}

module.exports.getRoleInfo = getRoleInfo
module.exports.userInfo = userInfo