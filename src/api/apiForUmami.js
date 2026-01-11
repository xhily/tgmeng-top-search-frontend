import {request} from '@/utils/requestForUmami.js'
import {getCurrentTimestamp, getTodayStartTimestamp, getAllTimeStartTimestamp} from '@/utils/timeUtils.js'

export function umamiActive() {
    return request({
        url: '/api/websites/4cd4a3c4-926a-4562-80f2-74022dfc93ef/active',
        method: 'get',
    })
}

export function umamiStatsToday() {
    return request({
        url: '/api/websites/4cd4a3c4-926a-4562-80f2-74022dfc93ef/stats',
        method: 'get',
        params: {
            startAt: getTodayStartTimestamp(),
            endAt: getCurrentTimestamp(),
        },
    })
}

export function umamiStatsAll() {
    return request({
        url: '/api/websites/4cd4a3c4-926a-4562-80f2-74022dfc93ef/stats',
        method: 'get',
        params: {
            startAt: getAllTimeStartTimestamp(),
            endAt: getCurrentTimestamp(),
        },
    })
}

export function umamiEventValues(eventName, startTime, platform) {
    return request({
        url: '/api/websites/4cd4a3c4-926a-4562-80f2-74022dfc93ef/event-data/values',
        method: 'get',
        params: {
            event: eventName,
            propertyName: 'value',
            startAt: startTime,
            endAt: getCurrentTimestamp(),
            filters: "%5B%7B%22property%22%3A%22platForm%22%2C%22operator%22%3A%22eq%22%2C%22value%22%3A%22" + platform + "%22%7D%5D"
        },
    })
}

