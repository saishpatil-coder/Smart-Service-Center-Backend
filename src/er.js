import db from "./models/index.js";
Object.values(db).forEach((model) => {
  console.log(`entity ${model.name} {`);
  Object.entries(model.rawAttributes).forEach(([k, v]) => {
    console.log(`  ${k} : ${v.type.key}`);
  });
  console.log(`}\n`);
});
