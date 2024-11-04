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

const SKIN_URL = 'https://raw.githubusercontent.com/qhy040404/hoyo-card-assets/refs/heads/main'

const SKIN_LEN = {
    'hi3' : 1,
    'gi' : 83,
    'hsr' : 6,
    'zzz' : 1
}

const BASE_GLYPH = {
    'hi3': ``,
    'gi': `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890 "!\`?'.,;:()[]{}<>|/@\\^$-%+=#_&~*活躍天數成就達成角色數量深境螺旋世界探索`,
    'hsr': ``,
    'zzz': `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890 "!\`?'.,;:()[]{}<>|/@\\^$-%+=#_&~*活躍天數成就達成查協會紀念幣代理人數量邦布數量調式輿防衛戰世界探索`,
}

module.exports = {
    FETCH_ROLE_ID,
    FETCH_ROLE_INDEX,
    GAME_ID,
    SKIN_URL,
    SKIN_LEN,
    BASE_GLYPH
}