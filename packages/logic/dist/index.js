var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

// index.ts
var dotenv = __toESM(require("dotenv"));
var import_path = __toESM(require("path"));
dotenv.config({ path: import_path.default.resolve(__dirname, `..`, `..`, `.env`) });
(async () => {
  const { NotionAPI } = await import("notion-client");
  const notionUnofficialClient = new NotionAPI();
  const recordMap = await notionUnofficialClient.getPage(`067dd719a912471ea9a3ac10710e7fdf`);
  console.log(recordMap);
})();
