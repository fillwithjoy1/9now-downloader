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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var functions_js_1 = require("./functions.js");
var vitest_1 = require("vitest");
var fs = require("node:fs/promises");
var node_fs_1 = require("node:fs");
// TODO: Add cohesive testing before reworking the files
(0, vitest_1.test)("404 Page Check", function () { return __awaiter(void 0, void 0, void 0, function () {
    var browser, page, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0: return [4 /*yield*/, functions_js_1.Browser.create()];
            case 1:
                browser = _d.sent();
                return [4 /*yield*/, browser.browser.newPage()];
            case 2:
                page = _d.sent();
                return [4 /*yield*/, page.goto("https://www.9now.com.au/archery-olympic-games-paris-2024/season-2025/", browser.noTimeout)];
            case 3:
                _d.sent();
                _b = (_a = console).log;
                return [4 /*yield*/, browser.check404(page)];
            case 4:
                _b.apply(_a, [_d.sent()]);
                _c = vitest_1.expect;
                return [4 /*yield*/, browser.check404(page)];
            case 5:
                _c.apply(void 0, [_d.sent()]).toBeTruthy();
                return [2 /*return*/];
        }
    });
}); }, 30000);
// Test Lock class
(0, vitest_1.test)("Create a lock", function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!(0, node_fs_1.existsSync)("node.lock")) return [3 /*break*/, 2];
                return [4 /*yield*/, fs.unlink("node.lock")];
            case 1:
                _b.sent();
                _b.label = 2;
            case 2: return [4 /*yield*/, functions_js_1.Lock.lock()];
            case 3:
                _b.sent();
                _a = vitest_1.expect;
                return [4 /*yield*/, fs.stat("node.lock")];
            case 4:
                _a.apply(void 0, [_b.sent()]).toBeTruthy();
                return [4 /*yield*/, fs.unlink("node.lock")];
            case 5:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.test)("Remove a lock", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!(0, node_fs_1.existsSync)("node.lock")) return [3 /*break*/, 2];
                return [4 /*yield*/, functions_js_1.Lock.lock()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                functions_js_1.Lock.unlock();
                (0, vitest_1.expect)((0, node_fs_1.existsSync)("node.lock")).toBeFalsy();
                return [2 /*return*/];
        }
    });
}); });
(0, vitest_1.test)("Check Lock.status()", function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!(0, node_fs_1.existsSync)("node.lock")) return [3 /*break*/, 2];
                return [4 /*yield*/, functions_js_1.Lock.lock()];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2:
                (0, vitest_1.expect)(functions_js_1.Lock.status()).toBeTruthy();
                return [2 /*return*/];
        }
    });
}); });
// Check sleep function
(0, vitest_1.test)("Sleep function check", function () { return __awaiter(void 0, void 0, void 0, function () {
    var now, now2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                now = performance.now();
                return [4 /*yield*/, (0, functions_js_1.sleep)(3000)];
            case 1:
                _a.sent();
                now2 = performance.now();
                console.log("Performance: ".concat(now2 - now - 3000));
                (0, vitest_1.expect)(now2 - now > 3000).toBeTruthy();
                return [2 /*return*/];
        }
    });
}); });
