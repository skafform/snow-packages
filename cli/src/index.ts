import { Command } from "commander"
import { create } from "./commands/create.js"
import { init } from "./commands/init.js"
import { add } from "./commands/add.js"
import { remove } from "./commands/remove.js"

const program = new Command()

program
  .name("skafform")
  .description("Skafform CLI — manage bricks and project configuration")
  .version("0.1.0")

program
  .command("create <name>")
  .description("Scaffold a new Skafform project with theme-light")
  .action((name: string) => create(name))

program
  .command("init")
  .description("Initialize skafform.config.json and skafform-bricks.json")
  .action(() => init(process.cwd()))

program
  .command("add <brick>")
  .description("Register a brick from the bricks/ folder into skafform-bricks.json")
  .action((brick: string) => add(brick, process.cwd()).catch(e => { console.error(e.message); process.exit(1) }))

program
  .command("remove <brick>")
  .description("Remove a brick from skafform-bricks.json")
  .action((brick: string) => remove(brick, process.cwd()))

program.parse()
