"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var S3EventEmitter = /** @class */ (function (_super) {
    __extends(S3EventEmitter, _super);
    function S3EventEmitter() {
        var _this = _super.call(this) || this;
        _this.progressAmount = 0;
        _this.progressTotal = 0;
        return _this;
    }
    return S3EventEmitter;
}(events_1.EventEmitter));
exports.default = S3EventEmitter;
