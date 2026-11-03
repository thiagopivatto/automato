/**
 * Aplica patch Android do Baileys (PR #2201) em validate-connection.js.
 * Sem isso, browser:['Ubuntu','Android','13'] NÃO muda o UserAgent (continua WEB)
 * e visualização única chega como stub "Message absent from node".
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const root = path.resolve(path.dirname(__filename), '..')
const target = path.join(
    root,
    'node_modules',
    '@whiskeysockets',
    'baileys',
    'lib',
    'Utils',
    'validate-connection.js'
)

export function patchBaileysAndroid() {
    if (!fs.existsSync(target)) {
        return { ok: false, reason: 'missing' }
    }

    let src = fs.readFileSync(target, 'utf8')
    if (src.includes('isAndroidBrowser') && src.includes('Platform.ANDROID')) {
        return { ok: true, reason: 'already' }
    }

    if (!src.includes('platform: proto.ClientPayload.UserAgent.Platform.WEB')) {
        return { ok: false, reason: 'unexpected' }
    }

    src = src.replace(
        `const getUserAgent = (config) => {
    return {
        appVersion: {
            primary: config.version[0],
            secondary: config.version[1],
            tertiary: config.version[2]
        },
        platform: proto.ClientPayload.UserAgent.Platform.WEB,
        releaseChannel: proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        osVersion: '0.1',
        device: 'Desktop',
        osBuildNumber: '0.1',
        localeLanguageIso6391: 'en',
        mnc: '000',
        mcc: '000',
        localeCountryIso31661Alpha2: config.countryCode
    };
};`,
        `const isAndroidBrowser = (config) =>
    String(config?.browser?.[1] || '').toLowerCase().includes('android');
const getUserAgent = (config) => {
    return {
        appVersion: {
            primary: config.version[0],
            secondary: config.version[1],
            tertiary: config.version[2]
        },
        platform: isAndroidBrowser(config)
            ? proto.ClientPayload.UserAgent.Platform.ANDROID
            : proto.ClientPayload.UserAgent.Platform.WEB,
        releaseChannel: proto.ClientPayload.UserAgent.ReleaseChannel.RELEASE,
        osVersion: '0.1',
        device: isAndroidBrowser(config) ? 'Android' : 'Desktop',
        osBuildNumber: '0.1',
        localeLanguageIso6391: 'en',
        mnc: '000',
        mcc: '000',
        localeCountryIso31661Alpha2: config.countryCode
    };
};`
    )

    src = src.replace(
        `const getClientPayload = (config) => {
    const payload = {
        connectType: proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
        connectReason: proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent: getUserAgent(config)
    };
    payload.webInfo = getWebInfo(config);
    return payload;
};`,
        `const getClientPayload = (config) => {
    const payload = {
        connectType: proto.ClientPayload.ConnectType.WIFI_UNKNOWN,
        connectReason: proto.ClientPayload.ConnectReason.USER_ACTIVATED,
        userAgent: getUserAgent(config)
    };
    if (!isAndroidBrowser(config)) {
        payload.webInfo = getWebInfo(config);
    }
    return payload;
};`
    )

    src = src.replace(
        `const getPlatformType = (platform) => {
    const platformType = platform.toUpperCase();
    return (proto.DeviceProps.PlatformType[platformType] ||
        proto.DeviceProps.PlatformType.DESKTOP);
};`,
        `const getPlatformType = (platform) => {
    const platformType = platform.toUpperCase();
    if (platformType === 'ANDROID') {
        return proto.DeviceProps.PlatformType.ANDROID_PHONE
            || proto.DeviceProps.PlatformType.ANDROID
            || proto.DeviceProps.PlatformType.DESKTOP;
    }
    return (proto.DeviceProps.PlatformType[platformType] ||
        proto.DeviceProps.PlatformType.DESKTOP);
};`
    )

    if (!src.includes('isAndroidBrowser')) {
        return { ok: false, reason: 'failed' }
    }

    fs.writeFileSync(target, src)
    return { ok: true, reason: 'patched' }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)
if (isMain) {
    const r = patchBaileysAndroid()
    console.log(`[patch-baileys] ${r.reason}`)
    process.exit(r.ok || r.reason === 'already' ? 0 : 1)
}
