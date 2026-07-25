import { translate } from '@vitalets/google-translate-api'

const MAPA = {
    pt: 'pt',
    por: 'pt',
    en: 'en',
    eng: 'en',
    es: 'es',
    spa: 'es',
    ja: 'ja',
    jpn: 'ja',
    it: 'it',
    ita: 'it',
    ru: 'ru',
    rus: 'ru',
    ko: 'ko',
    kor: 'ko',
    sv: 'sv',
    fr: 'fr',
    fra: 'fr',
    de: 'de',
    deu: 'de',
    zh: 'zh',
    zho: 'zh',
    ar: 'ar',
    ara: 'ar',
    hi: 'hi',
    hin: 'hi'
}

/** Detecta idioma do texto (fallback pt). */
export async function detectarIdioma(texto) {
    const t = String(texto || '').trim()
    if (!t) return 'pt'
    try {
        const r = await translate(t.slice(0, 400), { to: 'en' })
        const src = String(r?.raw?.src || r?.from?.language?.iso || '').toLowerCase()
        return MAPA[src] || 'pt'
    } catch {
        // Heurística rápida
        if (/[ぁ-んァ-ン一-龯]/.test(t)) return /[ぁ-んァ-ン]/.test(t) ? 'ja' : 'zh'
        if (/[가-힣]/.test(t)) return 'ko'
        if (/[а-яА-ЯЁё]/.test(t)) return 'ru'
        if (/[àáâãéêíóôõúç]/i.test(t) || /\b(você|não|também|olá)\b/i.test(t)) return 'pt'
        return 'pt'
    }
}
