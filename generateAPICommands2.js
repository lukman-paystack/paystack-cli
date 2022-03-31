let APIs = require('./src/lib/paystack/APIs.json')
console.log( typeof APIs)
// APIs = JSON.parse(APIs);
const fs = require('fs');

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    function (txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}
let commandKeys = Object.keys(APIs)
let declaredCommands = [];
commandKeys.forEach(key => {
  console.log("..", key)
  let API = APIs[key]
  let script = `
const {Command, Flags} = require('@oclif/core')
const helpers = require('../lib/helpers')
const APIs = require('../lib/paystack/APIs.json')
const Paystack = require('../lib/paystack')
const db = require('../lib/db')
let key = '${key}';
let API = APIs[key];
class ${toTitleCase(key)}Command extends Command {

  
  async run() {
    const {args, flags} = await this.parse(${toTitleCase(key)}Command)
    let selected_integration = db.read('selected_integration.id')
    let user = db.read('user.id')
    if (!selected_integration || !user) {
      this.error("You're not signed in, please run the \` paystack login \` command before you begin")
    }
    let token = ''
      let expiry = parseInt(db.read('token_expiry'), 10) * 1000
      let now = parseFloat(Date.now().toString())

      if (expiry > now) {
        token = db.read('token')
      } else {
        await helpers.promiseWrapper(Paystack.refreshIntegration())
        token = db.read('token')
      }
    let schema = helpers.findSchema(key, args.endpoint, flags)
    if(!schema){
      helpers.errorLog(\`ValidationError: Invalid endpoint '${key}'\`)
      return;
    }
    let [err, result] = await helpers.promiseWrapper(helpers.executeSchema(schema, flags))
    if (err) {
      if (err.response) {
        helpers.errorLog(err.response.data.message)
        return
      }
      helpers.errorLog(err)
      return
    }
    helpers.successLog(result.message)
    helpers.jsonLog(result.data)
   
  }
}


${toTitleCase(key)}Command.description = helpers.getDescription(API, key)

${toTitleCase(key)}Command.flags = {
    domain: Flags.string(),
}
let addedFlags = ['domain']
let endpoints = [];
API.forEach(path => {
  endpoints.push(path.api);
  path.params.forEach(param => {
    if (addedFlags.indexOf(param.parameter) < 0) {
      switch (param.type) {
      case 'String':
        ${toTitleCase(key)}Command.flags[param.parameter] = Flags.string()
        break
      case 'Number':
        ${toTitleCase(key)}Command.flags[param.parameter] = Flags.integer()
        break
      case 'Boolean':
        ${toTitleCase(key)}Command.flags[param.parameter] = Flags.boolean()
        break
      default:
        ${toTitleCase(key)}Command.flags[param.parameter] = Flags.string()
      }
      addedFlags.push(param.parameter)
    }
  })
  if(path.variables){
    path.variables.forEach((variable)=>{
      if(addedFlags.indexOf(variable.key) < 0){
        ${toTitleCase(key)}Command.flags[variable.key] = Flags.string();
        addedFlags.push(variable.key);
      }
    })
  }
 
})
${toTitleCase(key)}Command.args = [
    {name: 'endpoint',   required: true, options: endpoints}
  ]


module.exports = ${toTitleCase(key)}Command;
`
  fs.writeFile(`./src/commands/${key}.js`, script, () => {
    declaredCommands.push(key)
  })
})

