import { generateCmd } from './commands/generate'
import { driftCmd } from './commands/drift'
import { transformCmd } from './commands/transform'
import { gateCmd } from './commands/gate'

function run(argv: string[]): number {
  const [cmd, ...rest] = argv
  switch (cmd) {
    case undefined:
      console.error('usage: foundation-map <generate|drift-check|gate> ... | foundation-map <artifact.html>')
      return 2
    case 'generate':
      return generateCmd(rest[0]!)
    case 'drift-check':
      return driftCmd(rest[0]!)
    case 'gate':
      return gateCmd(rest[0]!, rest[1]!)
    default:
      // default: treat the first arg as an artifact path to transform.
      return transformCmd(cmd)
  }
}

process.exit(run(process.argv.slice(2)))
