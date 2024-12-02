const pino = require('pino');
const NodeCache = require("node-cache");
const { http, webhook } = require('./utils/http');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const roleIdCache = new NodeCache({ stdTTL: 60 * 60 * 24 * 365 });
const cardCache = new NodeCache({ stdTTL: 60 * 60 * 24 });

const { HEADERS, FETCH_ROLE_ID, FETCH_ROLE_INDEX, GAME_ID, COLOR } = require('./utils/routes')
const { getDS } = require('./utils/index');
const userAgents = require('user-agents');
const randomUserAgent = new userAgents({ deviceCategory: 'desktop' }).toString(); // this will break if hoyolab starts to tie tokens to user agents

const headers = {
  ...HEADERS,
  "User-Agent": randomUserAgent,
}

const getRoleInfo = (game, uid) => {
  const key = `__uid__${uid}__game__${game}`

  return new Promise((resolve, reject) => {
    let cachedData = roleIdCache.get(key)
    if (cachedData) {
      const { game_role_id, nickname, region, region_name } = cachedData
      logger.info('从缓存中获取角色信息, uid %s, game_role_id %s, nickname %s, region %s, region_name %s', uid, game_role_id, nickname, region, region_name)
      webhook("User Data From Cache", `UID = ${uid}\nGame Role ID = ${game_role_id}\nNickname = ${nickname}\nRegion = ${region}\nRegion Name = ${region_name}\nKey = ${key}`, COLOR.Yellow)
      resolve(cachedData)
    } else {
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
              webhook("User Data Not Found", `UID = ${uid}`, COLOR.Yellow)
              reject('無角色數據，請檢查輸入的米哈遊通行證ID是否有誤（非遊戲內的UID）和是否設置了公開角色信息，若操作無誤則可能是被米哈遊屏蔽，請第二天再試')
            }

            const { game_role_id, nickname, region, region_name } = roleInfo

            logger.info('首次获取角色信息, uid %s, game_role_id %s, nickname %s, region %s, region_name %s', uid, game_role_id, nickname, region, region_name)
            webhook("First Time Get RoleInfo", `UID = ${uid}\nGAME_ROLE_ID = ${game_role_id}\nNICKNAME = ${nickname}\nREGION = ${region}\nREGION_NAME = ${region_name}`, COLOR.Green)
            
            roleIdCache.set(key, roleInfo)
            resolve(roleInfo)
          } else {
            logger.warn('無角色數據, uid %s', uid)
            webhook("User Data Not Found", `UID = ${uid}`, COLOR.Yellow)
            reject('無角色數據，請檢查輸入的米哈遊通行證ID是否有誤（非遊戲內的UID）和是否設置了公開角色信息，若操作無誤則可能是被米哈遊屏蔽，請第二天再試')
          }
        } else {
          logger.error('取得角色ID介面報錯 %s', resp.message)
          webhook("GET ROLE_INFO ERROR", resp.message, COLOR.Red)
          reject(resp.message)
        }
      })
      .catch(err => {
        logger.error('取得角色ID介面請求報錯 %o', err)
        webhook("GET ROLE_INFO ERROR", resp.message, COLOR.Red)
      })
    }
  })
}

const userInfo = (game, uid, detail=false) => {
  const key = `__game__${game}__uid__${uid}_${detail ? 'detail' : 'lite'}`

  return new Promise((resolve, reject) => { let cachedBody = cardCache.get(key)
    if (cachedBody) {
      if(cachedBody.retcode === 10101){
        reject(cachedBody.message)
      } else {
        logger.info('Retrieved user info from cache %s', key)
        webhook("User Data From Cache", `UID = ${uid}\nGame Role ID = ${cachedBody.uid}\nNickname = ${cachedBody.nickname}\nRegion = ${cachedBody.region}\nRegion Name = ${cachedBody.region_name}\nKey = ${key}`, COLOR.Yellow)
        resolve(cachedBody)
      }
      return
    } else {
    getRoleInfo(game, uid)
      .then(roleInfo => {
        const { game_role_id, region } = roleInfo
        const qs = { role_id: game_role_id, server: region }
        if (game === "hsr" || game === "hi3") {
          const hsr = ["active_days", "avatar_number", "achievement_number", "chest_count"]
          const hi3 = ["active_days", "battlesuits_owned", "outfits", "q_manifold"]
          const parsed = roleInfo.data.reduce((obj, item, index) => {
            obj[game === "hsr" ? hsr[index] : hi3[index]] = item.value;
            return obj;
          }, {});
          const data = {
            uid: game_role_id,
            ...parsed,
            ...roleInfo
          };
          cardCache.set(key, data)
          resolve(data);
        } 
        else{
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
                      cardCache.set(key, data)
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
                      cardCache.set(key, data)
                      resolve(data)
                    }
                    break;
                  case 'zzz':
                    if (detail){
                      const { commemorative_coins_list } = resp.data.stats
                      const commemorative_coins = commemorative_coins_list[0].num
                      const data = {
                        uid: game_role_id,
                        commemorative_coins,
                        ...resp.data.stats,
                        ...roleInfo
                      }
                      cardCache.set(key, data)
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
                      cardCache.set(key, data)
                      resolve(data)
                    }
                    break;
                }
              } else {
                logger.error('取得角色詳情介面報錯 %s', JSON.stringify(resp))
                webhook("GET USER_INFO ERROR", JSON.stringify(resp), COLOR.Red)
                cardCache.set(key, resp)
                reject(resp.message)
              }
            })
            .catch(err => {
              logger.warn(err)
              webhook("RANDOM ERROR", JSON.stringify(err), COLOR.Yellow)
              reject(err)
            })
        }
      })
      .catch(err => {
        logger.warn(err)
        webhook("RANDOM ERROR", JSON.stringify(err), COLOR.Yellow)
        reject(err)
      })
    }
  })
}

module.exports.getRoleInfo = getRoleInfo
module.exports.userInfo = userInfo