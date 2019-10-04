"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var aws_sdk_1 = __importDefault(require("aws-sdk"));
var s3events_1 = __importDefault(require("./s3events"));
var url_1 = __importDefault(require("url"));
exports.MAX_PUTOBJECT_SIZE = 5 * 1024 * 1024 * 1024;
exports.MAX_DELETE_COUNT = 1000;
exports.MAX_MULTIPART_COUNT = 10000;
exports.MIN_MULTIPART_SIZE = 5 * 1024 * 1024;
exports.createClient = function (options) {
    return new Client(options);
};
function sleep(delay) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
        });
    });
}
var Client = /** @class */ (function () {
    function Client(options) {
        options = options || {};
        this.s3 = options.s3Client || new aws_sdk_1.default.S3(options.s3Options);
        this.maxAsyncS3 = options.maxAsyncS3 || 20;
        this.s3RetryCount = options.s3RetryCount || 3;
        this.s3RetryDelay = options.s3RetryDelay || 1000;
        this.multipartUploadThreshold = options.multipartUploadThreshold || (20 * 1024 * 1024);
        this.multipartUploadSize = options.multipartUploadSize || (15 * 1024 * 1024);
        this.multipartDownloadThreshold = options.multipartDownloadThreshold || (20 * 1024 * 1024);
        this.multipartDownloadSize = options.multipartDownloadSize || (15 * 1024 * 1024);
        if (this.multipartUploadThreshold < exports.MIN_MULTIPART_SIZE) {
            throw new Error('Minimum multipartUploadThreshold is 5MB.');
        }
        if (this.multipartUploadThreshold > exports.MAX_PUTOBJECT_SIZE) {
            throw new Error('Maximum multipartUploadThreshold is 5GB.');
        }
        if (this.multipartUploadSize < exports.MIN_MULTIPART_SIZE) {
            throw new Error('Minimum multipartUploadSize is 5MB.');
        }
        if (this.multipartUploadSize > exports.MAX_PUTOBJECT_SIZE) {
            throw new Error('Maximum multipartUploadSize is 5GB.');
        }
    }
    Client.prototype.deleteObjects = function (s3Params) {
        return __awaiter(this, void 0, void 0, function () {
            function uploadSlice(slice) {
                return __awaiter(this, void 0, void 0, function () {
                    function tryDeletingObjects() {
                        params.Delete.Objects = slice;
                        return self.s3.deleteObjects(params).promise();
                    }
                    var data;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, doWithRetry(tryDeletingObjects, self.s3RetryCount, self.s3RetryDelay)];
                            case 1:
                                data = _a.sent();
                                ee.progressAmount += slice.length;
                                ee.emit('progress');
                                ee.emit('data', data);
                                return [2 /*return*/];
                        }
                    });
                });
            }
            var self, ee, params, slices;
            return __generator(this, function (_a) {
                self = this;
                ee = new s3events_1.default();
                params = {
                    Bucket: s3Params.Bucket,
                    Delete: extend({}, s3Params.Delete),
                    MFA: s3Params.MFA
                };
                slices = chunkArray(params.Delete.Objects, exports.MAX_DELETE_COUNT);
                ee.progressAmount = 0;
                ee.progressTotal = params.Delete.Objects.length;
                Promise.all(slices.map(uploadSlice))
                    .then(function () { return ee.emit('end'); })
                    .catch(function (err) { return ee.emit('error', err); });
                return [2 /*return*/, ee];
            });
        });
    };
    return Client;
}());
exports.Client = Client;
function doWithRetry(fn, tryCount, delay) {
    return __awaiter(this, void 0, void 0, function () {
        var tryIndex, result, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    tryIndex = 0;
                    result = null;
                    _a.label = 1;
                case 1:
                    if (!(tryIndex < tryCount)) return [3 /*break*/, 7];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, fn()];
                case 3:
                    result = _a.sent();
                    return [3 /*break*/, 7];
                case 4:
                    err_1 = _a.sent();
                    if (err_1.retryable === false) {
                        throw err_1;
                    }
                    if (tryIndex === (tryCount - 1)) {
                        throw err_1;
                    }
                    return [4 /*yield*/, sleep(delay)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 6:
                    tryIndex++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/, result];
            }
        });
    });
}
function extend(target, source) {
    for (var propName in source) {
        target[propName] = source[propName];
    }
    return target;
}
function chunkArray(array, maxLength) {
    var slices = [array];
    while (slices[slices.length - 1].length > maxLength) {
        slices.push(slices[slices.length - 1].splice(maxLength));
    }
    return slices;
}
function encodeSpecialCharacters(filename) {
    // Note: these characters are valid in URIs, but S3 does not like them for
    // some reason.
    return encodeURI(filename).replace(/[!'()* ]/g, function (char) {
        return '%' + char.charCodeAt(0).toString(16);
    });
}
function getPublicUrl(bucket, key, bucketLocation, endpoint) {
    var nonStandardBucketLocation = (bucketLocation && bucketLocation !== 'us-east-1');
    var hostnamePrefix = nonStandardBucketLocation ? ('s3-' + bucketLocation) : 's3';
    var parts = {
        protocol: 'https:',
        hostname: hostnamePrefix + '.' + (endpoint || 'amazonaws.com'),
        pathname: '/' + bucket + '/' + encodeSpecialCharacters(key)
    };
    return url_1.default.format(parts);
}
exports.getPublicUrl = getPublicUrl;
function getPublicUrlHttp(bucket, key, endpoint) {
    var parts = {
        protocol: 'http:',
        hostname: bucket + '.' + (endpoint || 's3.amazonaws.com'),
        pathname: '/' + encodeSpecialCharacters(key)
    };
    return url_1.default.format(parts);
}
exports.getPublicUrlHttp = getPublicUrlHttp;
