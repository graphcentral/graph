"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameUntitledIfEmpty = exports.isIdAlreadySeparateByDash = exports.separateIdWithDashSafe = exports.identifyObjectTitle = void 0;
function identifyObjectTitle(obj) {
    const identify = () => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        if (obj.object === `database`) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: sdk bad typing
            return (_a = obj.title) === null || _a === void 0 ? void 0 : _a[0].plain_text;
        }
        else if (obj.object === `page`) {
            return (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: sdk bad typing
            (_e = (_d = (_c = (_b = obj.properties) === null || _b === void 0 ? void 0 : _b.Name) === null || _c === void 0 ? void 0 : _c.title) === null || _d === void 0 ? void 0 : _d[0].plain_text) !== null && _e !== void 0 ? _e : 
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: sdk bad typing
            (_h = (_g = (_f = obj.properties) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g.title) === null || _h === void 0 ? void 0 : _h[0].plain_text);
        }
        else if (obj.object === `block`) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore: sdk bad typing
            return (_k = (_j = obj.child_page) === null || _j === void 0 ? void 0 : _j.title) !== null && _k !== void 0 ? _k : obj.child_database.title;
        }
        throw new Error(`should never get here`);
    };
    return nameUntitledIfEmpty(identify());
}
exports.identifyObjectTitle = identifyObjectTitle;
/**
 *
 * @param maybe_without_dash 1429989fe8ac4effbc8f57f56486db54
 * @returns 1429989f-e8ac-4eff-bc8f-57f56486db54
 */
function separateIdWithDashSafe(maybe_without_dash) {
    if (isIdAlreadySeparateByDash(maybe_without_dash)) {
        return maybe_without_dash;
    }
    if (maybe_without_dash.length != 32) {
        throw new Error(`Incorrect length of id: ${maybe_without_dash.length}`);
    }
    if (!/^[a-zA-Z0-9]{32}$/.test(maybe_without_dash)) {
        throw new Error(`Incorrect format of id: ${maybe_without_dash}. It must be /^[a-zA-Z0-9]{32}$/`);
    }
    return `${maybe_without_dash.substring(0, 8)}-${maybe_without_dash.substring(8, 12)}-${maybe_without_dash.substring(12, 16)}-${maybe_without_dash.substring(16, 20)}-${maybe_without_dash.substring(20, 32)}`;
}
exports.separateIdWithDashSafe = separateIdWithDashSafe;
function isIdAlreadySeparateByDash(maybe_separate_with_dash) {
    if (maybe_separate_with_dash.length !== 36) {
        return false;
    }
    return /^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(maybe_separate_with_dash);
}
exports.isIdAlreadySeparateByDash = isIdAlreadySeparateByDash;
function nameUntitledIfEmpty(title) {
    if (title === ``) {
        return `Untitled`;
    }
    return title;
}
exports.nameUntitledIfEmpty = nameUntitledIfEmpty;
