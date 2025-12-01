const fs = require("fs");
const json = fs.readFileSync(
  "sscms-51853-firebase-adminsdk-fbsvc-9f9f6cc1f7.json",
  "utf8"
);
console.log(Buffer.from(json, "utf8").toString("base64"));
