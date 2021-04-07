/**
 * WoT Adapter.ts 
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

import { AddonManagerProxy } from "gateway-addon/lib/addon-manager-proxy";
import manifest from '../manifest.json';
import * as crypto from "crypto";

function getHeaders(authentication: any, includeContentType: boolean = false) {
    const headers: any = {
        Accept: 'application/json',
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }

    switch (authentication.method) {
        case 'jwt':
            headers.Authorization = `Bearer ${authentication.token}`;
            break;
        case 'basic':
        case 'digest':
        default:
            // not implemented
            break;
    }

    return headers;
}

class WoTAdapter extends Adapter {
    // TODO: specify exact types for `any`

    private readonly knownUrls: any;
    private readonly savedDevices: Set<any>;

    constructor(manager:AddonManagerProxy) {
        super(manager, manifest.id, manifest.id);
        this.knownUrls = {};
        this.savedDevices = new Set();
    }

    async loadThing(url: {href: string, authentication: any}, retryCounter: number = 0) {
         //TODO: See https://github.com/WebThingsIO/thing-url-adapter/blob/master/thing-url-adapter.js#L544

        const href = url.href.replace(/\/$/, '');

        if (!this.knownUrls[href]) {
            this.knownUrls[href] = {
                href,
                authentication: url.authentication,
                digest: '',
                timestamp: 0,
            };
        }

        if (this.knownUrls[href].timestamp + 5000 > Date.now()) {
            return;
        }

        let res;
        try {
            res = await fetch(href, {headers: getHeaders(url.authentication)});
        } catch (e) {
            // Retry the connection at a 2 second interval up to 5 times.
            if (retryCounter >= 5) {
                console.log(`Failed to connect to ${href}: ${e}`);
            } else {
                setTimeout(() => this.loadThing(url, retryCounter + 1), 2000);
            }

            return;
        }

        const text = await res.text();

        const hash = crypto.createHash('md5');
        hash.update(text);
        const dig = hash.digest('hex');
        let known = false;
        if (this.knownUrls[href].digest === dig) {
            known = true;
        }

        this.knownUrls[href] = {
            href,
            authentication: url.authentication,
            digest: dig,
            timestamp: Date.now(),
        };

        let thing;
        try {
            thing = JSON.parse(text);
        } catch (e) {
            console.log(`Failed to parse description at ${href}: ${e}`);
            return;
        }

        // TODO: Since we are using original URL as fallback to identify Things
        //  we can match it with one Thing only
        if (Array.isArray(thing)) {
            console.error('Only one Thing at a time is currently supported for loading');
        }

        const id = (thing.id) ? thing.id: href;

        // TODO: Do we need this replacement?
        // const id = thingUrl.replace(/[:/]/g, '-');

        if (id in this.getDevices() && !known) {
            // TODO: Uncomment after implementing
            // await this.removeThing(this.getDevices()[id], true);
        }

        // TODO: Uncomment after implementing (change the arguments as well)
        // await this.addDevice(
        //     id,
        //     thingUrl,
        //     url.authentication,
        //     thingDescription,
        //     href
        // );
    }

    unloadThing(url:string){
        //TODO: See https://github.com/WebThingsIO/thing-url-adapter/blob/master/thing-url-adapter.js#L635
    }
}


export default function loadWoTAdapter(manager:AddonManagerProxy) {
    //TODO: See https://github.com/WebThingsIO/thing-url-adapter/blob/master/thing-url-adapter.js#L844
}