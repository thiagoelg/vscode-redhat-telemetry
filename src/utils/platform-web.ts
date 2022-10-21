import { Environment } from '..';
import { env, UIKind, version } from 'vscode';
import { getCountry } from './geolocation';
import { Platform } from './platform';

async function getEnvironment(extensionId: string, extensionVersion:string): Promise<Environment> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
        extension: {
            name: extensionId,
            version: extensionVersion,
        },
        application: {
            name: env.appName,
            version: version,
            uiKind: getUIKind(),
            remote: env.remoteName !== undefined
        },
        platform:{
            name: 'Browser',
            version: typeof navigator !== 'undefined' ? navigator.appVersion : '',
            distribution: "web"
        },
        timezone: timezone,
        locale: env.language,
        country: getCountry(timezone),
        username: ''
    };
}
function getUIKind(): string {
    switch (env.uiKind) {
        case UIKind.Desktop:
            return 'Desktop';
        case UIKind.Web:
            return 'Web';
        default:
            return 'Unknown';
    }
}

export const PlatformWeb: Platform = {
    getEnvironment
}

