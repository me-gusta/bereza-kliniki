import express from 'express'

const router = express.Router()

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
const TELEGRAM_CHAT_IDS = process.env.TELEGRAM_CHAT_IDS.split(',').map(el=>parseInt(el))

async function sendTelegram(text, chatId) {
    const api = `https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_TOKEN)}/sendMessage`
    const body = new URLSearchParams({
        chat_id: String(chatId),
        text,
        parse_mode: 'HTML'
    })

    const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body
    })

    const json = await res.json()
    if (!json.ok) {
        const errText = json.description || 'Telegram sendMessage failed'
        throw new Error(errText)
    }
    return json
}

router.get('/hello', express.json(), async (req, res) => {
    return res.json({ status: 'ok' })
})

router.post('/callback', express.json(), async (req, res) => {
    return res.json({ status: 'ok' })

    try {
        const data = req.body
        const name = data?.name
        const phone = data?.phone
        const message = data?.message

        if (!(phone)) {
            throw new Error('Нет телефона')
        }

        let text =
            '<b>Сообщение с сайта "Клиники наркологии и психиатрии</b>"\n\n' +
            `<u>Имя</u>: ${name ?? ''}\n` +
            `<u>Телефон</u>: <pre>${phone ?? ''}</pre>`

        if (message) {
            text += `\n<u>Сообщение</u>: ${message}`
        }

        text += '\n\n\n<em>Скопировать телефон можно долгим нажатием на него</em>'

        // Send to all chat IDs in parallel; collect outcomes
        const results = await Promise.allSettled(
            TELEGRAM_CHAT_IDS.map(id => sendTelegram(text, id))
        )

        // Optionally log per-chat failures without breaking the response
        results.forEach((r, idx) => {
            if (r.status === 'rejected') {
                console.error(`Telegram send failed for chat ${TELEGRAM_CHAT_IDS[idx]}:`, r.reason)
            }
        })

        // If at least one send succeeded, return ok; otherwise error
        const anySuccess = results.some(r => r.status === 'fulfilled')
        if (anySuccess) {
            return res.json({ status: 'ok' })
        } else {
            return res.json({ status: 'error' })
        }
    } catch (e) {
        console.error('Error while sending telegram', e)
        return res.json({ status: 'error' })
    }
})

export default router
