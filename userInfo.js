const pino = require('pino');
const NodeCache = require("node-cache")
const http = require('./utils/http')
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const { HEADERS, FETCH_ROLE_ID, FETCH_ROLE_INDEX, GAME_ID } = require('./utils/routes')
const { getDS } = require('./utils/index');
const roleIdCache = new NodeCache({ stdTTL: 60 * 60 * 24 * 365 });
const userAgents = require('user-agents');
const randomUserAgent = new userAgents({ deviceCategory: 'desktop' }).toString(); // this will break if hoyolab starts to tie tokens to user agents

const headers = {
  ...HEADERS,
  "User-Agent": randomUserAgent,
}

const getRoleInfo = (game, uid) => {
  const key = `__uid__${uid}`

  return new Promise((resolve, reject) => {
    const qs = { uid }
    http({
      method: "GET",
      url: FETCH_ROLE_ID,
      qs,
      headers: {
        ...headers,
        "Cookie": `${process.env.HOYOLAB_TOKENV2 == "true" ? "ltoken_v2" : "ltoken"}=${process.env.HOYOLAB_TOKEN};${process.env.HOYOLAB_TOKENV2 == "true" ? "ltuid_v2" : "ltuid"}=${process.env.HOYOLAB_ID};`, // HoYoLAB only cares about the LToken and LTUID cookies
        'DS': getDS(qs),
      }
    })
      .then(resp => {
        resp = JSON.parse(resp)
        if (resp.retcode === 0) {
          if (resp.data.list && resp.data.list.length > 0) {
            const roleInfo = resp.data.list.find(_ => _.game_id === GAME_ID[game])

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

const userInfo = (game, uid, detail=false) => {
  return new Promise((resolve, reject) => {
    getRoleInfo(game, uid)
      .then(roleInfo => {
        const { game_role_id, region } = roleInfo
        const qs = { role_id: game_role_id, server: region }
          http({
            method: "GET",
            url: FETCH_ROLE_INDEX[game],
            qs,
            headers: {
              ...headers,
              "Cookie": `${process.env.HOYOLAB_TOKENV2 == "true" ? "ltoken_v2" : "ltoken"}=${process.env.HOYOLAB_TOKEN};${process.env.HOYOLAB_TOKENV2 == "true" ? "ltuid_v2" : "ltuid"}=${process.env.HOYOLAB_ID};`, // HoYoLAB only cares about the LToken and LTUID cookies
              'DS': getDS(qs),
            }
          })
            .then(resp => {
              resp = JSON.parse(resp)
              if (resp.retcode === 0) {
                switch (game) {
                  case 'hi3':
                    break;
                  case 'gi':
                    if (detail){
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
                    } else{
                      const {active_day_number, avatar_number, achievement_number, spiral_abyss, role_combat} = resp.data.stats
                      const parsed = {
                        active_day_number: active_day_number,
                        achievement_number: achievement_number,
                        avatar_number: avatar_number,
                        spiral_abyss: spiral_abyss,
                        role_combat : role_combat
                      }
                      const data = {
                        uid: game_role_id,
                        ...parsed,
                        ...roleInfo
                      }
                      resolve(data)
                    }
                    break;
                  case 'hsr':
                    break;
                  case 'zzz':
                    if (detail){
                      const { commemorative_coins_list } = resp.data.stats
                      const commemorative_coins = commemorative_coins_list[0].num
                      // const { cat_notes_list } = resp.data
                      // const { num , total } = cat_notes_list.reduce((total, next)=> ({ num: total.num + next.num, total: total.total + next.total }), {num:0, total:0})
                      // const world_exploration = Math.round(num / total * 10000)/ 100
                      const data = {
                        uid: game_role_id,
                        // world_exploration,
                        commemorative_coins,
                        ...resp.data.stats,
                        ...roleInfo
                      }
                      resolve(data)
                    } else{
                      const { active_days, avatar_num, buddy_num, achievement_count} = resp.data.stats
                      const parsed = {
                        active_days: active_days,
                        achievement_count: achievement_count,
                        avatar_num: avatar_num,
                        buddy_num: buddy_num
                      }
                      const data = {
                        uid: game_role_id,
                        ...parsed,
                        ...roleInfo
                      }
                      resolve(data)
                    }
                }
              } else {
                logger.error('取得角色詳情介面報錯 %s', JSON.stringify(resp))
                reject(resp.message)
              }
            })
            .catch(err => {
              logger.warn(err)
              reject(err)
            })
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