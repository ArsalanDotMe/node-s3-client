/// <reference types="node" />
import { EventEmitter } from 'events';
export default class S3EventEmitter extends EventEmitter {
    progressAmount: number;
    progressTotal: number;
    objectsFound: undefined | number;
    dirsFound: undefined | number;
    constructor();
}
//# sourceMappingURL=s3events.d.ts.map