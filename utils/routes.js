const HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "x-rpc-language": "zh-tw",
    'x-rpc-app_version': '2.40.1',
    'x-rpc-client_type': 5
}

const FETCH_ROLE_ID = 'https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard'

const FETCH_ROLE_INDEX = {
    'hi3' : 'https://bbs-api-os.hoyolab.com/game_record/honkai3rd/api/index', 
    'gi' : 'https://bbs-api-os.hoyolab.com/game_record/genshin/api/index',
    'hsr' : 'https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/index',
    'zzz' : 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/index'
}

const GAME_ID = {
    'hi3': 1,
    'gi': 2,
    'hsr': 6,
    'zzz': 8
}

const COLOR = {
    "White": 16777215,
    "Greyple": 10070709,
    "Black": 2303786,
    "DarkButNotBlack": 2895667,
    "NotQuiteBlack": 2303786,
    "Blurple": 5793266,
    "Green": 5763719,
    "Yellow":	16705372,
    "Fuchsia": 15418782,
    "Red": 15548997,
}

const SKIN_URL = 'https://raw.githubusercontent.com/qhy040404/hoyo-card-assets/refs/heads/main'

const SKIN_LEN = {
    'hi3' : 1,
    'gi' : 83,
    'hsr' : 6,
    'zzz' : 1
}

const BASE_GLYPH = {
    'hi3': ``,
    'gi': `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890 "!\`?'.,;:()[]{}<>|/@\\^$-%+=#_&~*活躍天數角色數量成就達成深境螺旋幻想真境劇詩世界探索`,
    'hsr': `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890 "!\`?'.,;:()[]{}<>|/@\\^$-%+=#_&~*活躍天數成就達成角色數量戰利品數量`,
    'zzz': `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890 "!\`?'.,;:()[]{}<>|/@\\^$-%+=#_&~*活躍天數成就達成查協會紀念幣代理人數量邦布數量調式輿防衛戰世界探索`,
}

module.exports = {
    HEADERS,
    FETCH_ROLE_ID,
    FETCH_ROLE_INDEX,
    GAME_ID,
    COLOR,
    SKIN_URL,
    SKIN_LEN,
    BASE_GLYPH
}