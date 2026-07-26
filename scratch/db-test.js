import db from '../src/config/db.js';

console.log("Employees in DB:");
const employees = db.prepare("SELECT * FROM employees").all();
console.log(employees);

console.log("\nLogs in DB:");
const logs = db.prepare("SELECT * FROM logs").all();
console.log(logs);
