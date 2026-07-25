import axios from 'axios'
import { rapidKey, rapidHeaders, exigirRapidKey } from './rapidapi.js'

/**
 * Localização via IP (APIs públicas + RapidAPI).
 * WhatsApp não expõe IP do peer; se houver IP (args/whois), geo real; senão DDD.
 */

function mapsLink(lat, lon, label = '') {
    return `https://www.google.com/maps?q=${lat},${lon}${
        label ? `&query=${encodeURIComponent(label)}` : ''
    }`
}

const IPV4_RE =
    /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g

export function extrairIp(texto) {
    const m = String(texto || '').match(IPV4_RE)
    if (!m?.length) return ''
    return (
        m.find((ip) => !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|255\.)/.test(ip)) ||
        m[0]
    )
}

function parseGeoPayload(data) {
    if (!data || typeof data !== 'object') return null
    const root = data.data || data.result || data.location || data
    const lat = Number(
        root.latitude ?? root.lat ?? root.Latitude ?? root.loc?.split?.(',')?.[0]
    )
    const lon = Number(
        root.longitude ?? root.lon ?? root.lng ?? root.Longitude ?? root.loc?.split?.(',')?.[1]
    )
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    const cidade =
        root.city || root.cidade || root.town || root.regionName || root.region || ''
    const pais = root.country || root.pais || root.country_name || root.countryName || ''
    const regiao = root.region || root.state || root.regionName || root.region_name || ''
    const isp = root.isp || root.org || root.as || root.asn || root.connection?.isp || ''
    const ip = root.ip || root.query || root.ipAddress || ''
    return {
        lat,
        lon,
        cidade: String(cidade),
        pais: String(pais),
        regiao: String(regiao),
        isp: String(isp),
        ip: String(ip),
        maps: mapsLink(lat, lon, [cidade, regiao, pais].filter(Boolean).join(', '))
    }
}

/** Geo por IP — RapidAPI ip-geo-location10. */
export async function geoPorIpRapid(ip) {
    exigirRapidKey()
    const { data, status } = await axios.get(
        `https://ip-geo-location10.p.rapidapi.com/ip?ip=${encodeURIComponent(ip)}`,
        {
            headers: rapidHeaders('ip-geo-location10.p.rapidapi.com'),
            timeout: 20000,
            validateStatus: () => true
        }
    )
    if (status === 403) throw { erro: 'Assine a API *ip-geo-location10* no RapidAPI (mesma RAPIDAPI_KEY).' }
    if (status >= 400) throw new Error(`geo rapid ${status}`)
    const geo = parseGeoPayload(data)
    if (!geo) throw new Error('geo rapid sem coordenadas')
    geo.ip = geo.ip || ip
    return geo
}

/** ip-api.com */
export async function geoPorIpFree(ip) {
    const { data, status } = await axios.get(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,lat,lon,isp,query`,
        { timeout: 15000, validateStatus: () => true }
    )
    if (status >= 400 || data?.status !== 'success') throw new Error(data?.message || 'ip-api falhou')
    return {
        lat: data.lat,
        lon: data.lon,
        cidade: data.city || '',
        pais: data.country || '',
        regiao: data.regionName || '',
        isp: data.isp || '',
        ip: data.query || ip,
        maps: mapsLink(data.lat, data.lon, [data.city, data.regionName, data.country].filter(Boolean).join(', '))
    }
}

/** ipwho.is (HTTPS, sem key) */
export async function geoPorIpWho(ip) {
    const { data, status } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        timeout: 15000,
        validateStatus: () => true
    })
    if (status >= 400 || data?.success === false) throw new Error(data?.message || 'ipwho falhou')
    return {
        lat: data.latitude,
        lon: data.longitude,
        cidade: data.city || '',
        pais: data.country || '',
        regiao: data.region || '',
        isp: data.connection?.isp || data.org || '',
        ip: data.ip || ip,
        maps: mapsLink(
            data.latitude,
            data.longitude,
            [data.city, data.region, data.country].filter(Boolean).join(', ')
        )
    }
}

/** ipinfo.io (token opcional via IPINFO_TOKEN) */
export async function geoPorIpInfo(ip) {
    const token = process.env.IPINFO_TOKEN?.trim()
    const url = token
        ? `https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`
        : `https://ipinfo.io/${encodeURIComponent(ip)}/json`
    const { data, status } = await axios.get(url, { timeout: 15000, validateStatus: () => true })
    if (status >= 400 || !data?.loc) throw new Error('ipinfo falhou')
    const [lat, lon] = String(data.loc).split(',').map(Number)
    return {
        lat,
        lon,
        cidade: data.city || '',
        pais: data.country || '',
        regiao: data.region || '',
        isp: data.org || '',
        ip: data.ip || ip,
        maps: mapsLink(lat, lon, [data.city, data.region, data.country].filter(Boolean).join(', '))
    }
}

export async function geoPorIp(ip) {
    const erros = []
    if (rapidKey()) {
        try {
            return { ...(await geoPorIpRapid(ip)), fonte: 'rapid-geo' }
        } catch (err) {
            erros.push(err?.erro || err.message)
        }
    }
    for (const [nome, fn] of [
        ['ipwho', geoPorIpWho],
        ['ip-api', geoPorIpFree],
        ['ipinfo', geoPorIpInfo]
    ]) {
        try {
            return { ...(await fn(ip)), fonte: nome }
        } catch (err) {
            erros.push(`${nome}:${err.message}`)
        }
    }
    throw new Error(erros.join(' | ') || 'geo IP falhou')
}

/**
 * Tenta obter IP via whois RapidAPI + hackertarget (domínio/IP).
 */
export async function obterIpViaWhois(query) {
    const q = String(query || '').trim()
    if (!q) throw new Error('query vazia')
    const jaIp = extrairIp(q)
    if (jaIp && /^\d+\.\d+\.\d+\.\d+$/.test(q.trim())) return jaIp

    if (rapidKey()) {
        exigirRapidKey()
        const tentativas = [
            `https://whois-lookup-service.p.rapidapi.com/whois?domain=${encodeURIComponent(q)}`,
            `https://whois-lookup-service.p.rapidapi.com/whois?query=${encodeURIComponent(q)}`,
            `https://whois-lookup-service.p.rapidapi.com/?domain=${encodeURIComponent(q)}`,
            `https://whois-lookup-service.p.rapidapi.com/lookup?query=${encodeURIComponent(q)}`
        ]
        let lastStatus = 0
        for (const url of tentativas) {
            try {
                const { data, status } = await axios.get(url, {
                    headers: rapidHeaders('whois-lookup-service.p.rapidapi.com'),
                    timeout: 20000,
                    validateStatus: () => true
                })
                lastStatus = status
                if (status === 403) {
                    throw { erro: 'Assine a API *whois-lookup-service* no RapidAPI (mesma RAPIDAPI_KEY).' }
                }
                if (status >= 400 || !data) continue
                const blob = typeof data === 'string' ? data : JSON.stringify(data)
                const publico = extrairIp(blob)
                if (publico) return publico
            } catch (err) {
                if (err?.erro) throw err
            }
        }
        if (lastStatus === 403) {
            throw { erro: 'Assine a API *whois-lookup-service* no RapidAPI (mesma RAPIDAPI_KEY).' }
        }
    }

    // hackertarget whois (só domínio/IP público, não telefone)
    if (/[a-zA-Z]/.test(q) || extrairIp(q)) {
        try {
            const { data } = await axios.get(
                `https://api.hackertarget.com/whois/?q=${encodeURIComponent(extrairIp(q) || q)}`,
                { timeout: 15000, responseType: 'text', validateStatus: () => true }
            )
            const publico = extrairIp(String(data || ''))
            if (publico) return publico
        } catch { /* ignore */ }
    }

    throw new Error('whois sem IP')
}

/** Heurística BR: DDD → cidade. */
const DDD_COORDS = {
    11: [-23.5505, -46.6333, 'São Paulo, SP'],
    21: [-22.9068, -43.1729, 'Rio de Janeiro, RJ'],
    31: [-19.9167, -43.9345, 'Belo Horizonte, MG'],
    41: [-25.4284, -49.2733, 'Curitiba, PR'],
    47: [-26.3045, -48.8487, 'Joinville, SC'],
    48: [-27.5954, -48.548, 'Florianópolis, SC'],
    51: [-30.0346, -51.2177, 'Porto Alegre, RS'],
    61: [-15.8267, -47.9218, 'Brasília, DF'],
    62: [-16.6869, -49.2648, 'Goiânia, GO'],
    71: [-12.9714, -38.5014, 'Salvador, BA'],
    81: [-8.0476, -34.877, 'Recife, PE'],
    85: [-3.7172, -38.5433, 'Fortaleza, CE'],
    91: [-1.4558, -48.4902, 'Belém, PA'],
    92: [-3.119, -60.0217, 'Manaus, AM']
}

export function geoPorTelefoneBr(jidOuNumero) {
    const digits = String(jidOuNumero || '').replace(/\D/g, '')
    let local = digits
    if (local.startsWith('55') && local.length >= 12) local = local.slice(2)
    const ddd = parseInt(local.slice(0, 2), 10)
    const hit = DDD_COORDS[ddd]
    if (!hit) {
        return {
            lat: -14.235,
            lon: -51.9253,
            cidade: 'Brasil',
            pais: 'Brasil',
            regiao: `DDD ${ddd || '?'}`,
            isp: 'estimativa por DDD',
            ip: '',
            maps: mapsLink(-14.235, -51.9253, 'Brasil'),
            aproximado: true
        }
    }
    const [lat, lon, label] = hit
    return {
        lat,
        lon,
        cidade: label.split(',')[0],
        pais: 'Brasil',
        regiao: label,
        isp: 'estimativa por DDD (WhatsApp não expõe IP do usuário)',
        ip: '',
        maps: mapsLink(lat, lon, label),
        aproximado: true
    }
}

/**
 * Fluxo: IP explícito → whois → geo APIs → DDD.
 */
export async function localizarAlvo({ ipHint, telefone, queryWhois, textoExtra } = {}) {
    let ip = ipHint || extrairIp(textoExtra) || ''
    const erros = []

    if (!ip && (queryWhois || telefone)) {
        try {
            ip = await obterIpViaWhois(queryWhois || telefone)
        } catch (err) {
            erros.push(err?.erro || err.message)
        }
    }

    if (ip) {
        try {
            const geo = await geoPorIp(ip)
            return { ...geo, ip: geo.ip || ip, avisos: erros }
        } catch (err) {
            erros.push(err.message)
        }
    }

    if (telefone) {
        return { ...geoPorTelefoneBr(telefone), fonte: 'ddd', avisos: erros }
    }

    throw {
        erro:
            erros.find((e) => /Assine a API/i.test(e)) ||
            'Não foi possível obter IP/localização. Envie um IP (`!local 8.8.8.8`) ou marque um número BR.'
    }
}
