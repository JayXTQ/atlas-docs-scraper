require("dotenv").config();
const Eris = require("eris");
const YAML = require('yaml')
const axios = require('axios')

const bot = new Eris(process.env.TOKEN);

bot.on("ready", async () => {
    try {
        bot.createCommand({
            name: 'docs',
            description: 'Searches the AtlasOS documentation for a specific term using Autocomplete.',
            type: Eris.Constants.ApplicationCommandTypes.CHAT_INPUT,
            options: [{
                type: 3,
                name: 'lookup',
                description: 'The term to look up.',
                required: true
            }, {
                type: 6,
                name: 'ping',
                description: 'The user to ping when the command is run.',
                required: false
            }]
        })
    } catch (error) {
        console.error(error)
    }
    console.log("Ready!");
});


function flattenDict(dict, result={}) {
    for (const key in dict) {
        if (typeof dict[key] === 'object') {
            if (isNaN(key) && dict[key][0]['Index']) {
                result[key.toLowerCase()] = dict[key][0]['Index'];
            }

            flattenDict(dict[key], result);
        } else {
            result[key.toLowerCase()] = dict[key];
        }
    }
    return result;
}


bot.on("interactionCreate", async (interaction) => {
    if (interaction instanceof Eris.CommandInteraction) {
        if (interaction.data.name === 'docs') {
            let term = interaction.data.options[0].value.toLowerCase(); // Grab the term to look up
            let ping = interaction.data.options[1]?.value; // Grab the user to ping, if any

            const rawDocs = await axios.get('https://raw.githubusercontent.com/Atlas-OS/docs/master/mkdocs.yml');
            const parsedDocs = await YAML.parse(rawDocs.data, { logLevel : 'error' }); 
            const result = flattenDict(parsedDocs.nav);
            let docsFound = result[term];

            if (!docsFound) {
                return await interaction.createMessage("Page not found.");
            }

            docsFound = !docsFound.includes("https://") ? `https://docs.atlasos.net/${docsFound
                .replace('index.md', '')
                .replace('.md', '')
            }` : docsFound;
            await interaction.createMessage(ping ? `<@${ping}> ${docsFound}`: docsFound)
        }
    }
});

bot.connect();
