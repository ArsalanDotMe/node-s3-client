"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var url_1 = __importDefault(require("url"));
var events_1 = require("events");
exports.MAX_PUTOBJECT_SIZE = 5 * 1024 * 1024 * 1024;
exports.MAX_DELETE_COUNT = 1000;
exports.MAX_MULTIPART_COUNT = 10000;
exports.MIN_MULTIPART_SIZE = 5 * 1024 * 1024;
function sleep(delay) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, delay); })];
        });
    });
}
exports.createClient = function (options) {
    return new Client(options);
};
var Client = /** @class */ (function () {
    function Client(options) {
        options = options || {};
        this.s3 = options.s3Client;
        if (!options.s3Client) {
            throw new Error('You need to pass in your own initialized s3Client');
        }
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
    Client.prototype.deleteObjects = function (s3Params, ee) {
        return __awaiter(this, void 0, void 0, function () {
            var params, slices, progressTotal;
            var _this = this;
            return __generator(this, function (_a) {
                params = {
                    Bucket: s3Params.Bucket,
                    Delete: __assign({}, s3Params.Delete),
                    MFA: s3Params.MFA
                };
                slices = chunkArray(params.Delete.Objects, exports.MAX_DELETE_COUNT);
                progressTotal = 0;
                return [2 /*return*/, Promise.all(slices.map(function (slice) { return __awaiter(_this, void 0, void 0, function () {
                        var data, progressAmount;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    params.Delete.Objects = slice;
                                    return [4 /*yield*/, this.s3.deleteObjects(params).promise()];
                                case 1:
                                    data = _a.sent();
                                    if (ee && data.Deleted) {
                                        progressAmount = data.Deleted.length;
                                        progressTotal += progressAmount;
                                        ee.emit('progress', { progressAmount: progressAmount, progressTotal: progressTotal });
                                    }
                                    ee && ee.emit('data', data);
                                    return [2 /*return*/, data];
                            }
                        });
                    }); }))];
            });
        });
    };
    Client.prototype.deleteDir = function (s3Params) {
        return __awaiter(this, void 0, void 0, function () {
            var bucket, listObjectsParams, ee, listObjectsPromise, deleteObjectPromises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bucket = s3Params.Bucket;
                        listObjectsParams = {
                            s3Params: {
                                Bucket: bucket,
                                Prefix: s3Params.Prefix
                            }
                        };
                        ee = new events_1.EventEmitter();
                        listObjectsPromise = this.listObjects(listObjectsParams, ee);
                        deleteObjectPromises = [];
                        ee.on('data', function (objects) {
                            var deleteParams = {
                                Bucket: s3Params.Bucket,
                                Delete: {
                                    Objects: objects.map(keyOnly),
                                    Quiet: true
                                },
                                MFA: s3Params.MFA
                            };
                            deleteObjectPromises.push(_this.s3.deleteObjects(deleteParams).promise());
                        });
                        return [4 /*yield*/, listObjectsPromise];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, Promise.all(deleteObjectPromises)];
                }
            });
        });
    };
    Client.prototype.listObjects = function (params, ee) {
        return __awaiter(this, void 0, void 0, function () {
            var s3Details, MAX_KEYS, maxObjectsToList, s3ObjectsList, isPending, continuationToken, listData, listObjects;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        s3Details = __assign({}, params.s3Params);
                        MAX_KEYS = 1000;
                        maxObjectsToList = params.maxObjects || 10 * 1000;
                        s3ObjectsList = [];
                        isPending = true;
                        continuationToken = s3Details.ContinuationToken;
                        _a.label = 1;
                    case 1:
                        if (!(isPending && s3ObjectsList.length < maxObjectsToList)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.s3.listObjectsV2(__assign(__assign({}, s3Details), { ContinuationToken: continuationToken, MaxKeys: s3Details.MaxKeys || MAX_KEYS })).promise()];
                    case 2:
                        listData = _a.sent();
                        if (!listData.Contents) {
                            throw new Error('List Contents should always be defined');
                        }
                        isPending = !!listData.IsTruncated;
                        continuationToken = listData.NextContinuationToken;
                        listObjects = listData.Contents;
                        if (ee) {
                            ee.emit('data', listObjects);
                        }
                        s3ObjectsList = __spreadArrays(s3ObjectsList, listObjects);
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/, s3ObjectsList];
                }
            });
        });
    };
    return Client;
}());
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
function keyOnly(item) {
    return {
        Key: item.Key,
        VersionId: item.VersionId
    };
}
